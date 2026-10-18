// Package realtime mengelola koneksi WebSocket owner dan pengiriman event notifikasi.
package realtime

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = pongWait * 9 / 10
	maxMessageSize = 1024
	sendBufferSize = 32
)

// Hub menyimpan semua koneksi yang aktif. Aman dipakai dari banyak goroutine.
type Hub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
	logger  *slog.Logger
}

func NewHub(logger *slog.Logger) *Hub {
	return &Hub{clients: make(map[*client]struct{}), logger: logger}
}

// Broadcast mengirim event ke semua koneksi. Koneksi yang terlalu lambat (buffer penuh) ditutup
// supaya tidak menahan pengiriman ke koneksi lain; webapp akan menyambung ulang.
func (h *Hub) Broadcast(event any) {
	payload, err := json.Marshal(event)
	if err != nil {
		h.logger.Error("gagal encode event", "error", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- payload:
		default:
			go c.close(websocket.CloseTryAgainLater, "client terlalu lambat")
		}
	}
	h.logger.Info("event dikirim", "connections", len(h.clients))
}

// CloseAll menutup semua koneksi, dipakai saat service berhenti.
func (h *Hub) CloseAll() {
	h.mu.RLock()
	clients := make([]*client, 0, len(h.clients))
	for c := range h.clients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()
	for _, c := range clients {
		c.close(websocket.CloseGoingAway, "server berhenti")
	}
}

func (h *Hub) register(c *client) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	total := len(h.clients)
	h.mu.Unlock()
	h.logger.Info("koneksi WebSocket dibuka", "user_id", c.userID, "connections", total)
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	delete(h.clients, c)
	total := len(h.clients)
	h.mu.Unlock()
	h.logger.Info("koneksi WebSocket ditutup", "user_id", c.userID, "connections", total)
}
