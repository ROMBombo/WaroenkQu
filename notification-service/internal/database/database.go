// Package database membuka koneksi GORM ke PostgreSQL.
//
// Schema dikelola oleh migration di api-services/migrations. JANGAN memanggil AutoMigrate.
package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		// Error database sudah dicatat oleh aplikasi (slog), jadi logger GORM dimatikan supaya log tidak dobel
		Logger:  logger.Default.LogMode(logger.Silent),
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("membuka koneksi database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	return db, nil
}
