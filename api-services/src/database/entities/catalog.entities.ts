import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  min_stock: number;
}

@Entity('catalog_publishes')
export class CatalogPublish {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt!: Date;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  products!: CatalogProduct[];
}
