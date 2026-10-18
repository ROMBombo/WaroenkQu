import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CatalogProduct, Product, Transaction, TransactionItem } from '../../database/entities';
import { CatalogService, CurrentCatalog } from '../catalog/catalog.service';
import { OutboxService } from '../outbox/outbox.service';
import { CreateTransactionDto } from './dto/transaction-request.dto';

interface PricedLine {
  product: CatalogProduct;
  quantity: number;
  subtotal: number;
}

const transactionNotFound = () =>
  AppException.notFound(ErrorCode.TRANSACTION_NOT_FOUND, 'Transaksi tidak ditemukan');

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly catalogService: CatalogService,
    private readonly outboxService: OutboxService,
    @InjectRepository(Transaction) private readonly transactions: Repository<Transaction>,
  ) {}

  /**
   * Nama & harga dari katalog Redis, stok dari PostgreSQL.
   * Semua pengurangan stok, penyimpanan transaksi, dan pesan outbox ada dalam satu DB transaction.
   */
  async create(dto: CreateTransactionDto, cashier: AuthUser): Promise<Transaction> {
    this.assertNoDuplicateProducts(dto);

    const catalog = await this.catalogService.getCurrentOrFail();
    if (catalog.catalog_publish_id !== dto.catalog_publish_id) {
      throw AppException.conflict(ErrorCode.CATALOG_OUTDATED, 'Katalog sudah diperbarui, muat ulang katalog', {
        current_catalog_publish_id: catalog.catalog_publish_id,
      });
    }

    const lines = this.priceLines(dto, catalog);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    if (dto.paid_amount < total) {
      throw AppException.validation('Uang dibayar kurang dari total', { total, paid_amount: dto.paid_amount });
    }

    const transactionId = await this.dataSource.transaction(async (manager) => {
      const stockAfter = await this.decrementStocks(manager, lines);

      const { identifiers } = await manager.getRepository(Transaction).insert({
        cashierId: cashier.id,
        catalogPublishId: catalog.catalog_publish_id,
        total,
        paidAmount: dto.paid_amount,
        changeAmount: dto.paid_amount - total,
      });
      const id = identifiers[0].id as string;

      await manager.getRepository(TransactionItem).insert(
        lines.map((line) => ({
          transactionId: id,
          productId: line.product.id,
          productName: line.product.name,
          quantity: line.quantity,
          price: line.product.price,
          subtotal: line.subtotal,
        })),
      );

      for (const line of lines) {
        const stock = stockAfter.get(line.product.id) as number;
        if (stock <= line.product.min_stock) {
          await this.outboxService.enqueueStockLow(manager, {
            product_id: line.product.id,
            product_name: line.product.name,
            catalog_publish_id: catalog.catalog_publish_id,
            stock,
            min_stock: line.product.min_stock,
          });
        }
      }
      return id;
    });

    return this.loadDetail({ id: transactionId });
  }

  /** Owner melihat semua transaksi, kasir hanya transaksinya sendiri. */
  async findAll(user: AuthUser, query: PaginationQueryDto): Promise<[Transaction[], number]> {
    return this.transactions.findAndCount({
      where: this.visibleTo(user),
      relations: { cashier: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
  }

  /** Transaksi kasir lain dibalas 404 (bukan 403) supaya keberadaannya tidak terlihat. */
  async findOne(id: string, user: AuthUser): Promise<Transaction> {
    return this.loadDetail({ id, ...this.visibleTo(user) });
  }

  private visibleTo(user: AuthUser): FindOptionsWhere<Transaction> {
    return user.role === 'CASHIER' ? { cashierId: user.id } : {};
  }

  private async loadDetail(where: FindOptionsWhere<Transaction>): Promise<Transaction> {
    const transaction = await this.transactions.findOne({
      where,
      relations: { cashier: true, items: true },
      order: { items: { productName: 'ASC' } },
    });
    if (!transaction) throw transactionNotFound();
    return transaction;
  }

  private assertNoDuplicateProducts(dto: CreateTransactionDto): void {
    const ids = dto.items.map((item) => item.product_id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length) {
      throw AppException.validation('Satu produk hanya boleh muncul sekali dalam satu transaksi', {
        duplicate_product_ids: duplicates,
      });
    }
  }

  private priceLines(dto: CreateTransactionDto, catalog: CurrentCatalog): PricedLine[] {
    const byId = new Map(catalog.products.map((product) => [product.id, product]));
    const missing = dto.items.filter((item) => !byId.has(item.product_id)).map((item) => item.product_id);
    if (missing.length) {
      throw AppException.unprocessable(ErrorCode.PRODUCT_NOT_IN_CATALOG, 'Produk tidak ada di katalog', {
        product_ids: missing,
      });
    }
    return dto.items.map((item) => {
      const product = byId.get(item.product_id) as CatalogProduct;
      return { product, quantity: item.quantity, subtotal: product.price * item.quantity };
    });
  }

  /**
   * Mengurangi stok secara atomic (WHERE stock >= qty). Diproses berurutan berdasarkan product_id,
   * sama dengan urutan penguncian Catalog Publisher, supaya tidak deadlock.
   * Produk yang dinonaktifkan/dihapus tetap bisa dijual selama masih ada di katalog.
   */
  private async decrementStocks(manager: EntityManager, lines: PricedLine[]): Promise<Map<string, number>> {
    const stockAfter = new Map<string, number>();
    // Perbandingan string biasa (bukan localeCompare) supaya urutannya sama dengan ORDER BY id di Postgres
    const sorted = [...lines].sort((a, b) => (a.product.id < b.product.id ? -1 : 1));

    for (const line of sorted) {
      const result = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock - :quantity' })
        .where('id = :id AND stock >= :quantity', { id: line.product.id, quantity: line.quantity })
        .returning(['stock'])
        .execute();

      if (!result.affected) {
        const current = await manager.getRepository(Product).findOneBy({ id: line.product.id });
        throw AppException.unprocessable(ErrorCode.INSUFFICIENT_STOCK, `Stok ${line.product.name} tidak cukup`, {
          product_id: line.product.id,
          product_name: line.product.name,
          requested: line.quantity,
          available: current?.stock ?? 0,
        });
      }
      stockAfter.set(line.product.id, (result.raw as { stock: number }[])[0].stock);
    }
    return stockAfter;
  }
}
