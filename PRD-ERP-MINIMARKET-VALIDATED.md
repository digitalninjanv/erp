# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# ERP Modular Minimarket — POS, Gudang & Akuntansi

| Informasi | Nilai |
|---|---|
| Versi | 2.1 — audited refinement |
| Status | Spesifikasi baseline; wajib mengikuti addendum normatif dan audit repository |
| Tanggal | 30 Oktober 2026 |
| Bahasa / mata uang / zona waktu | Indonesia / IDR / Asia-Jakarta |
| Operasional | Satu toko, beberapa lokasi stok |
| Katalog target | 10.000+ produk |
| Arsitektur | Modular monolith |
| Stack target | TypeScript, Next.js, React, PostgreSQL, Drizzle ORM, Tailwind CSS |
| POS offline | PWA, Service Worker, IndexedDB (Dexie opsional) |
| Pengujian | Vitest dan Playwright |

> **Penting:** PRD ini menetapkan stack target, tetapi AI agent wajib mengaudit repository terbaru sebelum mengubah teknologi. Pertahankan stack dan fitur yang masih baik. Jangan melakukan rewrite total atau migrasi framework tanpa alasan teknis terukur, rencana migrasi, dan persetujuan.

---

## 0. Instruksi Utama untuk AI Coding Agent

Bertindak sebagai tim engineering senior yang mencakup product analysis, software architecture, database engineering, UI/UX, security, QA, dan domain ERP/akuntansi.

Tugas bukan sekadar membuat tampilan atau CRUD. Hasil akhir harus menjadi sistem operasional yang menjaga konsistensi transaksi, stok, kas, piutang/utang, dan jurnal.

### Urutan kerja wajib

1. **Repository discovery:** baca struktur folder, package manifest, lockfile, konfigurasi, environment example, dokumentasi, schema, migration, route, API, komponen UI, test, dan workflow deploy.
2. **Baseline audit:** jalankan aplikasi, lint, typecheck, test, dan build yang tersedia. Catat fitur yang bekerja, bug yang dapat direproduksi, debt, risiko keamanan, bottleneck, dan bagian yang harus dipertahankan.
3. **Requirement mapping:** petakan setiap kebutuhan PRD ke kode yang ada dengan status `implemented`, `partial`, `missing`, `broken`, atau `needs-decision`.
4. **Architecture Decision Records (ADR):** dokumentasikan keputusan penting, alternatif, alasan, dampak, dan rencana migrasi.
5. **Implementation plan:** pecah pekerjaan menjadi milestone kecil. Setiap milestone memiliki ruang lingkup, dependensi, acceptance criteria, test plan, risiko, dan rollback.
6. **Implementasi bertahap:** perubahan kecil, mudah direview, tidak menggandakan logika, dan tidak membuat abstraksi berlebihan.
7. **Validasi:** jalankan lint, typecheck, unit/integration/e2e test, build, migration test, dan uji responsivitas sesuai perubahan.
8. **Handover:** perbarui dokumentasi, diagram, konfigurasi, catatan keputusan, known issues, dan petunjuk operasional.

### Larangan

- Jangan menghapus fitur lama sebelum fungsi penggantinya terbukti dan regresi lulus.
- Jangan membuat mock data seolah-olah data produksi.
- Jangan menyatakan test, integrasi, atau kepatuhan berhasil jika belum benar-benar diuji.
- Jangan menaruh seluruh aplikasi dalam satu file, satu komponen raksasa, atau satu service generik.
- Jangan membuat microservices, message broker, Kubernetes, atau infrastruktur kompleks tanpa kebutuhan terukur.
- Jangan mengakses database langsung dari komponen UI.
- Jangan menghitung uang dengan floating point biner.
- Jangan menghapus transaksi yang sudah diposting; gunakan reversal/koreksi yang dapat diaudit.
- Jangan menyimpan secret, password, token, atau data sensitif di repository maupun log.
- Jangan menganggap gambar QRIS atau screenshot pelanggan sebagai bukti pembayaran otomatis.
- Jangan mengimpor data Accurate.id ke produksi sebelum preview, validasi, backup, dry-run, dan persetujuan pengguna.

---

## 1. Visi, Sasaran, dan Prinsip Produk

### 1.1 Visi

ERP minimarket yang mudah dipakai kasir, petugas gudang, pemilik, dan staf keuangan. Sistem terdiri dari tiga modul utama yang terpisah secara navigasi dan tanggung jawab, tetapi terhubung melalui aturan bisnis dan sumber data yang konsisten.

### 1.2 Modul

1. **POS:** transaksi kasir, pembayaran, shift, hold order, pesanan antar, piutang pelanggan, retur, refund, void, dan nota.
2. **Gudang:** produk, barcode, pemasok, pembelian, penerimaan, lokasi stok, transfer, stok opname, barang rusak/kedaluwarsa, dan retur pemasok.
3. **Akuntansi:** bagan akun, jurnal, kas/bank, beban, utang-piutang, penggajian, pajak dasar, dan laporan keuangan.

### 1.3 Sasaran

- Menangani katalog sekurang-kurangnya 10.000 produk dengan pencarian dan daftar responsif.
- Menyediakan POS online dan offline dengan sinkronisasi idempotent.
- Memastikan transaksi operasional menghasilkan perubahan stok dan jurnal yang benar.
- Memungkinkan admin membuat role dan izin sesuai pekerjaan, termasuk akses POS saja atau Gudang saja.
- Mendukung migrasi Accurate.id berdasarkan file ekspor yang benar-benar tersedia.
- Menyediakan audit trail untuk perubahan data dan transaksi sensitif.
- Memiliki UI profesional, konsisten, cepat dipahami, dan bebas masalah layout.

### 1.4 Prinsip

- Data integrity first.
- Secure by default dan least privilege.
- Modular monolith, bukan monolit tanpa batas domain.
- Single source of truth untuk transaksi dan saldo.
- Workflow dan status eksplisit.
- Idempotency untuk operasi yang dapat diulang.
- Auditability: perubahan penting dapat ditelusuri.
- Progressive disclosure: informasi sesuai tugas pengguna.
- Konfigurasi untuk variasi bisnis; jangan membuat semua hal menjadi custom scripting.

---

## 2. Asumsi dan Batas Lingkup

### 2.1 Asumsi yang disepakati

- Baseline kode akan diberikan pengguna dalam versi terbaru.
- Satu toko dengan beberapa lokasi stok, bukan multi-cabang penuh.
- POS wajib bekerja offline pada perangkat yang sudah login dan memiliki data lokal yang diperlukan.
- Migrasi Accurate.id mencakup master data, saldo awal, dan seluruh riwayat yang tersedia serta dapat dipetakan secara valid.
- Metode biaya persediaan: **moving weighted average / rata-rata tertimbang bergerak**.
- QRIS: gambar QRIS statis yang diunggah admin, verifikasi pembayaran manual.
- Akuntansi lengkap, penggajian, dan pajak dasar.
- Bahasa Indonesia, mata uang IDR, zona waktu `Asia/Jakarta`.
- Role dan permission dapat dikonfigurasi admin.
- Target katalog awal 10.000+ produk.

### 2.2 Asumsi teknis sementara

- PostgreSQL sebagai database utama.
- Next.js + React + TypeScript untuk web application.
- Drizzle ORM dan SQL migration untuk akses database.
- Tailwind CSS dengan design system khusus.
- PWA + Service Worker + IndexedDB untuk offline POS.
- Vitest untuk unit/integration test dan Playwright untuk end-to-end test.
- Modular monolith dalam satu deployment selama skala dan kebutuhan belum membenarkan pemisahan layanan.

Jika repository yang diberikan sudah menggunakan teknologi berbeda tetapi masih stabil, aman, teruji, dan memenuhi kebutuhan, agent wajib menyajikan perbandingan biaya migrasi sebelum menggantinya.

### 2.3 Batas lingkup awal

Tidak wajib pada rilis pertama kecuali repository sudah memilikinya:
- Multi-company dan multi-cabang penuh.
- QRIS dinamis/payment gateway.
- Integrasi bank otomatis.
- Integrasi e-Faktur atau pelaporan pajak otomatis.
- Integrasi marketplace/e-commerce.
- Aplikasi native Android/iOS.
- Microservices dan event streaming.

---

## 3. Pengguna, Role, dan Permission

### 3.1 Prinsip RBAC

Gunakan Role-Based Access Control (RBAC) yang diperiksa di server/API. Menyembunyikan menu di frontend bukan kontrol keamanan.

- Default deny: akses ditolak kecuali izin diberikan.
- Least privilege: role hanya memiliki izin yang diperlukan.
- Pisahkan izin `view`, `create`, `update`, `post`, `approve`, `void`, `refund`, `export`, dan `manage`.
- Izin sensitif dapat membutuhkan approval, alasan wajib, batas nominal, atau autentikasi ulang.
- Semua perubahan role, permission, dan aksi sensitif dicatat dalam audit log.
- Admin dapat membuat, mengubah, menyalin, menonaktifkan, dan menguji role.
- Jangan menghapus role yang masih dipakai tanpa proses pemindahan pengguna.
- Sediakan mekanisme pemulihan akses admin yang aman.

### 3.2 Role template awal

| Role | Akses default |
|---|---|
| Owner / Super Admin | Semua modul, konfigurasi, pengguna, role, backup, migrasi |
| Admin Operasional | POS dan Gudang; konfigurasi operasional sesuai izin |
| Supervisor | Approval void, retur, diskon, penyesuaian dan laporan yang diizinkan |
| Kasir | POS, shift sendiri, cetak nota; tidak otomatis dapat mengubah harga/master |
| Petugas Gudang | Produk dan stok, penerimaan, transfer, opname, retur pemasok |
| Akuntan | Jurnal, kas/bank, utang-piutang, beban, laporan |
| HR / Payroll | Data karyawan dan payroll |
| Auditor / Viewer | Read-only sesuai lingkup yang ditetapkan |

Role template bukan role permanen. Admin dapat membuat contoh role seperti `Kasir Tanpa Retur`, `Kasir Senior`, `Petugas Penerimaan`, atau `Manajer Laporan`.

### 3.3 Permission key yang disarankan

- POS: `pos.access`, `pos.sell`, `pos.discount.apply`, `pos.discount.override`, `pos.order.hold`, `pos.order.resume`, `pos.order.manage`, `pos.credit.create`, `pos.payment.receive`, `pos.return.create`, `pos.refund.approve`, `pos.void`, `pos.receipt.reprint`, `pos.shift.open`, `pos.shift.close`, `pos.report.view`.
- Gudang: `inventory.access`, `product.view`, `product.create`, `product.update`, `product.archive`, `inventory.receive`, `inventory.transfer`, `inventory.adjust`, `inventory.stocktake`, `inventory.damage`, `inventory.expiry`, `supplier.manage`, `purchase.create`, `purchase.approve`, `purchase.receive`, `purchase.return`.
- Akuntansi: `accounting.access`, `account.view`, `journal.create`, `journal.post`, `journal.reverse`, `bank.transfer`, `bank.reconcile`, `expense.create`, `receivable.manage`, `payable.manage`, `report.financial.view`, `report.financial.export`, `payroll.view`, `payroll.manage`, `payroll.approve`.
- Admin: `user.manage`, `role.manage`, `settings.manage`, `migration.preview`, `migration.execute`, `audit.view`, `backup.manage`.

