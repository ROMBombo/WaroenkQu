# WaroenkQu

WaroenkQu adalah aplikasi warung sederhana. Owner mengelola produk lewat webapp, kasir melayani transaksi, dan owner mendapat notifikasi kalau stok produk mulai menipis.

Prinsip utama sistem ini: **semua perubahan data produk oleh owner baru berlaku di kasir setelah katalog dipublish (H+1)**. Satu-satunya pengecualian adalah **stok**, yang selalu realtime.

---

## Arsitektur

```
┌───────────────┐
│  Owner/Kasir  │
└───────┬───────┘
        │
        ▼
┌───────────────┐      WebSocket      ┌──────────────────────┐
│    Webapp     │◄────────────────────│ Notification Service │
└───────┬───────┘                     └──────────▲───────────┘
        │ HTTP                                   │ consume
        ▼                                        │
┌───────────────┐       publish       ┌──────────┴───────────┐
│ API Services  │────────────────────►│       RabbitMQ       │
└───┬───────┬───┘                     └──────────────────────┘
    │       │
    │       │ baca katalog
    │       ▼
    │   ┌───────────┐   tulis    ┌───────────────────┐
    │   │   Redis   │◄───────────│ Catalog Publisher │
    │   └───────────┘            └─────────┬─────────┘
    │                                      │ tiap n detik (n mewakili 1 hari):
    │ CRUD produk, stok,                   │ baca produk, simpan katalog,
    │ transaksi, notifikasi                │ update status publish
    ▼                                      │
┌──────────────┐                           │
│  PostgreSQL  │◄──────────────────────────┘
└──────────────┘
```

