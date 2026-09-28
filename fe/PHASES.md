# Phase POS Electron

Dokumen ini menurunkan `requirements.md` menjadi phase implementasi yang bisa dieksekusi dan diverifikasi.

## Keputusan yang sudah ditetapkan

- Renderer: React + TypeScript + Vite.
- Kontrak API Site Server: belum tersedia, dibuat mock server terlebih dahulu.
- Prioritas iterasi pertama (MVP): operator loket.
- Mode manless: satu aplikasi Electron yang sama, mode ditentukan konfigurasi.
- Styling: Tailwind CSS v4.
- Testing: vitest dipasang sejak Phase 0.
- Packaging: electron-builder disiapkan sejak Phase 0.
- Mode saat ini: **frontend-only di aplikasi Electron**. Backend Site Server dibuat terpisah di `server/` (Express + PostgreSQL via Prisma) dan **belum dihubungkan** ke frontend; UI tetap memakai data contoh lokal in-memory.
- Backend test: Express + TypeScript + PostgreSQL via Prisma ORM, kontrak mengikuti `requirements.md` bagian 7.1.

## Pembagian Track (Frontend vs Backend)

Pekerjaan dipisah menjadi dua track yang **independen** agar tidak bertabrakan:

| Track | Kode phase | Lokasi kode | Isi |
|---|---|---|---|
| Frontend (Electron POS) | `F0`–`F14` | `src/` | UI renderer, main/preload, IPC, mock data |
| Backend (Site Server) | `B0`–`B4` | `server/` | REST API, PostgreSQL (Prisma), auth, transaksi, audit |

Aturan batas track:

- Track backend **hanya** menulis di `server/`. Tidak boleh mengubah `src/` (renderer/main/preload) selama fase backend.
- Track frontend **hanya** menulis di `src/`. Tidak boleh mengubah `server/`.
- Kontrak bersama (`src/shared/types.ts`) adalah referensi, bukan jalur impor runtime. Backend menyalin kontrak secara lokal di `server/src/domain/types.ts` agar kedua track bisa dikerjakan paralel tanpa konflik file.
- Integrasi FE↔BE dilakukan pada phase terpisah di masa depan (belum masuk scope track saat ini). Sampai saat itu, frontend tetap memakai mock in-memory dan backend diuji lewat REST langsung.
- Nomor phase lama (`Phase 0`–`Phase 14`) tetap dipakai sebagai `F0`–`F14` hanya untuk penamaan track; tidak mengubah isinya.

## Status implementasi

Fase yang sudah dikerjakan sebagai frontend-only:

- Struktur Electron (main/preload/renderer) dengan `contextIsolation` dan sandbox.
- Konfigurasi lokal (loket, gerbang, mode, timeout sesi, printer, device) tersimpan lewat IPC.
- Login, hak akses berbasis permission, idle lock, logout.
- Beranda, Shift (buka/tutup + ringkasan), Loket (cari tiket manual/scan, multi-hasil, detail tagihan, cash, QR, palang, bukti), Riwayat, Pengaturan.
- Data contoh lokal + service layer di `src/renderer/src/mock` sebagai pengganti sementara Site Server.
- Pengujian unit untuk permission dan service data contoh.

Backend Site Server (test, belum terhubung ke frontend) — lihat Phase 15:

- REST API Express + TypeScript di `server/`.
- PostgreSQL via Prisma: pengguna, permission, device, parking session, shift, transaksi, QR/e-money intent, idempotency, audit.
- Auth JWT, validasi transisi status, idempotency key, correlation id.
- Endpoint health, session/tagihan, cash, QR, e-money, gate, receipt, shift, history, audit.

Belum dikerjakan (menunggu integrasi frontend/phase lanjut):

- Koneksi nyata frontend ke Site Server, health/status koneksi di UI.
- Mode manless dan pembayaran e-money (Phase 9-10).
- Cetak thermal sebenarnya, audit ke backend, auto-update.


## Stack dan arsitektur

