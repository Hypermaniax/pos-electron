# Requirement POS Electron

## 1. Ringkasan

POS Electron adalah aplikasi desktop untuk loket parkir. Aplikasi ini dipakai untuk menampilkan tagihan parkir, menerima pembayaran tunai, menampilkan QR pembayaran non-tunai, dan mendukung mode manless pada exit lane.

POS Electron adalah client operasional. Aplikasi ini tidak menjadi authority untuk master data, sesi parkir aktif, tarif, settlement final, atau audit utama. Data dan keputusan transaksi berasal dari Site Server dan Central sesuai batas tanggung jawab masing-masing sistem.

## 2. Tujuan

- Operator dapat mencari atau menerima detail tagihan parkir dari Site Server.
- Operator dapat menerima pembayaran tunai dan menandai pembayaran sebagai diterima sesuai otorisasi.
- Operator dapat menampilkan QR pembayaran agar pelanggan dapat membayar secara non-tunai.
- Operator dapat melihat status pembayaran secara jelas: menunggu, berhasil, gagal, kedaluwarsa, atau dibatalkan.
- Operator dapat membuka palang pintu setelah pembayaran selesai dan backend menyatakan kendaraan boleh keluar.
- Pada mode manless, pengemudi dapat scan tiket sendiri, melihat QR pembayaran di display, atau tap e-money pada perangkat pembayaran exit.
- Pada mode manless, palang pintu terbuka otomatis setelah pembayaran berhasil dan backend menyatakan kendaraan boleh keluar.
- Aplikasi tetap aman dan dapat dipakai di area loket dengan koneksi yang tidak selalu stabil.

## 3. Di luar cakupan

- Perhitungan tarif parkir di aplikasi Electron.
- Pengelolaan master data organisasi, site, lane, device, jenis kendaraan, user, role, dan permission.
- Settlement final, rekonsiliasi akuntansi, dan laporan keuangan resmi.
- Pairing sertifikat device, websocket Central, Horizon, Reverb, dan sinkronisasi lane controller.
- Implementasi provider pembayaran spesifik sebelum provider dipilih.
- Mode multi-site atau multi-tenant.

## 4. Pengguna

### Operator

Petugas loket yang menerima pembayaran parkir harian. Operator dapat melihat tagihan, memilih metode pembayaran, menerima cash, menampilkan QR, dan mencetak atau menampilkan bukti pembayaran bila tersedia.

### Pengemudi

Pengguna kendaraan yang melakukan pembayaran mandiri pada exit lane manless. Pengemudi dapat scan tiket, melihat tagihan pada display, memilih atau mengikuti instruksi pembayaran QR, tap e-money, dan keluar setelah palang terbuka.

### Supervisor

Petugas dengan hak lebih tinggi untuk membatalkan transaksi tertentu, melakukan override terbatas, melihat riwayat transaksi shift, dan membantu operator saat terjadi gangguan.

### Teknisi

Petugas yang membantu konfigurasi perangkat POS, printer, scanner, dan koneksi ke Site Server.

## 5. Asumsi arsitektur

- POS Electron berjalan di komputer loket.
- POS Electron terhubung ke Site Server lokal untuk operasi transaksi parkir.
- Central Backend tetap menjadi authority untuk user, role, permission, konfigurasi site, dan audit administratif.
- Site Server menjadi authority untuk parking session aktif dan status transaksi operasional loket.
- Perhitungan tarif dilakukan oleh layanan domain yang disediakan Site Server atau parking-engine, bukan oleh POS Electron.
- QR pembayaran dibuat berdasarkan respons backend atau payment gateway melalui Site Server.
- Perintah buka palang dikirim melalui Site Server atau Lane Controller API yang disetujui; POS Electron tidak mengendalikan hardware secara langsung tanpa backend operasional.
- Mode manless memakai perangkat display, scanner tiket, dan reader e-money yang terhubung ke exit lane.
- Debit saldo e-money dilakukan oleh perangkat reader dan backend/acquirer yang berwenang; POS Electron tidak memotong saldo secara mandiri.
- POS Electron tidak menyimpan credential payment gateway secara langsung.

