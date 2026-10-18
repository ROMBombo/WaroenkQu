import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxMessage } from '../../database/entities';

export const STOCK_LOW_QUEUE = 'stock.low';

export interface StockLowPayload {
  product_id: string;
  product_name: string;
  catalog_publish_id: string;
  stock: number;
  min_stock: number;
}

@Injectable()
export class OutboxService {
  /**
   * Menyimpan pesan ke outbox_messages memakai manager dari DB transaction pemanggil,
   * sehingga pesan hanya tersimpan kalau transaksi bisnisnya juga tersimpan.
   */
  async enqueue(manager: EntityManager, queue: string, payload: object): Promise<void> {
    const repo = manager.getRepository(OutboxMessage);
    await repo.insert({ queue, payload, nextAttemptAt: new Date() });
  }

  async enqueueStockLow(manager: EntityManager, payload: StockLowPayload): Promise<void> {
    await this.enqueue(manager, STOCK_LOW_QUEUE, payload);
  }
}
