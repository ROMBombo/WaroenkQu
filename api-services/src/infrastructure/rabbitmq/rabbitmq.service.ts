import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ChannelModel, ConfirmChannel, connect } from 'amqplib';
import { config } from '../../config/configuration';

/**
 * Publisher RabbitMQ dengan publisher confirm.
 * Koneksi dibuat saat pertama dibutuhkan dan dibuat ulang otomatis kalau putus (misalnya RabbitMQ restart).
 */
@Injectable()
export class RabbitMqService implements OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private connecting: Promise<ConfirmChannel> | null = null;
  private readonly assertedQueues = new Set<string>();

  /** Mengirim pesan persistent ke queue durable, lalu menunggu konfirmasi dari RabbitMQ. */
  async publish(queue: string, payload: unknown): Promise<void> {
    const channel = await this.getChannel();
    if (!this.assertedQueues.has(queue)) {
      await channel.assertQueue(queue, { durable: true });
      this.assertedQueues.add(queue);
    }
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    await channel.waitForConfirms();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection?.close().catch(() => undefined);
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    this.connecting ??= this.openChannel().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async openChannel(): Promise<ConfirmChannel> {
    // Timeout supaya worker tidak menggantung lama saat RabbitMQ mati
    const connection = await connect(config.rabbitmq.url, { timeout: 5000 });
    connection.on('error', (err: Error) => this.logger.warn(`RabbitMQ connection error: ${err.message}`));
    connection.on('close', () => this.reset());

    const channel = await connection.createConfirmChannel();
    channel.on('error', (err: Error) => this.logger.warn(`RabbitMQ channel error: ${err.message}`));
    channel.on('close', () => this.reset());

    this.connection = connection;
    this.channel = channel;
    this.logger.log('Connected to RabbitMQ');
    return channel;
  }

  private reset(): void {
    this.connection = null;
    this.channel = null;
    this.assertedQueues.clear();
  }
}