### 3.4 Otorisasi dan approval

- Diskon melebihi limit kasir memerlukan izin override/approval.
- Void transaksi final, refund, retur bernilai tinggi, penyesuaian stok, dan perubahan biaya produk dapat memerlukan supervisor.
- Pengguna tidak boleh menyetujui tindakannya sendiri untuk proses yang mensyaratkan maker-checker.
- Ambang nominal, alasan wajib, dan level approval dapat dikonfigurasi.
- API harus menguji izin pada setiap aksi, termasuk endpoint ekspor dan background job.

---

## 4. Arsitektur dan Teknologi

### 4.1 Arsitektur target

Gunakan **modular monolith** dengan pemisahan domain tegas. Satu aplikasi dan satu database utama lebih mudah dioperasikan untuk skala awal, tetapi modul tidak boleh saling mengakses tabel atau aturan secara sembarangan.

```text
Web / PWA
├── POS UI
├── Gudang UI
├── Akuntansi UI
└── Admin & Settings UI
        |
Application/API Layer
├── Authentication & Authorization
├── POS Use Cases
├── Inventory & Purchasing Use Cases
├── Accounting Use Cases
├── Migration Use Cases
└── Reporting Use Cases
        |
Domain Layer
├── Sales
├── Payments
├── Inventory
├── Purchasing
├── Receivables & Payables
├── Accounting
├── Payroll
└── Identity & Access
        |
Infrastructure Layer
├── PostgreSQL
├── Drizzle ORM / SQL
├── File Storage Adapter
├── Print Adapter
├── Offline Sync Adapter
└── Audit / Observability
```

### 4.2 Stack target

| Area | Teknologi target | Ketentuan |
|---|---|---|
| Bahasa | TypeScript | Strict mode; hindari `any` tanpa alasan |
| Web framework | Next.js + React | Versi stabil dan kompatibel |
| UI styling | Tailwind CSS | Design token dan komponen konsisten |
| Database | PostgreSQL | Constraint, transaction, index, backup |
| ORM | Drizzle ORM | SQL dapat ditinjau; migration terkontrol |
| Offline | PWA, Service Worker, IndexedDB | Dexie opsional jika mengurangi kompleksitas |
| Validation | Zod atau validator setara | Validasi di boundary |
| Unit test | Vitest | Domain logic dan use cases |
| E2E | Playwright | Alur pengguna dan regresi UI |
| Logging | Structured logging | Hindari data sensitif |
| File | Storage adapter | Domain tidak terikat vendor |

Jangan menambah library hanya karena populer. Setiap dependency baru harus menjawab kebutuhan, ukuran bundle, status pemeliharaan, lisensi, keamanan, dan biaya maintenance.

### 4.3 Struktur folder yang disarankan

Struktur akhir disesuaikan dengan repository dan konvensi Next.js yang dipakai.

```text
src/
├── app/
│   ├── (auth)/
│   ├── (workspace)/
│   │   ├── modules/
│   │   │   ├── pos/
│   │   │   ├── inventory/
│   │   │   └── accounting/
│   │   └── settings/
│   └── api/
├── modules/
│   ├── identity/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── pos/
│   ├── inventory/
│   ├── purchasing/
│   ├── accounting/
│   ├── payroll/
│   └── migration/
├── shared/
│   ├── kernel/
│   ├── database/
│   ├── auth/
│   ├── validation/
│   ├── ui/
│   ├── formatting/
│   └── observability/
└── tests/
    ├── integration/
    └── fixtures/

drizzle/
├── schema/
└── migrations/

docs/
├── architecture/
├── adr/
├── workflows/
├── operations/
└── testing/
```

**Aturan struktur kode:**
- `app/` hanya untuk routing, layout, page composition, dan adapter tipis; jangan menaruh aturan bisnis utama di page.
- `domain/` berisi entity, value object, invariant, domain policy, dan aturan inti tanpa ketergantungan UI.
- `application/` berisi use case, orchestration, DTO, dan transaction boundary.
- `infrastructure/` berisi repository implementation, database, file, printer, dan integrasi eksternal.
- `presentation/` berisi komponen UI khusus domain bila memang dibutuhkan.
- `shared/` hanya untuk hal yang benar-benar dipakai lintas domain; jangan menjadi tempat menaruh semua kode.
- Modul tidak boleh mengimpor tabel internal modul lain untuk mengubah data secara langsung. Gunakan application service/public contract eksplisit.
- Hindari circular dependency.
- Satu file memiliki satu tanggung jawab jelas. Pecah file ketika kompleksitas atau perubahan bersama membuatnya sulit dipahami; jangan memecah mekanis menjadi banyak file satu fungsi.
- Nama file, fungsi, tipe, dan folder harus konsisten serta deskriptif.
- Hindari `utils.ts` raksasa, `services.ts` raksasa, global state yang tidak perlu, dan generic repository yang menyembunyikan query penting.
- Setiap perubahan schema database harus melalui migration yang dapat direview.

### 4.4 Aturan transaksi dan database

- Semua transaksi finansial dan perubahan stok multi-record menggunakan database transaction.
- Gunakan foreign key, unique constraint, check constraint, dan index berdasarkan query nyata.
- Gunakan decimal/numeric atau integer satuan terkecil untuk uang; jangan gunakan floating point sebagai sumber kebenaran nominal.
- Tetapkan strategi concurrency stok: row lock, optimistic versioning, atau atomic update yang sesuai.
- Terapkan idempotency key untuk checkout, sync, payment receipt, posting jurnal, dan import batch.
- Gunakan pagination server-side untuk tabel besar.
- Hindari N+1 query dan mengambil semua produk ke client.
- Pisahkan status dokumen dari saldo hasil posting.
- Perubahan stok hanya melalui inventory ledger/document posting; jangan mengedit saldo stok langsung.
- Perubahan transaksi final melalui reversal/adjustment, bukan delete.

### 4.5 Domain boundaries

- POS tidak menghitung jurnal sendiri; POS memanggil application service yang menghasilkan efek inventory dan accounting.
- Inventory tidak mengubah data pembayaran; perubahan yang memengaruhi nilai persediaan mengirim sumber transaksi ke accounting.
- Accounting tidak mengedit transaksi POS/Gudang; akuntansi menerima dokumen sumber atau adjustment yang sah.
- Semua modul memakai identitas produk, satuan, lokasi, pihak, dan dokumen yang konsisten.
- Reporting membaca query model terkontrol; laporan tidak mengubah data.

---

## 5. Navigasi dan UI/UX

### 5.1 Launcher dan modul

Halaman awal menampilkan tiga kartu modul: **POS**, **Gudang**, dan **Akuntansi**.

Ketika pengguna membuka modul:
- tampilkan sidebar dan submenu modul tersebut saja;
- jangan mencampur menu modul lain;
- sediakan tombol kembali ke launcher dan module switcher;
- tampilkan nama pengguna, role, status koneksi/sinkronisasi, dan lokasi aktif bila relevan;
- menu hanya ditampilkan sesuai permission, tetapi server tetap memvalidasi setiap request.

### 5.2 Arah visual: business-grade, no AI slop

Target adalah software bisnis profesional, bukan dashboard template atau desain generik AI.

- Gunakan layout grid, spacing scale, typographic scale, warna status, radius, border, dan shadow konsisten.
- Utamakan keterbacaan dan kepadatan informasi wajar; jangan memenuhi layar dengan kartu dekoratif.
- Warna netral untuk struktur, satu warna utama untuk aksi primer, dan warna status hanya untuk success/warning/danger/info.
- Hindari gradien dekoratif berlebihan, glassmorphism, neon, animasi yang tidak membantu, emoji sebagai ikon antarmuka, dan ilustrasi stok yang tidak relevan.
- Gunakan satu keluarga ikon secara konsisten.
- Gunakan komponen UI aksesibel dan reusable.
- Dark mode bukan prioritas di atas usability.

### 5.3 UX berdasarkan modul

**POS**
- Layar kasir fokus pada pencarian/barcode, daftar item, total, pembayaran, dan aksi penting.
- Optimalkan keyboard flow dan scanner barcode.
- Tombol bayar jelas dan tidak mudah tertekan tidak sengaja.
- Tampilkan status offline dan waktu sync terakhir.
- Jangan memunculkan dashboard analitik yang mengganggu proses kasir.

**Gudang**
- Tabel produk dan pergerakan stok menjadi pusat kerja.
- Filter, pencarian, sort, pagination, bulk action dengan konfirmasi, dan ekspor sesuai izin.
- Form penerimaan/transfer/opname menggunakan langkah jelas dan ringkasan dampak stok.

**Akuntansi**
- Prioritaskan tabel, periode, filter, debit/kredit, saldo, drill-down ke dokumen sumber, dan status posting.
- Format laporan konsisten, mudah dibaca, dan dapat dicetak.
- Informasi payroll dan data sensitif tidak terlihat oleh role yang tidak berhak.

### 5.4 Responsivitas dan aksesibilitas

- Desktop: optimalkan layout kerja tabel dan laporan.
- Tablet: adaptasi sidebar dan form tanpa kehilangan aksi penting.
- Mobile: navigasi ringkas, tabel adaptif, POS tetap mudah disentuh.
- Uji lebar 360 px, 390 px, 768 px, 1024 px, dan desktop lebar.
- Tidak boleh ada horizontal overflow yang tidak disengaja, text clipping, modal keluar viewport, tombol tertutup, atau form yang tidak dapat diselesaikan.
- Semua input memiliki label, error, focus state, dan keyboard navigation.
- Status tidak hanya dibedakan dengan warna.
- Loading, empty, error, offline, permission denied, dan success state harus dirancang.

### 5.5 Design system

Dokumentasikan design token dan komponen:
- Button, input, select, combobox, date picker, checkbox, radio, switch.
- Dialog, drawer, popover, toast, alert, tooltip.
- Table, pagination, filter bar, empty state, skeleton.
- Status badge, breadcrumb, tabs, sidebar, module card.
- Currency input, quantity input, barcode input.
- Receipt preview, print layout, report header.
- Form section, validation summary, confirmation dialog.

Komponen memiliki state disabled/loading/error/focus dan aturan penggunaan. Jangan membuat komponen baru bila yang sudah ada memadai.

---

## 6. Modul POS

