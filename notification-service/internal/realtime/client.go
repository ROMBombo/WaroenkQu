package realtime

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// CloseTokenExpired dikirim saat access token habis. Webapp harus refresh token lalu menyambung ulang.
const CloseTokenExpired = 4001

type client struct {
	hub       *Hub
	conn      *websocket.Conn
	userID    uuid.UUID
	send      chan []byte
	done      chan struct{}
	closeOnce sync.Once
}

func newClient(hub *Hub, conn *websocket.Conn, userID uuid.UUID) *client {
	return &client{
		hub:    hub,
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, sendBufferSize),
		done:   make(chan struct{}),
	}
}

// run menjalankan pembaca & penulis koneksi, dan menutup koneksi saat token kedaluwarsa.
func (c *client) run(tokenExpiresAt time.Time) {
	c.hub.register(c)
	expiry := time.AfterFunc(time.Until(tokenExpiresAt), func() {
		c.close(CloseTokenExpired, "access token kedaluwarsa")
	})
	go c.writePump()
	c.readPump()
	expiry.Stop()
}

// readPump hanya untuk mendeteksi koneksi putus dan menerima pong; pesan dari client diabaikan.
func (c *client) readPump() {
	defer c.close(websocket.CloseNormalClosure, "")
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

// writePump satu-satunya goroutine yang menulis ke koneksi (gorilla/websocket tidak aman untuk penulis ganda).
func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-c.done:
			return
		case payload := <-c.send:
			if err := c.write(websocket.TextMessage, payload); err != nil {
				c.close(websocket.CloseAbnormalClosure, "")
				return
			}
		case <-ticker.C:
			if err := c.write(websocket.PingMessage, nil); err != nil {
				c.close(websocket.CloseAbnormalClosure, "")
				return
			}
		}
	}
}

func (c *client) write(messageType int, payload []byte) error {
	_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
	return c.conn.WriteMessage(messageType, payload)
}

// close aman dipanggil berkali-kali dari goroutine mana pun.
func (c *client) close(code int, reason string) {
	c.closeOnce.Do(func() {
		c.hub.unregister(c)
		close(c.done)
		// WriteControl aman dipanggil bersamaan dengan writer lain
		_ = c.conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(code, reason), time.Now().Add(writeWait))
		_ = c.conn.Close()
	})
}
