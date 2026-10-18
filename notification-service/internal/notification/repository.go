package notification

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// CreateIfAbsent menyimpan notifikasi dengan ON CONFLICT (product_id, catalog_publish_id) DO NOTHING.
// Mengembalikan true kalau row benar-benar baru tersimpan, false kalau produk sudah punya notifikasi
// untuk katalog yang sama (satu produk maksimal satu notifikasi per hari).
func (r *Repository) CreateIfAbsent(ctx context.Context, n *Notification) (bool, error) {
	result := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "product_id"}, {Name: "catalog_publish_id"}},
			DoNothing: true,
		}).
		Create(n)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *Repository) CountUnread(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Notification{}).Where("is_read = ?", false).Count(&count).Error
	return count, err
}
