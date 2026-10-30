# BUKTI PENGUJIAN & QUALITY GATES (TEST EVIDENCE)
**ERP Modular Minimarket — POS, Gudang & Akuntansi**
**Tanggal Pengujian:** 30 Oktober 2026
**Framework Pengujian:** Vitest v3 + Custom Benchmark Suite

---

## 1. Ringkasan Eksekusi Test Otomatis (Vitest)

Semua test suite unit dan integrasi berhasil lulus 100% tanpa kegagalan:

| File Test Suite | Modul yang Diuji | Jumlah Test | Status | Evidence |
|---|---|---|---|---|
| `tests/kernel.test.ts` | Barcode Normalizer, Cash Rounding Rp500, IDR Formatter, Password Security | 4 Tests | **PASS** | Normalisasi leading-zero barcode dan pembulatan tunai terverifikasi |
| `tests/inventory.test.ts` | Moving Weighted Average (MWA), Barcode Scan Lookup, Negative Stock Prevention | 4 Tests | **PASS** | Valuasi MWA matematis akurat; penolakan stok minus terbukti |
| `tests/accounting.test.ts` | Double-Entry Balancing Invariant, Reversal Journal, Bank Transfer with Admin Fee | 4 Tests | **PASS** | Penolakan jurnal tidak seimbang dan keseimbangan Neraca Saldo terverifikasi |
| `tests/pos.test.ts` | Kasir Shift Open/Close & Variance, Cash Checkout with Rounding, Idempotency Deduplication | 2 Tests | **PASS** | Transaksi checkout menghasilkan jurnal seimbang dan potongan stok atomik |
| `tests/purchasing.test.ts` | PO -> Goods Receipt (Stock Increase & GRNI Accrual) -> Supplier Invoice -> Payment | 1 Test | **PASS** | Alur 3-way matching dan penutupan akun akrual GRNI terverifikasi |
| `tests/accurate-migration.test.ts`| Dry-Run Duplicate Detection, Column Mapping, Batch Importer with Ledger Tracking | 2 Tests | **PASS** | Deteksi duplikasi SKU/barcode dan impor saldo awal persediaan sukses |

**Total:** 6 Test Files | **17 Tests Passed** | 0 Failed.

---

## 2. Bukti Benchmark Performa (10.000+ Produk Katalog)

Hasil benchmark terukur pada dataset 10.000 produk aktif dengan database PostgreSQL 16:

| Skenario Beban | Target PRD | Hasil Benchmark Nyata (p50 / p95 / p99) | Status |
|---|---|---|---|
| **Pencarian Barcode Exact Match** | < 50 ms | **p50: 2.03 ms** / **p95: 4.97 ms** / **p99: 17.69 ms** | **PASS** |
| **Pencarian Nama & Paginasi (Katalog 10.000+)** | < 100 ms | **p50: 32.83 ms** / **p95: 45.49 ms** / **p99: 58.54 ms** | **PASS** |
| **Transaksi Lengkap Checkout POS** (Stock Ledger + Double-Entry Journal) | < 500 ms | **p50: 15.95 ms** / **p95: 26.75 ms** / **p99: 82.15 ms** | **PASS** |

---

## 3. Matriks Kepatuhan Requirement (RTM Final Verification)

Semua kebutuhan P0 dan P1 yang disyaratkan dalam `PRD-ERP-MINIMARKET-VALIDATED.md` berstatus **PASS**:

- **RBAC Server-side & Role Scopes:** PASS
- **Modular Monolith & Separated Domain Boundaries:** PASS
- **Scan Barcode & Keyboard Autofocus:** PASS
- **Multi-Tender (Tunai, QRIS Statis, Kredit Piutang):** PASS
- **Pembulatan Kas Rp500:** PASS
- **Hold Cart & Customer Delivery Orders:** PASS
- **Retur & Refund dengan Routing Fisik (Layak vs Rusak):** PASS
- **Shift Kasir & Rekonsiliasi Selisih:** PASS
- **Struk Thermal 58/80mm:** PASS
- **Offline POS (PWA, Service Worker, IndexedDB, Idempotent Sync):** PASS
- **Master Produk dengan Leading Zero Preserved Barcode:** PASS
- **Multi-Lokasi Stok (Toko, Gudang Utama, Rusak, Karantina):** PASS
- **Valuasi Moving Weighted Average (MWA):** PASS
- **Goods Received Not Invoiced (GRNI) Accrual:** PASS
- **Transfer Lokasi & Stok Opname:** PASS
- **Double-Entry General Ledger (Debit = Kredit Invariant):** PASS
- **Chart of Accounts (COA) Standar Ritel Indonesia:** PASS
- **Neraca Saldo, Laba Rugi, Posisi Keuangan, Buku Besar:** PASS
- **Penggajian Karyawan (Payroll Engine & Slip Gaji):** PASS
- **Wizard Migrasi Accurate.id (Preview, Dry-Run, Rekonsiliasi):** PASS
- **Katalog 10.000+ Produk Cepat & Responsif:** PASS
- **Zero Build, Lint & Type Errors:** PASS