### 6.1 Penjualan kasir

- Scan barcode dengan scanner keyboard-wedge.
- Cari berdasarkan SKU, barcode, nama, atau alias produk.
- Tambah item, ubah kuantitas, hapus item sesuai izin.
- Tampilkan harga, satuan, diskon, subtotal, pajak jika berlaku, dan total.
- Validasi produk aktif, harga berlaku, kuantitas, stok, dan aturan diskon.
- Simpan snapshot nama/SKU/harga/satuan/diskon/pajak saat transaksi agar histori tidak berubah ketika master produk diperbarui.
- Nomor transaksi unik dan dapat ditelusuri.
- Dukungan tunai, QRIS statis, dan split payment sesuai konfigurasi.
- Perhitungan nominal diterima, kekurangan, dan kembalian.
- Cegah submit ganda akibat double click, refresh, retry, atau koneksi putus.

### 6.2 QRIS statis

- Admin dapat mengunggah gambar QRIS, memberi nama metode, status aktif, dan instruksi pembayaran.
- Validasi file gambar, ukuran, tipe, dan preview.
- Kasir menampilkan QRIS dan nominal yang harus dibayar.
- Kasir menandai pembayaran setelah memeriksa bukti melalui prosedur toko.
- Simpan siapa yang memverifikasi, waktu, nominal, dan referensi/catatan bila ada.
- Gambar QRIS bukan payment confirmation; jangan mengubah status menjadi lunas hanya karena QR ditampilkan.
- Jika offline dan tidak ada cara verifikasi, simpan sebagai pending/unpaid atau gunakan metode lain yang diizinkan.

### 6.3 Diskon dan kelompok pelanggan

- Admin dapat membuat kelompok: Mahasiswa, Pelanggan Tetap, Grosir, dan lainnya.
- Diskon dapat berupa persentase atau nominal.
- Atur cakupan diskon: produk, kategori, kelompok pelanggan, atau total transaksi.
- Atur masa berlaku, prioritas, produk pengecualian, kombinasi diskon, batas nominal, dan role yang boleh override.
- Tampilkan rincian diskon di layar dan nota.
- Simpan nilai diskon aktual sebagai snapshot transaksi.
- Cegah diskon ganda yang tidak diizinkan.

### 6.4 Pembulatan

- Konfigurasi kelipatan Rp500/Rp1.000 atau aturan lain.
- Default rekomendasi: pembulatan total pembayaran tunai setelah diskon dan pajak; QRIS menggunakan nominal tagihan aktual kecuali kebijakan bisnis menetapkan lain.
- Simpan subtotal, diskon, pajak, rounding adjustment, total tagihan, tender, dan kembalian secara terpisah.
- Pembulatan tidak boleh diam-diam mengubah harga master atau harga item.
- Tampilkan penyesuaian pembulatan di nota dan jurnal sesuai kebijakan akuntansi.
- Uji nilai di bawah, tepat, dan di atas titik pembulatan.

### 6.5 Hold order dan pesanan pelanggan

Bedakan:
1. **Hold cart:** keranjang sementara ditahan, belum menjadi penjualan, belum mengurangi stok final, dan belum membuat jurnal.
2. **Customer order/delivery order:** pesanan pelanggan dengan kontak seperlunya, item, kuantitas, alamat/tujuan, jadwal, biaya kirim, status, pembayaran, dan petugas.
3. **Purchase order pemasok:** pemesanan barang ke pemasok, bukan pesanan pelanggan.

Status pesanan pelanggan:
`draft → confirmed → reserved (opsional) → picking → ready → dispatched → delivered → completed`.

Cabang: `partially_paid`, `unpaid`, `cancelled`, `returned`.

- Reservasi stok dapat dikonfigurasi dan dibedakan dari stok fisik.
- Pembatalan pesanan melepas reservasi.
- Pengiriman/penyelesaian memicu posting sesuai kebijakan.
- Perubahan status harus memvalidasi transisi dan izin.
- Riwayat status tidak dihapus.

### 6.6 Piutang pelanggan dan pembayaran sebagian

- Penjualan kredit hanya untuk pelanggan yang dicatat dan memiliki izin/kebijakan kredit.
- Simpan nilai tagihan, pembayaran awal, sisa piutang, tanggal jatuh tempo, dan histori penagihan.
- Dukung pembayaran sebagian dan pelunasan.
- Pembayaran harus dialokasikan ke tagihan yang benar.
- Cetak nota penjualan kredit dan kwitansi pembayaran.
- Sediakan daftar jatuh tempo dan aging piutang.
- Batas kredit dan approval dapat dikonfigurasi.
- Retur setelah pembayaran harus menghasilkan saldo piutang/refund yang benar; jangan menghapus penerimaan yang sudah diposting.

### 6.7 Retur, refund, void, pembatalan

Bedakan void sebelum transaksi diposting, pembatalan order yang belum selesai, retur setelah transaksi final, refund uang, penukaran barang, dan koreksi transaksi melalui reversal.

- Transaksi final tidak dihapus.
- Retur harus merujuk transaksi/item asli dan membatasi kuantitas terhadap sisa yang dapat diretur.
- Catat alasan, kondisi barang, keputusan stok (layak jual/karantina/rusak), pengguna, approver, waktu, dan metode refund.
- Refund dibatasi oleh nilai pembayaran/retur yang valid.
- Aksi bernilai tinggi memerlukan approval sesuai konfigurasi.
- Dampak stok, kas, piutang, pajak, dan jurnal harus konsisten.
- Nota retur/refund dapat dicetak.

### 6.8 Shift dan kas

- Buka shift dengan kas awal.
- Catat kas masuk/keluar non-penjualan dengan alasan dan izin.
- Catat setoran kas, pergantian kasir, dan penanggung jawab.
- Tutup shift dengan expected cash, actual cash, variance, catatan, dan approval jika perlu.
- Shift final tidak diedit diam-diam.
- Laporan shift per metode pembayaran, transaksi, retur, refund, pengeluaran, setoran, dan selisih.
- Kasir hanya dapat mengakses shift sendiri kecuali diberi izin.

### 6.9 Nota dan printer

- Template dapat mengatur logo, nama toko, alamat, kontak, footer, pesan, kebijakan retur, ukuran kertas 58/80 mm, dan A4 jika didukung.
- Nota memuat nomor, tanggal, kasir, item, qty, harga, diskon, subtotal, pajak, pembulatan, total, pembayaran, kembalian, dan footer.
- Preview, test print, print, dan reprint.
- Reprint dicatat di audit log.
- Pisahkan print stylesheet dari tampilan aplikasi.
- Uji printer dan browser nyata sebelum mengklaim dukungan model tertentu.

---

## 7. Modul Gudang dan Persediaan

### 7.1 Master produk

Field minimal: ID internal, nama, SKU, kategori, satuan dasar, harga jual, status aktif, atribut pajak bila relevan.

- Barcode boleh kosong; dukung lebih dari satu barcode bila kebutuhan terbukti.
- Atribut tambahan: merek, varian, satuan pembelian, faktor konversi, pemasok utama, harga beli referensi, lokasi rak, gambar, batch, tanggal kedaluwarsa.
- SKU/barcode harus unik sesuai aturan normalisasi.
- Jangan membuat barcode palsu. Kode internal hanya dibuat jika diminta dan tidak bertabrakan.
- Produk yang sudah direferensikan transaksi diarsipkan, bukan dihapus.
- Perubahan harga master tidak mengubah transaksi historis.

### 7.2 Lokasi stok

Contoh lokasi yang dapat dibuat/diubah admin: Gudang Utama, Area Penjualan, Karantina, Barang Rusak, Area Retur, dan lokasi lain.

Setiap lokasi memiliki saldo dan ledger sendiri. POS menjual dari lokasi yang ditentukan. Jangan menganggap “POS” sebagai gudang tanpa konfigurasi eksplisit.

### 7.3 Penerimaan dan pembelian

Dokumen terpisah:
- Purchase Request (opsional).
- Purchase Order (PO).
- Goods Receipt/Penerimaan.
- Supplier Invoice/Tagihan.
- Supplier Payment/Pembayaran.
- Supplier Return/Retur.

Aturan:
- PO tidak menambah stok atau membuat utang final.
- Penerimaan yang diposting menambah stok.
- Tagihan pemasok mengakui utang sesuai aturan akuntansi.
- Dukung penerimaan parsial dan beberapa penerimaan untuk satu PO.
- Catat jumlah dipesan, diterima, ditolak, selisih, lokasi tujuan, biaya tambahan, dan petugas.
- Retur pemasok mendukung penggantian barang, nota kredit/potongan utang, atau refund.
- Retur tidak boleh melebihi jumlah diterima yang masih dapat diretur.
- Cetak PO, penerimaan, tagihan, dan retur.

### 7.4 Transfer lokasi

- Dokumen transfer mencatat asal, tujuan, item, qty, pembuat, penerima, dan waktu.
- Status: `draft`, `approved` (opsional), `in_transit` (opsional), `received`.
- Transfer langsung mengurangi lokasi asal dan menambah tujuan dalam satu transaksi atomik.
- Untuk transfer transit, stok berada di lokasi transit sampai diterima.
- Tidak boleh ada stok ganda atau hilang selama transfer.
- Biaya per unit mengikuti moving average; transfer internal tidak menciptakan laba/rugi.

### 7.5 Stock opname dan penyesuaian

- Opname per lokasi, kategori, atau rentang SKU.
- Dukung hitung fisik, scan barcode, dan impor hasil hitung.
- Simpan snapshot saldo saat sesi dimulai, hasil hitung, selisih, alasan, petugas, approver, dan waktu.
- Cegah hasil opname menimpa pergerakan selama sesi; gunakan locking/versioning atau perhitungan selisih aman saat posting.
- Alasan penyesuaian: rusak, kedaluwarsa, hilang, ditemukan, koreksi, dan lainnya.
- Barang rusak/kedaluwarsa dipindah ke status/lokasi non-jual.
- Penyesuaian nilai persediaan harus menghasilkan dampak jurnal sesuai konfigurasi.

### 7.6 Moving weighted average

- Gunakan moving weighted average sebagai metode biaya.
- Definisikan presisi kuantitas, presisi biaya, aturan rounding, biaya pembelian yang dikapitalisasi, retur, transfer, saldo awal, dan koreksi.
- Harga jual tidak sama dengan biaya rata-rata.
- Saldo kuantitas dan nilai persediaan dapat ditelusuri ke ledger.
- Jangan menghitung ulang histori lama secara diam-diam ketika harga beli baru masuk.
- Cegah stok negatif secara default. Jika diaktifkan, wajib ada kebijakan biaya sementara, peringatan, approval, dan rekonsiliasi.
- Barang rusak/hilang/kedaluwarsa memiliki proses write-off dan jurnal.

