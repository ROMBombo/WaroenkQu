import { toIsoJakarta } from '../../common/utils/datetime.util';
import { Transaction } from '../../database/entities';
import { TransactionDetailResponseDto, TransactionSummaryResponseDto } from './dto/transaction-response.dto';

export function toTransactionSummary(transaction: Transaction): TransactionSummaryResponseDto {
  return {
    id: transaction.id,
    cashier: { id: transaction.cashier.id, name: transaction.cashier.name },
    catalog_publish_id: transaction.catalogPublishId,
    total: transaction.total,
    paid_amount: transaction.paidAmount,
    change_amount: transaction.changeAmount,
    created_at: toIsoJakarta(transaction.createdAt),
  };
}

export function toTransactionDetail(transaction: Transaction): TransactionDetailResponseDto {
  return {
    ...toTransactionSummary(transaction),
    items: transaction.items.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
  };
}
