# TECHNICAL DEBT, SECURITY & PERFORMANCE RISK REPORT
**ERP Modular Minimarket — POS, Gudang & Akuntansi**
**Audit Date:** 30 Oktober 2026

---

## 1. Technical Debt Register (Pre-Implementation Baseline)

| Item | Risiko Debt | Strategi Mitigasi / Kebijakan Arsitektur |
|---|---|---|
| Floating point arithmetic | Kesalahan pembulatan sen/rupiah pada perhitungan uang | Wajib gunakan tipe `numeric`/`decimal` di database dan library integer/fixed-point math (`BigInt` atau integer satuan terkecil / cents) di TypeScript |
| Anemic Domain Model / Big Ball of Mud | Logic bisnis tersebar di controller/UI components | Terapkan Domain-Driven Modular Monolith. `app/` hanya adapter tipis; business logic wajib berada di `domain/` dan `application/` use cases |
| Direct DB Balance Mutasi | Saldo stok diedit langsung tanpa jejak audit | Terapkan *Append-Only Inventory Ledger* (`inventory_movements`). Saldo stok dihitung dari ledger atau diproyeksikan dengan database trigger/transaction lock |
| Unbalanced Journal Entries | Jurnal posted tidak seimbang menyebabkan distorsi laporan keuangan | Database check constraint `sum(debit) = sum(credit)` dan pre-commit domain assertion sebelum persistensi |
| Monolithic Global State di Client | State belanjaan/katalog mencemari memori browser | Cache IndexedDB terstruktur via Dexie/native IDB; pagination server-side untuk katalog 10.000+ produk |

---

## 2. Security Risk Register

| ID | Kategori Ancaman | Deskripsi Risiko | Tingkat Risiko | Kontrol Mitigasi Wajib |
|---|---|---|---|---|
| SEC-01 | Broken Object Level Auth (BOLA / IDOR) | Kasir mengakses data shift atau transaksi milik cabang/kasir lain | High | Server-side RBAC + Scope-level check (`user_id`, `assigned_location_id`, `shift_id`) pada setiap API handler |
| SEC-02 | Privilege Escalation | Kasir mem-bypass otorisasi supervisor untuk void / diskon besar | High | Maker-checker validation; supervisor token / approval pin verifier di server; log audit wajib |
| SEC-03 | Replay Attacks & Double Submit | Kasir submit transaksi ganda akibat jaringan lambat atau klik berulang | High | Idempotency Key unik (`client_request_id` + `device_id`) dengan unique constraint pada tabel `idempotency_records` |
| SEC-04 | Insecure Storage | Kredensial atau data rahasia tersimpan di IndexedDB atau localStorage | High | Hanya simpan token sesi terenkripsi / HttpOnly cookie; dilarang menyimpan data payroll atau data sensitif di storage browser lokal |
| SEC-05 | File Upload Vulnerabilities | File gambar QRIS atau file import disusupi file berbahaya / exploit | Medium | Validasi MIME type, limit ukuran file (max 5MB), sanitasi nama file, dan parsing terisolasi |

---

## 3. Performance Risk Report

| ID | Area Beban | Target / Ambang Batas | Risiko & Bottleneck | Solusi Teknis |
|---|---|---|---|---|
| PERF-01 | Katalog 10.000+ Produk | Query pencarian < 100 ms | Full table scan pada tabel produk | Buat B-Tree Index pada `barcode`, `sku`, dan composite index pada `(status, name)` |
| PERF-02 | POS Checkout Concurrency | Transaksi commit < 500 ms (p95) | Lock contention pada row stok saat jam sibuk | Gunakan conditional atomic decrement: `UPDATE stock_balances SET qty = qty - :qty WHERE product_id = :id AND qty >= :qty` |
| PERF-03 | Laporan Buku Besar & Neraca Saldo | Query eksekusi < 1 detik | Pembacaan seluruh `journal_lines` tanpa filter indeks | Index majemuk pada `journal_lines (account_id, entry_date, posted_status)` |
| PERF-04 | Offline Data Sync Batch | Sinkronisasi 50 transaksi < 5 detik | N+1 roundtrips saat submit antrean | Endpoint batch sync atomik yang memproses antrean dalam satu database transaction per transaksi |

---

## 4. Implementation Roadmap (Phased Plan)

```
[Phase 0: Deep Audit & Baseline]  -> COMPLETED
           ↓
[Phase 1: Architecture & Foundation]
  - Project scaffold Next.js 15 + TypeScript + Tailwind
  - PostgreSQL container & Drizzle ORM setup
  - RBAC engine, session authentication, audit logger
  - Unified Business UI Design System & 3-Card Module Launcher
           ↓
[Phase 2: Core Domain Models & Modules Implementation]
  - Gudang: Master data, Barcode normalizer, Multi-location, Ledger mutasi, MWA, PO & GR, GRNI, Opname
  - POS: Online POS, Multi-tender, Rounding Rp500/Rp1000, Static QRIS, Shift kasir, Thermal Receipt
  - Akuntansi: Double-entry journal engine, COA standard, Automatic posting, Bank & fees, Payroll, Reports
           ↓
[Phase 3: Cross-Module Integration & Business Workflows]
  - POS Sale -> Stock Deduction -> Balanced Accounting Journal
  - Goods Receipt -> Stock Increase -> GRNI Accrual -> Invoice Matching
  - Returns & Refunds with physical condition routing (Saleable vs Damaged)
           ↓
[Phase 4: Accurate.id Migration Wizard]
  - Preview-first wizard: File parser -> Column mapping -> Dry-run validator -> Batch importer -> Reconciliation
           ↓
[Phase 5: Offline POS & Sync Engine]
  - Service Worker, PWA manifest, IndexedDB cache & queue, Idempotent sync adapter
           ↓
[Phase 6: Comprehensive Testing & Quality Gates]
  - Vitest unit suites, Integration suites, Concurrency tests, Balancing checks
           ↓
[Phase 7: Performance Benchmarking & Hardening]
  - 10.000+ products benchmark, query optimization, security verification
           ↓
[Phase 8: Final Audit, Documentation & Handover]
  - Requirement Traceability verification, User manuals, Architecture & API docs
```