## 6. Kebutuhan fungsional

### 6.1 Login dan sesi operator

- Operator harus login menggunakan akun yang dikelola oleh sistem.
- Aplikasi harus menampilkan nama operator, role, dan status koneksi.
- Aplikasi harus mengunci layar atau meminta login ulang setelah periode tidak aktif yang dapat dikonfigurasi.
- Logout harus menghapus token atau sesi lokal yang tidak lagi diperlukan.
- Hak akses harus mengikuti permission, bukan nama role hardcoded.

### 6.2 Pemilihan shift

- Operator dapat memulai shift pada POS tertentu.
- Operator dapat menutup shift bila tidak ada transaksi menggantung yang memerlukan tindakan.
- Ringkasan shift minimal menampilkan jumlah transaksi cash, jumlah transaksi QR berhasil, pembatalan, dan total cash yang harus disetor.
- Penutupan shift harus tercatat untuk audit operasional.

### 6.3 Pencarian tagihan parkir

- Operator dapat mencari tagihan berdasarkan nomor tiket, plat nomor, QR tiket masuk, atau input dari scanner.
- Untuk flow tiket manual, operator dapat mengetik nomor plat kendaraan pada field pencarian.
- Untuk flow scan tiket, operator dapat memindai barcode/QR tiket sehingga aplikasi mengisi nomor tiket dan nomor kendaraan secara otomatis.
- Setelah nomor tiket atau nomor kendaraan terisi, aplikasi meminta detail parking session dan tagihan ke backend.
- Aplikasi menampilkan informasi minimum:
  - nomor tiket;
  - plat nomor bila tersedia;
  - jenis kendaraan;
  - waktu masuk;
  - durasi;
  - total tagihan;
  - status sesi;
  - status pembayaran.
- Bila data tidak ditemukan, aplikasi menampilkan pesan kosong yang jelas tanpa membuat transaksi baru.
- Bila sesi sudah dibayar, aplikasi menampilkan status lunas dan mencegah pembayaran ganda.
- Bila hasil pencarian berdasarkan plat menghasilkan lebih dari satu sesi aktif, operator harus memilih sesi yang benar berdasarkan waktu masuk, jenis kendaraan, dan lane masuk.

### 6.4 Flow input tiket manual dan scan

- Mode input utama terdiri dari `Input manual` dan `Scan tiket`.
- Pada mode `Input manual`, field nomor plat menjadi input utama dan operator dapat mengisi nomor tiket bila tersedia.
- Pada mode `Scan tiket`, aplikasi menerima data scanner sebagai satu payload lalu memetakan data ke field nomor tiket dan nomor kendaraan.
- Setelah scan berhasil, aplikasi harus menampilkan nomor tiket dan nomor kendaraan yang terbaca sebelum operator melanjutkan pembayaran.
- Operator dapat mengoreksi nomor kendaraan hasil scan bila backend mengizinkan dan koreksi tersebut harus tercatat audit.
- Bila payload scan tidak valid, aplikasi menampilkan error dan tidak mengisi field secara parsial.
- Field hasil scan harus tetap bisa dibaca operator, tetapi perubahan manual setelah scan harus jelas dibedakan dari hasil scan asli.

### 6.5 Pembayaran cash

- Operator dapat memilih metode pembayaran cash.
- Aplikasi menampilkan total tagihan dan input jumlah uang diterima.
- Aplikasi menghitung kembalian di sisi UI untuk membantu operator, tetapi jumlah tagihan tetap berasal dari backend.
- Operator harus mengonfirmasi penerimaan cash sebelum transaksi dikirim.
- Setelah cash berhasil diterima, backend mengembalikan status pembayaran berhasil.
- Aplikasi harus mencegah submit ganda saat proses pembayaran sedang berjalan.
- Pembatalan pembayaran cash setelah berhasil hanya dapat dilakukan oleh permission supervisor dan harus meminta alasan.

