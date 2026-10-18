package httpx

import (
	"context"
	"net/http"
	"time"

	"gorm.io/gorm"
)

// HealthHandler dipakai healthcheck Docker: OK kalau database bisa diakses.
func HealthHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sqlDB, err := db.DB()
		if err == nil {
			ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
			defer cancel()
			err = sqlDB.PingContext(ctx)
		}
		if err != nil {
			WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE")
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// NotFoundHandler menyamakan format 404 dengan API Services.
func NotFoundHandler(w http.ResponseWriter, _ *http.Request) {
	WriteError(w, http.StatusNotFound, "NOT_FOUND")
}