Catatan diagram:
- Notification Service juga menyimpan notifikasi ke PostgreSQL (garis tidak digambar agar diagram tetap rapi).
- API Services tidak langsung mengirim pesan ke RabbitMQ saat transaksi. Pesan disimpan dulu di tabel `outbox_messages`, lalu dikirim oleh **outbox worker** yang berjalan di dalam API Services (lihat [Outbox worker](#outbox-worker)).

### Daftar service

| No | Service | Peran singkat |
|----|---------|---------------|
| 1 | Webapp | Aplikasi sebagai media interaksi untuk owner dan kasir |
| 2 | API Services | Pintu masuk semua proses dari webapp. Juga menjalankan outbox worker yang mengirim pesan ke RabbitMQ |
| 3 | PostgreSQL | Database utama |
| 4 | Redis | Katalog produk yang berlaku hari ini, dipakai kasir |
| 5 | Catalog Publisher | Menyalin produk aktif dari PostgreSQL menjadi katalog di Redis secara berkala (setiap "hari") |
| 6 | RabbitMQ | Antrean pesan stok menipis |
| 7 | Notification Service | Membuat notifikasi stok menipis dan mengirimnya ke owner |

---

## Alur Data

Bagian ini menjelaskan data apa yang ada di mana, siapa yang menulis, dan siapa yang membaca. Alur langkah demi langkah per skenario ada di bagian [Alur Utama](#alur-utama).

### Peta data

| Data | Disimpan di | Ditulis oleh | Dibaca oleh |
|------|-------------|--------------|-------------|
| Produk (nama, harga, stok, stok minimum, status) | PostgreSQL `products` | API Services (owner), API Services (stok, saat transaksi) | API Services (owner, transaksi), Catalog Publisher |
| History produk | PostgreSQL `product_histories` | Trigger database pada `products` | API Services (owner) |
| Katalog (snapshot produk aktif) | PostgreSQL `catalog_publishes` | Catalog Publisher | API Services (owner: history katalog) |
| Katalog yang berlaku hari ini | Redis key `catalog:current` | Catalog Publisher | API Services (kasir: katalog & transaksi) |
| Transaksi | PostgreSQL `transactions`, `transaction_items` | API Services (kasir) | API Services (owner & kasir: history transaksi) |
| Pesan stok menipis (antrean kirim) | PostgreSQL `outbox_messages` | API Services (saat transaksi) | Outbox worker (di API Services) |
| Pesan stok menipis | RabbitMQ queue `stock.low` | Outbox worker (di API Services) | Notification Service |
| Notifikasi | PostgreSQL `notifications` | Notification Service | API Services (owner) |
| Notifikasi realtime | WebSocket event `notification.created` | Notification Service | Webapp (owner) |
| User, role, permission | PostgreSQL `users`, `roles`, `permissions`, `role_permissions` | Seed data | API Services (login & cek akses) |
| Refresh token | PostgreSQL `refresh_tokens` | API Services (login & refresh) | API Services (refresh) |

### Kapan perubahan terlihat

| Aksi owner | Di halaman owner | Di kasir | `publish_status` produk |
|------------|------------------|----------|-------------------------|
| Tambah produk | Langsung | Setelah publish berikutnya | `PENDING` |
| Ubah nama / harga / stok minimum | Langsung | Setelah publish berikutnya | `PENDING` |
| Aktifkan / nonaktifkan | Langsung | Setelah publish berikutnya | `PENDING` |
| Hapus produk | Langsung hilang dari list | Setelah publish berikutnya | `PENDING` |
| Tambah / kurang stok | Langsung | **Langsung** | Tidak berubah |

Setelah Catalog Publisher berjalan, semua produk `PENDING` menjadi `PUBLISHED`.

### Titik pengecekan (untuk automation)

| Komponen | Yang bisa dicek |
|----------|-----------------|
| API Services | Status code, body response, pesan error |
| PostgreSQL | Isi tabel `products`, `product_histories`, `transactions`, `transaction_items`, `outbox_messages`, `notifications`, `catalog_publishes` |
| Redis | Isi key `catalog:current` |
| RabbitMQ | Pesan di queue `stock.low`. RabbitMQ bisa dimatikan dan dinyalakan untuk menguji pengiriman ulang |
| WebSocket | Event `notification.created` yang diterima webapp owner |
| Catalog Publisher | Interval diatur lewat `CATALOG_PUBLISH_INTERVAL` supaya "hari berikutnya" bisa disimulasikan dalam hitungan detik |

---

## Komponen dan Fiturnya

### 1. Webapp

Satu aplikasi dengan dua role. Setiap user login dengan username dan password, lalu menu yang tampil menyesuaikan role-nya.

- **Teknologi:** SvelteKit (SPA) dengan komponen [shadcn-svelte](https://shadcn-svelte.com) dan Tailwind CSS, disajikan oleh nginx di `http://localhost:8080`.
- **Akses ke backend:** nginx meneruskan `/api/*` ke API Services dan `/ws` ke Notification Service, jadi webapp dan backend berada di satu origin.
- **Sesi:** access token yang kedaluwarsa di-refresh otomatis. Kalau refresh gagal, user diarahkan ke halaman login.
- **Selector untuk automation:** elemen penting punya atribut `data-testid` (misalnya `login-username`, `product-row`, `pos-pay-button`, `notification-bell`).

**Role Owner**
- Melihat daftar produk, dengan pencarian berdasarkan nama. Setiap produk menampilkan status (Aktif / Nonaktif) dan status publish (Menunggu publish / Sudah publish).
- Menambah produk.
- Mengubah produk (nama, harga, stok minimum).
- Mengaktifkan dan menonaktifkan produk.
- Menghapus produk.
- Menambah stok dan mengurangi stok produk (pengurangan wajib disertai catatan).
- Melihat history perubahan produk.
- Melihat waktu publish katalog terakhir dan berikutnya, serta history katalog.
- Melihat history transaksi semua kasir beserta detailnya.
- Menerima notifikasi stok menipis secara realtime (ikon lonceng dengan jumlah notifikasi belum dibaca).
- Membuka notifikasi dan menandainya sebagai sudah dibaca.

Setiap kali owner berhasil menambah, mengubah, mengaktifkan, menonaktifkan, atau menghapus produk, webapp menampilkan pesan:

> Perubahan berhasil disimpan dan akan berlaku di kasir mulai **dd-mm-yyyy hh:mm:ss** (publish katalog berikutnya).

Waktu tersebut diambil dari field `meta.effective_at` di response API (`null` kalau katalog belum pernah dipublish). Pesan ini tidak muncul untuk tambah/kurang stok, karena stok langsung berlaku.

**Role Kasir**
- Saat halaman transaksi dibuka, webapp memanggil `GET /v1/catalog` **satu kali**, lalu menyimpan katalog di state. Selama halaman terbuka, form transaksi memakai katalog dari state tersebut.
- Membuat transaksi:
  - Memilih produk lewat select yang bisa dicari berdasarkan nama, lalu mengisi jumlahnya. Bisa menambah beberapa baris produk. Produk yang sama tidak bisa dipilih dua kali.
  - Webapp menghitung subtotal tiap baris dan total belanja dari harga di katalog.
  - Mengisi uang yang dibayar pembeli. Webapp menampilkan kembalian (`uang dibayar − total`). Tombol bayar tidak aktif kalau uang dibayar kurang dari total.
- Melihat hasil transaksi: berhasil (beserta total, uang dibayar, dan kembalian) atau gagal (beserta alasannya).
- Melihat history transaksi yang dibuatnya sendiri beserta detailnya.
- Kalau katalog di state sudah usang (sudah ada publish baru), transaksi ditolak. Webapp memuat ulang katalog dan meminta kasir mengecek ulang transaksinya.

### 2. API Services

Penghubung antara webapp dengan PostgreSQL, Redis, dan RabbitMQ.

Ketentuan umum:
- Semua endpoint kecuali login dan refresh membutuhkan `access_token` di header `Authorization: Bearer <token>`. API Services mengecek apakah role user punya permission untuk endpoint tersebut (lihat [Data awal role dan permission](#data-awal-role-dan-permission)).
- Semua waktu memakai zona waktu **UTC+7 (Asia/Jakarta)**. Database menyimpan `TIMESTAMPTZ`, dan API menampilkan waktu dalam UTC+7 (format dd-mm-yyyy hh:mm:ss untuk field yang ditampilkan ke user).
- Semua endpoint GET yang mengembalikan list memakai pagination.
- Request dan response memakai JSON dengan nama field snake_case.
- Response sukses selalu berbentuk `{ "data": ..., "meta": ... }`. `meta` hanya ada di list (info pagination) dan di perubahan produk (`effective_at`).
- Response error selalu berbentuk `{ "error": { "code", "message", "details" } }`. `details` berisi info tambahan, misalnya daftar field yang tidak valid.
- Untuk status 401, 403, 500, dan 503, serta error dari framework (JSON rusak, route tidak ada, body terlalu besar), `message` selalu teks standar HTTP (`Unauthorized`, `Forbidden`, `Internal Server Error`, `Service Unavailable`, dst.) tanpa `details`. Alasan detailnya sengaja tidak dikirim ke client. `code` tetap menunjukkan jenis error-nya.
- Field yang tidak dikenal di body request ditolak dengan `400`, misalnya `stock` di body PUT produk.
- Field waktu di response memakai format ISO 8601 dengan offset `+07:00`, kecuali `publish-info` yang memakai format tampilan dd-mm-yyyy hh:mm:ss.
- Detail request, response, dan pagination tiap endpoint ada di dokumentasi Swagger: `http://localhost:3000/docs`.

**/v1/auth/login** (semua role, data dari PostgreSQL)
- post : login dengan username dan password. Mengembalikan `access_token` (berlaku 30 menit), `refresh_token` (berlaku 7 hari), role, dan permission user

**/v1/auth/refresh** (semua role, data dari PostgreSQL)
- post : menukar `refresh_token` yang masih berlaku dengan `access_token` dan `refresh_token` baru

**/v1/product-management** (role owner, data dari PostgreSQL)
- post : menambahkan produk. Body `{ "name", "price", "stock", "min_stock" }`. Produk baru otomatis aktif dengan `publish_status` `PENDING`. Response berisi `meta.effective_at`
- get : melihat list produk yang belum dihapus, bisa dicari berdasarkan nama. Setiap produk berisi `is_active` dan `publish_status`

**/v1/product-management/{id}** (role owner, data dari PostgreSQL)
- get : melihat detail produk
- put : mengubah produk. Body `{ "name", "price", "min_stock" }`. Response berisi `meta.effective_at`
- delete : menghapus produk (soft delete). Response berisi `meta.effective_at`

**/v1/product-management/{id}/status** (role owner, data dari PostgreSQL)
- patch : mengaktifkan atau menonaktifkan produk. Body `{ "is_active": true }` atau `{ "is_active": false }`. Response berisi `meta.effective_at`

**/v1/product-management/{id}/stock-in** (role owner, data dari PostgreSQL)
- post : menambah stok. Body `{ "quantity": 10, "note": "Restock dari supplier" }` (`note` opsional). Stok baru = stok + quantity

**/v1/product-management/{id}/stock-out** (role owner, data dari PostgreSQL)
- post : mengurangi stok. Body `{ "quantity": 3, "note": "Barang rusak" }` (`note` wajib). Stok baru = stok − quantity. Ditolak kalau hasilnya negatif

**/v1/product-management/{id}/history** (role owner, data dari PostgreSQL)
- get : melihat list history perubahan satu produk, diurutkan dari yang terbaru. Tetap bisa diakses untuk produk yang sudah dihapus

**/v1/catalog** (role kasir, data dari Redis)
- get : melihat katalog yang berlaku saat ini. Response `{ "catalog_publish_id", "published_at", "products": [{ "id", "name", "price" }] }`

**/v1/catalog-management/publish-info** (role owner, data dari PostgreSQL)
- get : melihat waktu publish katalog terakhir dan berikutnya, dengan format dd-mm-yyyy hh:mm:ss

**/v1/catalog-management/history** (role owner, data dari PostgreSQL)
- get : melihat list history katalog (waktu publish dan jumlah produk di tiap katalog)

**/v1/catalog-management/history/{id}** (role owner, data dari PostgreSQL)
- get : melihat isi katalog pada satu waktu publish (produk dan harga yang berlaku saat itu)

**/v1/transactions** (role kasir, data dari Redis dan PostgreSQL)
- post : membuat transaksi. Body:
  ```json
  {
    "catalog_publish_id": "9b2d...",
    "items": [
      { "product_id": "3f1c...", "quantity": 2 },
      { "product_id": "a7e4...", "quantity": 1 }
    ],
    "paid_amount": 20000
  }
  ```
  Response sukses berisi `transaction_id`, `items` (beserta harga dan subtotal), `total`, `paid_amount`, dan `change_amount`. Detail prosesnya ada di [Kasir membuat transaksi](#kasir-membuat-transaksi).
- get : melihat list history transaksi (waktu, kasir, total, uang dibayar, kembalian), diurutkan dari yang terbaru. Owner melihat transaksi semua kasir, kasir hanya melihat transaksi yang dibuatnya sendiri

**/v1/transactions/{id}** (role owner dan kasir, data dari PostgreSQL)
- get : melihat detail satu transaksi beserta item-itemnya (nama produk, jumlah, harga, subtotal). Kasir hanya bisa membuka transaksi yang dibuatnya sendiri

**/v1/notifications** (role owner, data dari PostgreSQL)
- get : melihat list notifikasi beserta jumlah yang belum dibaca

**/v1/notifications/{id}/read** (role owner, data dari PostgreSQL)
- patch : menandai notifikasi sebagai sudah dibaca

#### Kode error

| HTTP | Kode | Kapan |
|------|------|-------|
| 400 | `VALIDATION_ERROR` | Field wajib kosong, format salah, nilai di luar batas, field tidak dikenal, ID bukan UUID, produk dobel di satu transaksi, uang dibayar kurang dari total |
| 401 | `UNAUTHORIZED` | Tanpa token, token tidak valid atau kedaluwarsa, user sudah nonaktif, atau login gagal |
| 403 | `FORBIDDEN` | Role tidak punya permission untuk endpoint tersebut |
| 404 | `PRODUCT_NOT_FOUND` | Produk tidak ada atau sudah dihapus (endpoint product-management, kecuali `/history` yang tetap bisa diakses untuk produk yang sudah dihapus) |
| 404 | `NOTIFICATION_NOT_FOUND` | Notifikasi tidak ada |
| 404 | `TRANSACTION_NOT_FOUND` | Transaksi tidak ada, atau kasir membuka transaksi milik kasir lain |
| 409 | `DUPLICATE_PRODUCT_NAME` | Nama produk sudah dipakai produk lain yang belum dihapus |
| 409 | `CATALOG_OUTDATED` | `catalog_publish_id` di request transaksi berbeda dengan katalog di Redis |
| 422 | `PRODUCT_NOT_IN_CATALOG` | Produk di transaksi tidak ada di katalog Redis |
| 422 | `INSUFFICIENT_STOCK` | Stok tidak cukup saat transaksi atau saat kurang stok |
| 404 | `CATALOG_NOT_FOUND` | History katalog dengan ID tersebut tidak ada |
| 413 | `PAYLOAD_TOO_LARGE` | Body request terlalu besar |
| 500 | `INTERNAL_SERVER_ERROR` | Error tak terduga di server |
| 503 | `CATALOG_NOT_AVAILABLE` | Katalog belum ada di Redis (Catalog Publisher belum pernah berjalan) |

#### Outbox worker

Background worker yang berjalan di dalam API Services (bukan service terpisah). Tugasnya memastikan setiap pesan stok menipis **pasti terkirim** ke RabbitMQ, walaupun RabbitMQ sedang mati.

1. Setiap `OUTBOX_POLL_INTERVAL` (default 1 detik), worker mengambil row `outbox_messages` dengan `status = 'PENDING'` dan `next_attempt_at <= now()`, memakai `SELECT ... FOR UPDATE SKIP LOCKED` (aman kalau API Services berjalan lebih dari satu instance).
2. Mengirim `payload` ke queue tujuan sebagai pesan persistent, lalu menunggu konfirmasi RabbitMQ (publisher confirm).
3. Kalau berhasil: `status = 'SENT'`, `sent_at = now()`.
4. Kalau gagal (RabbitMQ mati atau tidak mengonfirmasi): `status` tetap `PENDING`, `attempts` bertambah, `last_error` diisi, dan `next_attempt_at` dimundurkan dengan jeda yang makin lama (1, 2, 4, 8, ... detik, maksimal 60 detik). Tidak ada batas jumlah percobaan.

Karena pesan tersimpan di database, pesan tidak hilang walaupun API Services restart. Worker melanjutkan pengiriman saat API Services hidup lagi.

### 3. PostgreSQL

Database utama. Berikut detail schema-nya.

```
products 1───* transaction_items *───1 transactions
products 1───* notifications *───1 catalog_publishes
products 1───* product_histories
catalog_publishes 1───* transactions
catalog_publishes.products = snapshot produk dalam kolom JSONB (tanpa FK)

roles 1───* users
roles 1───* role_permissions *───1 permissions
users 1───* refresh_tokens
users 1───* transactions        (kasir yang membuat transaksi)
users 1───* product_histories   (owner yang melakukan perubahan)
```

#### Tabel `products`
Data produk yang dikelola owner.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | Kode produk |
| name | VARCHAR(50) | NOT NULL | Nama produk, unik di antara produk yang belum dihapus |
| price | INTEGER | NOT NULL, CHECK (price BETWEEN 100 AND 1000000) | Harga dalam Rupiah |
| stock | INTEGER | NOT NULL, CHECK (stock >= 0) | Stok saat ini (realtime) |
| min_stock | INTEGER | NOT NULL, CHECK (min_stock >= 0) | Batas stok minimum |
| is_active | BOOLEAN | NOT NULL, default `true` | Status aktif / nonaktif |
| publish_status | VARCHAR(10) | NOT NULL, default `'PENDING'`, CHECK (publish_status IN ('PENDING', 'PUBLISHED')) | `PENDING` = ada perubahan yang belum masuk katalog. `PUBLISHED` = kondisi produk sudah sama dengan katalog yang berlaku |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu dibuat |
| updated_at | TIMESTAMPTZ | NULL | Waktu terakhir diubah. `NULL` saat baru dibuat, diisi `now()` oleh trigger setiap ada perubahan |
| deleted_at | TIMESTAMPTZ | NULL | Diisi saat soft delete. `NULL` berarti belum dihapus |

Index:
- `idx_products_name` pada `name` (pencarian berdasarkan nama).
- `uq_products_name_active` UNIQUE pada `lower(name)` WHERE `deleted_at IS NULL` (nama unik tanpa membedakan huruf besar/kecil, produk yang sudah dihapus tidak dihitung).

**Trigger pada `products`**

API Services hanya menulis ke tabel `products`. Pengisian `updated_at`, `publish_status`, dan history dilakukan oleh trigger database:

1. **`trg_products_before_update`** (BEFORE UPDATE)
   - Kalau salah satu kolom `name`, `price`, `stock`, `min_stock`, `is_active`, atau `deleted_at` berubah, `updated_at` diisi `now()`.
   - Kalau salah satu kolom yang masuk katalog berubah (`name`, `price`, `min_stock`, `is_active`, `deleted_at`), `publish_status` diisi `PENDING`. Perubahan `stock` tidak mengubah `publish_status`.
2. **`trg_products_history`** (AFTER INSERT OR UPDATE)
   - Hanya mencatat history kalau session variable `app.changed_by` terisi. API Services mengisinya (`SET LOCAL app.changed_by = '<id owner>'`) hanya di endpoint product-management. Transaksi kasir dan Catalog Publisher tidak mengisinya, jadi tidak membuat history.
   - Untuk tambah/kurang stok, API Services juga mengisi `SET LOCAL app.note = '<note>'`.
   - Jenis action ditentukan dari perbandingan `OLD` dan `NEW`:

     | Kondisi | Action |
     |---------|--------|
     | INSERT | `CREATE` |
     | `deleted_at` berubah dari `NULL` menjadi terisi | `DELETE` |
     | `is_active` berubah `false` → `true` | `ACTIVATE` |
     | `is_active` berubah `true` → `false` | `DEACTIVATE` |
     | `stock` bertambah | `STOCK_IN` (quantity = `NEW.stock − OLD.stock`) |
     | `stock` berkurang | `STOCK_OUT` (quantity = `OLD.stock − NEW.stock`) |
     | `name`, `price`, atau `min_stock` berubah | `UPDATE` |
     | Tidak ada kolom yang berubah | Tidak ada history |

   Setiap endpoint hanya mengubah satu kelompok kolom, jadi satu request menghasilkan paling banyak satu row history.

#### Tabel `product_histories`
Riwayat perubahan produk oleh owner, diisi oleh trigger `trg_products_history`. Setiap row berisi kondisi produk **setelah** perubahan. Kondisi sebelum perubahan bisa dilihat dari row sebelumnya.

Kolom `stock` di history adalah stok saat owner melakukan perubahan. Pengurangan stok oleh kasir tidak dicatat di sini karena sudah tercatat di `transaction_items`.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID history |
| product_id | UUID | NOT NULL, FK → `products.id` | Produk terkait |
| action | VARCHAR(10) | NOT NULL, CHECK (action IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'STOCK_IN', 'STOCK_OUT', 'DELETE')) | Jenis perubahan |
| quantity | INTEGER | NULL, CHECK (quantity > 0) | Jumlah stok yang ditambah/dikurangi. Hanya diisi untuk `STOCK_IN` dan `STOCK_OUT` |
| note | TEXT | NULL | Catatan bebas dari owner. Wajib untuk `STOCK_OUT`, opsional untuk `STOCK_IN`, kosong untuk action lain |
| name | VARCHAR(50) | NOT NULL | Nama setelah perubahan |
| price | INTEGER | NOT NULL | Harga setelah perubahan |
| stock | INTEGER | NOT NULL | Stok setelah perubahan |
| min_stock | INTEGER | NOT NULL | Stok minimum setelah perubahan |
| is_active | BOOLEAN | NOT NULL | Status setelah perubahan |
| changed_by | UUID | NOT NULL, FK → `users.id` | Owner yang melakukan perubahan |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu perubahan |

Index: `idx_product_histories_product_id_created_at` pada (`product_id`, `created_at`) (list history satu produk).

#### Tabel `transactions`
Header transaksi kasir.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID transaksi |
| cashier_id | UUID | NOT NULL, FK → `users.id` | Kasir yang membuat transaksi |
| catalog_publish_id | UUID | NOT NULL, FK → `catalog_publishes.id` | Katalog yang dipakai saat transaksi |
| total | BIGINT | NOT NULL, CHECK (total > 0) | Total belanja dalam Rupiah |
| paid_amount | BIGINT | NOT NULL, CHECK (paid_amount >= total) | Uang yang dibayar pembeli |
| change_amount | BIGINT | NOT NULL, CHECK (change_amount = paid_amount - total) | Kembalian |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu transaksi |

#### Tabel `transaction_items`
Detail produk dalam satu transaksi. Nama dan harga diambil dari katalog Redis saat transaksi, jadi tidak ikut berubah kalau produk diubah setelahnya.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID item |
| transaction_id | UUID | NOT NULL, FK → `transactions.id` ON DELETE CASCADE | Transaksi induk |
| product_id | UUID | NOT NULL, FK → `products.id` | Produk yang dibeli |
| product_name | VARCHAR(50) | NOT NULL | Nama produk dari katalog Redis |
| quantity | INTEGER | NOT NULL, CHECK (quantity > 0) | Jumlah dibeli |
| price | INTEGER | NOT NULL | Harga dari katalog Redis dalam Rupiah |
| subtotal | BIGINT | NOT NULL, CHECK (subtotal = quantity * price) | `quantity × price` |

Unique: (`transaction_id`, `product_id`).

#### Tabel `notifications`
Notifikasi stok menipis untuk owner, ditulis oleh Notification Service.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID notifikasi |
| product_id | UUID | NOT NULL, FK → `products.id` | Produk terkait |
| catalog_publish_id | UUID | NOT NULL, FK → `catalog_publishes.id` | Katalog (hari) yang berlaku saat notifikasi dibuat |
| message | TEXT | NOT NULL | Isi pesan, contoh: "Stok Indomie Goreng tersisa 9 (minimum 10)" |
| is_read | BOOLEAN | NOT NULL, default `false` | Status sudah/belum dibaca |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu notifikasi dibuat |
| read_at | TIMESTAMPTZ | NULL | Waktu ditandai sudah dibaca |

Unique: (`product_id`, `catalog_publish_id`). Satu produk maksimal punya satu notifikasi per katalog (per hari). Notification Service menyimpan dengan `INSERT ... ON CONFLICT DO NOTHING`, dan hanya mengirim WebSocket kalau row benar-benar tersimpan.

Index: `idx_notifications_is_read` pada `is_read` (hitung jumlah belum dibaca).

#### Tabel `outbox_messages`
Antrean pesan yang akan dikirim ke RabbitMQ. Ditulis oleh API Services dalam DB transaction yang sama dengan transaksi kasir, lalu dikirim oleh [outbox worker](#outbox-worker).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID pesan |
| queue | VARCHAR(50) | NOT NULL | Queue tujuan, contoh: `stock.low` |
| payload | JSONB | NOT NULL | Isi pesan (lihat contoh di [RabbitMQ](#6-rabbitmq)) |
| status | VARCHAR(10) | NOT NULL, default `'PENDING'`, CHECK (status IN ('PENDING', 'SENT')) | `PENDING` = belum terkirim, `SENT` = sudah dikonfirmasi RabbitMQ |
| attempts | INTEGER | NOT NULL, default `0` | Jumlah percobaan kirim |
| last_error | TEXT | NULL | Error dari percobaan terakhir yang gagal |
| next_attempt_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu paling cepat untuk dicoba lagi |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu pesan dibuat |
| sent_at | TIMESTAMPTZ | NULL | Waktu berhasil terkirim |

Index: `idx_outbox_messages_pending` pada `next_attempt_at` WHERE `status = 'PENDING'` (ambil pesan yang siap dikirim).

#### Tabel `catalog_publishes`
Riwayat setiap kali Catalog Publisher berjalan. Setiap row menyimpan snapshot katalog lengkap. Row terbaru adalah katalog yang sedang berlaku di Redis.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID publish |
| published_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu publish |
| products | JSONB | NOT NULL, default `'[]'` | Array produk aktif dan belum dihapus saat publish (id, nama, harga, stok minimum) |

Index: `idx_catalog_publishes_published_at` pada `published_at` (ambil publish terbaru & urutkan history).

Contoh isi kolom `products`:

```json
[
  { "id": "3f1c2a9e-8b7d-4c6a-9e21-5d4b3a2f1e00", "name": "Indomie Goreng", "price": 3500, "min_stock": 10 },
  { "id": "a7e4b1c2-0d3f-4e5a-8b6c-7d9e0f1a2b3c", "name": "Teh Botol", "price": 5000, "min_stock": 5 }
]
```

- Jumlah produk di tiap katalog (untuk `/v1/catalog-management/history`) dihitung dengan `jsonb_array_length(products)`.
- Isi katalog pada satu waktu publish (untuk `/v1/catalog-management/history/{id}`) diambil langsung dari kolom `products`.
- Waktu publish berikutnya (`effective_at`) dihitung dari `published_at` terakhir + `CATALOG_PUBLISH_INTERVAL`.

#### Tabel `users`
Akun yang bisa login ke webapp. Akun owner dan kasir untuk pengujian dibuat lewat seed `api-services/seeds/0002_users.sql`.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID user |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Username untuk login |
| password_hash | VARCHAR(255) | NOT NULL | Hash password (bcrypt), password asli tidak disimpan |
| name | VARCHAR(100) | NOT NULL | Nama lengkap |
| role_id | UUID | NOT NULL, FK → `roles.id` | Role user (satu user satu role) |
| is_active | BOOLEAN | NOT NULL, default `true` | User nonaktif tidak bisa login |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu dibuat |
| updated_at | TIMESTAMPTZ | NULL | Waktu terakhir diubah |

#### Tabel `refresh_tokens`
Refresh token yang pernah diterbitkan. Disimpan supaya refresh token lama bisa dinyatakan tidak berlaku setelah dipakai.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID token |
| user_id | UUID | NOT NULL, FK → `users.id` | Pemilik token |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE | Hash refresh token, token asli tidak disimpan |
| expires_at | TIMESTAMPTZ | NOT NULL | Waktu kedaluwarsa (7 hari setelah dibuat) |
| used_at | TIMESTAMPTZ | NULL | Diisi saat token dipakai untuk refresh. Token yang sudah terisi `used_at` tidak bisa dipakai lagi |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` | Waktu dibuat |

`access_token` tidak disimpan di database (stateless, berisi user id, role, dan waktu kedaluwarsa).

#### Tabel `roles`
Daftar role.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID role |
| code | VARCHAR(50) | NOT NULL, UNIQUE | Kode role, contoh: `OWNER`, `CASHIER` |
| name | VARCHAR(100) | NOT NULL | Nama role, contoh: "Owner", "Kasir" |

#### Tabel `permissions`
Daftar aksi yang bisa diberikan ke role.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID permission |
| code | VARCHAR(100) | NOT NULL, UNIQUE | Kode permission, contoh: `product:create` |
| description | VARCHAR(255) | NULL | Penjelasan singkat |

#### Tabel `role_permissions`
Penghubung role dan permission (many-to-many). Satu role punya banyak permission, dan satu permission bisa dimiliki banyak role.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | UUID | PK, default `gen_random_uuid()` | ID role permission |
| role_id | UUID | NOT NULL, FK → `roles.id` ON DELETE CASCADE | Role |
| permission_id | UUID | NOT NULL, FK → `permissions.id` ON DELETE CASCADE | Permission |

Unique: (`role_id`, `permission_id`).

#### Data awal role dan permission

| Permission | Endpoint | OWNER | CASHIER |
|------------|----------|:-----:|:-------:|
| `product:read` | GET `/v1/product-management`, GET `/v1/product-management/{id}` | ✓ | |
| `product:create` | POST `/v1/product-management` | ✓ | |
| `product:update` | PUT `/v1/product-management/{id}` | ✓ | |
| `product-status:update` | PATCH `/v1/product-management/{id}/status` | ✓ | |
| `product:delete` | DELETE `/v1/product-management/{id}` | ✓ | |
| `product-stock:update` | POST `/v1/product-management/{id}/stock-in`, POST `/v1/product-management/{id}/stock-out` | ✓ | |
| `product-history:read` | GET `/v1/product-management/{id}/history` | ✓ | |
| `catalog-management:read` | GET `/v1/catalog-management/*` | ✓ | |
| `catalog:read` | GET `/v1/catalog` | | ✓ |
| `transaction:create` | POST `/v1/transactions` | | ✓ |
| `transaction:read` | GET `/v1/transactions`, GET `/v1/transactions/{id}` | ✓ (semua transaksi) | ✓ (transaksi sendiri) |
| `notification:read` | GET `/v1/notifications` | ✓ | |
| `notification:update` | PATCH `/v1/notifications/{id}/read` | ✓ | |

### 4. Redis

Menyimpan **katalog yang berlaku hari ini** di key `catalog:current`. Isinya adalah salinan row `catalog_publishes` terbaru:

```json
{
  "catalog_publish_id": "9b2d4e6f-1a3c-4b5d-8e7f-0a1b2c3d4e5f",
  "published_at": "2026-10-18T07:00:00+07:00",
  "products": [
    { "id": "3f1c2a9e-8b7d-4c6a-9e21-5d4b3a2f1e00", "name": "Indomie Goreng", "price": 3500, "min_stock": 10 },
    { "id": "a7e4b1c2-0d3f-4e5a-8b6c-7d9e0f1a2b3c", "name": "Teh Botol", "price": 5000, "min_stock": 5 }
  ]
}
```

Isinya hanya berubah saat Catalog Publisher berjalan. Tujuannya supaya kasir tidak perlu membaca database untuk mendapatkan nama dan harga produk. `min_stock` dipakai API Services untuk mengecek stok menipis, tapi tidak dikirim ke webapp kasir.

### 5. Catalog Publisher

Service Python (SQLAlchemy) yang berjalan terus di container dan publish katalog secara berkala. Tugasnya:
1. Membuka satu DB transaction dan mengunci semua produk (`SELECT ... FROM products ORDER BY id FOR UPDATE`), supaya perubahan owner yang masuk di tengah proses menunggu dan masuk ke publish berikutnya. Urutan `ORDER BY id` sama dengan urutan penguncian di transaksi kasir, supaya tidak deadlock.
2. Dari produk yang terkunci, mengambil yang aktif dan belum dihapus.
3. Menyimpan satu row baru di `catalog_publishes` berisi waktu publish dan array produk (id, nama, harga, stok minimum).
4. Mengubah produk `PENDING` **yang terkunci di langkah 1** menjadi `PUBLISHED` (`WHERE id = ANY(:locked_ids) AND publish_status = 'PENDING'`), termasuk produk yang dinonaktifkan atau dihapus karena perubahannya sudah berlaku di katalog baru. Produk baru yang di-insert owner di tengah proses tidak ikut terkunci, jadi tetap `PENDING` dan masuk ke publish berikutnya.
5. Commit DB transaction.
6. Menulis ulang key `catalog:current` di Redis dengan row `catalog_publishes` tersebut. Kalau gagal, proses ini diulang sampai berhasil.

Jadwal publish dihitung dari `published_at` terakhir + `CATALOG_PUBLISH_INTERVAL`, sama dengan perhitungan `effective_at`. Setiap kali container start:
- **Belum ada katalog sama sekali**, atau **sudah lewat waktunya** → langsung publish. Jadi sejak awal selalu ada katalog di Redis dan `catalog_publishes`, karena transaksi kasir membutuhkan `catalog_publish_id`.
- **Belum waktunya** → tidak membuat katalog baru, hanya memastikan isi Redis sama dengan row `catalog_publishes` terbaru (misalnya setelah data Redis hilang). Jadi restart container tidak memajukan "hari".

Di sistem sungguhan proses ini berjalan sekali sehari (H+1). Di environment tes, proses ini berjalan **setiap n detik** dan intervalnya bisa diatur lewat environment variable `CATALOG_PUBLISH_INTERVAL`.

### 6. RabbitMQ

Antrean untuk pesan **stok menipis** di queue `stock.low`. Outbox worker di API Services menaruh pesan di sini, lalu Notification Service mengambilnya.

Queue `stock.low` dibuat **durable** dan pesannya **persistent**, jadi pesan yang belum diambil tidak hilang walaupun RabbitMQ restart.

Contoh pesan:

```json
{
  "product_id": "3f1c2a9e-8b7d-4c6a-9e21-5d4b3a2f1e00",
  "product_name": "Indomie Goreng",
  "catalog_publish_id": "9b2d4e6f-1a3c-4b5d-8e7f-0a1b2c3d4e5f",
  "stock": 9,
  "min_stock": 10
}
```

Dengan antrean ini, transaksi kasir tidak perlu menunggu notifikasi selesai dibuat. Kalau Notification Service sedang bermasalah, pesannya tetap tersimpan di queue dan diproses saat Notification Service hidup lagi.

### 7. Notification Service

Service Go (GORM) yang mengambil pesan stok menipis dan mengirim notifikasi realtime ke owner.

1. Mengambil pesan dari queue `stock.low` dengan **manual ack**.
2. Menyimpan notifikasi ke tabel `notifications` dengan `INSERT ... ON CONFLICT DO NOTHING`. Isi pesan: "Stok {nama produk} tersisa {stok} (minimum {stok minimum})".
3. Pesan di-ack setelah notifikasi tersimpan, lalu kalau row benar-benar baru, event `notification.created` dikirim ke semua koneksi WebSocket owner. Kalau tidak tersimpan (produk sudah punya notifikasi untuk katalog yang sama), pesan di-ack dan diabaikan.

Penanganan pesan:

| Kondisi | Yang terjadi |
|---------|--------------|
| Berhasil disimpan, atau sudah ada notifikasi yang sama | Ack |
| Database sedang tidak bisa diakses | Nack + requeue setelah jeda 2 detik, dicoba lagi sampai berhasil |
| Pesan rusak (bukan JSON, field wajib kosong, produk/katalog tidak ada) | Dibuang (reject tanpa requeue) dan dicatat di log, supaya queue tidak macet |
| Notification Service crash sebelum ack | RabbitMQ mengirim ulang pesan tersebut |
| Koneksi RabbitMQ putus | Menyambung ulang otomatis dengan jeda 1, 2, 4, ... detik (maksimal 30 detik) |

Kalau owner sedang tidak membuka webapp, notifikasi tetap tersimpan dan akan muncul saat owner membuka webapp lagi (`GET /v1/notifications`).

#### WebSocket

- **URL:** `ws://localhost:3001/ws?access_token=<access_token>`. Browser tidak bisa mengirim header `Authorization` saat membuka WebSocket, jadi token dikirim lewat query param.
- **Autentikasi:** token diverifikasi sebelum koneksi dibuka. User harus aktif dan role-nya punya permission `notification:read` (hanya owner).

  | Kondisi | Response |
  |---------|----------|
  | Token tidak ada, tidak valid, kedaluwarsa, atau user nonaktif | `401 {"error":{"code":"UNAUTHORIZED","message":"Unauthorized"}}` |
  | Role tidak punya `notification:read` (misalnya kasir) | `403 {"error":{"code":"FORBIDDEN","message":"Forbidden"}}` |

- **Token kedaluwarsa saat terhubung:** koneksi ditutup dengan close code `4001`. Webapp harus refresh token lalu menyambung ulang.
- **Keep-alive:** server mengirim ping setiap 54 detik. Koneksi yang tidak membalas pong dalam 60 detik ditutup.
- **Event yang dikirim server.** Isi `data` sama bentuknya dengan item di `GET /v1/notifications`:

  ```json
  {
    "event": "notification.created",
    "data": {
      "id": "2ad7d1a7-a10a-42b9-9370-bc2834f5f174",
      "product": { "id": "3f1c2a9e-8b7d-4c6a-9e21-5d4b3a2f1e00", "name": "Indomie Goreng" },
      "catalog_publish_id": "9b2d4e6f-1a3c-4b5d-8e7f-0a1b2c3d4e5f",
      "message": "Stok Indomie Goreng tersisa 10 (minimum 10)",
      "is_read": false,
      "created_at": "2026-10-18T22:37:02+07:00",
      "read_at": null
    },
    "meta": { "unread_count": 1 }
  }
  ```

- Pesan yang dikirim client ke server diabaikan.
- `GET /health` dipakai healthcheck Docker.

---

## Aturan Bisnis

### Data produk
| Field | Aturan |
|-------|--------|
| Kode | Dibuat otomatis oleh sistem (UUID), unik |
| Nama | Wajib, unik di antara produk yang belum dihapus (tidak membedakan huruf besar/kecil), maksimal 50 karakter |
| Harga | Wajib, angka bulat, Rp100 sampai Rp1.000.000 |
| Stok | Wajib saat produk dibuat (stok awal), angka bulat, minimal 0. Setelah itu hanya bisa diubah lewat tambah/kurang stok |
| Stok minimum | Wajib, angka bulat, minimal 0 |
| Status | Aktif / nonaktif. Produk baru otomatis aktif. Setelah itu hanya bisa diubah lewat aktifkan/nonaktifkan |
| Status publish | `PENDING` (Menunggu publish) / `PUBLISHED` (Sudah publish). Diatur otomatis oleh sistem |

### Berlaku H+1 (publish katalog)
- Semua perubahan produk oleh owner **langsung tersimpan** di PostgreSQL dan langsung terlihat di halaman owner.
- Kasir **baru melihat perubahan setelah Catalog Publisher berjalan**. Artinya:
  - Produk baru belum bisa dijual sebelum publish berikutnya.
  - Perubahan nama, harga, dan stok minimum belum berlaku di kasir sebelum publish berikutnya. Transaksi masih memakai nilai lama.
  - Produk yang dinonaktifkan atau dihapus **masih bisa dijual** sampai publish berikutnya, karena masih ada di katalog Redis.
  - Produk yang diaktifkan kembali baru bisa dijual setelah publish berikutnya.
- Setiap perubahan tersebut membuat `publish_status` produk menjadi `PENDING`, termasuk produk yang sebelumnya sudah `PUBLISHED`. Setelah publish, semuanya menjadi `PUBLISHED`.
- Webapp memberi tahu owner kapan perubahan berlaku (lihat [Webapp](#1-webapp)).
- **Stok selalu realtime**, karena dicek dan diubah langsung di PostgreSQL.

### Ubah produk dan status
- Ubah produk (PUT) hanya berisi nama, harga, dan stok minimum. Stok dan status tidak ada di body PUT.
- Status diubah lewat satu endpoint `PATCH /v1/product-management/{id}/status` dengan `is_active` `true` (aktifkan) atau `false` (nonaktifkan).
- Mengirim status yang sama dengan status sekarang (misalnya mengaktifkan produk yang sudah aktif) tetap **berhasil** (`200`). Karena tidak ada yang berubah, tidak ada row history baru dan `publish_status` tidak berubah.
- Hal yang sama berlaku untuk PUT dengan nilai yang sama persis dengan data sekarang.
- Produk yang sudah dihapus tidak bisa diubah, diaktifkan, dinonaktifkan, atau dihapus lagi (`404`).

### Tambah dan kurang stok
- Tambah stok: stok baru = stok + quantity.
- Kurang stok: stok baru = stok − quantity. Kalau hasilnya negatif, request **ditolak** (`422 INSUFFICIENT_STOCK`) dan stok tidak berubah.
- Quantity wajib angka bulat, minimal 1.
- Note berupa teks bebas. **Wajib** diisi saat kurang stok (misalnya "barang rusak", "kadaluarsa"), opsional saat tambah stok.
- Stok produk nonaktif tetap bisa ditambah/dikurangi. Produk yang sudah dihapus tidak bisa (`404`).
- Stok diubah secara relatif dalam satu query atomic, bukan dengan menimpa nilainya. Contoh kurang stok:
  ```sql
  UPDATE products
  SET stock = stock - :qty
  WHERE id = :id AND deleted_at IS NULL AND stock >= :qty
  RETURNING stock;
  ```
  Kalau tidak ada row yang ter-update, request ditolak. Dengan cara ini, tambah/kurang stok oleh owner dan transaksi kasir yang terjadi bersamaan tetap terhitung semua, tidak ada yang saling menimpa.
- Perubahan stok berlaku langsung (realtime) untuk owner maupun kasir, tidak menunggu publish katalog.

### History produk
- Setiap produk dibuat (`CREATE`), diubah (`UPDATE`), diaktifkan (`ACTIVATE`), dinonaktifkan (`DEACTIVATE`), ditambah stoknya (`STOCK_IN`), dikurangi stoknya (`STOCK_OUT`), atau dihapus (`DELETE`) oleh owner, satu row history disimpan di `product_histories`.
- History diisi oleh trigger database dalam DB transaction yang sama dengan perubahan produknya. Kalau salah satu gagal, keduanya dibatalkan.
- History mencatat nama, harga, stok, stok minimum, dan status setelah perubahan. Untuk `STOCK_IN` dan `STOCK_OUT`, jumlah yang ditambah/dikurangi dicatat di kolom `quantity` dan catatan owner di kolom `note`.
- Request yang ditolak, atau request yang tidak mengubah apa pun, tidak membuat row history.
- Pengurangan stok oleh transaksi kasir **tidak** masuk history.
- History hanya bisa dilihat oleh owner.

### Login dan hak akses
- Setiap user punya satu role: `OWNER` atau `CASHIER`.
- Akses ke endpoint ditentukan oleh permission yang dimiliki role (lihat [Data awal role dan permission](#data-awal-role-dan-permission)).
- Login menghasilkan dua token:
  - `access_token` berlaku **30 menit**, dipakai di setiap request.
  - `refresh_token` berlaku **7 hari**, hanya dipakai di `POST /v1/auth/refresh` untuk mendapatkan pasangan token baru.
- Setiap refresh menghasilkan `access_token` dan `refresh_token` baru. `refresh_token` lama tidak bisa dipakai lagi.
- Kalau `refresh_token` sudah kedaluwarsa atau sudah pernah dipakai, user harus login ulang.
- User yang nonaktif tidak bisa login dan tidak bisa refresh. Request dengan token milik user yang sudah dinonaktifkan juga ditolak `401`, walaupun tokennya belum kedaluwarsa.
- Request tanpa token atau dengan token tidak valid/kedaluwarsa ditolak dengan `401`. Request ke endpoint yang tidak diizinkan untuk role-nya ditolak dengan `403`.

### History transaksi
- Owner bisa melihat semua transaksi dari semua kasir.
- Kasir hanya bisa melihat transaksi yang dibuatnya sendiri. Membuka detail transaksi kasir lain menghasilkan `404 TRANSACTION_NOT_FOUND` (bukan `403`, supaya keberadaan transaksi lain tidak terlihat).
- Data transaksi tidak bisa diubah atau dihapus.

### Transaksi
- Satu transaksi berisi minimal satu produk. Satu produk hanya boleh muncul sekali dalam satu transaksi.
- Quantity tiap produk wajib angka bulat, minimal 1.
- Nama dan harga diambil dari katalog Redis, **bukan** dari request webapp. Total dihitung ulang oleh API Services.
- `catalog_publish_id` di request harus sama dengan katalog di Redis. Kalau berbeda (sudah ada publish baru sejak katalog dimuat di webapp), transaksi ditolak dengan `409 CATALOG_OUTDATED`.
- Semua produk harus ada di katalog Redis. Produk yang dinonaktifkan atau dihapus tapi masih ada di katalog tetap bisa dijual.
- Uang dibayar (`paid_amount`) wajib angka bulat dan tidak boleh kurang dari total. Kembalian = uang dibayar − total.
- Kalau stok salah satu produk tidak cukup, **seluruh transaksi ditolak** (`422 INSUFFICIENT_STOCK`) dan tidak ada stok yang berkurang.

### Notifikasi stok menipis
- Notifikasi dibuat saat transaksi membuat stok produk **sama dengan atau di bawah stok minimum**.
- Stok minimum yang dipakai adalah stok minimum dari katalog Redis (seperti harga, perubahan stok minimum oleh owner baru berlaku setelah publish berikutnya).
- Satu produk **maksimal satu notifikasi per katalog (per hari)**. Transaksi berikutnya di hari yang sama tidak membuat notifikasi baru untuk produk itu.
- Kalau di hari berikutnya stok produk masih di bawah minimum, transaksi pertama yang menyentuh produk itu membuat notifikasi baru (sebagai pengingat).
- Notifikasi hanya dipicu oleh transaksi. Kurang stok oleh owner tidak membuat notifikasi, walaupun hasilnya di bawah stok minimum.

### Jaminan pengiriman pesan stok menipis
- Pesan stok menipis **pasti terkirim**. Pesan disimpan di `outbox_messages` dalam DB transaction yang sama dengan transaksi kasir, jadi transaksi yang tersimpan pasti punya pesannya.
- Transaksi kasir **tetap berhasil** walaupun RabbitMQ atau Notification Service sedang mati.
- Kalau RabbitMQ mati, pesan tetap `PENDING` di `outbox_messages` dan dikirim ulang terus oleh outbox worker sampai berhasil.
- Kalau Notification Service mati, pesan menunggu di queue `stock.low` dan diproses saat Notification Service hidup lagi.
- Pesan yang sama bisa terkirim lebih dari sekali (misalnya worker crash setelah kirim tapi sebelum menandai `SENT`). Ini aman karena unique (`product_id`, `catalog_publish_id`) di `notifications` mencegah notifikasi dobel.

---

## Alur Utama

Contoh data yang dipakai: katalog yang berlaku adalah **K1**. Interval publish di environment tes diatur lewat `CATALOG_PUBLISH_INTERVAL`.

### Login
1. User mengisi username dan password di webapp.
2. Webapp memanggil `POST /v1/auth/login`.
3. API Services mencari user di tabel `users`, mencocokkan password dengan `password_hash`, dan memastikan user aktif.
4. Kalau cocok, API Services mengembalikan `access_token` (30 menit), `refresh_token` (7 hari), role, dan permission (dari `roles` dan `role_permissions`). Kalau tidak, `401`.
5. Webapp menampilkan menu sesuai role.
6. Saat `access_token` kedaluwarsa, request berikutnya mendapat `401`. Webapp memanggil `POST /v1/auth/refresh` dengan `refresh_token`, mendapat pasangan token baru, lalu mengulang request tadi.
7. Kalau refresh juga gagal (`refresh_token` kedaluwarsa atau sudah dipakai), webapp mengarahkan user ke halaman login.

### Owner menambah produk
1. Owner mengisi nama "Teh Pucuk", harga 4000, stok 50, stok minimum 10.
2. Webapp memanggil `POST /v1/product-management`.
3. API Services memvalidasi data (termasuk nama belum dipakai), lalu `INSERT` ke `products` dengan `is_active = true`, `publish_status = 'PENDING'`.
4. Trigger menyimpan history `CREATE`.
5. Response berisi `meta.effective_at`. Webapp menampilkan pesan bahwa produk berlaku di kasir mulai waktu tersebut.
6. Di halaman owner, Teh Pucuk langsung muncul dengan label "Menunggu publish".
7. Kasir belum bisa menjual Teh Pucuk, karena belum ada di katalog K1.
8. Catalog Publisher berjalan dan membuat katalog K2 yang berisi Teh Pucuk. `publish_status` Teh Pucuk menjadi `PUBLISHED`.
9. Kasir yang memuat katalog K2 sudah bisa menjual Teh Pucuk.

### Owner mengubah produk
1. Indomie Goreng berstatus `PUBLISHED` dengan harga Rp3.500. Owner mengubah harganya menjadi Rp4.000.
2. Webapp memanggil `PUT /v1/product-management/{id}`.
3. API Services meng-`UPDATE` `products`. Trigger mengisi `updated_at`, mengubah `publish_status` menjadi `PENDING`, dan menyimpan history `UPDATE`.
4. Webapp menampilkan pesan `effective_at`. Halaman owner langsung menampilkan Rp4.000 dengan label "Menunggu publish".
5. Transaksi kasir masih memakai Rp3.500 dari katalog K1.
6. Catalog Publisher berjalan dan membuat katalog K2 dengan harga Rp4.000. `publish_status` menjadi `PUBLISHED`.
7. Transaksi kasir dengan katalog K2 memakai Rp4.000.

### Owner menonaktifkan dan mengaktifkan produk
1. Owner menonaktifkan Teh Botol (`PATCH /v1/product-management/{id}/status` dengan `is_active: false`).
2. Trigger mengubah `publish_status` menjadi `PENDING` dan menyimpan history `DEACTIVATE`. Webapp menampilkan pesan `effective_at`.
3. Selama katalog K1 masih berlaku, kasir **masih bisa menjual** Teh Botol.
4. Catalog Publisher membuat katalog K2 tanpa Teh Botol. `publish_status` Teh Botol menjadi `PUBLISHED`.
5. Kasir dengan katalog K2 tidak bisa lagi memilih Teh Botol.
6. Owner mengirim `is_active: false` lagi. Response `200`, tidak ada history baru, `publish_status` tetap `PUBLISHED`.
7. Owner mengaktifkan kembali Teh Botol (`is_active: true`). History `ACTIVATE`, `publish_status` `PENDING`.
8. Teh Botol baru bisa dijual lagi setelah publish berikutnya (katalog K3).

### Owner menghapus produk
1. Owner menghapus Teh Botol (`DELETE /v1/product-management/{id}`).
2. API Services mengisi `deleted_at`. Trigger mengubah `publish_status` menjadi `PENDING` dan menyimpan history `DELETE`.
3. Teh Botol langsung hilang dari list produk owner. History-nya tetap bisa dilihat lewat `/history`.
4. Selama katalog yang berlaku masih berisi Teh Botol, kasir masih bisa menjualnya dan stoknya tetap berkurang.
5. Setelah publish berikutnya, Teh Botol tidak ada lagi di katalog.
6. Owner bisa membuat produk baru dengan nama "Teh Botol" lagi, karena produk lama sudah dihapus.

### Owner menambah dan mengurangi stok
1. Stok Indomie Goreng 9. Owner menambah stok 20 (`POST .../stock-in`), stok menjadi 29. Trigger menyimpan history `STOCK_IN`, quantity 20, stock 29.
2. `publish_status` tidak berubah dan tidak ada pesan `effective_at`. Kasir langsung bisa menjual dari stok 29.
3. Owner mengurangi stok 5 dengan note "Barang rusak" (`POST .../stock-out`), stok menjadi 24. History `STOCK_OUT`, quantity 5, note "Barang rusak", stock 24.
4. Owner mencoba mengurangi stok 30. Hasilnya akan negatif, jadi request ditolak (`422`), stok tetap 24, dan tidak ada history baru.
5. Owner mencoba mengurangi stok tanpa note. Request ditolak (`400`).

### Catalog Publisher berjalan
1. Sesuai interval, Catalog Publisher membuka DB transaction dan mengunci produk.
2. Membaca produk yang aktif dan belum dihapus, lalu menyimpan katalog K2 ke `catalog_publishes`.
3. Mengubah semua produk `PENDING` menjadi `PUBLISHED`, lalu commit.
4. Menulis K2 ke Redis key `catalog:current`.
5. `GET /v1/catalog-management/publish-info` menampilkan waktu publish K2 sebagai publish terakhir dan waktu publish berikutnya.
6. `GET /v1/catalog-management/history` menampilkan K2 di urutan teratas beserta jumlah produknya.

### Kasir membuat transaksi
1. Kasir membuka halaman transaksi. Webapp memanggil `GET /v1/catalog` sekali dan menyimpan katalog K1 (beserta `catalog_publish_id`) di state.
2. Kasir memilih Indomie Goreng (Rp3.500) jumlah 2 dan Teh Botol (Rp5.000) jumlah 1. Webapp menampilkan total Rp12.000.
3. Kasir mengisi uang dibayar Rp20.000. Webapp menampilkan kembalian Rp8.000.
4. Webapp memanggil `POST /v1/transactions` dengan `catalog_publish_id` K1, daftar item, dan `paid_amount` 20000.
5. API Services membaca `catalog:current` dari Redis dan memastikan `catalog_publish_id` sama dengan K1. Kalau tidak, `409 CATALOG_OUTDATED`.
6. API Services memastikan semua produk ada di katalog, lalu menghitung ulang subtotal dan total dari harga katalog, dan memastikan `paid_amount` ≥ total.
7. Dalam satu DB transaction, API Services:
   - Mengurangi stok tiap produk dengan query atomic (`stock = stock - :qty WHERE stock >= :qty`). Produk diproses berurutan berdasarkan `product_id` supaya tidak deadlock dengan transaksi lain.
   - Kalau salah satu produk stoknya tidak cukup, semua dibatalkan dan transaksi ditolak (`422 INSUFFICIENT_STOCK`).
   - Menyimpan `transactions` (total, paid_amount, change_amount, catalog_publish_id, cashier_id) dan `transaction_items`.
   - Untuk setiap produk yang stoknya sekarang ≤ `min_stock` di katalog, menyimpan satu row `outbox_messages` untuk queue `stock.low` (lihat [Stok menipis](#stok-menipis)).
8. Setelah commit, outbox worker mengirim pesan tersebut ke RabbitMQ di background. Response ke kasir tidak menunggu proses ini.
9. Response berisi total Rp12.000, uang dibayar Rp20.000, dan kembalian Rp8.000. Webapp menampilkan hasilnya.

**Variasi yang ditolak**
- Uang dibayar Rp10.000 untuk total Rp12.000: ditolak di webapp (tombol bayar tidak aktif). Kalau API dipanggil langsung, ditolak `400`.
- Stok Teh Botol tinggal 0: seluruh transaksi ditolak `422`, stok Indomie Goreng juga tidak berkurang.
- Katalog K2 sudah terbit saat kasir masih memakai K1 di state: ditolak `409`. Webapp memuat ulang katalog, menghitung ulang total, dan kasir mengecek ulang sebelum mengirim lagi.

### Melihat history transaksi
1. Kasir A membuka menu history transaksi. Webapp memanggil `GET /v1/transactions` dan hanya mendapat transaksi dengan `cashier_id` kasir A.
2. Kasir A membuka satu transaksi (`GET /v1/transactions/{id}`) dan melihat item, harga, subtotal, total, uang dibayar, dan kembalian.
3. Kasir A mencoba membuka transaksi milik kasir B. Ditolak `404 TRANSACTION_NOT_FOUND`.
4. Owner membuka menu yang sama dan mendapat transaksi semua kasir, termasuk nama kasir yang membuatnya.

### Stok menipis
1. Transaksi membuat stok Indomie Goreng turun dari 12 menjadi 9, sedangkan stok minimumnya di katalog K1 adalah 10.
2. Dalam DB transaction yang sama, API Services menyimpan row `outbox_messages` (`PENDING`) berisi `product_id`, `product_name`, `catalog_publish_id` K1, stok 9, dan stok minimum 10.
3. Outbox worker mengirim pesan ke queue `stock.low`. Setelah RabbitMQ mengonfirmasi, row outbox menjadi `SENT`.
4. Notification Service mengambil pesan, menyimpan notifikasi dengan `ON CONFLICT DO NOTHING`, lalu ack.
5. Karena notifikasi baru tersimpan, Notification Service mengirim event `notification.created` lewat WebSocket. Lonceng di halaman owner bertambah satu.
6. Transaksi berikutnya di hari yang sama (stok 9 → 7) juga membuat pesan, tapi Notification Service tidak menyimpan notifikasi baru (sudah ada untuk Indomie Goreng + K1), jadi lonceng tidak bertambah.
7. Setelah katalog K2 terbit, transaksi pertama yang membuat stok Indomie Goreng masih ≤ 10 membuat notifikasi baru.

### RabbitMQ atau Notification Service sedang mati
1. RabbitMQ dimatikan. Kasir melakukan transaksi yang membuat stok Indomie Goreng ≤ minimum.
2. Transaksi **tetap berhasil** dan kasir mendapat response normal.
3. Row `outbox_messages` tetap `PENDING`. `attempts` terus bertambah, `last_error` terisi, dan `next_attempt_at` makin mundur. Lonceng owner belum bertambah.
4. RabbitMQ dinyalakan lagi. Pada percobaan berikutnya, outbox worker berhasil mengirim dan row menjadi `SENT`.
5. Notification Service memproses pesan, dan lonceng owner bertambah satu.
6. Kalau yang dimatikan adalah Notification Service: row outbox langsung `SENT`, pesan menumpuk di queue `stock.low`. Setelah Notification Service hidup lagi, pesan diproses dan notifikasi muncul.
7. Kalau API Services restart saat masih ada row `PENDING`: setelah hidup lagi, outbox worker melanjutkan pengiriman. Tidak ada pesan yang hilang.

### Owner membaca notifikasi
1. Owner membuka webapp. Webapp memanggil `GET /v1/notifications` dan menampilkan list notifikasi beserta jumlah yang belum dibaca di lonceng.
2. Owner membuka satu notifikasi. Webapp memanggil `PATCH /v1/notifications/{id}/read`.
3. API Services mengisi `is_read = true` dan `read_at`. Jumlah belum dibaca di lonceng berkurang satu.