### 6.6 Pembayaran QR

- Operator dapat memilih metode pembayaran QR.
- Aplikasi meminta pembuatan invoice atau payment intent ke backend.
- Aplikasi menampilkan QR yang diterima dari backend, bukan membuat payload payment gateway sendiri.
- QR harus memiliki waktu kedaluwarsa yang terlihat bagi operator.
- Aplikasi harus memperbarui status pembayaran sampai berhasil, gagal, kedaluwarsa, atau dibatalkan.
- Operator dapat membatalkan QR yang belum dibayar bila pelanggan memilih metode lain.
- Setelah QR berhasil dibayar, aplikasi menampilkan status lunas dan menutup alur pembayaran.

### 6.7 Status transaksi

Status pembayaran minimum:

| Status | Makna |
|---|---|
| `UNPAID` | Tagihan belum dibayar |
| `PENDING_QR` | QR sudah dibuat dan menunggu pembayaran |
| `PENDING_EMONEY` | Pembayaran e-money sedang diproses |
| `PAID` | Pembayaran berhasil |
| `FAILED` | Pembayaran gagal |
| `EXPIRED` | QR kedaluwarsa |
| `CANCELLED` | Transaksi pembayaran dibatalkan |

Transisi status harus divalidasi oleh backend. POS Electron hanya menampilkan status dan mengirim permintaan aksi.

### 6.8 Mode manless di exit lane

- Mode manless dapat diaktifkan per POS atau per exit lane melalui konfigurasi.
- Pada mode manless, layar utama menampilkan instruksi sederhana untuk pengemudi melakukan scan tiket.
- Pengemudi melakukan scan tiket pada scanner exit.
- Setelah scan berhasil, aplikasi menampilkan nomor tiket, nomor kendaraan bila tersedia, durasi parkir, dan total tagihan.
- Jika pembayaran QR tersedia, aplikasi meminta payment intent ke backend dan menampilkan QR pada display pelanggan.
- QR pembayaran harus menampilkan sisa waktu kedaluwarsa dan status pembayaran terkini.
- Setelah QR berhasil dibayar, backend mengembalikan status `PAID` dan izin keluar.
- Jika pembayaran e-money tersedia, aplikasi menampilkan instruksi agar pengemudi melakukan tap kartu pada reader e-money di exit.
- Pada pembayaran e-money, pemotongan saldo dilakukan saat tap di exit berdasarkan total tagihan yang dikonfirmasi backend.
- Aplikasi harus menampilkan status e-money: menunggu tap, memproses, berhasil, saldo tidak cukup, kartu tidak terbaca, gagal, atau timeout.
- Setelah e-money berhasil terdebit, backend mengembalikan status `PAID` dan izin keluar.
- Setelah backend memberi izin keluar, sistem mengirim perintah buka palang melalui jalur operasional yang disetujui.
- Jika pembayaran gagal atau timeout, aplikasi kembali menampilkan opsi pembayaran yang tersedia tanpa membuat pembayaran ganda.
- Jika tiket tidak valid, sudah lunas, atau sesi tidak ditemukan, display harus menampilkan pesan yang dapat dipahami pengemudi dan mengarahkan untuk menghubungi operator.
- Mode manless tidak menyediakan pembayaran cash langsung pada pengemudi.

### 6.9 Pembayaran e-money

- Pembayaran e-money hanya tersedia pada perangkat exit yang memiliki reader e-money tersertifikasi dan aktif.
- POS Electron menerima event dari reader atau backend untuk status tap dan hasil debit.
- Nominal debit harus berasal dari backend, bukan dihitung di POS Electron.
- Setiap permintaan debit harus memiliki payment reference dan idempotency key.
- Bila saldo tidak cukup, aplikasi menampilkan pesan saldo tidak cukup dan tidak membuka palang.
- Bila kartu tidak terbaca, aplikasi meminta pengemudi melakukan tap ulang.
- Bila debit berhasil tetapi perintah buka palang gagal, status pembayaran tetap lunas dan sistem harus memberi instruksi bantuan operator.
- Refund, void, atau koreksi transaksi e-money tidak dilakukan dari flow pengemudi dan harus mengikuti prosedur supervisor/back office.

