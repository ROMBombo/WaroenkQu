import { toIsoJakarta } from '../../common/utils/datetime.util';
import { Product, ProductHistory } from '../../database/entities';
import { ProductHistoryResponseDto, ProductResponseDto } from './dto/product-response.dto';

export function toProductResponse(product: Product): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    min_stock: product.minStock,
    is_active: product.isActive,
    publish_status: product.publishStatus,
    created_at: toIsoJakarta(product.createdAt),
    updated_at: toIsoJakarta(product.updatedAt),
  };
}

export function toProductHistoryResponse(history: ProductHistory): ProductHistoryResponseDto {
  return {
    id: history.id,
    action: history.action,
    quantity: history.quantity,
    note: history.note,
    name: history.name,
    price: history.price,
    stock: history.stock,
    min_stock: history.minStock,
    is_active: history.isActive,
    changed_by: { id: history.changedBy.id, name: history.changedBy.name },
    created_at: toIsoJakarta(history.createdAt),
  };
}