- Runtime: Electron 44.
- Build: electron-vite + Vite + React + TypeScript.
- Packaging: electron-builder.
- Kualitas kode: ESLint + prettier + typecheck.
- Struktur:
  - `src/main` — proses utama, akses Node, secret, store aman.
  - `src/preload` — jembatan IPC bertipe, tanpa `nodeIntegration`.
  - `src/renderer` — UI React (mode operator dan manless).
  - `src/shared` — tipe kontrak API dan konstanta status.
  - `mock-server` — Site Server tiruan untuk development.
- Keamanan proses: `contextIsolation` aktif, `nodeIntegration` nonaktif, sandbox aktif, semua panggilan backend lewat IPC.
- Penyimpanan token: secure storage OS (`safeStorage`).
- Idempotency: setiap aksi pembayaran dan buka palang memakai idempotency key.

## Track Frontend — Iterasi 1: MVP Operator Loket (F0–F8)

### Phase 0 — Foundation dan Keputusan Teknis

Ruang lingkup:
- Scaffold electron-vite + React + TypeScript + Tailwind.
- Konfigurasi main / preload / renderer dengan `contextIsolation`.
- Setup electron-builder, ESLint, prettier, dan script typecheck/test.
- Manajemen konfigurasi: URL Site Server, identitas device POS, lane/gate, mode operasional, timeout sesi.
- Lapisan penyimpanan aman untuk token/sesi.
- Mock Site Server beserta tipe kontrak bersama.
- API client dengan penanganan error, timeout, dan correlation id.

Kriteria selesai:
- `npm run dev:all` menjalankan mock server dan Electron.
- `npm run lint` dan `npm run typecheck` lulus.
- Konfigurasi dapat dibaca dan disimpan.
- Mock server dapat dipanggil dari renderer lewat IPC.

### Phase 1 — Login dan Sesi Operator

Referensi: 6.1.

Ruang lingkup:
- Login operator melalui Site Server.
- Tampilkan nama operator, role, dan status koneksi.
- Kunci layar atau minta login ulang setelah idle sesuai konfigurasi.
- Logout menghapus token/sesi lokal.
- Hak akses mengikuti permission, bukan nama role hardcoded.

Kriteria selesai:
- Operator dapat login dan melihat status koneksi.
- Idle lock berjalan sesuai timeout.
- Tampilan mengikuti permission yang dikembalikan backend.

### Phase 2 — Pemilihan Shift

Referensi: 6.2.

Ruang lingkup:
- Mulai shift pada POS tertentu.
- Tutup shift dengan validasi tidak ada transaksi menggantung.
- Ringkasan shift: jumlah transaksi cash, QR berhasil, pembatalan, total cash setoran.
- Penutupan shift tercatat audit.

Kriteria selesai:
- Operator dapat membuka dan menutup shift.
- Tutup shift diblokir bila ada transaksi menggantung.

### Phase 3 — Pencarian Tagihan Parkir

Referensi: 6.3, 6.4.

Ruang lingkup:
- Mode `Input manual` (nomor plat sebagai input utama) dan `Scan tiket`.
- Mapping payload scanner ke nomor tiket dan nomor kendaraan.
- Pengambilan detail parking session dan tagihan dari backend.
- Tampilan detail: nomor tiket, plat, jenis kendaraan, waktu masuk, durasi, total tagihan, status sesi, status pembayaran.
- Penanganan data tidak ditemukan tanpa membuat transaksi baru.
- Penanganan sesi sudah lunas untuk mencegah pembayaran ganda.
- Pemilihan sesi bila hasil pencarian plat lebih dari satu.
- Koreksi plat hasil scan dengan pencatatan audit.

Kriteria selesai:
- Operator dapat mencari tagihan yang valid pada kedua mode.
- Payload scan tidak valid menampilkan error tanpa mengisi field parsial.
- Hasil scan dan perubahan manual dibedakan dengan jelas.

### Phase 4 — Pembayaran Cash

Referensi: 6.5.

Ruang lingkup:
- Pilih metode cash, tampilkan total tagihan dan input uang diterima.
- Hitung kembalian di UI, jumlah tagihan tetap dari backend.
- Konfirmasi penerimaan cash sebelum submit.
- Submit idempotent dan pencegahan submit ganda.
- Pembatalan setelah berhasil hanya oleh supervisor dengan alasan.

