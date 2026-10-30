# FEATURE INVENTORY & REQUIREMENTS TRACEABILITY MATRIX (RTM)
**ERP Modular Minimarket — POS, Gudang & Akuntansi**
**Dokumen Referensi:** PRD-ERP-MINIMARKET-VALIDATED.md (v2.1 + Addendum A–M)

| ID Req | Modul / Domain | Fitur / Spesifikasi PRD | Prioritas | Status Baseline | Status Target | Acceptance Test / Validasi |
|---|---|---|---|---|---|---|
| REQ-ID-01 | Identity | RBAC Server-side (view, create, update, post, approve, void, refund, export, manage) | P0 | Missing | PASS | Role & permission middleware + Vitest RBAC suites |
| REQ-ID-02 | Identity | Multi-scope permission (Shift sendiri, Lokasi toko yang ditugaskan, Payroll privacy) | P0 | Missing | PASS | Scope filter verification unit tests |
| REQ-ID-03 | Identity | Maker-checker enforcement (tidak dapat menyetujui transaksi sendiri) | P0 | Missing | PASS | Maker-checker constraint assertion |
| REQ-ID-04 | Identity | Audit Trail terpusat untuk seluruh aksi mutasi dan finansial sensitif | P0 | Missing | PASS | Audit table logging verification |
| REQ-UX-01 | UI/UX | 3-Card Module Launcher (POS, Gudang, Akuntansi) | P0 | Missing | PASS | Module navigation isolation test |
| REQ-UX-02 | UI/UX | Business-grade UI, no AI slop, no layout overflow, responsive 360px-desktop | P0 | Missing | PASS | Viewport & accessibility visual QA |
| REQ-WH-01 | Gudang | Master Produk: SKU unik, Barcode normalizer (leading zero safe), multi-satuan | P0 | Missing | PASS | Barcode normalization test cases |
| REQ-WH-02 | Gudang | Multi-lokasi stok (Gudang, Toko, Karantina, Rusak, Retur) dengan ledger terpisah | P0 | Missing | PASS | Multi-location stock ledger balance test |
| REQ-WH-03 | Gudang | Inventory Movement Ledger (immutability, no direct stock balance editing) | P0 | Missing | PASS | Stock ledger append-only verification |
| REQ-WH-04 | Gudang | Valuasi Persediaan Moving Weighted Average (MWA) | P0 | Missing | PASS | MWA calculation test suite |
| REQ-WH-05 | Gudang | Purchase Order & Goods Receipt (GR) dengan alokasi ke lokasi fisik | P0 | Missing | PASS | PO to GR stock posting test |
| REQ-WH-06 | Gudang | Goods Received Not Invoiced (GRNI) accounting bridging | P0 | Missing | PASS | GRNI journal balancing test |
| REQ-WH-07 | Gudang | Supplier Invoice 3-way match & Supplier Return | P1 | Missing | PASS | 3-way match tolerance validation |
| REQ-WH-08 | Gudang | Transfer Antar-Lokasi (Langsung & In-Transit) tanpa kebocoran/duplikasi stok | P0 | Missing | PASS | Stock transfer conservation of mass test |
| REQ-WH-09 | Gudang | Stock Opname dengan snapshot sesi dan isolasi mutasi transaksi berjalan | P0 | Missing | PASS | Stocktake variance & adjustment posting test |
| REQ-WH-10 | Gudang | Peringatan stok minimum, reorder alert, dan produk mendekati expired (FEFO) | P1 | Missing | PASS | Expiry & low stock query verification |
| REQ-POS-01 | POS | Scan Barcode & Pencarian Cepat katalog 10.000+ item | P0 | Missing | PASS | Catalog search & keyboard scanner flow |
| REQ-POS-02 | POS | Keranjang belanja, snapshot harga/satuan/diskon/pajak pada item transaksi | P0 | Missing | PASS | Transaction snapshot immutability test |
| REQ-POS-03 | POS | Multi-Tender: Tunai, QRIS Statis, Split Payment | P0 | Missing | PASS | Payment tendering math & validation tests |
| REQ-POS-04 | POS | Aturan Pembulatan (Rounding Rp500 / Rp1.000) tunai vs aktual non-tunai | P0 | Missing | PASS | Rounding test cases covering edge numbers |
| REQ-POS-05 | POS | Verifikasi manual QRIS Statis (tidak otomatis lunas sebelum dicek kasir) | P0 | Missing | PASS | QRIS verification workflow test |
| REQ-POS-06 | POS | Hold Cart (menahan antrean tanpa potong stok & tanpa jurnal) | P0 | Missing | PASS | Hold cart isolation test |
| REQ-POS-07 | POS | Customer Delivery Order / Pesanan Antar dengan status machine terpisah | P1 | Missing | PASS | Order lifecycle state machine test |
| REQ-POS-08 | POS | Piutang Pelanggan (Credit Sale), pencatatan jatuh tempo & pembayaran bertahap | P1 | Missing | PASS | AR aging & installment payment test |
| REQ-POS-09 | POS | Retur & Refund Penjualan (validasi sisa qty, routing kondisi layak vs rusak) | P0 | Missing | PASS | Return limit & stock routing test |
| REQ-POS-10 | POS | Shift Kasir (Kas Awal, Kas Masuk/Keluar, Setoran, Actual vs Expected, Variance) | P0 | Missing | PASS | Shift reconciliation test |
| REQ-POS-11 | POS | Cetak Nota Thermal (58mm/80mm) + Audit Log Reprint | P0 | Missing | PASS | Receipt format & reprint audit logging |
| REQ-POS-12 | POS | Idempotency Key pada Checkout untuk mencegah duplikasi submit/double-click | P0 | Missing | PASS | Concurrency & duplicate request prevention |
| REQ-OFF-01 | Offline POS | PWA Service Worker & IndexedDB caching untuk katalog & offline session | P1 | Missing | PASS | Offline storage initialization test |
| REQ-OFF-02 | Offline POS | Offline transaction queue dengan status syncing/synced/conflict & retry backoff | P1 | Missing | PASS | Sync queue idempotency & conflict test |
| REQ-ACC-01 | Akuntansi | Double-Entry General Ledger (semua jurnal balance: Debit = Kredit) | P0 | Missing | PASS | Journal balancing constraint test |
| REQ-ACC-02 | Akuntansi | Chart of Accounts (COA) ritel lengkap & konfigurasi pemetaan akun otomatis | P0 | Missing | PASS | Standard COA seed & mapping verification |
| REQ-ACC-03 | Akuntansi | Posting otomatis jurnal dari POS, Penerimaan, Tagihan, Retur, Beban, Transfer | P0 | Missing | PASS | End-to-end automated posting test |
| REQ-ACC-04 | Akuntansi | Kas & Bank, Transfer antarbank dengan pencatatan biaya administrasi | P0 | Missing | PASS | Bank transfer fee balancing test |
| REQ-ACC-05 | Akuntansi | Pencatatan Beban Operasional dan Bukti Pengeluaran Kas | P0 | Missing | PASS | Expense entry & voucher test |
| REQ-ACC-06 | Akuntansi | Penggajian (Payroll): Periode, Komponen, Perhitungan, Approval, Slip Gaji | P1 | Missing | PASS | Payroll posting & privacy test |
| REQ-ACC-07 | Akuntansi | Pajak dasar (PPN Masukan, PPN Keluaran, tarif fleksibel) | P1 | Missing | PASS | Tax calculation & reporting test |
| REQ-ACC-08 | Akuntansi | Laporan Keuangan: Neraca Saldo, Laba Rugi, Neraca, Arus Kas, Buku Besar | P0 | Missing | PASS | Financial report generation & drilldown |
| REQ-MIG-01 | Migrasi | Wizard Migrasi Accurate.id: Upload (Excel/CSV), Header parsing, Sample preview | P0 | Missing | PASS | File parser & sample rendering test |
| REQ-MIG-02 | Migrasi | Column Mapping dinamis ke field ERP (Produk, Satuan, Kategori, Kontak, Akun) | P0 | Missing | PASS | Mapping transformation logic test |
| REQ-MIG-03 | Migrasi | Duplication detection (SKU, Normalized Barcode, Nama) & conflict strategy | P0 | Missing | PASS | Duplicate detection test cases |
| REQ-MIG-04 | Migrasi | Dry-Run simulation dengan ringkasan valid, warning, error | P0 | Missing | PASS | Dry-run summary verification |
| REQ-MIG-05 | Migrasi | Batch Importer dengan checkpoint, retry idempotent, & error log per baris | P0 | Missing | PASS | Batch import test with simulated failures |
| REQ-MIG-06 | Migrasi | Rekonsiliasi saldo kuantitas, nilai persediaan, dan saldo akun pasca-migrasi | P0 | Missing | PASS | Post-migration reconciliation report test |
