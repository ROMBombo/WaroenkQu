import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CatalogPublish } from './catalog.entities';
import { Product } from './product.entities';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'catalog_publish_id', type: 'uuid' })
  catalogPublishId!: string;

  @ManyToOne(() => CatalogPublish)
  @JoinColumn({ name: 'catalog_publish_id' })
  catalogPublish!: CatalogPublish;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
}

export type OutboxStatus = 'PENDING' | 'SENT';

@Entity('outbox_messages')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  queue!: string;

  @Column({ type: 'jsonb' })
  payload!: object;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status!: OutboxStatus;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'next_attempt_at', type: 'timestamptz' })
  nextAttemptAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;
}
