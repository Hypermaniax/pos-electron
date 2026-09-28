# POS Site Server (Track Backend, Test)

Backend Site Server untuk POS Parkir. Berada di track terpisah dari aplikasi Electron dan **belum dihubungkan** ke frontend. Kontrak mengikuti `requirements.md` bagian 7.1 dan tipe di `../src/shared/types.ts`.

Stack: Express 5 + TypeScript + PostgreSQL via Prisma ORM (driver adapter `@prisma/adapter-pg`).

## Menjalankan

```bash
cd server
cp .env.example .env
npm install
npm run setup   # prisma generate + prisma db push + seed
npm run dev
```

Server default: `http://localhost:4000`. Semua endpoint di bawah prefix `/api/v1`.

Log berbentuk JSON via pino (`LOG_LEVEL` di `.env`). `/auth/login` dibatasi `RATE_LIMIT_LOGIN_MAX` percobaan gagal per `RATE_LIMIT_LOGIN_WINDOW_MINUTES` menit. `/health` mengembalikan 503 saat database tidak dapat dijangkau. Alur pembayaran memakai klaim kondisional (conditional update) sehingga request bersamaan tidak bisa membayar dua kali.

Skema database dikelola Prisma di `prisma/schema.prisma` (`npm run db:push` untuk sinkron, `npm run generate` setelah mengubah skema). Tidak ada migrasi SQL manual; `AUTO_MIGRATE` tidak dipakai lagi.

## Akun seed

| Username | Password | Role |
|---|---|---|
| `operator` | `operator123` | Operator |
| `supervisor` | `supervisor123` | Supervisor (semua permission) |
| `teknisi` | `teknisi123` | Teknisi |

## Autentikasi

Login mengembalikan `token` JWT. Kirim di header `Authorization: Bearer <token>`. Aksi pembayaran dan buka palang memakai header `x-idempotency-key`.

Setiap respons menyertakan header `x-correlation-id` (dapat dikirim klien untuk menelusuri aksi).

Error dikembalikan dengan HTTP status + body:

```json
{ "error": { "code": "GATE_NOT_ALLOWED", "message": "...", "correlationId": "corr_..." } }
```

## Endpoint

| Method | Path | Permission | Keterangan |
|---|---|---|---|
| GET | `/health` | — | Status server + DB |
| POST | `/auth/login` | — | Login, mengembalikan token |
| GET | `/auth/me` | auth | Profil operator |
| POST | `/auth/logout` | auth | Audit logout |
| GET | `/sessions/search` | `session.view` | `?mode=manual|scan` + `plateNumber`/`ticketNumber`/`payload` |
| GET | `/sessions/:id` | `session.view` | Detail + tagihan |
| POST | `/shifts/open` | `shift.manage` | Buka shift |
| GET | `/shifts/active` | `shift.manage` | `?deviceId=` |
| GET | `/shifts/:id/summary` | `shift.manage` | Ringkasan |
| POST | `/shifts/:id/close` | `shift.manage` | Blokir bila ada transaksi menggantung |
| POST | `/payments/cash` | `payment.cash` | Idempotency wajib |
| POST | `/payments/qr` | `payment.qr` | Buat payment intent |
| GET | `/payments/qr/:id` | `payment.qr` | Status (auto-expire) |
| POST | `/payments/qr/:id/simulate` | `payment.qr` | Simulasi gateway: `{ "result": "paid" | "failed" }` |
| POST | `/payments/qr/:id/cancel` | `payment.cancel` | Batalkan QR pending |
| POST | `/payments/emoney` | `payment.qr` | Buat intent e-money |
| GET | `/payments/emoney/:id` | `payment.qr` | Status |
| POST | `/payments/emoney/:id/tap` | `payment.qr` | Simulasi tap: `paid`/`insufficient`/`unreadable`/`failed`/`timeout` |
| POST | `/payments/emoney/:id/cancel` | `payment.cancel` | Batalkan intent |
| POST | `/gate/open` | `gate.open` | Hanya saat `PAID`, idempotency wajib |
| POST | `/gate/override` | `gate.override` | Override supervisor + alasan |
| GET | `/transactions` | `history.view` | Filter `shiftId`,`method`,`status`,`from`,`to` |
| GET | `/transactions/:id` | `history.view` | Detail |
| GET | `/transactions/:id/receipt` | `receipt.print` | Data bukti |
| POST | `/transactions/:id/cancel` | `payment.cancel` | Batalkan transaksi lunas + alasan |
| GET | `/audit` | `history.view_range` | Filter `action`,`correlationId`,`from`,`to` |

Catatan: e-money memakai permission `payment.qr` karena kontrak permission bersama belum memiliki permission khusus e-money. Ini akan dipisah saat integrasi/penyempurnaan.

## Contoh alur (curl)

```bash
BASE=http://localhost:4000/api/v1
TOKEN=$(curl -s $BASE/auth/login -H 'content-type: application/json' \
  -d '{"username":"operator","password":"operator123"}' | jq -r .token)

# cari tagihan
curl -s "$BASE/sessions/search?mode=manual&plateNumber=B%201234%20XYZ" \
  -H "authorization: Bearer $TOKEN" | jq

# bayar cash (idempotent)
curl -s $BASE/payments/cash -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -H 'x-idempotency-key: cash-demo-1' \
  -d '{"sessionId":"ses_0001","amountReceived":50000}' | jq

# buka palang (idempotent)
curl -s $BASE/gate/open -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -H 'x-idempotency-key: gate-demo-1' \
  -d '{"sessionId":"ses_0001"}' | jq
```

## Struktur

```text
prisma/
  schema.prisma           # model + mapping tabel (sumber kebenaran skema)
prisma.config.ts          # konfigurasi Prisma CLI (datasource, seed)
src/
  app.ts, index.ts        # bootstrap express
  config/env.ts           # environment
  db/                      # prisma client + seed
  generated/prisma/        # Prisma Client (hasil generate, gitignored)
  domain/                  # types, permissions, tarif, aturan status
  lib/                     # error, id, password, idempotency, validate
  middleware/              # auth, correlation, error
  routers/                 # wiring route + middleware (auth, health, sessions, shifts, payments, gate, transactions, audit)
  controllers/             # penerima HTTP + validasi zod (req/res saja)
  services/                # seluruh business logic (orkestrasi, audit, idempotency)
  repositories/            # query Prisma murni (tanpa if/for, satu operasi per fungsi)
```

## Lapisan

- **Controller** (`src/controllers/`): hanya menerima HTTP, validasi payload/query dengan zod, memanggil service, lalu mengirim respons. Tidak ada aturan bisnis.
- **Service** (`src/services/`): seluruh business logic — validasi domain, transaksi, idempotency, audit, pemetaan ke kontrak domain.
- **Repository** (`src/repositories/`): murni akses data Prisma. Satu fungsi = satu operasi query, tanpa percabangan (`if`) maupun perulangan (`for`). Semua fungsi menerima `db` (`Prisma.TransactionClient`) agar bisa dipakai di dalam `$transaction`.
- **Router** (`src/routers/`): hanya memasang path, middleware auth/permission, dan handler controller.

## Batas track

- Hanya menyentuh folder `server/`. Tidak mengubah aplikasi Electron di `fe/`.
- Tipe kontrak disalin lokal di `src/domain/types.ts` agar tidak ada impor runtime lintas track.