### 7.7 Peringatan dan laporan gudang

- Stok minimum dan reorder alert.
- Kartu stok per produk/lokasi.
- Stok tersedia, reserved, in-transit, karantina, rusak, dan kedaluwarsa.
- Nilai persediaan berdasarkan metode biaya.
- Riwayat penerimaan, transfer, penyesuaian, dan retur.
- Laporan produk tanpa barcode, barcode duplikat, produk tidak aktif dengan stok, dan stok negatif jika ditemukan.

---

## 8. Offline POS dan Sinkronisasi

### 8.1 Desain

- PWA dengan Service Worker untuk app shell dan aset penting.
- IndexedDB untuk data lokal terstruktur dan antrean transaksi; Dexie dapat digunakan jika cocok.
- Jangan menyimpan katalog 10.000+ produk seluruhnya di `localStorage`.
- Cache produk/harga yang diperlukan, konfigurasi POS, aturan diskon/pajak yang diizinkan, sesi kasir, dan data minimum operasi.
- Tampilkan indikator online/offline dan waktu sinkronisasi terakhir.
- Perangkat harus pernah login online dan terdaftar sebelum mode offline.
- Batasi lama sesi offline dan data sensitif lokal melalui kebijakan keamanan.
- Logout membersihkan data sensitif; transaksi antrean memiliki prosedur pemulihan aman.

### 8.2 Idempotensi dan antrean

Setiap transaksi offline mempunyai UUID dan idempotency key unik. Status:
`queued`, `syncing`, `synced`, `conflict`, `failed`.

- Retry dengan exponential backoff dan jitter.
- Server menyimpan idempotency key yang sudah diproses dan mengembalikan hasil sama untuk request berulang.
- Jangan membuat transaksi, pembayaran, stok, atau jurnal ganda.
- Simpan payload transaksi dan snapshot harga/produk saat transaksi terjadi.
- Konflik stok/harga/izin/pembayaran ditampilkan untuk penyelesaian; jangan merge diam-diam.
- Transaksi yang ditolak tidak boleh hilang sebelum operator memahami alasan dan menyelesaikannya.
- Log sync tidak boleh mengandung token, password, atau data sensitif.

### 8.3 Batasan offline

- Data stok offline adalah snapshot terakhir tersinkron, bukan saldo global real-time.
- Dua perangkat offline dapat menjual stok yang sama. Sistem menandai potensi oversell dan menyediakan kebijakan: blokir item berisiko jika data terlalu lama, kuota offline per perangkat, atau rekonsiliasi supervisor.
- Rekomendasi awal: tampilkan stok terakhir tersinkron, batas usia data offline yang dapat dikonfigurasi, dan peringatan stok rendah.
- QRIS statis memerlukan verifikasi manual. Saat offline, transaksi QRIS tidak otomatis dianggap lunas. Simpan sebagai pending/unpaid atau metode lain sesuai SOP.

### 8.4 Skenario wajib diuji

Internet putus sebelum checkout; putus setelah server menerima request tetapi sebelum response; tombol bayar ditekan dua kali; browser ditutup saat antrean belum sync; dua perangkat offline menjual stok terakhir; harga berubah saat offline; role dicabut saat perangkat offline; antrean gagal karena validasi; storage lokal penuh/korup; sinkronisasi berulang.

---

## 9. Modul Akuntansi dan Keuangan

### 9.1 Prinsip double-entry

- Setiap jurnal posted harus seimbang: total debit = total kredit.
- Status: draft, posted, reversed, period-locked.
- Jurnal posted tidak dihapus/diedit langsung.
- Koreksi menggunakan reversal atau adjustment yang ditautkan.
- Simpan tanggal transaksi dan tanggal pembukuan bila berbeda.
- Gunakan numeric/decimal untuk nominal.
- Setiap jurnal memiliki sumber dokumen, nomor, pembuat, approver, waktu, dan audit reference.
- Tutup periode dengan kontrol akses; koreksi periode tertutup memerlukan prosedur khusus.

### 9.2 Chart of Accounts dan posting mapping

Konfigurasi akun untuk:
- Kas per kasir/metode dan rekening bank.
- QRIS clearing bila diperlukan.
- Piutang pelanggan.
- Persediaan.
- Utang pemasok.
- Penjualan, retur penjualan, diskon penjualan.
- HPP dan retur pembelian.
- Biaya administrasi bank.
- Beban operasional.
- Pajak masukan/keluaran jika relevan.
- Gaji, tunjangan, potongan, utang gaji.
- Modal, prive, dan akun ekuitas.

Jika akun wajib belum dipetakan, posting ditahan dengan error jelas. Jangan membuat akun sembarangan otomatis.

### 9.3 Jurnal otomatis

Pola umum:
- POS final: debit kas/bank/piutang sesuai pembayaran; kredit penjualan dan pajak sesuai konfigurasi; debit HPP dan kredit persediaan.
- Retur: reversal/retur penjualan, penyesuaian persediaan jika barang layak jual, dan refund/piutang sesuai kondisi.
- Penerimaan dan tagihan pembelian: pisahkan pengakuan persediaan dan utang sesuai kebijakan.
- Pembayaran pemasok: debit utang, kredit kas/bank.
- Penerimaan piutang: debit kas/bank, kredit piutang.
- Transfer bank: debit rekening tujuan sebesar dana bersih, debit beban admin sebesar biaya, kredit rekening asal sebesar total dana keluar.
- Write-off: debit beban/kerugian persediaan, kredit persediaan.
- Payroll: jurnal beban dan kewajiban sesuai komponen; pembayaran melunasi kewajiban.
- Semua jurnal idempotent dan memiliki source reference.

Pola ini bukan pengganti pemetaan akun dan kebijakan akuntansi yang harus dikonfirmasi.

### 9.4 Kas dan bank

- Kelola beberapa akun kas/bank dengan nama, tipe, akun buku besar, status, dan identitas disamarkan.
- Transfer mencatat sumber, tujuan, nominal, biaya admin, nominal bersih, tanggal, referensi, dan pembuat.
- Rekonsiliasi mutasi bank manual atau impor file bila format tersedia.
- Tampilkan saldo buku, saldo bank, transaksi belum cocok, dan hasil rekonsiliasi.
- Cegah transfer ganda melalui idempotency dan unique reference yang sesuai.

### 9.5 Beban, utang, piutang, modal

- Beban: kategori akun, tanggal, pihak, nominal, metode pembayaran, catatan, bukti lampiran, approval.
- Utang/piutang: dokumen sumber, jatuh tempo, pembayaran parsial, alokasi pembayaran, saldo, aging.
- Modal/prive/jurnal pembukaan dengan hak akses terbatas.
- Setiap penerimaan/pembayaran memiliki nomor dan bukti.
- Jangan menghapus pembayaran yang sudah posted.

### 9.6 Penggajian

- Master karyawan: kode, nama, jabatan, status, tanggal kerja, komponen gaji, dan data yang diperlukan.
- Akses data pribadi dibatasi.
- Periode payroll: draft, calculated, reviewed, approved, posted, paid.
- Komponen dapat dikonfigurasi: gaji pokok, tunjangan, potongan, lembur, dan lainnya.
- Slip gaji dapat dicetak/diunduh.
- Payroll posted dikoreksi dengan reversal/adjustment.
- Perhitungan PPh 21/BPJS hanya diterapkan berdasarkan aturan resmi yang diverifikasi dan sesuai status pekerja/perusahaan. Simpan versi/periode aturan. Jangan mengklaim kepatuhan hukum menyeluruh tanpa validasi.

### 9.7 Pajak dasar

- Konfigurasi kelompok pajak, tarif, dasar pengenaan, tanggal efektif, dan perlakuan per produk/transaksi.
- Jangan hardcode tarif pajak di banyak tempat.
- Simpan rincian dasar pengenaan, tarif, nilai, dan aturan yang digunakan.
- Sediakan ringkasan pajak dan ekspor untuk pemeriksaan akuntan.
- Integrasi DJP/e-Faktur atau pelaporan otomatis bukan bagian default kecuali tersedia, disetujui, dan diuji.
- Tentukan kerangka SAK Indonesia yang relevan dengan bentuk usaha bersama akuntan; jangan mengklaim SNI atau sertifikasi internasional yang tidak relevan.

### 9.8 Laporan keuangan

Minimal: jurnal umum, buku besar, neraca saldo, laporan laba rugi, laporan posisi keuangan/neraca, arus kas, perubahan ekuitas bila diperlukan, penjualan dan HPP, kas/bank, piutang dan aging, utang dan aging, nilai persediaan dan kartu stok, beban, payroll summary dengan akses terbatas, serta pajak dasar.

Setiap laporan memiliki periode, tanggal cetak, filter, mata uang, status data, drill-down ke jurnal dan dokumen sumber, PDF/ekspor sesuai kebutuhan, dan kontrol akses. Draft tidak boleh diam-diam masuk ke angka final.

---

## 10. Migrasi Data dari Accurate.id

### 10.1 Prinsip

- Jangan mengasumsikan ada API atau format ekspor tertentu. Periksa dokumentasi Accurate.id terkini dan file ekspor contoh pengguna.
- Migrasi melalui wizard **preview-first**. Tidak ada import produksi sebelum preview, dry-run, backup, dan persetujuan.
- Data yang tersedia dapat berbeda menurut fitur, paket, izin, atau format ekspor. Dokumentasikan batasannya.
- Jangan mengarang data yang tidak tersedia.
- Uji migrasi pada staging/salinan database terlebih dahulu.

### 10.2 Wizard migrasi

1. Pilih tipe data/file.
2. Upload file; validasi ukuran, ekstensi, MIME, encoding, header, struktur, dan keamanan.
3. Tampilkan jumlah baris, sampel data, kolom, format tanggal/angka, dan warning.
4. Mapping kolom sumber ke field tujuan dengan preview nilai.
5. Simpan mapping template agar dapat digunakan ulang.
6. Pilih data yang diimpor: semua atau subset, termasuk produk tanpa barcode, kategori, pelanggan, pemasok, saldo awal, dan periode histori.
7. Validasi referensi, satuan, kategori, akun, lokasi, tanggal, nominal, kuantitas, dan relasi dokumen.
8. Deteksi duplikasi dan konflik.
9. Dry-run dengan ringkasan record valid, warning, error, duplikat, dan record yang dilewati.
10. Pengguna mengonfirmasi.
11. Import batch dengan progress, checkpoint, retry aman, dan log per baris.
12. Tampilkan hasil dan laporan kesalahan yang dapat diunduh.
13. Rekonsiliasi saldo dan jumlah sumber/tujuan.
14. Finalisasi setelah persetujuan.

### 10.3 Strategi deduplikasi

Gunakan kombinasi ID sumber Accurate jika tersedia, SKU, barcode ternormalisasi, nama+satuan+atribut pembeda, nomor dokumen+tanggal+pihak+total, dan referensi transaksi sumber.

