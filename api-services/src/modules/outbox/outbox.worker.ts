import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { config } from '../../config/configuration';
import { OutboxMessage } from '../../database/entities';
import { RabbitMqService } from '../../infrastructure/rabbitmq/rabbitmq.service';

const BATCH_SIZE = 50;
const MAX_BACKOFF_SECONDS = 60;

/** Jeda percobaan berikutnya: 1, 2, 4, 8, ... detik, maksimal 60 detik. */
export function backoffSeconds(attempts: number): number {
  return Math.min(2 ** Math.max(attempts - 1, 0), MAX_BACKOFF_SECONDS);
}

/**
 * Background worker di dalam API Services yang mengirim outbox_messages ke RabbitMQ.
 * Pesan yang gagal tetap PENDING dan dicoba lagi tanpa batas, jadi pesan pasti terkirim setelah RabbitMQ hidup lagi.
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduleNext();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), config.outbox.pollIntervalMs);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processBatch();
    } catch (err) {
      this.logger.error(`Outbox batch gagal: ${(err as Error).message}`);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }

  /** SKIP LOCKED: aman kalau API Services berjalan lebih dari satu instance. */
  async processBatch(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OutboxMessage);
      const messages = await repo
        .createQueryBuilder('message')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where("message.status = 'PENDING'")
        .andWhere('message.next_attempt_at <= now()')
        .orderBy('message.created_at', 'ASC')
        .limit(BATCH_SIZE)
        .getMany();

      for (const message of messages) {
        try {
          await this.rabbitMq.publish(message.queue, message.payload);
          await repo.update(message.id, { status: 'SENT', sentAt: new Date(), lastError: null });
        } catch (err) {
          const attempts = message.attempts + 1;
          await repo.update(message.id, {
            attempts,
            lastError: (err as Error).message,
            nextAttemptAt: new Date(Date.now() + backoffSeconds(attempts) * 1000),
          });
          this.logger.warn(`Gagal mengirim outbox ${message.id} (percobaan ${attempts}): ${(err as Error).message}`);
        }
      }
    });
  }
}