Kriteria selesai:
- Operator dapat menerima cash sampai status lunas.
- Klik ganda tidak membuat transaksi ganda.

### Phase 5 — Pembayaran QR

Referensi: 6.6, 6.7.

Ruang lingkup:
- Pilih metode QR dan minta pembuatan payment intent ke backend.
- Tampilkan QR dari backend, tidak membuat payload gateway sendiri.
- Tampilkan waktu kedaluwarsa.
- Polling/subscription status sampai berhasil, gagal, kedaluwarsa, atau dibatalkan.
- Batalkan QR yang belum dibayar.
- Setelah berhasil, tampilkan status lunas dan tutup alur pembayaran.

Kriteria selesai:
- Operator dapat membuat QR dan melihatnya di layar.
- Status QR terbarui sampai berhasil atau kedaluwarsa.

### Phase 6 — Operasi Palang Pintu

Referensi: 6.11.

Ruang lingkup:
- Tombol buka palang aktif hanya saat status `PAID` dan backend memberi izin keluar.
- Tombol nonaktif untuk `UNPAID`, `PENDING_QR`, `FAILED`, `EXPIRED`, `CANCELLED`.
- Perintah dikirim ke backend operasional, bukan langsung ke perangkat dari renderer.
- Idempotency key untuk mencegah perintah ganda.
- Tampilkan hasil: berhasil, gagal, timeout, perlu tindakan manual.
- Retry sesuai permission bila gagal setelah pembayaran lunas.
- Override tanpa lunas hanya supervisor, dengan alasan dan audit.

Kriteria selesai:
- Tombol buka palang nonaktif bila pembayaran belum lunas.
- Klik ganda tidak mengirim perintah ganda.

### Phase 7 — Bukti Pembayaran

Referensi: 6.10.

Ruang lingkup:
- Cetak bukti bila printer tersedia.
- Isi bukti: nomor tiket, waktu masuk, waktu bayar, metode, total, operator, nomor referensi.
- Gagal printer tidak membatalkan status pembayaran.
- Cetak ulang sesuai permission dan tercatat audit.

Kriteria selesai:
- Bukti tercetak setelah pembayaran berhasil.
- Gagal cetak tidak mengubah status pembayaran.

### Phase 8 — Riwayat Transaksi Lokal

Referensi: 6.12.

Ruang lingkup:
- Operator melihat transaksi pada shift aktif.
- Supervisor melihat transaksi berdasarkan rentang waktu terbatas.
- Riwayat harus membedakan cash, QR berhasil, QR gagal, QR kedaluwarsa, e-money berhasil, e-money gagal, dan pembatalan.
- Data dari backend, cache lokal hanya untuk mempercepat tampilan.

Kriteria selesai:
- Riwayat shift aktif tampil benar.
- Filter rentang waktu berjalan untuk supervisor.

## Track Frontend — Iterasi 2: Manless dan Ketahanan (F9–F11)

### Phase 9 — Mode Manless di Exit Lane

Referensi: 6.8.

Ruang lingkup:
- Aktivasi mode manless per POS atau per exit lane via konfigurasi.
- Layar instruksi scan tiket, tanpa kontrol operator.
- Setelah scan, tampilkan nomor tiket, nomor kendaraan, durasi, total tagihan.
- Tampilkan QR pembayaran dengan sisa waktu kedaluwarsa dan status terkini.
- Instruksi tap e-money pada reader exit bila tersedia.
- Buka palang otomatis setelah status `PAID` dan izin keluar diterima.
- Pesan yang dapat dipahami pengemudi bila tiket tidak valid, sudah lunas, atau sesi tidak ditemukan.
- Tidak menyediakan pembayaran cash langsung pada pengemudi.

Kriteria selesai:
- Pengemudi dapat scan tiket dan melihat QR di customer display.
- Palang terbuka otomatis setelah pembayaran berhasil dan izin keluar diterima.

### Phase 10 — Pembayaran E-money

Referensi: 6.9.

