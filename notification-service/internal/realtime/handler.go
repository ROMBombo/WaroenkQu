package realtime

import (
	"context"
	"errors"
	"net/http"

	"github.com/gorilla/websocket"

	"github.com/ROMBombo/WaroenkQu/notification-service/internal/auth"
	"github.com/ROMBombo/WaroenkQu/notification-service/internal/httpx"
)

type Authenticator interface {
	Authenticate(ctx context.Context, token string) (auth.Principal, error)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Webapp berjalan di origin lain (port berbeda). Akses tetap dibatasi lewat access token.
	CheckOrigin: func(*http.Request) bool { return true },
}

// Handler GET /ws?access_token=<token>.
// Browser tidak bisa mengirim header Authorization saat membuka WebSocket, jadi token lewat query param.
// Token dicek SEBELUM upgrade, sehingga request yang ditolak mendapat response HTTP 401/403 biasa.
func Handler(hub *Hub, authenticator Authenticator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, err := authenticator.Authenticate(r.Context(), r.URL.Query().Get("access_token"))
		switch {
		case errors.Is(err, auth.ErrUnauthorized):
			httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED")
			return
		case errors.Is(err, auth.ErrForbidden):
			httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN")
			return
		case err != nil:
			hub.logger.Error("gagal memverifikasi koneksi WebSocket", "error", err)
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR")
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			// Upgrader sudah menulis response error-nya sendiri
			return
		}
		newClient(hub, conn, principal.UserID).run(principal.ExpiresAt)
	}
}