Jangan menggabungkan record hanya karena nama mirip. Untuk konflik, berikan opsi:
- Skip.
- Update field yang diizinkan.
- Merge ke record target yang dipilih.
- Mark for manual review.

Tampilkan perbedaan sebelum merge. Simpan source ID dan migration job ID untuk audit.

### 10.4 Jenis data

Sejauh tersedia dan valid:
- Produk, SKU, barcode, kategori, satuan, harga.
- Pelanggan, kelompok pelanggan, pemasok.
- Lokasi stok dan saldo awal kuantitas/nilai.
- Chart of Accounts dan saldo awal.
- Kas/bank, piutang, utang, ekuitas pembukaan.
- Pembelian, penerimaan, penjualan, retur, pembayaran, beban, jurnal, dan histori lain.
- Nomor dokumen dan tanggal sumber.

Jika histori tidak cukup untuk merekonstruksi jurnal atau moving average, tandai keterbatasan dan minta strategi pembukaan yang disetujui akuntan.

### 10.5 Performa dan pemulihan

- Jangan memproses 10.000+ record dengan satu request web panjang.
- Gunakan batch terukur, progress, checkpoint, dan worker/background job jika infrastruktur mendukung.
- Batasi ukuran file dan jumlah baris; beri pesan batas jelas.
- Gunakan idempotency per batch dan source key.
- Backup sebelum import produksi.
- Rollback batch hanya jika aman dan belum ada transaksi baru yang bergantung padanya; jika tidak, gunakan restore backup atau prosedur kompensasi yang disetujui.
- Jangan menjanjikan rollback sempurna tanpa menguji dependensi dan transaksi yang sudah berjalan.

---

## 11. Data Model Konseptual

Nama tabel final mengikuti konvensi repository. Entitas yang perlu dipertimbangkan:

**Identity:** users, roles, permissions, role_permissions, user_roles, sessions, devices.

**Master:** products, product_barcodes, categories, units, unit_conversions, customers, customer_groups, suppliers, locations, payment_methods, tax_rules.

**POS:** sales, sale_items, sale_payments, sale_discounts, held_carts, customer_orders, delivery_details, shifts, cash_movements, returns, return_items, refunds.

**Inventory:** stock_balances (projection/cache yang dapat direkonsiliasi), inventory_movements (ledger), stock_reservations, transfers, transfer_items, stocktakes, stocktake_items, stock_adjustments, batches/expiry jika diperlukan.

**Purchasing:** purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, supplier_invoices, supplier_payments, supplier_returns, supplier_return_items.

**Accounting:** accounts, journal_entries, journal_lines, accounting_periods, posting_rules, bank_accounts, bank_transfers, reconciliations, expenses, receivables, payables, payment_allocations.

**Payroll:** employees, payroll_periods, payroll_components, payroll_runs, payroll_items, payslips.

**Migration & audit:** import_jobs, import_files, import_mappings, import_rows, external_source_records, audit_logs, idempotency_records, sync_devices, sync receipts.

Aturan:
- Gunakan primary key stabil (UUID atau strategi repository yang sudah baik).
- Tambahkan unique constraint untuk nomor dokumen dalam scope benar.
- Soft delete hanya untuk master yang memerlukan arsip; jangan soft delete jurnal/ledger seolah tidak pernah terjadi.
- Simpan timestamps dan actor untuk dokumen penting.
- Tentukan indeks berdasarkan pola query dan ukur dengan `EXPLAIN ANALYZE`.
- Jangan membuat semua tabel di atas tanpa kebutuhan; susun schema final berdasarkan domain dan implementasi bertahap.

---

## 12. Workflow dan State Machine

Setiap dokumen harus memiliki status, transisi valid, aktor, waktu, dan efek samping jelas.

### 12.1 Penjualan POS

`draft → pending_payment → paid → posted/completed`

Cabang:
- `draft → voided`
- `pending_payment → cancelled`
- `paid/completed → partially_returned → returned` sesuai kuantitas.

Efek:
- Draft tidak mengurangi stok final.
- Posting penjualan mengurangi stok dan membuat jurnal.
- Pembayaran tercatat sebagai tender dan mengurangi/mengakui saldo sesuai metode.
- Retur membuat dokumen baru yang mereferensikan penjualan asli dan membalik dampak yang sesuai.
- Tidak ada hard delete setelah posted.

### 12.2 Pesanan pelanggan

`draft → confirmed → reserved (opsional) → picking → ready → dispatched → delivered → completed`

Cabang: `cancelled`, `partially_paid`, `unpaid`, `returned`.

Reservasi tidak sama dengan pengurangan stok fisik. Pembatalan melepas reservasi. Pengiriman/penyelesaian memicu posting sesuai kebijakan.

### 12.3 Pembelian pemasok

PO: `draft → submitted → approved → partially_received → received → closed`; cabang `cancelled`.

Penerimaan: `draft → posted`; pembatalan setelah posted harus memakai reversal.

Retur pemasok: `draft → submitted → approved → shipped/returned → resolved`; hasil dapat berupa replacement, credit note, refund, atau potongan utang.

### 12.4 Transfer stok

`draft → approved → in_transit → received`; transfer langsung dapat `draft → posted`. Pembatalan hanya sebelum posting atau melalui reversal yang sesuai.

### 12.5 Stocktake

`draft → counting → review → approved → posted`. Selisih ditinjau; posting membuat adjustment ledger dan jurnal bila ada dampak nilai.

### 12.6 Jurnal

`draft → approved (opsional) → posted → reversed`. Periode tertutup memerlukan prosedur koreksi khusus.

### 12.7 Payroll

`draft → calculated → reviewed → approved → posted → paid`. Koreksi payroll posted melalui adjustment/reversal.

### 12.8 Migrasi

`uploaded → parsed → mapped → validated → previewed → dry_run_passed → approved → importing → completed/partially_failed/failed`.

Tidak boleh mengimpor sebelum status `approved`. Retry harus idempotent.

---

## 13. Skenario Risiko dan Perilaku Sistem

| Kejadian | Perilaku wajib |
|---|---|
| Kasir double-click bayar | Satu transaksi; idempotency mencegah duplikasi |
| Internet putus setelah submit | Client memeriksa status berdasarkan idempotency key sebelum retry |
| Transaksi dibatalkan sebelum posted | Lepaskan reservasi/hold; tidak ada jurnal penjualan |
| Transaksi sudah posted lalu dibatalkan | Buat reversal/retur; jangan hapus histori |
| Retur melebihi qty asli | Tolak dan tampilkan qty yang masih dapat diretur |
| Barang retur rusak | Masuk lokasi/status rusak, bukan stok jual |
| QRIS belum diverifikasi | Status pending/unpaid; tidak boleh dianggap lunas |
| Stok tidak cukup | Blokir sesuai kebijakan; override hanya jika diizinkan |
| Dua perangkat offline menjual stok terakhir | Tandai potensi konflik/oversell |
| Penerimaan PO parsial | Catat qty diterima dan sisa PO |
| PO dibatalkan setelah sebagian diterima | Batalkan sisa terbuka; penerimaan posted tetap tercatat |
| Transfer belum diterima | Stok berada di transit jika workflow transit digunakan |
| Opname bersamaan transaksi | Gunakan version/locking dan hitung selisih aman |
| Harga master berubah | Transaksi lama tetap memakai snapshot harga |
| Akun jurnal belum dipetakan | Tahan posting dengan pesan konfigurasi jelas |
| Jurnal tidak seimbang | Posting ditolak |
| Pembayaran piutang sebagian | Saldo tagihan berkurang sesuai alokasi |
| Refund setelah split payment | Refund dibatasi nilai dan metode yang sah |
| User kehilangan permission | Request berikutnya ditolak server |
| File import memiliki barcode duplikat | Tampilkan konflik; jangan merge otomatis |
| Import berhenti di tengah | Resume aman dari checkpoint |
| Data sumber tidak lengkap | Tandai warning/error; jangan mengisi angka asumsi |
| Periode akuntansi ditutup | Posting mundur diblokir atau melalui adjustment |

---

## 14. Performa, Skalabilitas, dan Keandalan

### 14.1 Target awal

Target ini adalah acceptance target yang harus diuji pada environment tercatat, bukan janji universal:

- Katalog 10.000+ produk dapat dicari dengan pagination server-side.
- Pencarian barcode/SKU exact-match cepat dan konsisten.
- Tidak memuat seluruh katalog ke browser.
- Daftar besar memakai filter dan pagination; virtual scrolling hanya jika profiling membuktikan perlu.
- API operasional umum ditargetkan p95 < 500 ms pada beban uji yang disepakati, tidak termasuk jaringan eksternal dan laporan berat.
- Checkout online ditargetkan < 2 detik p95 pada environment uji yang ditentukan.
- Laporan besar menggunakan query terukur, filter periode, dan background export bila perlu.
- Sinkronisasi offline menggunakan batch, retry, dan checkpoint.

Agent wajib melaporkan environment uji, ukuran data, concurrent users, query, p50/p95/p99, dan batasan. Jangan menyatakan target tercapai tanpa benchmark.

### 14.2 Database performance

- Indeks untuk SKU/barcode, strategi pencarian nama, nomor dokumen, tanggal, status, foreign key, dan kolom filter.
- Full-text/trigram hanya bila relevan dan terukur.
- Hindari indeks berlebihan yang memperlambat write.
- Gunakan `EXPLAIN ANALYZE` pada query penting.
- Hindari N+1.
- Gunakan server-side pagination dan batas maksimum page size.
- Summary/materialized view hanya jika dibutuhkan dan dapat direkonsiliasi.
- Gunakan connection pooling sesuai deployment.

### 14.3 Observability

- Structured logs dengan correlation/request ID.
- Error tracking tanpa data sensitif.
- Metrics untuk checkout, sync queue, import job, failed posting, stock conflict, dan query lambat.
- Health check dan backup status.
- Audit log bisnis terpisah dari log teknis.
- Diagnostic bundle tidak boleh mengandung secret.

---

## 15. Keamanan dan Privasi

- Gunakan autentikasi aman sesuai framework dan dokumentasi resmi.
- Password di-hash dengan algoritma modern yang direkomendasikan, bukan plaintext atau enkripsi reversibel.
- Cookie sesi: HttpOnly, Secure di HTTPS, SameSite sesuai kebutuhan.
- Proteksi CSRF sesuai arsitektur autentikasi.
- Validasi input di server; jangan percaya data dari client/offline.
- Batasi percobaan login dan gunakan session expiry.
- Authorization pada setiap server action/API, termasuk background jobs.
- File upload: cek MIME dan konten, ukuran, nama, akses, dan penyimpanan; jangan eksekusi file.
- Lindungi dari SQL injection, XSS, CSRF, IDOR, SSRF, dan mass assignment sesuai threat model.
- Secrets melalui environment/secret manager; `.env.example` tanpa nilai rahasia.
- Audit aksi sensitif dan akses data payroll.
- Backup terenkripsi, akses terbatas, dan uji restore.
- Minimalkan data pribadi dan tetapkan retensi.
- Jangan menaruh data sensitif di browser cache/log jika tidak diperlukan.

