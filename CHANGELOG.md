# CHANGELOG

## [1.0.0] - 2026-10-30

### Inisialisasi Arsitektur & Fondasi (Phase 0 & Phase 1)
- Deep repository audit dan penyusunan baseline audit report, technical debt register, security risk register, dan requirements traceability matrix (RTM).
- Setup Next.js 15 (React 19, TypeScript strict mode) dengan Tailwind CSS enterprise design system.
- Setup PostgreSQL 16 container dan Drizzle ORM dengan 51 tabel terstruktur, constraint relasional, dan presisi numerik `numeric(14,2)`.
- Implementasi RBAC server-side dengan 8 role template (`owner`, `admin_ops`, `supervisor`, `cashier`, `warehouse`, `accountant`, `hr_payroll`, `auditor`) dan granular permission keys.
- Module Launcher modern dengan 3 kartu utama terpisah: POS, Gudang, dan Akuntansi.

### Modul Gudang & Persediaan (Phase 2)
- Master katalog produk dengan normalisasi barcode (menjaga leading zero).
- Multi-lokasi stok (`STORE-01`, `WH-MAIN`, `DAMAGED`, `QUARANTINE`).
- Append-only *Inventory Movement Ledger* untuk audit trail mutasi kuantitas fisik.
- Engine biaya pokok **Moving Weighted Average (MWA)**.
- Alur pembelian: Purchase Order (PO) -> Goods Receipt (GR) dengan akrual *Goods Received Not Invoiced (GRNI)*.
- Transfer stok antar-lokasi dan sesi stok opname fisik dengan penyesuaian selisih otomatis.

### Modul Kasir POS & Offline Support (Phase 2 & Phase 5)
- Scan barcode keyboard-wedge dengan autofocus instan dan katalog pencarian cepat.
- Multi-tender: Tunai (dengan pembulatan Rp500), QRIS Statis (verifikasi manual), dan Kredit Piutang Pelanggan.
- Hold order dan resume keranjang belanja.
- Retur penjualan dan refund dengan routing kondisi fisik barang (layak jual kembali ke toko vs barang rusak ke karantina).
- Manajemen shift kasir (buka/tutup shift, kas masuk/keluar, dan rekonsiliasi kas).
- Cetak struk thermal 58mm/80mm siap printer via stylesheet `@media print`.
- Offline POS engine: PWA Service Worker (`public/sw.js`), Dexie IndexedDB cache katalog, antrean transaksi offline, dan sinkronisasi batch idempoten.

### Modul Akuntansi & Keuangan (Phase 2 & Phase 4)
- Double-entry general ledger dengan invariant wajib $\sum \text{Debit} = \sum \text{Kredit}$.
- Bagan akun (Chart of Accounts) standar ritel Indonesia.
- Jurnal transaksi posted immutable (koreksi via reversal journal).
- Laporan keuangan otomatis: Neraca Saldo (Trial Balance), Laporan Laba Rugi, Posisi Keuangan (Neraca), Buku Besar, dan Kartu Stok.
- Kas & Bank, mutasi, dan transfer antarbank dengan pencatatan beban administrasi.
- Penggajian (Payroll): Periode gaji, perhitungan gaji bersih, approval & posting beban/utang gaji ke buku besar, serta pencairan via bank.

### Wizard Migrasi Accurate.id (Phase 5)
- Preview-first migration wizard: Upload file Excel/CSV ekspor Accurate Online.
- Ekstraksi header dan pemetaan kolom dinamis dengan auto-detection kolom Accurate Online.
- Simulasi dry-run untuk validasi baris dan deteksi duplikasi SKU/barcode sebelum commit.
- Batch importer idempoten dengan per-row error logging dan laporan rekonsiliasi nilai saldo awal persediaan.

### Quality Assurance & Benchmarking (Phase 6 & Phase 7)
- 17 test otomatis (Vitest) mencakup kalkulasi finansial, double-entry balancing, moving average, checkout POS, dan batch import.
- Benchmark performa 10.000+ produk:
  - Barcode match: p95 = 4.97 ms (< 50 ms target).
  - Search & pagination: p95 = 45.49 ms (< 100 ms target).
  - POS checkout with ledger & double-entry journal: p95 = 26.75 ms (< 500 ms target).
- Zero lint, type, and build errors (40 routes compiled cleanly).
