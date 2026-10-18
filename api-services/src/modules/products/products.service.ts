import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { escapeLike, isUniqueViolation } from '../../common/utils/pg-error.util';
import { AuditContext, runAuditedTransaction } from '../../database/audit-context';
import { Product, ProductHistory } from '../../database/entities';
import {
  CreateProductDto,
  ListProductsQueryDto,
  StockInDto,
  StockOutDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/product-request.dto';

const UNIQUE_NAME_INDEX = 'uq_products_name_active';

const productNotFound = () => AppException.notFound(ErrorCode.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan');

/**
 * Semua perubahan produk berjalan lewat runAuditedTransaction supaya trigger database bisa mencatat history,
 * mengisi updated_at, dan mengubah publish_status (lihat migrations/0002_products.sql).
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductHistory) private readonly histories: Repository<ProductHistory>,
  ) {}

  async findAll(query: ListProductsQueryDto): Promise<[Product[], number]> {
    const qb = this.products.createQueryBuilder('product').where('product.deleted_at IS NULL');
    if (query.search) {
      qb.andWhere(`product.name ILIKE :search ESCAPE '\\'`, { search: `%${escapeLike(query.search)}%` });
    }
    return qb.orderBy('product.created_at', 'DESC').skip(query.skip).take(query.limit).getManyAndCount();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOneBy({ id, deletedAt: IsNull() });
    if (!product) throw productNotFound();
    return product;
  }

  async create(dto: CreateProductDto, user: AuthUser): Promise<Product> {
    return this.withUniqueName(() =>
      runAuditedTransaction(this.dataSource, { changedBy: user.id }, async (manager) => {
        const repo = manager.getRepository(Product);
        const { identifiers } = await repo.insert({
          name: dto.name,
          price: dto.price,
          stock: dto.stock,
          minStock: dto.min_stock,
        });
        return repo.findOneByOrFail({ id: identifiers[0].id as string });
      }),
    );
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser): Promise<Product> {
    return this.withUniqueName(() =>
      this.mutate(id, { changedBy: user.id }, (repo) =>
        repo.update(id, { name: dto.name, price: dto.price, minStock: dto.min_stock }),
      ),
    );
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto, user: AuthUser): Promise<Product> {
    return this.mutate(id, { changedBy: user.id }, (repo) => repo.update(id, { isActive: dto.is_active }));
  }

  async remove(id: string, user: AuthUser): Promise<Product> {
    return this.mutate(id, { changedBy: user.id }, (repo) => repo.update(id, { deletedAt: new Date() }));
  }

  async stockIn(id: string, dto: StockInDto, user: AuthUser): Promise<Product> {
    return runAuditedTransaction(this.dataSource, { changedBy: user.id, note: dto.note }, async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock + :quantity' })
        .where('id = :id AND deleted_at IS NULL', { id, quantity: dto.quantity })
        .execute();
      if (!result.affected) throw productNotFound();
      return manager.getRepository(Product).findOneByOrFail({ id });
    });
  }

  /** Pengurangan atomic: hanya berhasil kalau stok cukup, sehingga stok tidak pernah negatif. */
  async stockOut(id: string, dto: StockOutDto, user: AuthUser): Promise<Product> {
    return runAuditedTransaction(this.dataSource, { changedBy: user.id, note: dto.note }, async (manager) => {
      const repo = manager.getRepository(Product);
      const result = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock - :quantity' })
        .where('id = :id AND deleted_at IS NULL AND stock >= :quantity', { id, quantity: dto.quantity })
        .execute();

      if (!result.affected) {
        const product = await repo.findOneBy({ id, deletedAt: IsNull() });
        if (!product) throw productNotFound();
        throw AppException.unprocessable(ErrorCode.INSUFFICIENT_STOCK, 'Stok tidak cukup untuk dikurangi', {
          product_id: id,
          requested: dto.quantity,
          available: product.stock,
        });
      }
      return repo.findOneByOrFail({ id });
    });
  }

  /** History tetap bisa dilihat untuk produk yang sudah dihapus. */
  async findHistory(id: string, query: PaginationQueryDto): Promise<[ProductHistory[], number]> {
    if (!(await this.products.existsBy({ id }))) throw productNotFound();
    return this.histories.findAndCount({
      where: { productId: id },
      relations: { changedBy: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
  }

  /** Mengunci produk yang belum dihapus, menjalankan perubahan, lalu mengembalikan data terbaru (setelah trigger). */
  private async mutate(
    id: string,
    context: AuditContext,
    apply: (repo: Repository<Product>) => Promise<unknown>,
  ): Promise<Product> {
    return runAuditedTransaction(this.dataSource, context, async (manager) => {
      const repo = manager.getRepository(Product);
      const locked = await repo
        .createQueryBuilder('product')
        .setLock('pessimistic_write')
        .where('product.id = :id AND product.deleted_at IS NULL', { id })
        .getOne();
      if (!locked) throw productNotFound();

      await apply(repo);
      return repo.findOneByOrFail({ id });
    });
  }

  private async withUniqueName<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isUniqueViolation(err, UNIQUE_NAME_INDEX)) {
        throw AppException.conflict(ErrorCode.DUPLICATE_PRODUCT_NAME, 'Nama produk sudah dipakai produk lain');
      }
      throw err;
    }
  }
}