---

## 16. Backup, Restore, dan Operasional

- Jadwalkan backup database dan file yang diperlukan.
- Tetapkan RPO/RTO berdasarkan kemampuan hosting dan kebutuhan usaha; jangan mengarang jaminan.
- Backup terenkripsi dan akses terbatas.
- Uji restore di environment terpisah secara berkala.
- Migration database backward-compatible jika deployment bertahap membutuhkannya.
- Sediakan prosedur maintenance, rollback deployment, recovery sync, dan pemulihan import.
- Health check untuk database, storage, dan worker.
- Dokumentasikan konfigurasi printer, browser, scanner, dan perangkat POS yang diuji.

---

## 17. Pengujian dan Quality Gates

### 17.1 Test layers

- **Unit:** perhitungan uang, diskon, rounding, moving average, permission policy, status transition, journal balancing.
- **Integration:** database transaction, posting penjualan, retur, penerimaan, transfer, piutang, payroll, import, idempotency.
- **E2E:** login, role, checkout, shift, hold order, order delivery, retur, gudang, laporan, import wizard.
- **Offline:** queue, retry, duplicate request, restart browser, conflict, storage failure.
- **UI regression:** viewport, form, modal, table, navigation, print layout.
- **Security:** authorization bypass, IDOR, privilege escalation, file upload, session, CSRF/XSS sesuai stack.
- **Performance:** 10.000+ produk, pencarian, pagination, checkout, laporan, concurrent requests.
- **Migration:** import berulang, duplikat, partial failure, resume, reconciliation, rollback/restore.

### 17.2 Acceptance criteria utama

1. Kasir tanpa izin tidak dapat membuka atau memanggil endpoint Gudang/Akuntansi.
2. Admin dapat membuat role khusus dan menguji permission.
3. Kasir dapat scan/cari produk, checkout, menerima tunai, menghitung kembalian, dan mencetak nota.
4. QRIS statis hanya menjadi lunas setelah verifikasi manual.
5. Hold cart tidak mengurangi stok dan tidak membuat jurnal penjualan.
6. Pesanan pelanggan dan PO pemasok memiliki workflow berbeda.
7. Penjualan posted mengurangi stok dan menghasilkan jurnal seimbang.
8. Retur merujuk penjualan asal dan tidak melebihi sisa kuantitas yang dapat diretur.
9. Barang retur rusak tidak masuk stok jual.
10. Penerimaan barang menambah stok sesuai kuantitas yang diposting.
11. Transfer memindahkan stok tanpa duplikasi.
12. Opname menyimpan snapshot dan mencegah overwrite transaksi berjalan.
13. Moving average dapat direkonsiliasi dengan ledger.
14. Piutang mendukung pembayaran sebagian dan pelunasan.
15. Transfer bank mencatat biaya admin dan jurnal seimbang.
16. Payroll hanya dapat dilihat role yang berhak.
17. Laporan dapat ditelusuri ke jurnal dan dokumen sumber.
18. POS offline menyimpan transaksi dan sinkronisasi ulang tidak menggandakan transaksi.
19. Import Accurate memiliki preview, mapping, duplicate detection, dry-run, approval, batch log, dan reconciliation.
20. 10.000+ produk tidak menyebabkan katalog dimuat sekaligus di browser.
21. Tidak ada lint/type/build/test failure yang diabaikan tanpa penjelasan.
22. Tidak ada halaman utama yang rusak pada viewport target.

### 17.3 Definition of Done

Fitur hanya selesai jika acceptance criteria terpenuhi; permission dan audit log benar; loading/empty/error/success state tersedia; validasi server dan database ada; test relevan lulus; tidak merusak fitur lama; dokumentasi diperbarui; tidak ada secret di log; dan hasil diuji pada perangkat/viewport relevan.

---

## 18. Rencana Implementasi Bertahap

### Phase 0 — Discovery dan baseline
Audit repository dan stack; jalankan aplikasi, test, build; inventarisasi fitur, database, alur, bug, dependency. Hasil: audit report, architecture map, risk register, requirement traceability matrix, implementation plan.

### Phase 1 — Fondasi
Modular boundaries, migration strategy, authentication, RBAC, audit log, design system, launcher, layout modul, error handling, logging, validation. Hasil: login dan role server-side; tiga modul terpisah secara UX.

### Phase 2 — Master data dan Gudang
Produk, barcode, kategori, satuan, pemasok, lokasi, ledger stok, penerimaan, transfer, opname, barang rusak, moving weighted average. Hasil: stok dapat ditelusuri dan direkonsiliasi.

### Phase 3 — POS online
Barcode/search, cart, tender, receipt, shift, diskon, kelompok pelanggan, rounding, hold order, customer order, piutang, retur, void, refund. Hasil: alur POS online end-to-end.

### Phase 4 — Akuntansi
Chart of Accounts, posting rules, journal engine, kas/bank, transfer, beban, utang-piutang, laporan, payroll, pajak dasar. Hasil: transaksi operasional menghasilkan jurnal seimbang.

### Phase 5 — Offline POS
PWA, IndexedDB, sync queue, idempotency, conflict handling, recovery, offline tests. Hasil: offline flow diuji pada perangkat nyata.

### Phase 6 — Migrasi Accurate.id
Analisis file ekspor aktual, mapping wizard, validation, deduplication, dry-run, batch import, reconciliation, recovery. Hasil: laporan migrasi dan bukti rekonsiliasi.

### Phase 7 — Hardening dan release
Security review, performance benchmark, responsive audit, backup/restore drill, regression, UAT, dokumentasi operasional. Hasil: release candidate dan known issues.

Urutan dapat disesuaikan dengan dependency repository, tetapi integritas data, authorization, dan migration safety tidak boleh dilewati.

---

## 19. Dokumentasi yang Wajib Diserahkan Agent

- `README.md`: setup, scripts, environment, development.
- `docs/architecture/overview.md`: arsitektur dan domain boundaries.
- `docs/architecture/database.md`: ERD/entitas, constraint, index.
- `docs/architecture/offline-sync.md`: queue, idempotency, conflict, recovery.
- `docs/architecture/security.md`: auth, RBAC, threat model.
- `docs/workflows/`: workflow POS, retur, purchase, transfer, opname, accounting, payroll.
- `docs/migration/accurate-import.md`: format yang benar-benar diuji, mapping, limitasi, prosedur.
- `docs/operations/backup-restore.md`.
- `docs/testing/test-plan.md`.
- `docs/adr/`: keputusan arsitektur.
- `CHANGELOG.md` atau release notes.
- `.env.example` tanpa secret.

---

## 20. Format Laporan Agent

Pada akhir setiap milestone, agent memberikan:
1. Ringkasan pekerjaan.
2. File/folder yang berubah dan alasannya.
3. Keputusan arsitektur dan ADR.
4. Database migration yang ditambahkan.
5. Fitur yang selesai dan belum.
6. Test yang benar-benar dijalankan beserta hasil.
7. Benchmark dan environment bila mengklaim performa.
8. Risiko, known issues, dan batasan.
9. Cara menjalankan dan menguji.
10. Langkah berikutnya.

Gunakan status `PASS`, `PARTIAL`, `FAIL`, atau `BLOCKED`. Jangan menandai fitur `PASS` hanya karena UI sudah dibuat.

---

## 21. Referensi Teknis Resmi

Agent wajib memeriksa dokumentasi versi yang relevan saat implementasi.

### Framework dan bahasa
- Next.js: https://nextjs.org/docs
- React: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/

### Database dan ORM
- PostgreSQL: https://www.postgresql.org/docs/
- Drizzle ORM: https://orm.drizzle.team/docs/overview
- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- PostgreSQL indexes: https://www.postgresql.org/docs/current/indexes.html

### UI, browser, dan offline
- Tailwind CSS: https://tailwindcss.com/docs
- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Service Worker: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Web.dev PWA: https://web.dev/learn/pwa/

### Testing dan keamanan
- Vitest: https://vitest.dev/guide/
- Playwright: https://playwright.dev/docs/intro
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/

### Akuntansi dan pembayaran Indonesia
- Ikatan Akuntan Indonesia: https://web.iaiglobal.or.id/SAK-IAI
- Bank Indonesia — QRIS: https://www.bi.go.id/QRIS/default.aspx
- Direktorat Jenderal Pajak: https://www.pajak.go.id/

### Accurate.id
- Accurate Online Help Center: https://help.accurate.id/
- Periksa dokumentasi ekspor dan kemampuan akun Accurate yang digunakan pengguna. Jangan mengasumsikan endpoint API atau seluruh histori dapat diekspor.

Tautan adalah titik awal. Agent harus memeriksa versi, tanggal, relevansi, dan perubahan dokumentasi. Aturan pajak/akuntansi harus diverifikasi untuk periode berlaku.

---

## 22. Keputusan yang Masih Harus Dikonfirmasi Saat Audit

Jangan menghentikan pekerjaan untuk setiap detail kecil. Gunakan default aman dan catat asumsi. Minta keputusan pengguna jika berdampak besar pada data, uang, keamanan, atau operasi.

1. Framework dan database repository aktual.
2. Bentuk badan usaha dan kerangka SAK yang sesuai.
3. Kebijakan pajak dan status PKP jika relevan.
4. Aturan pembulatan: tunai saja atau semua metode.
5. Kebijakan stok negatif dan kuota offline.
6. Apakah reservasi stok pesanan pelanggan diaktifkan.
7. Batas kredit pelanggan dan limit approval.
8. Metode refund jika tender awal campuran.
9. Format file ekspor Accurate.id yang benar-benar tersedia.
10. Printer, scanner barcode, OS, browser, dan perangkat POS.
11. Hosting, backup, jumlah pengguna bersamaan, dan target RPO/RTO.

---

## 23. Prompt Eksekusi untuk AI Agent

Baca PRD ini secara menyeluruh. Audit repository terbaru sebelum mengubah kode. Buat baseline audit, requirement traceability matrix, diagram arsitektur aktual, risk register, dan rencana implementasi bertahap. Pertahankan teknologi dan fitur yang masih baik. Target stack adalah TypeScript, Next.js, React, PostgreSQL, Drizzle ORM, Tailwind CSS, PWA/Service Worker/IndexedDB untuk POS offline, Vitest, dan Playwright, tetapi keputusan migrasi harus didasarkan pada audit.

