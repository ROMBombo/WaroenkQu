// Notification Service: consume pesan stok menipis dari RabbitMQ, simpan notifikasi, kirim lewat WebSocket.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	// Data zona waktu di-embed supaya TZ=Asia/Jakarta berlaku walaupun image tidak punya tzdata
	_ "time/tzdata"

	"github.com/ROMBombo/WaroenkQu/notification-service/internal/auth"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/config"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/database"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/httpx"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/messaging"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/notification"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/realtime"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("notification service berhenti karena error", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	db, err := database.Open(cfg.PostgresDSN)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	hub := realtime.NewHub(logger)
	service := notification.NewService(notification.NewRepository(db), hub, logger)

	handler := func(ctx context.Context, body []byte) error {
		err := service.HandleStockLowMessage(ctx, body)
		if errors.Is(err, notification.ErrInvalidMessage) {
			return fmt.Errorf("%w: %v", messaging.ErrPermanent, err)
		}
		return err
	}
	consumer := messaging.NewConsumer(cfg.RabbitMQURL, cfg.StockLowQueue, cfg.PrefetchCount, handler, logger)
	consumerDone := make(chan struct{})
	go func() {
		defer close(consumerDone)
		consumer.Run(ctx)
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", httpx.HealthHandler(db))
	mux.HandleFunc("GET /ws", realtime.Handler(hub, auth.NewAuthenticator(cfg.JWTAccessSecret, db)))
	mux.HandleFunc("/", httpx.NotFoundHandler)

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("notification service listening", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case <-ctx.Done():
		logger.Info("menerima sinyal berhenti")
	case err := <-serverErr:
		return fmt.Errorf("http server: %w", err)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	hub.CloseAll()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Warn("http server tidak berhenti dengan rapi", "error", err)
	}
	<-consumerDone
	return nil
}