### 6.10 Bukti pembayaran

- Setelah pembayaran berhasil, aplikasi dapat mencetak bukti pembayaran bila printer tersedia.
- Bukti pembayaran minimal berisi nomor tiket, waktu masuk, waktu bayar, metode pembayaran, total, operator, dan nomor referensi pembayaran.
- Bila printer gagal, status pembayaran tidak boleh dibatalkan otomatis.
- Operator dapat mencetak ulang bukti pembayaran sesuai permission.

### 6.11 Operasi palang pintu

- Operator dapat membuka palang pintu hanya setelah status pembayaran `PAID` dan backend mengembalikan izin keluar.
- Tombol buka palang harus nonaktif untuk transaksi `UNPAID`, `PENDING_QR`, `FAILED`, `EXPIRED`, atau `CANCELLED`.
- Pada mode manless, perintah buka palang dapat berjalan otomatis setelah status `PAID` dan izin keluar diterima dari backend.
- Perintah buka palang harus dikirim ke backend operasional, bukan langsung ke perangkat dari renderer Electron.
- Backend harus memvalidasi permission operator, status pembayaran, status sesi parkir, lane tujuan, dan idempotency key sebelum meneruskan perintah.
- Aplikasi harus menampilkan hasil perintah buka palang: berhasil, gagal, timeout, atau perlu tindakan manual.
- Bila perintah buka palang gagal setelah pembayaran berhasil, status pembayaran tetap lunas dan operator dapat mencoba ulang sesuai permission.
- Override buka palang tanpa pembayaran lunas hanya boleh dilakukan oleh supervisor, harus meminta alasan, dan harus tercatat audit.

### 6.12 Riwayat transaksi lokal

- Operator dapat melihat transaksi pada shift aktif.
- Supervisor dapat melihat transaksi berdasarkan rentang waktu terbatas.
- Riwayat harus membedakan transaksi cash, QR berhasil, QR gagal, QR kedaluwarsa, e-money berhasil, e-money gagal, dan pembatalan.
- Data riwayat berasal dari backend; cache lokal hanya untuk mempercepat tampilan dan tidak menjadi sumber kebenaran.

### 6.13 Mode koneksi terganggu

- Aplikasi harus menampilkan status online atau offline.
- Saat offline, aplikasi tidak boleh membuat status pembayaran final tanpa konfirmasi backend.
- Pembayaran QR tidak dapat dibuat saat POS tidak bisa menghubungi backend.
- Pembayaran e-money tidak dapat diproses saat POS atau reader tidak bisa menghubungi backend/acquirer yang dibutuhkan.
- Palang pintu tidak boleh dibuka dari POS saat aplikasi tidak bisa menghubungi backend operasional, kecuali tersedia prosedur override manual di luar aplikasi.
- Pembayaran cash offline hanya boleh tersedia bila kebijakan operasional mengizinkan, dan harus menggunakan nomor transaksi lokal yang disinkronkan ulang. Bila kebijakan belum diputuskan, default awal adalah tidak mengizinkan cash offline.
- Semua kegagalan koneksi harus ditampilkan dengan pesan yang bisa ditindaklanjuti operator.

## 7. Kebutuhan integrasi

### 7.1 Site Server

POS Electron membutuhkan API Site Server untuk:

- autentikasi atau validasi sesi operator;
- pencarian tiket atau parking session;
- pengambilan total tagihan;
- pembuatan payment intent QR;
- pembuatan payment intent e-money atau request debit ke acquirer;
- polling atau subscription status pembayaran;
- pencatatan pembayaran cash;
- penerimaan status debit e-money;
- pembatalan payment intent;
- pencetakan ulang atau pengambilan data bukti pembayaran;
- penerbitan izin keluar;
- pembukaan palang pintu pada lane terkait setelah pembayaran lunas.

### 7.2 Central Backend

