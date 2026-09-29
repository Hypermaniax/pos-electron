# Slicing Plan — POS Parkir (fe/stitch → aplikasi Electron)

## Prinsip utama
> Kita **refactor total** mengikuti folder `fe/stitch`. UI lama **tidak dipertahankan** — setiap file stitch di-potong (di-slice), yang lama **dihapus/diganti penuh**. Fitur lama yang tidak ada padanannya (mis. riwayat, shift) **bukan dihapus**, tetapi **digabung ke dalam halaman stitch** lain. Yang **dibolehkan berubah hanya nama halaman/route** — fiturnya tetap tersedia menempati halaman stitch yang relevan.
> Jadi aturan slicing: baca desain stitch → bangun ulang halaman dari nol persis seperti desain → buang markup lama → pindahkan wire-up API lama ke markup baru.

Aturan global (berlaku di semua phase):
- **Ganti total, bukan restyle**: halaman dibangun ulang mengikuti file stitch; markup lama dihapus. Nama file/komponen halaman boleh diganti mengikuti nama desain stitch (dibolehkan), route juga dapat diganti — fungsi (wire `server-api`) tetap.
- Semua slice **harus betul-betul mirip** file stitch acuannya: palet (`surface-*`, `text-*`, `accent-*`), font (`JetBrains Mono` untuk angka/tiket, `Space Grotesk` headline), radius, urutan & proporsi panel.
- Fitur lama tanpa padanan di desain (Riwayat, Shift, dll.) **digabung** ke halaman stitch yang relevan — jangan buat halaman tambahan di luar daftar stitch.
- Semua slice tetap **wire ke `server-api`**; fitur tanpa backend dibuat non-aktif/disabled, bukan dihapus.
- Setiap phase selesai wajib lulus: `npm run lint`, `npm run typecheck`, `npm test` di `fe/`, lalu konfirmasi user sebelum lanjut phase berikutnya.
- Komponen dipakai ulang, tidak di-copy: `DockButton`/`Kbd`/`MatrixBox`/`SectionHeader` → `src/renderer/src/components/park-pos/*`.

## Acuan token PARK-POS (dipakai semua screen)
`surface-base #18181b · surface-primary #1e1e1e · surface-secondary #111111 · surface-tertiary #0a0a0a · surface-card #252528 · surface-card-subtle #1f1f23 · surface-border #333338 · text-main #d4d4d4 · text-muted #9ca3af · accent-blue #569cd6 · accent-cyan #38bdf8 · cta-primary #f97316 · success #22c55e · warning #f59e0b · error #ef4444`

---

## PHASE 1 — Fondasi token & komponen bersama  ✅
- [x] Pindahkan token PARK-POS ke CSS vars (`index.css`) + font mono/heading (JetBrains Mono, Space Grotesk via @fontsource).
- [x] Ekstrak `DockButton`, `Kbd`, `MatrixBox`, `DetailLine`, `SectionHeader` → `components/park-pos/index.tsx`.
- [x] Toast system (`ToastProvider` + `components/park-pos/toast-context.ts` + `hooks/useToast.ts`).
- [x] Hook bersama `hooks/useFKeyBindings.ts` (F1–F12, Enter, Esc) — LoketScreen dipindah ke hook ini.
- [x] Verifikasi: lint 0 problem, typecheck 0 error, 12 tests pass.

