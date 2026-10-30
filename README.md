# ERP Modular Minimarket — POS, Gudang & Akuntansi

Sistem Enterprise Resource Planning (ERP) ritel modern berarsitektur **Modular Monolith** yang dirancang khusus untuk minimarket di Indonesia sesuai dengan spesifikasi normatif `PRD-ERP-MINIMARKET-VALIDATED.md`.

---

## 🚀 Fitur Utama & Modul

### 1. Modul Kasir (POS)
- **Scanner Barcode Cepat**: Mendukung barcode keyboard-wedge dengan normalisasi *leading zeros*.
- **Katalog 10.000+ Produk**: Pencarian instan SKU, barcode, dan nama barang (< 5 ms latency).
- **Multi-Tender**: Pembayaran Tunai (dengan pembulatan Rp500), QRIS Statis (verifikasi manual), Split Payment, dan Kredit Piutang Pelanggan.
- **Hold Cart**: Menahan transaksi antrean sementara tanpa mengurangi stok fisik atau memicu jurnal prematur.
- **Retur & Refund**: Routing fisik barang (layak jual kembali ke stok vs barang rusak ke karantina) disertai jurnal pembalik otomatis.
- **Shift & Kas Kasir**: Buka/tutup shift kasir, pencatatan kas masuk/keluar/setoran, dan rekonsiliasi selisih kas.
- **Cetak Struk Thermal**: Format struk cetak 58mm/80mm siap printer thermal via dialog print browser.
- **Dukungan Offline POS**: PWA Service Worker + IndexedDB antrean transaksi offline dengan sinkronisasi idempoten.

### 2. Modul Gudang & Persediaan
- **Master Data**: SKU unik, barcode ternormalisasi, multi-satuan dengan conversion factor, dan kategori.
- **Multi-Lokasi Stok**: Pemisahan saldo fisik antara Area Penjualan Toko (`STORE-01`), Gudang Utama (`WH-MAIN`), Barang Rusak (`DAMAGED`), dan Retur (`QUARANTINE`).
- **Ledger Mutasi Stok (Immutability)**: Saldo stok dihitung dari *append-only inventory ledger*, mencegah pengeditan saldo mutlak tanpa jejak audit.
- **Valuasi Moving Weighted Average (MWA)**: Penghitungan biaya pokok rata-rata bergerak otomatis setiap penerimaan barang masuk.
- **Pembelian & Penerimaan Barang (GRNI)**: Purchase Order (PO) -> Goods Receipt (GR) dengan pengakuan akrual *Goods Received Not Invoiced*.
- **Transfer Antar-Lokasi**: Pemindahan stok fisik secara atomik tanpa kebocoran kuantitas dan tanpa laba/rugi fiktif.
- **Stok Opname**: Penghitungan fisik berkala, identifikasi selisih, dan posting penyesuaian otomatis ke kartu stok.

### 3. Modul Akuntansi & Keuangan
- **Double-Entry General Ledger**: Setiap jurnal posted wajib seimbang ($\sum \text{Debit} = \sum \text{Kredit}$) pada level invariant database.
- **Jurnal Otomatis**: Transaksi kasir, penerimaan barang, faktur supplier, retur, beban, dan payroll otomatis menghasilkan ayat jurnal seimbang.
- **Bagan Akun (COA)**: Standar akun ritel Indonesia (Kas, Bank BCA, Bank Mandiri, QRIS Clearing, Piutang, Persediaan, Utang Usaha, GRNI, Penjualan, HPP, Beban Operasional).
- **Laporan Keuangan**: Neraca Saldo (Trial Balance), Laporan Laba Rugi, Posisi Keuangan (Neraca), Buku Besar, dan Kartu Stok.
- **Kas & Bank**: Rekening perbankan, mutasi dana, dan transfer antarbank dengan pencatatan beban administrasi.
- **Penggajian (Payroll)**: Master karyawan, periode payroll, perhitungan gaji bersih, approval & posting jurnal utang gaji, dan pembayaran via bank.

### 4. Wizard Migrasi Accurate.id
- **Preview-First Wizard**: Upload file ekspor Accurate Online (.xlsx / .csv) -> Ekstraksi header & preview sampel baris.
- **Pemetaan Kolom Dinamis**: Deteksi otomatis nama kolom Accurate Online ke field target ERP.
- **Simulasi Dry-Run**: Validasi baris, deteksi SKU/barcode duplikat sebelum commit ke database aktif.
- **Batch Importer Idempoten**: Pengimporan bertahap dengan pencatatan log per baris dan laporan rekonsiliasi nilai saldo awal persediaan.

---

## 🛠️ Tech Stack & Arsitektur

