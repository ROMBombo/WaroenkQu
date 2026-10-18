// Package auth memverifikasi access token yang diterbitkan API Services.
package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionNotificationRead adalah permission yang wajib dimiliki untuk menerima notifikasi realtime.
const PermissionNotificationRead = "notification:read"

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
)

type Principal struct {
	UserID    uuid.UUID
	ExpiresAt time.Time
}

type Authenticator struct {
	secret []byte
	db     *gorm.DB
}

func NewAuthenticator(secret string, db *gorm.DB) *Authenticator {
	return &Authenticator{secret: []byte(secret), db: db}
}

// Authenticate memverifikasi JWT (HS256, secret yang sama dengan API Services), lalu memastikan user masih
// aktif dan role-nya punya permission notification:read. Sama seperti API, user dicek ulang ke database.
func (a *Authenticator) Authenticate(ctx context.Context, token string) (Principal, error) {
	if token == "" {
		return Principal{}, ErrUnauthorized
	}

	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) { return a.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return Principal{}, ErrUnauthorized
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return Principal{}, ErrUnauthorized
	}

	var access struct {
		IsActive      bool
		HasPermission bool
	}
	result := a.db.WithContext(ctx).Raw(`
		SELECT u.is_active,
		       EXISTS (
		         SELECT 1 FROM role_permissions rp
		         JOIN permissions p ON p.id = rp.permission_id
		         WHERE rp.role_id = u.role_id AND p.code = ?
		       ) AS has_permission
		FROM users u
		WHERE u.id = ?`, PermissionNotificationRead, userID).Scan(&access)
	if result.Error != nil {
		return Principal{}, result.Error
	}
	if result.RowsAffected == 0 || !access.IsActive {
		return Principal{}, ErrUnauthorized
	}
	if !access.HasPermission {
		return Principal{}, ErrForbidden
	}
	return Principal{UserID: userID, ExpiresAt: claims.ExpiresAt.Time}, nil
}