## PHASE 2 — Login  ✅  acuan: `login_multi_role_pos_parkir_electron_workstation.html`
- [x] Workspace gelap `#0c0d10` + glow oranye; kartu 2 kolom: kiri metadata (44%, logo P, status site server, Loket/Gerbang/Mode/Akses, footer barrier COM3) — kanan kartu PUTIH (56%) berisi form.
- [x] 3 preset role chip (Operator/Supervisor/Teknisi, OPR/SPV/ENG) → isi otomatis user/pass + update preview "Tujuan" & panel kiri.
- [x] Toggle "Lihat sandi", submit "Masuk Workstation [Enter ↵]" (hitam, kbd Enter), jam WIB live di footer & panel.
- [x] Bottom status bar fiks (Terminal ready, RFID, Printer, [F1]/[F5]/[ESC].
- [ ] Modal sukses "Otorisasi Berhasil" + tombol routing per role — *dilewati*: aplikasi nyata langsung navigate ke `/` (auth backend aktif).

## PHASE 3 — Loket (lanjutan slice fase 0)  ✅
- [x] Modal **ParkModal** reusable (`components/park-pos/ParkModal.tsx`) — overlay black/80 + blur, ESC close.
- [x] Modal **F1 Bantuan/SOP** (`HelpModal`) — 3 tab SOP (Tiket Hilang / Palang Macet / QRIS) persis copy isi design; tombol Interkom → toast (belum ada backend).
- [x] Modal **F11 Override Supervisor** (`SupervisorOverrideModal`) — PIN 6 digit + numpad klik (C/⌫), 4 alasan override, tombol amber "Otorisasi & Buka Palang" → openGate nyata; server menolak bila rule tidak izinkan (tampil di modal).
- [x] Receipt monospace PARK-POS (`ReceiptCard`) — dashed receipt, TOTAL hijau mono, tombol "Cetak Ulang Struk" (window.print + toast).
- [x] QRIS white-card (`QrPaymentPanel`) — QR putih border-4, box countdown cyan + total, tombol Batalkan & "[DEV] Simulasi Sukses".
- [x] Gate Masuk (`CheckInScreen`) dibangun ulang gaya PARK-POS: form ticketing + kartu tiket (matrix), QR white-card, arus masuk jadi baris mono + dock F5/ESC.
- [x] F1/F11 tombol di footer dock Loket + keyboard F1/F11/ESC-aware.
- [x] Verifikasi: lint bersih, typecheck 0, 12 tests pass.
- [ ] Modal F2 "Ganti Shift/Tutup Sesi" — ditunda (sudah ada ShiftScreen; digabung di phase polish).

## PHASE 4 — Dashboard / Ringkasan Operasional (Home)  ✅
- [x] HomeScreen dibangun ulang persis desain: header badge TELEMETRY + tombol Unduh Laporan (unduh CSV riil dari data transaksi shift) & Refresh; 4 metric cards (okupansi nyata dari sesi, total transaksi + flow IN/OUT, omzet + split metode %, status server + RTT ping live); chart bar arus per jam (6 jam) dibangkitkan dari data sesi/transaksi nyata; tabel 5 transaksi terakhir persis kolom desain; Status Jalur & Device (exit lane ini ONLINE, lane lain PENDING/WARNING jujur menunggu integrasi perangkat, Central Server Sync live); Quick Actions (Loket, Shift, Broadcast & Cek Kas Fisik → toast belum ada backend; Riwayat).
- [x] Feather stat & chip membaca data nyata `/api/v1/sessions` & transaksi shift; role-aware via Permissions.
- [x] Verifikasi: lint 0, typecheck 0, 12 tests pass.

## PHASE 5 — Pengaturan (kumpulan section, tab per file stitch) — ✅ selesai
- [x] **a. `admin_pengaturan_tarif_parkir.html` (TariffSection)**: header badge MODUL KONFIGURASI PUSAT + tombol Simulasi/Simpan (save disabled jujur); kartu status skema READ-ONLY; matriks tarif 3 golongan persis desain (nilai asli rule server: Motor 2rb/Mobil 3rb; max-24/denda/grace "—"); 4 kartu kebijakan (Drop-off, Weekend, Pembulatan 30/60 menit interaktif, Asuransi) — toggle berfungsi lokal tapi ditandai belum didukung backend; audit trail "CRUD TARIF MENUNGGU ENDPOINT BACKEND"; modal Simulasi Hitung Tarif menghitung formula server setia (ceil jam penuh / 30 menit), disabled checkbox libur/asuransi.
- [x] **b. `admin_pengaturan_sistem_*` (SystemSection)**: form identitas booth, URL site server, loket/gerbang/mode, timeout, printer — disimpan via ConfigContext (nyata) dengan gaya PARK-POS.
- [x] **c. SettingsScreen**: kerangka 5 tab PARK-POS dengan shadcn Tabs (base-nova), semua aktif: Tarif / Sistem / Fitur / Tema / Ping Perangkat; gate Permissions.SettingsManage.
- [x] **d. `admin_aktivasi_fitur_pembayaran_incident_feed.html` (ActivationSection)**: header gate cluster + tombol Sinkronkan Gateway (spinner 1.2s nyata); 4 KPI cards (kanal aktif dihitung dari switch nyata; success rate/settlement "—" jujur belum tersedia; incident 1 gangguan); kanal Cash/QRIS/E-Money ON, EDC standby diact-switch disabled + toast jujur; SAM slot grid (status "belum tersedia" jujur); tombol per-channel & audit → toast belum tersedia; Live Incident Feed timeline 4 item (warning/info/success/muted) + Broadcast Ulang berubah "TERKIRIM KE LOKET!" 2.5s (lokal); WS Streambadge "NO WS STREAM" jujur.
- [x] **e. `admin_tema_otomatis_bantuan_f1_sop_minimalis.html` Bagian 1 (ThemeSection)**: 3 kartu tema radio (dark/light/auto; auto bercorona AKTIF BERJALAN + jadwal 06-18 WIB + progress bar dari jam nyata + countdown switch); preferensi tersimpan localStorage; fade transition engine switch; caption jujur "tema terang butuh token light CSS belum tersedia"; hotkey bar F1/F11 + Cek Jaringan → toast menunggu tab Ping Perangkat. (Bagian 2 F1 Help Center sudah diwakili HelpModal Phase 3; Tab D diagnostik = slice Ping Perangkat berikutnya.)
- [x] **f. `admin_manajemen_ping_perangkat_minimalis.html` (DevicesSection)**: header TELEMETRY + 3 tombol (Ekspor/Ping Semua sweep 1.4s/Tambah — semua jujur kecuali ping); 4 metric cards (total/online/warning/offline dari tabel lokal); tabel perangkat 6 rows persis desain (status badge, latency, timestamp) dengan filter tab & search berfungsi; LIVE SOCKET STREAM log box yang mengisi log asli dari ping `/api/v1/health` site server (RTT via performance.now pola effect/then lint-safe); auto-ping poller switch (interval 5s meng-hit server health nyata; GT-02 tidak diperbarui — jadi jujur tetap offline); form cepat perangkat + TEST → ping health; catatan jujur: satu-satunya ping nyata adalah /health, ping IP/port periferal belum tersedia — Simpan perangkat disabled via toast.
- [x] **g. Phase 5 selesai** — SettingsScreen 5 tab: Tarif & Kebijakan / Sistem & Jaringan / Aktivasi Fitur / Tema (semua aktif) + tab tombol-kunci laporan (hanya di Home). Tombol kunci per role (admin_dashboard_multi_role) tidak dibuat terpisah — navigasi antar-tab pengaturan sudah diwakili Tabs + Permissions gate `SettingsManage`.

## PHASE 6 — Member & Personel (halaman baru) — ✅ selesai
- [x] **a. `admin_member_bebas_parkir_karyawan_minimalis.html` (PersonelScreen tab Member)**: header Otoritas & Akses + tab switch 2 panel (Member/Karyawan); 4 KPI cards (member dihitung lokal; tap-in/shift/kasier "—" jujur belum tersedia); form Registrasi Kartu Member penuh (UID + simulasi tap acak, pemilik, unit, kategori, golongan, plat utama/cadangan, masa berlaku) — Simulasi Tap acak nyata, penyimpanan lokal + toast jujur "endpoint CRUD member belum ada"; kartu info Bebas Parkir Rp 0 dengan catatan rule engine belum mendukung; antena ACR122U grid + status USB "STANDBY — belum tersedia"; tabel 4 member sampel persis desain + member baru, filter search berfungsi, aksi Perpanjang/Blokir toast jujur; pagination footer listing.
- [x] **b. `admin_karyawan_operator_loket.html` (PersonelScreen tab Karyawan & Operator)**: **endpoint backend baru**: `GET /api/v1/personel/users` + `PATCH /api/v1/personel/users/:id/active` (requireAuth + permission baru `personel.view`, supervisor), service/repo via Prisma users include permissions; tab ini fetch data NYATA (nama, username, role, permission, status aktif) — kolom penugasan gate/shift/transaksi per operator ditampilkan "belum tersedia"; aksi Aktifkan/Nonaktifkan mengubah DB nyata (pending reseed login), Reset PIN/Audit toast jujur, Refresh fetch ulang.
- [x] **c. Wire route & nav**: `/personel` route baru + nav "Personel & Member" (icon Users) dengan gate permission `personel.view` (hanya supervisor pada seed saat ini); `fe/src/shared/permissions.ts` + label sinkron dengan server. CRUD member tetap jujur disabled (belum ada model/DB di Prisma).

## PHASE 7 — Polish
- [x] **LoketScreen rebuild fidelitas penuh** (`loket_operator_mode_keluar_f1_f11_klik_keyboard.html`): chrome header dua tingkat (system bar: PARK-POS v2.4.1 + status Site Server latency NYATA dari ping /health tiap 10 dtk + Central "tidak tersedia" jujur; nav bar: badge PARK-OS cta, LOKET EXIT 01 + LANE, 3 badge periferal Scanner/Printer/Barrier, profil operator → /shift, jam live WIB + tanggal); grid utama 7/5 persis desain — kiri: tab Scan/Manual (+form manual plat & golongan), kartu Snapshot Kamera/ANPR (jelas "RTSP/ANPR belum terintegrasi", confidence "—", koreksi plat manual), kartu Rincian Sesi 4-matrix + breakdown tarif (Jam Pertama nyata; Tambahan & Asuransi "—" jujur), banner TOTAL TAGIHAN border selection-blue; kanan: kartu Status Transaksi (TXN/SESI), kartu metode 3 tab (Tunai cash penuh + uang pas/preset + kembalian, QRIS via QrPaymentPanel, E-Money tab jujur "SAM NFC belum tersedia di backend"), panel Kontrol Palang selalu tampil (terkunci unpaid dengan label persis desain, Cetak Struk F10, Batal Reset, Override Supervisor), footer dock 11 tombol F1/F2/F3/F4/F5/F6/F7/F9/F10/F11/ESC + session info.
- [ ] Konsistensi header/topbar AppShell ke gaya PARK-POS (atau full kiosk window sesuai keputusan Phase 3).
- [ ] Print CSS untuk receipt.
- [ ] Sweeps: warna, spacing, focus state, empty state semua screen.

---

## Checklist per file stitch (semua harus tersentuh)
| file stitch | target screen | phase |
|---|---|---|
| `loket_operator_mode_keluar_f1_f11_klik_keyboard.html` | Loket (exit) | 1 & 3 |
| `login_multi_role_pos_parkir_electron_workstation.html` | Login | 2 |
| `admin_ringkasan_status_operasional.html` | Home (ringkasan) | 4 |
| `admin_dashboard_multi_role_tombol_loket_operator_spv.html` | Pengaturan (akses cepat) | 5 |
| `admin_pengaturan_sistem_master_otorisasi_spv.html` | Pengaturan (sistem) | 5 |
| `admin_pengaturan_tarif_parkir.html` | Pengaturan (tarif) | 5 |
| `admin_aktivasi_fitur_pembayaran_incident_feed.html` | Pengaturan (pembayaran) | 5 |
| `admin_manajemen_ping_perangkat_minimalis.html` | Pengaturan (perangkat) | 5 |
| `admin_tema_otomatis_bantuan_f1_sop_minimalis.html` | Pengaturan (tema) + modal F1 | 3 & 5 |
| `admin_member_bebas_parkir_karyawan_minimalis.html` | Member (baru) | 6 |
| `admin_karyawan_operator_loket.html` | Karyawan (baru) | 6 |

Status: `⬜ belum · 🔄 berjalan · ✅ selesai` — update setiap phase selesai.
