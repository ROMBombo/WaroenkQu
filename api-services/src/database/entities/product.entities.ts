import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './iam.entities';

export type PublishStatus = 'PENDING' | 'PUBLISHED';

export type ProductHistoryAction =
  | 'CREATE'
  | 'UPDATE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'DELETE';

// updated_at, publish_status, dan product_histories diisi oleh trigger database (lihat migrations/0002_products.sql)
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'integer' })
  stock!: number;

  @Column({ name: 'min_stock', type: 'integer' })
  minStock!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'publish_status', type: 'varchar', length: 10, default: 'PENDING' })
  publishStatus!: PublishStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

@Entity('product_histories')
export class ProductHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'varchar', length: 10 })
  action!: ProductHistoryAction;

  @Column({ type: 'integer', nullable: true })
  quantity!: number | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'integer' })
  stock!: number;

  @Column({ name: 'min_stock', type: 'integer' })
  minStock!: number;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedBy!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