Ruang lingkup:
- Hanya pada perangkat exit dengan reader e-money tersertifikasi dan aktif.
- Terima event reader/backend untuk status tap dan hasil debit.
- Nominal debit dari backend, bukan dihitung di POS.
- Payment reference dan idempotency key pada setiap permintaan debit.
- Penanganan saldo tidak cukup, kartu tidak terbaca, gagal, dan timeout.
- Bila debit berhasil tetapi buka palang gagal, status tetap lunas dan tampilkan instruksi bantuan operator.
- Refund/void/koreksi mengikuti prosedur supervisor/back office, bukan flow pengemudi.

Kriteria selesai:
- Pengemudi dapat tap e-money di exit dan saldo terdebit sesuai tagihan.
- Semua status e-money ditampilkan dengan benar.

### Phase 11 — Mode Koneksi Terganggu

Referensi: 6.13.

Ruang lingkup:
- Indikator status online/offline.
- Saat offline, tidak membuat status pembayaran final tanpa konfirmasi backend.
- QR dan e-money tidak dapat diproses saat backend tidak terjangkau.
- Palang tidak dibuka dari POS saat backend operasional tidak terjangkau.
- Pembayaran cash offline mengikuti kebijakan; default awal tidak diizinkan.
- Semua kegagalan koneksi ditampilkan dengan pesan yang dapat ditindaklanjuti.

Kriteria selesai:
- Aplikasi menampilkan error koneksi dengan jelas tanpa crash.
- Tidak ada status final dibuat saat offline.

## Track Frontend — Iterasi 3: Hardening dan Rilis (F12–F14)

### Phase 12 — Audit, Logging, dan Observability

Referensi: 11, 12.

Ruang lingkup:
- Correlation id pada setiap aksi pembayaran.
- Log lokal tanpa data sensitif dan dapat diekspor teknisi.
- Kode atau pesan error yang mudah dilaporkan.
- Audit operasional: login/logout, mulai/tutup shift, pembayaran cash, pembuatan/pembatalan QR, pembayaran QR, pembayaran e-money, buka palang, percobaan buka palang gagal, cetak ulang, pembatalan/override supervisor.
- Audit final disimpan di backend.
- Versi aplikasi terlihat di halaman bantuan atau pengaturan.

Kriteria selesai:
- Semua aksi kritis tercatat dengan correlation id.
- Log dapat diekspor.

### Phase 13 — Security Hardening

Referensi: 9.

Ruang lingkup:
- Komunikasi backend via HTTPS atau koneksi lokal aman yang disepakati.
- Token/sesi lokal di secure storage OS.
- DevTools dibatasi di build produksi.
- Auto-update hanya dari sumber terpercaya dan ditandatangani.
- Idempotency key pada semua aksi pembayaran dan buka palang.
- Audit korektif mencatat actor, waktu, alasan, dan device POS.

Kriteria selesai:
- Build produksi tidak membuka DevTools.
- Auto-update memverifikasi sumber bertanda tangan.

### Phase 14 — Packaging dan Release

Referensi: 12, 15.

Ruang lingkup:
- Installer Windows 10/11.
- Channel auto-update.
- Uji kriteria penerimaan awal (bagian 15 requirements).
- Dokumentasi konfigurasi awal (bagian 13).

Kriteria selesai:
- Installer dapat dipasang di Windows 10/11.
- Seluruh kriteria penerimaan awal terverifikasi.

## Track Backend — Site Server (B0–B4)

Catatan track: seluruh phase di bawah ini **hanya** menyentuh folder `server/`. Kontrak, data contoh, dan perilaku mengikuti `src/shared/types.ts` serta mock di `src/renderer/src/mock` agar integrasi berikutnya konsisten. Backend **belum dihubungkan** ke frontend Electron.

### B0 — Fondasi Backend

Ruang lingkup:
- Scaffold Express + TypeScript di `server/` (package, tsconfig, env, script dev/typecheck/test).
- Konfigurasi environment: `DATABASE_URL`, `JWT_SECRET`, port, TTL QR/e-money, CORS.
- Koneksi PostgreSQL via Prisma Client (driver adapter `@prisma/adapter-pg`), skema Prisma, `db push`, dan seed.
- Skema tabel: users, permissions, user_permissions, devices, parking_sessions, shifts, transactions, qr_intents, emoney_intents, idempotency_keys, audit_logs.
- Lapisan error terstruktur dan middleware correlation id.
- Endpoint health.

