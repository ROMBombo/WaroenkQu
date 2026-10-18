package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrInvalidMessage menandakan pesan rusak yang tidak akan pernah berhasil diproses (jangan di-requeue).
var ErrInvalidMessage = errors.New("pesan stok menipis tidak valid")

// Broadcaster mengirim event ke semua owner yang sedang terhubung lewat WebSocket.
type Broadcaster interface {
	Broadcast(event any)
}

type Service struct {
	repo        *Repository
	broadcaster Broadcaster
	logger      *slog.Logger
}

func NewService(repo *Repository, broadcaster Broadcaster, logger *slog.Logger) *Service {
	return &Service{repo: repo, broadcaster: broadcaster, logger: logger}
}

// HandleStockLowMessage memproses isi mentah pesan dari queue stock.low.
func (s *Service) HandleStockLowMessage(ctx context.Context, body []byte) error {
	var msg StockLowMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidMessage, err)
	}
	if msg.ProductID == uuid.Nil || msg.CatalogPublishID == uuid.Nil || msg.ProductName == "" {
		return fmt.Errorf("%w: product_id, catalog_publish_id, dan product_name wajib diisi", ErrInvalidMessage)
	}
	return s.HandleStockLow(ctx, msg)
}

// HandleStockLow menyimpan notifikasi (maksimal satu per produk per katalog) lalu mengirimnya lewat WebSocket.
// Error dari database dikembalikan supaya pesan di-requeue dan dicoba lagi.
func (s *Service) HandleStockLow(ctx context.Context, msg StockLowMessage) error {
	n := &Notification{
		ID:               uuid.New(),
		ProductID:        msg.ProductID,
		CatalogPublishID: msg.CatalogPublishID,
		Message:          fmt.Sprintf("Stok %s tersisa %d (minimum %d)", msg.ProductName, msg.Stock, msg.MinStock),
		CreatedAt:        time.Now().UTC(),
	}

	created, err := s.repo.CreateIfAbsent(ctx, n)
	if err != nil {
		if isPermanentDBError(err) {
			// Misalnya product_id/catalog_publish_id tidak ada (foreign key): dicoba berapa kali pun tetap gagal
			return fmt.Errorf("%w: %v", ErrInvalidMessage, err)
		}
		return fmt.Errorf("menyimpan notifikasi: %w", err)
	}
	if !created {
		s.logger.Info("notifikasi sudah ada untuk produk & katalog ini, pesan diabaikan",
			"product_id", msg.ProductID, "catalog_publish_id", msg.CatalogPublishID)
		return nil
	}
	s.logger.Info("notifikasi dibuat", "notification_id", n.ID, "product_id", msg.ProductID)

	// Jumlah belum dibaca hanya pelengkap event; kalau gagal dihitung, event tetap dikirim tanpa meta
	var meta *EventMeta
	if unread, err := s.repo.CountUnread(ctx); err != nil {
		s.logger.Warn("gagal menghitung notifikasi belum dibaca", "error", err)
	} else {
		meta = &EventMeta{UnreadCount: unread}
	}
	s.broadcaster.Broadcast(newCreatedEvent(n, msg.ProductName, meta))
	return nil
}

// isPermanentDBError: error karena isi data (kelas SQLSTATE 22 data exception, 23 constraint violation),
// bukan karena database sedang bermasalah. Error lain (koneksi putus, timeout) dianggap sementara.
func isPermanentDBError(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}
	class := pgErr.Code[:2]
	return class == "22" || class == "23"
}