| Komponen | Pilihan Teknologi | Keterangan |
|---|---|---|
| **Framework** | Next.js 15 (React 19 App Router) | Modular monolith dengan layout per modul terisolasi |
| **Bahasa** | TypeScript (Strict Mode) | Validasi boundary tipe data end-to-end |
| **Database** | PostgreSQL 16 | ACID-compliant, native `numeric` decimal precision |
| **ORM** | Drizzle ORM & Drizzle Kit | Type-safe SQL migrations |
| **Styling** | Tailwind CSS | Enterprise design tokens, accessibility & responsive layout |
| **Offline POS** | PWA Service Worker + Dexie (IndexedDB) | Cache katalog lokal & idempotent sync queue |
| **Testing** | Vitest | Unit & Integration testing (17 tests passing) |

---

## ⚙️ Petunjuk Menjalankan (Development & Testing)

### 1. Prasyarat
- Node.js v20+ atau v24 LTS
- Docker (untuk PostgreSQL container)
- npm / pnpm

### 2. Menjalankan Database PostgreSQL
```bash
docker run -d --name erp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=erp_minimarket \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Migrasi Schema & Seeding Data Awal
```bash
# Push skema tabel ke database
npx drizzle-kit push

# Jalankan seeder default (Akun COA, Role, Permission, Master Produk, Lokasi, User Demo)
npm run db:seed
```

### 4. Menjalankan Test Suite (Vitest)
```bash
npm test
```

### 5. Menjalankan Benchmark Performa 10.000+ Produk
```bash
node -r esbuild-register scripts/benchmark-10k.ts
```

### 6. Menjalankan Aplikasi Web
```bash
npm run dev
```
Akses di browser: `http://localhost:3000`

---

## 👥 Akun Pengguna Demo (Uji Coba Cepat)

Kata sandi default untuk seluruh akun: `Admin123!`

| Username | Role | Hak Akses Utama |
|---|---|---|
| `admin` | Owner / Super Admin | Akses seluruh modul, konfigurasi, backup, dan migrasi |
| `kasir1` | Kasir | Terminal POS, shift mandiri, dan cetak struk |
| `gudang1` | Petugas Gudang | Master barang, stok multi-lokasi, PO & Goods Receipt, opname |
| `akuntan1` | Akuntan | Buku besar, jurnal umum, neraca saldo, kas/bank, laporan keuangan |

---

## 📑 Struktur Direktori Proyek & Dokumentasi

- **Laporan Serah Terima Final**: [docs/FINAL_DELIVERY_REPORT.md](file:///workspaces/erp/docs/FINAL_DELIVERY_REPORT.md)
- **Matriks Kebutuhan & Traceability**: [docs/audit/requirement-traceability-matrix.md](file:///workspaces/erp/docs/audit/requirement-traceability-matrix.md)
- **Arsitektur & Skema Database**: [docs/architecture/database.md](file:///workspaces/erp/docs/architecture/database.md)
- **Workflow POS & Akuntansi Double-Entry**: [docs/workflows/pos-and-accounting.md](file:///workspaces/erp/docs/workflows/pos-and-accounting.md)
- **Panduan Migrasi Accurate.id**: [docs/migration/accurate-import.md](file:///workspaces/erp/docs/migration/accurate-import.md)
- **Bukti Pengujian & QA**: [docs/testing/test-plan-and-evidence.md](file:///workspaces/erp/docs/testing/test-plan-and-evidence.md)

```
/workspaces/erp/
├── drizzle/                    # Drizzle migrations
├── docs/                       # Dokumentasi arsitektur, audit & workflow
│   ├── FINAL_DELIVERY_REPORT.md # Laporan final delivery & sign-off
│   ├── adr/                    # Architecture Decision Records
│   ├── architecture/           # Desain teknis database & offline sync
│   ├── audit/                  # Baseline audit & risk register
│   └── workflows/              # Panduan alur POS, GRNI & Akuntansi
├── public/                     # Aset statis PWA & Service Worker (sw.js)
├── scripts/
│   ├── seed.ts                 # Database seeder (Roles, COA, Products)
│   └── benchmark-10k.ts        # Script benchmark 10.000+ produk
├── src/
│   ├── app/                    # Next.js App Router (Pages & API Handlers)
│   │   ├── (modules)/
│   │   │   ├── pos/            # Terminal Kasir POS
│   │   │   ├── inventory/      # Modul Gudang & Persediaan
│   │   │   ├── accounting/     # Modul Akuntansi & Keuangan
│   │   │   └── migration/      # Wizard Migrasi Accurate.id
│   │   └── api/                # REST API Endpoint
│   ├── modules/                # Domain-Driven Core Modules
│   │   ├── identity/           # Autentikasi sesi & RBAC permissions
│   │   ├── inventory/          # Produk, barcode, ledger & Moving Average
│   │   ├── purchasing/         # PO, Goods Receipt & Akrual GRNI
│   │   ├── pos/                # Checkout, rounding, shifts & offline queue
│   │   ├── accounting/         # Double-entry general ledger & reports
│   │   ├── payroll/            # Penggajian karyawan
│   │   └── migration/          # Accurate.id preview & importer
│   └── shared/                 # Database connection, security, design system
└── tests/                      # Vitest Unit & Integration Suites
```