Kriteria selesai:
- `npm run setup` (generate + db push + seed) berhasil pada PostgreSQL kosong.
- `npm run typecheck` lulus.
- `GET /api/v1/health` mengembalikan status dan versi.

### B1 — Auth dan Otorisasi

Referensi: 6.1, 9.

Ruang lingkup:
- Login operator (verifikasi password hash) yang mengembalikan token JWT + profil + permission.
- `GET /me`, logout.
- Middleware auth dan `requirePermission`.
- Sinkronisasi permission dari tabel, bukan hardcoded role.

Kriteria selesai:
- Login valid mengembalikan token; login salah mengembalikan `INVALID_CREDENTIALS`.
- Endpoint terproteksi menolak tanpa token atau tanpa permission.

### B2 — Sesi Parkir, Tagihan, dan Shift

Referensi: 6.2, 6.3, 6.4.

Ruang lingkup:
- Pencarian parking session: manual (tiket/plat) dan scan payload, termasuk multi-hasil.
- Detail sesi + perhitungan tagihan (tarif domain backend, bukan frontend).
- Deteksi sesi tidak ditemukan, sesi sudah lunas.
- Shift: buka, shift aktif, ringkasan, tutup (blokir bila ada transaksi menggantung).
- Audit mulai/tutup shift.

Kriteria selesai:
- Pencarian dan detail tagihan dapat diuji lewat REST.
- Tutup shift diblokir saat ada transaksi menggantung.

### B3 — Pembayaran Cash, QR, dan E-money

Referensi: 6.5, 6.6, 6.7, 6.9.

Ruang lingkup:
- Cash: validasi jumlah, idempotency key, pembuatan transaksi `PAID`.
- QR: pembuatan payment intent, polling status, kedaluwarsa otomatis, pembatalan, simulasi gateway untuk test.
- E-money: pembuatan intent, event tap/debit simulasi, status (saldo tidak cukup, kartu tidak terbaca, gagal, timeout), pembatalan.
- Validasi transisi status oleh backend; mencegah pembayaran ganda.
- Audit tiap aksi pembayaran dengan correlation id.

Kriteria selesai:
- Cash, QR, dan e-money dapat diselesaikan sampai `PAID` lewat REST.
- Submit ganda dengan idempotency key yang sama tidak membuat transaksi ganda.

### B4 — Gate, Riwayat, Bukti, dan Audit

Referensi: 6.10, 6.11, 6.12, 11.

Ruang lingkup:
- Izin keluar dan perintah buka palang (hanya saat `PAID`, idempotent, hasil SUCCESS/FAILED/TIMEOUT).
- Override buka palang supervisor dengan alasan + audit.
- Bukti pembayaran dan data cetak ulang.
- Riwayat transaksi per shift dan rentang waktu (permission supervisor).
- Query audit operasional.
- Penanganan error terstruktur dengan kode yang bisa dilaporkan.

Kriteria selesai:
- Buka palang nonaktif/ditolak bila belum lunas; klik ganda tidak menggandakan perintah.
- Riwayat shift dan rentang waktu dapat difilter.
- Semua aksi kritis tercatat di tabel audit dengan correlation id.
- Tidak ada perubahan apa pun pada folder `src/`.

## Keputusan Terbuka

Perlu dikonfirmasi sebelum phase terkait dimulai:

- Provider pembayaran QR — F5, B3 (simulasi dipakai dulu).
- Provider/acquirer e-money dan protokol reader — F10, B3 (simulasi dipakai dulu).
- Apakah pembayaran cash offline diizinkan — F11.
- Jalur teknis buka palang: Site Server, Lane Controller API, atau mekanisme lain — F6, B4 (default lewat backend).
- Authentication POS langsung ke Site Server atau lewat Central — F1, B1.
- Mekanisme sinkronisasi permission dari Central ke Site Server — F1, B1.
- Format bukti pembayaran dan kebutuhan printer thermal — F7, B4.
- Skema auto-update dan distribusi installer — F13.
