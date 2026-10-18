import { DataSource, EntityManager } from 'typeorm';

export interface AuditContext {
  changedBy: string;
  note?: string;
}

/**
 * Menjalankan fn dalam satu DB transaction yang membawa session variable untuk trigger trg_products_history:
 * - app.changed_by: owner yang melakukan perubahan (history hanya dicatat kalau ini terisi)
 * - app.note: catatan tambah/kurang stok
 * set_config(..., true) setara dengan SET LOCAL, jadi nilainya hilang saat transaction selesai.
 */
export function runAuditedTransaction<T>(
  dataSource: DataSource,
  context: AuditContext,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return dataSource.transaction(async (manager) => {
    await manager.query(`SELECT set_config('app.changed_by', $1, true), set_config('app.note', $2, true)`, [
      context.changedBy,
      context.note ?? '',
    ]);
    return fn(manager);
  });
}
