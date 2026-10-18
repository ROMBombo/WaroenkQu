// Package config membaca konfigurasi dari environment variable.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
)

type Config struct {
	Port            int
	PostgresDSN     string
	RabbitMQURL     string
	JWTAccessSecret string
	StockLowQueue   string
	PrefetchCount   int
}

// Load membaca env. Mengembalikan error kalau ada env wajib yang kosong atau tidak valid.
func Load() (Config, error) {
	var missing []string
	required := func(name string) string {
		value := os.Getenv(name)
		if value == "" {
			missing = append(missing, name)
		}
		return value
	}

	host := required("POSTGRES_HOST")
	db := required("POSTGRES_DB")
	user := required("POSTGRES_USER")
	password := required("POSTGRES_PASSWORD")
	rabbitURL := required("RABBITMQ_URL")
	secret := required("JWT_ACCESS_SECRET")
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("environment variable wajib diisi: %v", missing)
	}

	port, err := positiveInt("PORT", 3001)
	if err != nil {
		return Config{}, err
	}
	pgPort, err := positiveInt("POSTGRES_PORT", 5432)
	if err != nil {
		return Config{}, err
	}

	timezone := os.Getenv("TZ")
	if timezone == "" {
		timezone = "Asia/Jakarta"
	}

	dsn := (&url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, password),
		Host:     fmt.Sprintf("%s:%d", host, pgPort),
		Path:     db,
		RawQuery: url.Values{"sslmode": {"disable"}, "TimeZone": {timezone}}.Encode(),
	}).String()

	return Config{
		Port:            port,
		PostgresDSN:     dsn,
		RabbitMQURL:     rabbitURL,
		JWTAccessSecret: secret,
		StockLowQueue:   "stock.low",
		PrefetchCount:   10,
	}, nil
}

func positiveInt(name string, fallback int) (int, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("environment variable %s harus angka positif, didapat %q", name, raw)
	}
	return value, nil
}
