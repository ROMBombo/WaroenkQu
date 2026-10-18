// Package notification berisi model, penyimpanan, dan logika notifikasi stok menipis.
package notification

import (
	"time"

	"github.com/google/uuid"
)

// Notification memetakan tabel notifications (schema dari api-services/migrations).
type Notification struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	ProductID        uuid.UUID `gorm:"type:uuid"`
	CatalogPublishID uuid.UUID `gorm:"type:uuid"`
	Message          string
	IsRead           bool
	CreatedAt        time.Time
	ReadAt           *time.Time
}

func (Notification) TableName() string { return "notifications" }

// StockLowMessage adalah isi pesan di queue stock.low (ditulis oleh outbox worker API Services).
type StockLowMessage struct {
	ProductID        uuid.UUID `json:"product_id"`
	ProductName      string    `json:"product_name"`
	CatalogPublishID uuid.UUID `json:"catalog_publish_id"`
	Stock            int       `json:"stock"`
	MinStock         int       `json:"min_stock"`
}
