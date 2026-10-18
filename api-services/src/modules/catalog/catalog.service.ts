import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { toDisplayJakarta, toIsoJakarta } from '../../common/utils/datetime.util';
import { config } from '../../config/configuration';
import { CatalogProduct, CatalogPublish } from '../../database/entities';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';
import {
  CatalogHistoryDetailResponseDto,
  CatalogHistoryItemResponseDto,
  PublishInfoResponseDto,
} from './dto/catalog-response.dto';

/** Key Redis yang ditulis Catalog Publisher. */
export const CURRENT_CATALOG_KEY = 'catalog:current';

/** Isi key catalog:current (salinan row catalog_publishes terbaru). */
export interface CurrentCatalog {
  catalog_publish_id: string;
  published_at: string;
  products: CatalogProduct[];
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(CatalogPublish) private readonly catalogPublishes: Repository<CatalogPublish>,
  ) {}

  async getCurrent(): Promise<CurrentCatalog | null> {
    const raw = await this.redis.get(CURRENT_CATALOG_KEY);
    return raw ? (JSON.parse(raw) as CurrentCatalog) : null;
  }

  async getCurrentOrFail(): Promise<CurrentCatalog> {
    const catalog = await this.getCurrent();
    if (!catalog) {
      throw AppException.serviceUnavailable(
        ErrorCode.CATALOG_NOT_AVAILABLE,
        'Katalog belum tersedia, tunggu Catalog Publisher berjalan',
      );
    }
    return catalog;
  }

  /** Waktu publish berikutnya = published_at terakhir + CATALOG_PUBLISH_INTERVAL. Ini juga nilai effective_at. */
  async getNextPublishAt(): Promise<Date | null> {
    return this.nextPublishAfter(await this.getLastPublishedAt());
  }

  async getPublishInfo(): Promise<PublishInfoResponseDto> {
    const last = await this.getLastPublishedAt();
    return {
      last_published_at: toDisplayJakarta(last),
      next_published_at: toDisplayJakarta(this.nextPublishAfter(last)),
    };
  }

  async listHistory(query: PaginationQueryDto): Promise<{ items: CatalogHistoryItemResponseDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.catalogPublishes
        .createQueryBuilder('catalog')
        .select('catalog.id', 'id')
        .addSelect('catalog.published_at', 'published_at')
        .addSelect('jsonb_array_length(catalog.products)', 'product_count')
        .orderBy('catalog.published_at', 'DESC')
        .offset(query.skip)
        .limit(query.limit)
        .getRawMany<{ id: string; published_at: Date; product_count: number }>(),
      this.catalogPublishes.count(),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      published_at: toIsoJakarta(row.published_at),
      product_count: Number(row.product_count),
    }));
    return { items, total };
  }

  async getHistory(id: string): Promise<CatalogHistoryDetailResponseDto> {
    const catalog = await this.catalogPublishes.findOneBy({ id });
    if (!catalog) throw AppException.notFound(ErrorCode.CATALOG_NOT_FOUND, 'Katalog tidak ditemukan');
    return {
      id: catalog.id,
      published_at: toIsoJakarta(catalog.publishedAt),
      products: catalog.products,
    };
  }

  private async getLastPublishedAt(): Promise<Date | null> {
    const latest = await this.catalogPublishes.findOne({
      select: { id: true, publishedAt: true },
      where: {},
      order: { publishedAt: 'DESC' },
    });
    return latest?.publishedAt ?? null;
  }

  private nextPublishAfter(last: Date | null): Date | null {
    return last ? new Date(last.getTime() + config.catalog.publishIntervalSeconds * 1000) : null;
  }
}
