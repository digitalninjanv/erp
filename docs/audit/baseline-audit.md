# BASELINE AUDIT REPORT
**ERP Modular Minimarket — POS, Gudang & Akuntansi**
**Audit Date:** 30 Oktober 2026
**Auditor:** Autonomous Senior Software Engineering Team

---

## 1. Executive Summary

Audit awal terhadap repository `/workspaces/erp` dilakukan sebelum inisialisasi kode untuk memetakan kondisi dasar, dependensi, dan keselarasan terhadap dokumen spesifikasi `PRD-ERP-MINIMARKET-VALIDATED.md`.

Hasil audit menunjukkan repositori berada pada kondisi awal (*greenfield*):
- Commit awal: `797c1c3` (Initial commit)
- Commit terbaru: `8b612d7` (Add files via upload: `PRD-ERP-MINIMARKET-VALIDATED.md`)
- Tidak ada source code warisan (*legacy code*) yang bertentangan atau perlu dibersihkan.
- Seluruh spesifikasi pada PRD v2.1 beserta Addendum Normatif (A–M) dijadikan acuan arsitektur definitif.

---

## 2. Environment & Tooling Audit

| Komponen | Status / Versi | Catatan |
|---|---|---|
| OS | Linux (x86_64 Debian/Ubuntu Codespaces) | Didukung penuh |
| Node.js | v24.21.0 | Mendukung Next.js 15+ LTS |
| Package Manager | pnpm v12.3.4 / npm v11.19.0 | Rekomendasi: `npm` / `pnpm` |
| Docker | v29.8.0-1 | Aktif; digunakan untuk PostgreSQL 16 Alpine container |
| Database Utama | PostgreSQL 16 | Relational, ACID compliant, native decimal support |
| Target Framework | Next.js 15 (React 19, TypeScript strict mode) | Modular monolith App Router |
| ORM | Drizzle ORM + Drizzle Kit | Type-safe SQL schema & migrations |
| Styling | Tailwind CSS | Enterprise design tokens, responsive, accessible |
| Testing | Vitest + Playwright | Unit/Integration & E2E browser testing |

---

## 3. Fitur & Ruang Lingkup (Scope Baseline)

Sesuai PRD v2.1, sistem mencakup tiga modul inti yang terisolasi secara navigasi dan logika domain:
1. **Modul POS:**
   - Scan barcode & pencarian cepat katalog 10.000+ item.
   - Tender: Tunai (dengan pembulatan Rp500/Rp1.000), QRIS Statis (verifikasi manual), Split Payment, Kredit Piutang.
   - Hold Order (keranjang ditahan tanpa efek stok/jurnal) & Pesanan Pelanggan (Customer Order / Antar).
   - Retur penjualan & Refund dengan validasi sisa kuantitas, routing kondisi barang (layak jual vs karantina/rusak).
   - Shift kasir terisolasi (kas awal, kas masuk/keluar, setoran, expected vs actual cash, variance).
   - Cetak nota thermal (58mm/80mm) dan audit reprint.
   - Offline POS dengan PWA, Service Worker, IndexedDB, dan sinkronisasi antrean berbasis UUID & Idempotency Key.

2. **Modul Gudang (Inventory & Purchasing):**
   - Master produk dengan normalized barcode (menjaga leading zeros), multi-satuan dengan conversion factor.
   - Multi-lokasi stok (Gudang Utama, Area Penjualan/Toko, Karantina, Barang Rusak, Area Retur).
   - Pergerakan stok tercatat strictly pada *Inventory Movement Ledger* (bukan direct update ke saldo).
   - Purchasing: PO -> Goods Receipt (GR) -> Supplier Invoice (matching 3-way) -> Payment.
   - Akun perantara **GRNI (Goods Received Not Invoiced)** saat barang diterima sebelum tagihan tiba.
   - Transfer stok antar-lokasi (langsung maupun transit).
   - Stock Opname dengan snapshot sesi dan isolasi mutasi berjalan.
   - Valuasi persediaan: **Moving Weighted Average** (tidak menciptakan laba/rugi fiktif pada transfer internal).

3. **Modul Akuntansi & Keuangan:**
   - Standar Double-Entry Bookkeeping (semua jurnal posted wajib seimbang Debit = Kredit).
   - Jurnal otomatis terpicu dari transaksi operasional (POS checkout, Goods Receipt, Supplier Invoice, Retur, Write-off, Transfer Bank, Payroll).
   - Immutability: Jurnal posted tidak dapat di-edit atau di-delete; koreksi wajib melalui *reversal* atau *adjustment*.
   - Chart of Accounts (COA) komprehensif untuk bisnis minimarket ritel Indonesia.
   - Kas & Bank, mutasi, transfer antarbank dengan pencatatan beban administrasi.
   - Penggajian (Payroll): Periode, master karyawan, slip gaji, jurnal beban & utang gaji dengan akses privat terproteksi.
   - Pajak dasar (PPN Masukan/Keluaran dengan konfigurasi tarif fleksibel).
   - Laporan Keuangan: Jurnal Umum, Buku Besar, Neraca Saldo, Laba Rugi, Neraca, Arus Kas, Kartu Stok, Aging Piutang & Utang.

4. **Wizard Migrasi Accurate.id:**
   - Preview-first import wizard: Upload (Excel/CSV) -> Parsing -> Column Mapping -> Validation & Deduplication -> Dry-Run -> Batch Import -> Reconciliation Report.
   - Menjamin saldo pembukuan awal dan kuantitas stok terverifikasi sebelum masuk ke database aktif.

---

## 4. Analisis Kesiapan Arsitektur

Arsitektur akan disusun dengan prinsip **Domain-Driven Modular Monolith**:
- `src/modules/identity`: Autentikasi sesi, user, role template, dynamic permissions, audit log.
- `src/modules/inventory`: Produk, kategori, satuan, supplier, lokasi stok, ledger mutasi, valuasi MWA, opname.
- `src/modules/purchasing`: PO, Goods Receipt, Supplier Invoice (3-way matching), Supplier Return.
- `src/modules/pos`: Cart, checkout, payment processing, shift kasir, hold cart, customer orders, retur & refund.
- `src/modules/accounting`: COA, journal engine, posting mapper, bank accounts, expenses, AR/AP subledger, financial reports.
- `src/modules/payroll`: Employee records, payroll periods, salary components, payslip generator.
- `src/modules/migration`: Accurate.id parser, mapper, dry-run validator, batch importer, reconciliation engine.
- `src/shared`: Database pool/client, transaction runner, security hashers, audit dispatcher, UI design system, currency & number formatters.