Central Backend dibutuhkan untuk:

- sinkronisasi user, role, permission, dan konfigurasi site;
- audit administratif;
- konfigurasi device POS bila POS didaftarkan sebagai device;
- laporan atau settlement final pada iterasi berikutnya.

POS Electron tidak boleh langsung mengubah master data Central.

### 7.3 Payment gateway

- Integrasi payment gateway dilakukan melalui backend, bukan langsung dari Electron.
- Secret key, credential merchant, dan callback signature tidak boleh disimpan di POS Electron.
- POS Electron hanya menerima data aman untuk ditampilkan, seperti QR image, QR string, expiry time, amount, payment reference, dan status transaksi.

### 7.4 Perangkat manless

Perangkat manless minimum:

- customer display untuk instruksi, tagihan, QR, dan status pembayaran;
- scanner tiket untuk membaca barcode/QR tiket parkir;
- reader e-money untuk tap kartu di exit;
- koneksi ke lane controller atau jalur backend untuk membuka palang;
- indikator atau pesan bantuan saat transaksi gagal.

Semua event perangkat harus dikirim ke backend dengan correlation id dan identitas device.

## 8. Kebutuhan UI

- Bahasa antarmuka: Bahasa Indonesia.
- Layar utama harus fokus untuk kerja loket: pencarian tiket, ringkasan tagihan, pilihan pembayaran, dan status transaksi.
- Layar manless harus fokus untuk pengemudi: instruksi scan tiket, tagihan, QR pembayaran, instruksi tap e-money, status pembayaran, dan instruksi keluar.
- Status koneksi harus selalu terlihat.
- Total tagihan dan status pembayaran harus sangat jelas.
- Tombol aksi utama harus dibedakan:
  - `Terima cash`;
  - `Tampilkan QR`;
  - `Batalkan QR`;
  - `Cetak bukti`;
  - `Buka palang`;
  - `Transaksi berikutnya`.
- UI harus mendukung penggunaan keyboard dan scanner barcode/QR.
- UI manless harus memiliki teks besar, kontras jelas, dan tidak menampilkan kontrol operator yang tidak relevan bagi pengemudi.
- Tidak boleh ada grafik dummy atau data palsu.

## 9. Kebutuhan keamanan

- Aplikasi harus memakai HTTPS atau koneksi lokal aman yang disepakati untuk komunikasi backend.
- Token/sesi lokal harus disimpan di secure storage milik OS bila memungkinkan.
- Aplikasi harus membatasi akses DevTools di build produksi.
- Aplikasi harus melakukan auto-update hanya dari sumber yang dipercaya dan ditandatangani.
- Semua aksi pembayaran harus memiliki idempotency key untuk mencegah transaksi ganda.
- Semua aksi buka palang harus memiliki idempotency key untuk mencegah perintah ganda yang tidak disengaja.
- Semua aksi korektif seperti pembatalan, override, buka palang manual, dan cetak ulang harus mencatat actor, waktu, alasan, dan device POS.

## 10. Data lokal

Data lokal yang boleh disimpan:

- konfigurasi endpoint Site Server;
- identitas device POS;
- cache ringan user/session yang masih valid;
- preferensi UI non-kritis;
- antrean event lokal bila mode offline disetujui pada iterasi berikutnya.

Data lokal yang tidak boleh disimpan:

- credential payment gateway;
- password plaintext;
- detail kartu atau data pembayaran sensitif;
- nomor kartu e-money lengkap atau data sensitif reader;
- master data sebagai sumber kebenaran permanen;
- tarif yang dipakai untuk menghitung tagihan.

## 11. Audit dan logging

- Setiap aksi pembayaran harus memiliki correlation id.
- Log aplikasi harus mencatat error teknis tanpa membocorkan data sensitif.
- Audit operasional minimal mencatat:
  - login dan logout operator;
  - mulai dan tutup shift;
  - pembayaran cash berhasil;
  - QR dibuat;
  - QR dibatalkan;
  - pembayaran QR berhasil;
  - pembayaran e-money berhasil;
  - pembayaran e-money gagal;
  - palang pintu dibuka;
  - percobaan buka palang gagal;
  - cetak ulang bukti;
  - pembatalan atau override oleh supervisor.
