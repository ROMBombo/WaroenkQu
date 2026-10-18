import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintToNumber } from '../transformers';
import { CatalogPublish } from './catalog.entities';
import { User } from './iam.entities';
import { Product } from './product.entities';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cashier_id', type: 'uuid' })
  cashierId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier!: User;

  @Column({ name: 'catalog_publish_id', type: 'uuid' })
  catalogPublishId!: string;

  @ManyToOne(() => CatalogPublish)
  @JoinColumn({ name: 'catalog_publish_id' })
  catalogPublish!: CatalogPublish;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  total!: number;

  @Column({ name: 'paid_amount', type: 'bigint', transformer: bigintToNumber })
  paidAmount!: number;

  @Column({ name: 'change_amount', type: 'bigint', transformer: bigintToNumber })
  changeAmount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => TransactionItem, (item) => item.transaction)
  items!: TransactionItem[];
}

@Entity('transaction_items')
export class TransactionItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.items)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_name', type: 'varchar', length: 50 })
  productName!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  subtotal!: number;
}
