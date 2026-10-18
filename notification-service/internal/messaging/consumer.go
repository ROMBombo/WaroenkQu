// Package messaging berisi consumer RabbitMQ dengan manual ack dan reconnect otomatis.
package messaging

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// ErrPermanent menandakan pesan yang tidak akan pernah berhasil diproses: pesan di-reject tanpa requeue.
var ErrPermanent = errors.New("pesan tidak bisa diproses")

// Handler memproses isi pesan. Return nil -> ack, ErrPermanent -> reject, error lain -> nack + requeue.
type Handler func(ctx context.Context, body []byte) error

const (
	maxReconnectDelay = 30 * time.Second
	// Jeda sebelum requeue supaya tidak terjadi loop cepat saat database sedang mati
	requeueDelay = 2 * time.Second
)

type Consumer struct {
	url      string
	queue    string
	prefetch int
	handler  Handler
	logger   *slog.Logger
}

func NewConsumer(url, queue string, prefetch int, handler Handler, logger *slog.Logger) *Consumer {
	return &Consumer{url: url, queue: queue, prefetch: prefetch, handler: handler, logger: logger}
}

// Run berjalan sampai ctx dibatalkan. Kalau koneksi putus (misalnya RabbitMQ restart), consumer
// menyambung ulang dengan jeda 1, 2, 4, ... detik (maksimal 30 detik).
func (c *Consumer) Run(ctx context.Context) {
	delay := time.Second
	for ctx.Err() == nil {
		connected, err := c.consume(ctx)
		if ctx.Err() != nil {
			return
		}
		if connected {
			delay = time.Second
		}
		c.logger.Warn("koneksi RabbitMQ terputus, menyambung ulang", "error", err, "retry_in", delay)
		if !sleep(ctx, delay) {
			return
		}
		delay = min(delay*2, maxReconnectDelay)
	}
}

func (c *Consumer) consume(ctx context.Context) (connected bool, err error) {
	conn, err := amqp.DialConfig(c.url, amqp.Config{Dial: amqp.DefaultDial(5 * time.Second)})
	if err != nil {
		return false, fmt.Errorf("dial: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return false, fmt.Errorf("channel: %w", err)
	}
	// Deklarasi harus sama dengan API Services (durable, tanpa argumen lain)
	if _, err := ch.QueueDeclare(c.queue, true, false, false, false, nil); err != nil {
		return false, fmt.Errorf("queue declare: %w", err)
	}
	if err := ch.Qos(c.prefetch, 0, false); err != nil {
		return false, fmt.Errorf("qos: %w", err)
	}
	deliveries, err := ch.ConsumeWithContext(ctx, c.queue, "notification-service", false, false, false, false, nil)
	if err != nil {
		return false, fmt.Errorf("consume: %w", err)
	}

	c.logger.Info("terhubung ke RabbitMQ", "queue", c.queue)
	closed := conn.NotifyClose(make(chan *amqp.Error, 1))
	for {
		select {
		case <-ctx.Done():
			return true, nil
		case amqpErr := <-closed:
			return true, fmt.Errorf("connection closed: %v", amqpErr)
		case delivery, ok := <-deliveries:
			if !ok {
				return true, errors.New("delivery channel ditutup")
			}
			c.handle(ctx, delivery)
		}
	}
}

// handle: pesan di-ack hanya setelah handler berhasil (notifikasi sudah tersimpan di database).
func (c *Consumer) handle(ctx context.Context, d amqp.Delivery) {
	err := c.handler(ctx, d.Body)
	switch {
	case err == nil:
		c.ackOrLog(d.Ack(false))
	case errors.Is(err, ErrPermanent):
		c.logger.Error("pesan dibuang karena tidak valid", "error", err, "body", string(d.Body))
		c.ackOrLog(d.Reject(false))
	default:
		c.logger.Error("gagal memproses pesan, akan dicoba lagi", "error", err)
		sleep(ctx, requeueDelay)
		c.ackOrLog(d.Nack(false, true))
	}
}

func (c *Consumer) ackOrLog(err error) {
	if err != nil {
		c.logger.Warn("gagal mengirim ack/nack ke RabbitMQ", "error", err)
	}
}

// sleep menunggu d atau sampai ctx dibatalkan. Mengembalikan false kalau ctx dibatalkan.
func sleep(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
