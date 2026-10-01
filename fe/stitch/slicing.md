# Slicing Plan — POS Electron (fe/stitch → aplikasi Electron)

## Prinsip utama
> Aplikasi desktop Electron untuk loket parkir dengan **dua mode operasional**: **manned operator** (desktop) dan **manless** (tablet sentuh, self-service). POS Electron adalah **client operasional** — bukan authority untuk master data, tarif, atau settlement. Semua keputusan transaksi berasal dari **Site Server** dan **Central Backend**.

Aturan global:
- **Dua mode dalam satu aplikasi**: toggle manned/manless per device via konfigurasi.
- **Backend-driven**: tidak ada perhitungan tarif, tidak ada data dummy, tidak ada grafik palsu. Semua data dari API Site Server.
- **Status transaksi** sesuai flow: `UNPAID` → `PENDING_QR`/`PENDING_EMONEY` → `PAID`/`FAILED`/`EXPIRED`/`CANCELLED`.
- **Idempotency key** untuk semua aksi pembayaran dan buka palang.
- **Audit**: setiap aksi korektif (cancel, override, buka palang manual) mencatat actor, waktu, alasan, device.
- **Offline handling**: tampilkan status online/offline; tidak ada finalisasi status tanpa backend.
- **Bahasa Indonesia** untuk semua UI.
- **Keamanan**: token di secure storage OS, DevTools dibatasi di produksi, HTTPS untuk backend.

---

## Arsitektur Mode

### Mode Manned (Desktop — Operator)
- Login operator dengan akun dari sistem
- Pencarian tagihan by tiket/plat/scanner
- Pembayaran: Cash (dibantu operator), QR (ditampilkan ke pelanggan), E-Money
- Buka palang manual setelah `PAID` + izin backend
- Shift management (mulai/tutup shift, rekap)
- Riwayat transaksi shift aktif

### Mode Manless (Tablet — Pengemudi Self-Service)
- Tanpa login operator
- Instruksi scan tiket di display
- Setelah scan: tampilkan tagihan, QR countdown, instruksi tap e-money
- **Tanpa pembayaran cash**
- Palang terbuka **otomatis** setelah `PAID` + izin backend
- Pesan error jelas + arahkan ke operator bila gagal
- Teks besar, kontras tinggi, tanpa kontrol operator

---

## PHASE 1 — Fondasi & Komponen Bersama
- [ ] Setup Electron + Vite + React + TypeScript
- [ ] Token PARK-POS (CSS vars) + font (JetBrains Mono, Space Grotesk)
- [ ] Komponen bersama: `DockButton`, `Kbd`, `MatrixBox`, `SectionHeader`, `StatusBadge`
- [ ] Toast system (`ToastProvider`)
- [ ] Hook `useFKeyBindings` (F1-F12, Enter, Esc)
- [ ] Hook `useConnectionStatus` (online/offline + latency)
- [ ] Komponen `PaymentStatusBadge` (UNPAID/PENDING_QR/PENDING_EMONEY/PAID/FAILED/EXPIRED/CANCELLED)
- [ ] Komponen `QrPaymentPanel` (QR dari backend + countdown + status)
- [ ] Komponen `EmoneyTapPanel` (instruksi tap + status reader)
- [ ] Komponen `GateControl` (tombol buka palang + status relay)

## PHASE 2 — Login & Sesi Operator (Manned)
- [ ] Login dengan akun dari Central Backend
- [ ] Tampilkan nama operator, role, permission, status koneksi
- [ ] Auto-lock setelah periode tidak aktif (configurable)
- [ ] Logout hapus token/sesi lokal
- [ ] Hak akses mengikuti permission dari backend (bukan hardcoded)
- [ ] Pilih mode operasional (manned/manless) di konfigurasi device