- Audit final disimpan di backend, bukan hanya file lokal POS.

## 12. Requirement non-fungsional

### Performa

- Pencarian tiket normal harus terasa responsif pada jaringan lokal.
- Tampilan QR harus muncul segera setelah backend mengembalikan payment intent.
- Instruksi tap e-money harus muncul segera setelah tagihan siap dan reader tersedia.
- UI tidak boleh freeze saat polling status pembayaran atau mencetak bukti.

### Reliabilitas

- Submit pembayaran harus idempotent.
- Aplikasi harus aman terhadap klik ganda dan retry jaringan.
- Aplikasi harus dapat dibuka ulang tanpa kehilangan status transaksi yang sudah dikonfirmasi backend.

### Kompatibilitas

- Target awal: Windows 10/11 untuk komputer loket.
- Dukungan Linux dapat dipertimbangkan bila perangkat site memakai Linux.
- Resolusi minimum harus ditentukan setelah perangkat POS aktual diketahui.

### Observability

- Build produksi harus memiliki log lokal yang dapat diekspor teknisi.
- Error penting harus memiliki kode atau pesan yang mudah dilaporkan.
- Versi aplikasi harus terlihat di halaman bantuan atau pengaturan.

## 13. Konfigurasi awal

Konfigurasi minimum yang dibutuhkan saat instalasi:

- URL Site Server;
- identitas device POS;
- nama loket atau lane terkait;
- gate atau palang pintu terkait;
- mode operasional: operator atau manless;
- customer display terkait;
- scanner tiket terkait;
- reader e-money terkait;
- printer default bila tersedia;
- mode update aplikasi;
- batas timeout sesi operator;
- opsi scanner input.

Perubahan konfigurasi sensitif harus membutuhkan permission teknisi atau supervisor.

## 14. Risiko dan keputusan yang perlu dikonfirmasi

- Provider pembayaran QR yang akan digunakan.
- Provider/acquirer e-money dan protokol reader yang akan digunakan.
- Apakah pembayaran cash offline diizinkan atau tidak.
- Jalur teknis buka palang: lewat Site Server, Lane Controller API, atau mekanisme operasional lain.
- Apakah mode manless memakai aplikasi Electron yang sama atau build khusus customer display.
- Apakah authentication POS langsung ke Site Server atau lewat Central.
- Mekanisme sinkronisasi permission dari Central ke Site Server.
- Format bukti pembayaran dan kebutuhan printer thermal.
- Skema auto-update dan distribusi installer.

## 15. Kriteria penerimaan awal

- Operator dapat login dan melihat status koneksi.
- Operator dapat mencari tagihan parkir yang valid.
- Operator dapat menerima pembayaran cash sampai status lunas.
- Operator dapat membuat QR pembayaran dan melihat QR di layar.
- Aplikasi dapat memperbarui status QR sampai berhasil atau kedaluwarsa.
- Pada mode manless, pengemudi dapat scan tiket dan melihat QR pembayaran di customer display.
- Pada mode manless, pengemudi dapat tap e-money di exit dan saldo terdebit sesuai tagihan.
- Pada mode manless, palang terbuka otomatis setelah QR atau e-money berhasil dan backend memberi izin keluar.
- Operator dapat membuka palang pintu setelah pembayaran lunas dan backend memberi izin keluar.
- Tombol buka palang nonaktif bila pembayaran belum lunas.
- Pembayaran yang sudah lunas tidak dapat dibayar ulang.
- Klik ganda pada tombol bayar tidak membuat transaksi ganda.
- Klik ganda pada tombol buka palang tidak mengirim perintah ganda.
- Semua aksi pembayaran memiliki correlation id dan tercatat di backend.
- Aplikasi menampilkan error koneksi dengan jelas tanpa crash.
- Supervisor dapat membatalkan QR pending dengan alasan.