Bangun ERP modular dengan POS, Gudang, dan Akuntansi yang terpisah secara navigasi dan domain. Terapkan RBAC server-side yang dapat dikonfigurasi admin. Prioritaskan integritas stok, pembayaran, piutang, jurnal, offline sync, dan migrasi Accurate.id. Gunakan modular monolith, struktur folder berbasis domain, file dengan tanggung jawab jelas, migration terkontrol, test otomatis, dan dokumentasi.

UI/UX harus terasa seperti software bisnis profesional: konsisten, cepat dipahami, responsif, aksesibel, tanpa AI slop, tanpa elemen dekoratif berlebihan, tanpa layout bertumpuk, dan setiap tombol memiliki fungsi nyata. Jangan membuat mock sebagai pengganti fitur.

Implementasikan per milestone. Untuk setiap milestone, laporkan perubahan, test yang benar-benar dijalankan, hasil, risiko, dan pekerjaan tersisa. Jangan melakukan perubahan destruktif atau migrasi produksi tanpa backup dan persetujuan. Fitur hanya boleh dinyatakan selesai jika acceptance criteria dan pengujiannya lulus.

---

**Akhir PRD — ERP Modular Minimarket**


---

# ADDENDUM NORMATIF — HASIL VALIDASI PRD

> Bagian ini merupakan aturan tambahan dan **mengungguli bagian sebelumnya apabila ada istilah, status, atau alur yang bertentangan**. Agent wajib membaca addendum ini sebelum membuat model data atau menulis workflow.

## A. Klasifikasi prioritas kebutuhan

Gunakan prioritas berikut saat menyusun backlog:
- **P0 — wajib untuk integritas dan rilis awal:** login/RBAC, master produk, lokasi stok, ledger stok, POS online, pembayaran, transaksi/jurnal atomik, pembatalan/retur, pembelian-penerimaan, laporan dasar, audit log, backup, migrasi master/saldo awal.
- **P1 — wajib sebelum operasional penuh:** POS offline, pesanan pelanggan/antar, piutang dan pembayaran parsial, payroll, pajak dasar, supplier return, rekonsiliasi bank, migrasi riwayat transaksi.
- **P2 — pengembangan lanjutan:** analitik lanjutan, integrasi eksternal, automasi tambahan, multi-cabang, QRIS dinamis, dan fitur yang belum menjadi kebutuhan operasional awal.

P0 bukan berarti boleh mengabaikan offline yang telah disepakati. Artinya implementasi harus bertahap dan fitur P0 menjadi fondasi aman untuk P1. Rilis produksi harus memenuhi kebutuhan wajib yang secara eksplisit disepakati pemilik.

## B. Model status transaksi — wajib dipisahkan

Jangan memakai satu kolom `status` untuk menggambarkan seluruh proses. Status pembayaran, posting akuntansi, pemenuhan pesanan, dan status dokumen adalah dimensi berbeda.

### B.1 Sales document state
Gunakan state dokumen yang sesuai, contohnya:
- `draft`
- `awaiting_payment`
- `confirmed`
- `posted`
- `voided` (hanya sebelum posting final sesuai aturan)
- `reversed` (untuk koreksi setelah posting melalui dokumen reversal)

### B.2 Payment state
- `unpaid`
- `pending_verification`
- `partially_paid`
- `paid`
- `partially_refunded`
- `refunded`
- `failed` atau `cancelled` untuk pembayaran yang tidak selesai

Payment state dihitung dari payment records dan refund records, bukan diedit manual tanpa ledger pembayaran.

### B.3 Fulfillment state
- `not_required`
- `pending`
- `reserved`
- `picking`
- `ready`
- `dispatched`
- `partially_delivered`
- `delivered`
- `cancelled`

### B.4 Accounting posting state
- `not_posted`
- `posted`
- `reversal_pending` (jika proses approval diperlukan)
- `reversed`
- `posting_error`

Status-status tersebut tidak harus semuanya menjadi enum identik pada setiap dokumen. Agent harus menentukan state machine per aggregate dan mendokumentasikan transisinya. Contoh penting:
- Pesanan dapat sudah `paid`, tetapi fulfillment masih `pending`.
- Penjualan kredit dapat `posted` tetapi payment state `partially_paid`.
- Pesanan hold belum menjadi penjualan posted.
- QRIS yang belum diverifikasi tetap `pending_verification`, bukan `paid`.
- Dokumen posted tidak dapat diubah seolah-olah belum pernah terjadi.

Setiap transisi harus memiliki precondition, permission, actor, timestamp, event/audit record, efek stok, efek pembayaran, dan efek jurnal yang eksplisit.

## C. Konsistensi transaksi lintas modul

### C.1 Atomic posting
Untuk transaksi online dalam satu PostgreSQL database, operasi posting yang saling bergantung harus diselesaikan dalam satu transaction boundary bila memungkinkan:
1. validasi izin, status, idempotency key, dan versi dokumen;
2. validasi/lock saldo stok dan aturan harga;
3. simpan dokumen final dan item snapshot;
4. simpan payment ledger;
5. simpan inventory movement dan nilai biaya;
6. buat journal entry dan journal lines;
7. simpan audit/outbox event;
8. commit.

Jika salah satu langkah wajib gagal, rollback seluruh operasi yang berada dalam transaction boundary tersebut. Jangan menampilkan transaksi sukses jika commit gagal.

Pekerjaan eksternal seperti cetak fisik, email, atau sinkronisasi perangkat tidak boleh membuat database transaction menunggu proses jaringan lama. Gunakan outbox/queue yang dapat diulang setelah commit.

### C.2 Idempotency
- Idempotency key wajib unik dalam scope operasi, misalnya `device_id + operation_type + idempotency_key`.
- Simpan request fingerprint, hasil, status, dan resource ID.
- Pengiriman ulang dengan key dan payload sama mengembalikan hasil yang sama.
- Pengiriman ulang dengan key sama tetapi payload berbeda harus ditolak sebagai konflik.
- Terapkan unique constraint di database; jangan hanya mengandalkan pengecekan frontend.
- Idempotency bukan pengganti transaction database atau authorization.

### C.3 Concurrency
- Dua kasir online yang menjual unit stok terakhir tidak boleh sama-sama berhasil mengurangi saldo menjadi negatif bila stok negatif tidak diizinkan.
- Gunakan conditional update/row lock/optimistic version sesuai desain dan uji race condition.
- Setiap dokumen yang diubah memakai version/concurrency token atau mekanisme serupa agar perubahan pengguna lain tidak tertimpa diam-diam.
- Deadlock/serialization failure harus ditangani dengan retry terbatas dan idempotency.

## D. Aturan biaya persediaan dan alur akuntansi pembelian

### D.1 Moving weighted average
Gunakan rumus konseptual berikut untuk penerimaan baru yang diterima dan dapat dijual:

`Biaya rata-rata baru = (nilai persediaan sebelum penerimaan + nilai biaya penerimaan yang dikapitalisasi) / (kuantitas tersedia sebelum penerimaan + kuantitas penerimaan yang diterima)`

Definisi:
- Gunakan satuan dasar produk setelah konversi unit pembelian.
- Kuantitas ditolak/rusak saat penerimaan tidak masuk stok layak jual; perlakuannya dicatat terpisah.
- Biaya penerimaan yang dikapitalisasi harus mengikuti kebijakan akuntansi yang disetujui, termasuk biaya angkut/pajak yang dapat dikreditkan atau tidak dapat dikreditkan.
- Simpan precision internal memadai; pembulatan tampilan tidak boleh mengubah nilai perhitungan internal.
- HPP penjualan memakai biaya rata-rata yang berlaku pada saat posting penjualan.
- Transfer antar lokasi dalam entitas yang sama tidak menciptakan laba/rugi. Jika valuasi disimpan per lokasi, biaya rata-rata dan transfer harus tetap mempertahankan nilai total yang konsisten.
- Semua koreksi biaya setelah posting harus menghasilkan jejak penyesuaian dan rekonsiliasi; jangan mengubah histori secara diam-diam.

### D.2 Penerimaan sebelum invoice — GRNI
Sediakan akun clearing **Goods Received Not Invoiced (GRNI)** atau akun penampung ekuivalen yang disetujui akuntan.

Alur konseptual:
1. PO dibuat/diotorisasi: belum menambah stok dan belum otomatis menciptakan utang final.
2. Goods Receipt diposting: stok dan nilai persediaan diakui; lawannya masuk GRNI/receipt accrual sesuai kebijakan.
3. Supplier Invoice diterima: cocokkan invoice dengan PO dan penerimaan; pindahkan saldo GRNI ke utang pemasok (AP), akui pajak yang relevan, dan catat selisih harga/biaya sesuai kebijakan.
4. Supplier Payment: debit AP, kredit kas/bank.
5. Retur/credit note: kurangi saldo yang sesuai dan tautkan ke dokumen asal.

Dukung three-way matching: PO quantity/price, goods received quantity, dan invoice quantity/price. Tampilkan selisih dan minta approval bila melewati toleransi.

Agent tidak boleh menetapkan jurnal final, pajak yang dapat dikreditkan, atau perlakuan price variance secara sepihak. Buat posting rules configurable dan minta validasi akuntan untuk kebijakan final.

### D.3 Retur pembelian dan biaya tambahan
- Retur sebelum invoice, setelah invoice, dan setelah pembayaran harus dibedakan.
- Credit note pemasok mengurangi AP; refund pemasok menambah kas/bank; replacement barang membuat penerimaan baru yang tertaut.
- Biaya angkut/biaya tambahan pembelian mempunyai metode alokasi yang terdokumentasi (misalnya proporsional nilai atau kuantitas) dan dapat diaudit.
- Selisih harga invoice vs estimasi penerimaan harus masuk akun/penyesuaian yang dipetakan; bila stok terkait sudah sebagian terjual, kebijakan alokasi ke inventory/COGS/variance harus ditentukan dan diuji.

### D.4 Retur pelanggan
- Barang kembali yang layak jual dapat menambah stok pada biaya yang konsisten dengan nilai HPP transaksi asal, sesuai kebijakan retur yang disetujui.
- Barang rusak/karantina tidak otomatis kembali ke stok tersedia.
- Refund pembayaran tidak boleh melebihi nilai yang sah setelah memperhitungkan retur sebelumnya, diskon, pajak, dan metode pembayaran.
- Retur tidak boleh mengubah penjualan asli; buat dokumen retur dan jurnal koreksi.

## E. Unit, barcode, batch, dan kedaluwarsa