## PHASE 3 — Loket Operator (Manned)
- [ ] Pencarian tagihan: by tiket, plat, QR, scanner
- [ ] Tampilkan: nomor tiket, plat, jenis kendaraan, waktu masuk, durasi, total, status
- [ ] Mode input: Manual / Scan tiket
- [ ] Pembayaran Cash: input uang diterima, hitung kembalian (UI only), konfirmasi
- [ ] Pembayaran QR: minta payment intent ke backend, tampilkan QR + countdown, polling status
- [ ] Pembayaran E-Money: instruksi tap, terima event dari reader/backend
- [ ] Tombol buka palang: disabled kecuali `PAID` + izin backend
- [ ] Cetak struk pembayaran (printer thermal)
- [ ] Override Supervisor: PIN + alasan + audit
- [ ] Riwayat transaksi shift aktif

## PHASE 4 — Manless Exit Lane (Tablet Touchscreen) — acuan: `kiosk.html`
- [ ] Layar standby: instruksi scan tiket (teks besar, kontras tinggi)
- [ ] Scan tiket → tampilkan tagihan + QR countdown
- [ ] Pembayaran QR: scan oleh pengemudi, polling status
- [ ] Pembayaran E-Money/RFID: tap kartu tanpa karcis, tampilkan status (proses/berhasil/gagal/saldo kurang)
- [ ] Palang terbuka otomatis setelah `PAID` + izin backend
- [ ] Countdown tutup palang + kembali ke standby
- [ ] Error handling: tiket tidak valid, sudah lunas, sesi tidak ditemukan → pesan jelas + arahkan ke operator
- [ ] Tanpa pembayaran cash
- [ ] Tanpa kontrol operator (UI bersih untuk pengemudi)

## PHASE 5 — Shift & Riwayat
- [ ] Mulai shift di POS tertentu
- [ ] Tutup shift (cek transaksi menggantung)
- [ ] Ringkasan shift: jumlah cash, QR berhasil, pembatalan, total cash
- [ ] Riwayat transaksi: bedakan cash/QR berhasil/QR gagal/QR expired/e-money berhasil/e-money gagal/cancel
- [ ] Data dari backend; cache lokal hanya untuk performa

## PHASE 6 — Pengaturan & Admin
- [ ] Konfigurasi device: URL Site Server, identitas POS, loket/gate, mode operasional
- [ ] Manajemen perangkat: printer, scanner, reader e-money, barrier
- [ ] Status koneksi selalu terlihat
- [ ] Timeout sesi operator configurable
- [ ] Log lokal yang dapat diekspor teknisi

## PHASE 7 — Keamanan & Audit
- [ ] Token di secure storage OS
- [ ] DevTools dibatasi di build produksi
- [ ] Idempotency key untuk semua aksi pembayaran & buka palang
- [ ] Audit: login/logout, mulai/tutup shift, pembayaran, cancel, override, buka palang, cetak ulang
- [ ] Audit final di backend, bukan hanya file lokal
- [ ] HTTPS untuk komunikasi backend

## PHASE 8 — Offline & Error Handling
- [ ] Tampilkan status online/offline
- [ ] Offline: tidak buat status final tanpa backend
- [ ] QR tidak bisa dibuat offline
- [ ] E-Money tidak bisa diproses offline
- [ ] Palang tidak bisa dibuka offline (kecuali prosedur manual di luar aplikasi)
- [ ] Cash offline: default tidak diizinkan (bila kebijakan belum diputuskan)
- [ ] Semua error koneksi dengan pesan yang bisa ditindaklanjuti

---

## Checklist per file stitch
| file stitch | target screen | mode | phase |
|---|---|---|---|
| `login.html` | Login | manned | 2 |
| `loket.html` | Loket Operator | manned | 3 |
| `kiosk.html` | Manless Exit Lane (tablet touchscreen) | manless | 4 |
| `dashboard.html` | Ringkasan Operasional | manned | 5 |
| `tarif.html` | Pengaturan Tarif | manned | 6 |
| `payment.html` | Pengaturan Pembayaran | manned | 6 |
| `perangkat.html` | Pengaturan Perangkat | manned | 6 |
| `member.html` | Member & Karyawan | manned | 6 |
| `karyawan.html` | Karyawan & Operator | manned | 6 |
| `ringkasan.html` | Ringkasan Status | manned | 5 |
| `sop.html` | SOP & Bantuan | both | 3 & 4 |

Status: `⬜ belum · 🔄 berjalan · ✅ selesai` — update setiap phase selesai.