- Setiap produk mempunyai base unit of measure.
- Unit pembelian/penjualan tambahan memakai conversion factor yang jelas (misalnya dus ke pcs); perubahan konversi setelah transaksi tidak boleh mengubah histori.
- Kuantitas disimpan dengan precision yang sesuai kebutuhan unit; produk pecahan dan produk satuan harus dibedakan.
- SKU internal unik sesuai scope toko.
- Barcode disimpan dalam bentuk normalized value, menjaga nilai leading zero. Jangan mengonversi barcode menjadi angka.
- Barcode duplikat harus ditolak atau masuk alur konflik manual; barcode yang sama untuk dua produk aktif tidak boleh membuat hasil scan ambigu.
- Batch/expiry tracking dapat diaktifkan per produk/kategori.
- FEFO (first-expired, first-out) adalah aturan pengambilan fisik untuk barang ber-expiry; jangan menyamakannya dengan metode valuasi biaya moving average.
- Sediakan laporan produk mendekati kedaluwarsa dan barang lewat tanggal.

## F. Role scope dan pemisahan tugas

RBAC harus mendukung permission sekaligus batas data:
- scope shift: shift sendiri atau semua shift;
- scope lokasi stok: lokasi yang ditugaskan atau semua lokasi;
- scope data: hanya lihat, lihat biaya, lihat harga beli, edit harga jual, ekspor, atau mengelola;
- scope payroll: ringkasan atau rincian gaji;
- scope approval: batas nominal, jenis dokumen, dan level persetujuan.

Aturan konflik:
- Default deny.
- Permission eksplisit yang tidak dimiliki berarti ditolak.
- Jangan menggabungkan beberapa role dengan aturan yang membuat deny dapat dibypass oleh role lain tanpa kebijakan yang terdokumentasi. Tentukan semantik grant/deny secara eksplisit; rekomendasi awal adalah grant dari role yang ditetapkan dengan deny global untuk akun nonaktif dan kebijakan pembatasan wajib.
- Perubahan permission harus berlaku untuk request berikutnya; cache izin harus memiliki invalidation/versioning.
- Sesi offline tidak dapat mengetahui pencabutan izin secara real-time. Tetapkan batas durasi offline dan sinkronisasi ulang sebelum tindakan sensitif.
- Maker-checker: orang yang membuat transaksi tidak boleh menyetujui transaksi yang sama bila approval diwajibkan.

## G. Aturan offline yang lebih aman

### G.1 Batas kemampuan
PWA + IndexedDB memungkinkan operasi lokal, tetapi browser storage bukan database server dengan jaminan durability mutlak. Browser dapat menerapkan kuota dan eviction, termasuk menghapus data origin pada kondisi tertentu. Agent harus merancang untuk kegagalan storage, bukan mengasumsikan data selalu ada.

### G.2 Persyaratan wajib
- Saat perangkat didaftarkan, identifikasi perangkat dan simpan metadata perangkat di server.
- Minta persistent storage melalui Storage API bila browser mendukung; tampilkan status hasil permintaan.
- Pantau `navigator.storage.estimate()` bila tersedia dan tangani `QuotaExceededError`.
- Jangan menjalankan mode offline bila data master minimum belum tersinkron.
- Tampilkan jumlah transaksi antrean, usia antrean tertua, status storage, dan waktu sync terakhir.
- Jangan menghapus antrean yang belum mendapat acknowledgement server.
- Buat export/recovery procedure untuk transaksi antrean yang gagal; data recovery harus terlindungi dan diimpor secara idempotent.
- Hindari menyimpan password, token jangka panjang, seluruh data pelanggan, data payroll, atau data finansial yang tidak dibutuhkan secara lokal.
- Hindari mode private/incognito untuk POS operasional.
- Pengguna harus diberi peringatan bahwa membersihkan site data/browser profile dapat menghapus data lokal yang belum tersinkron.
- Sediakan kebijakan batas lama offline; setelah batas tercapai, blokir aksi berisiko atau wajib reconnect.
- Transaksi offline tidak dianggap final secara global sampai diterima server.
- Buat perangkat uji dan skenario browser nyata (Chrome/Edge yang digunakan toko) sebelum rilis.

### G.3 Keputusan penting
Asumsi rilis awal: offline pada perangkat POS tetap/terdaftar; tidak menjanjikan konsistensi stok global lintas banyak perangkat yang semuanya offline. Jika kebutuhan operasional mengharuskan beberapa terminal offline sekaligus dengan jaminan data lebih kuat, evaluasi aplikasi desktop/local database atau local network server sebagai keputusan arsitektur terpisah.

## H. API, kontrak aplikasi, dan validasi

AI agent wajib mendokumentasikan kontrak use case/API, tanpa harus membuat microservices.

Untuk setiap command penting tentukan:
- nama use case;
- aktor dan permission;
- input schema dan validasi;
- output schema;
- business rule/precondition;
- idempotency requirement;
- transaction boundary;
- event/side effect;
- error code;
- audit record;
- test yang membuktikan perilaku.

Contoh command:
- `CreateSaleDraft`
- `AddSaleItem`
- `HoldSale`
- `CompleteSale`
- `VerifyStaticQrisPayment`
- `CreateCustomerOrder`
- `ReceiveCustomerPayment`
- `CreateSalesReturn`
- `OpenCashShift`
- `CloseCashShift`
- `ReceivePurchaseOrder`
- `PostSupplierInvoice`
- `TransferInventory`
- `PostStocktake`
- `PostJournal`
- `RunMigrationPreview`
- `ExecuteMigrationBatch`

Gunakan error envelope konsisten yang membedakan validation, permission, conflict, not-found, business-rule, dan internal errors. Jangan mengirim stack trace ke pengguna.

## I. Data integrity dan constraint

Wajib dirancang dan diuji:
- Unique idempotency key dalam scope yang benar.
- Unique barcode/SKU sesuai normalisasi dan aturan bisnis.
- Unique document number dalam periode/scope yang ditentukan.
- Foreign key untuk relasi dokumen.
- Check constraints untuk kuantitas/nominal/status yang sesuai.
- Debit = kredit sebelum jurnal diposting.
- Kuantitas retur tidak melebihi kuantitas yang dapat diretur.
- Pembayaran/refund tidak melebihi nilai yang dapat dialokasikan.
- Transfer asal/tujuan berbeda dan saldo asal cukup.
- Tidak ada stok tersedia negatif kecuali kebijakan eksplisit mengizinkan.
- Dokumen posted tidak dapat diedit langsung.
- Master yang telah dipakai transaksi tidak dapat hard delete.
- Saldo projection harus dapat direkonsiliasi dengan ledger sumber.
- Setiap adjustment mempunyai alasan, aktor, dan referensi.

## J. Migrasi Accurate.id — kriteria rekonsiliasi tambahan

Sebelum mengimpor produksi, sediakan laporan per tipe data:
- total baris sumber;
- baris terbaca;
- valid;
- warning;
- error;
- duplikat;
- dilewati;
- berhasil diimpor;
- gagal diimpor.

Rekonsiliasi minimal:
1. Jumlah master produk, pelanggan, dan pemasok berdasarkan aturan mapping.
2. Total barcode kosong, duplikat, dan tidak valid.
3. Saldo kuantitas per produk/lokasi dan total nilai persediaan.
4. Saldo awal semua akun dan kesamaan total debit/kredit.
5. Saldo kas/bank.
6. Total piutang dan daftar pelanggan/tagihan yang membentuknya.
7. Total utang dan daftar pemasok/tagihan yang membentuknya.
8. Jumlah serta nilai transaksi per periode jika histori lengkap tersedia.
9. Referensi dokumen sumber ke dokumen hasil migrasi.
10. Seluruh data gagal dan alasan kegagalannya.

Jangan memaksakan total record sama jika pengguna sengaja memilih subset. Laporan harus membedakan jumlah sumber penuh dan jumlah yang dipilih untuk migrasi.

Strategi cutover:
- Tentukan tanggal cutover.
- Hentikan sementara transaksi pada sistem lama atau tentukan prosedur delta import.
- Ambil ekspor final.
- Jalankan backup dan dry-run.
- Impor ke staging dan rekonsiliasi.
- Persetujuan pemilik/akuntan.
- Impor/finalisasi produksi.
- Catat saldo pembukaan dan nomor dokumen sumber.
- Jangan menjalankan dua sistem sebagai sumber transaksi final tanpa aturan sinkronisasi eksplisit.

## K. Pengujian tambahan yang wajib

Tambahkan test khusus:
- Race condition dua checkout terhadap stok terakhir.
- Race condition dua penerimaan/transfer untuk item yang sama.
- Retry setelah timeout ketika commit sebenarnya berhasil.
- Idempotency key sama dengan payload berbeda.
- Perubahan izin saat sesi aktif.
- Permission scope lokasi dan shift.
- Penerimaan barang sebelum invoice (GRNI) dan invoice parsial.
- Faktur pemasok berbeda harga dari PO.
- Pembelian dengan biaya angkut.
- Retur pemasok sebelum/sesudah invoice dan pembayaran.
- Retur pelanggan parsial beberapa kali.
- Retur barang baik vs rusak.
- Penjualan kredit dan pembayaran cicilan beberapa kali.
- Refund dari split payment.
- Pembulatan tunai vs QRIS.
- Unit conversion (dus/pcs) dan barcode dengan leading zero.
- FEFO dan peringatan kedaluwarsa.
- Storage quota penuh, browser storage dibersihkan, dan persistent storage ditolak.
- Offline queue di-retry setelah perangkat restart.
- Migrasi import file identik dua kali.
- Migrasi sebagian gagal dan dilanjutkan.
- GRNI, saldo persediaan, subledger AP/AR, dan general ledger direkonsiliasi.

## L. Definition of Ready — sebelum coding tiap milestone

Satu milestone tidak boleh mulai diimplementasikan sebelum tersedia:
1. Tujuan dan ruang lingkup.
2. User story/actor.
3. Acceptance criteria yang dapat diuji.
4. Workflow dan status transition.
5. Data/entity/API contract yang terdampak.
6. Permission yang dibutuhkan.
7. Efek stok/pembayaran/jurnal.
8. Error dan edge cases.
9. Migration/rollback plan jika schema berubah.
10. Test plan.
11. UI states dan responsive behavior jika ada perubahan UI.

Tidak semua keputusan perlu menunggu pengguna. Jika aman, agent dapat memakai asumsi PRD dan mencatatnya di ADR. Pertanyaan ke pengguna hanya untuk keputusan berdampak besar pada uang, data, hukum, atau operasional.

## M. Acceptance gate rilis produksi

Rilis tidak boleh dinyatakan siap hanya karena build berhasil. Wajib:
- seluruh P0 lulus;
- P1 yang disepakati untuk go-live lulus;
- semua jurnal balance dan subledger dapat direkonsiliasi;
- backup/restore drill lulus;
- migration rehearsal lulus pada data representatif;
- permission tests lulus;
- offline data-loss/recovery tests lulus pada perangkat target;
- UAT kasir, gudang, dan akuntan ditandatangani;
- tidak ada bug blocker/critical terbuka;
- known issue, batasan, dan prosedur manual terdokumentasi.

