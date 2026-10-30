# DESAIN BASIS DATA & RELATIONAL SCHEMA (ERD)
**ERP Modular Minimarket — POS, Gudang & Akuntansi**

---

## 1. Prinsip Integritas Basis Data

- **Database Engine:** PostgreSQL 16.
- **Tipe Data Finansial & Kuantitas:** Menggunakan tipe `numeric(14,2)` untuk nominal uang dan `numeric(12,2)` untuk kuantitas stok. Dilarang menggunakan tipe `float` atau `double` biner untuk mencegah kesalahan pembulatan sen/rupiah.
- **Normalisasi Barcode:** Kolom `barcode` bertipe `text` unik untuk menjaga integritas *leading zeros* (misalnya barcode produk `0899...`). Dilarang mengonversi barcode menjadi integer.
- **Append-Only Ledgers:**
  - `inventory_movements`: Mencatat setiap mutasi penambahan/pengurangan kuantitas dan nilai biaya satuan secara kronologis.
  - `journal_entries` & `journal_lines`: Menyimpan ayat debit dan kredit buku besar. Jurnal yang sudah diposting tidak boleh diubah atau dihapus (*immutable*).
- **Idempotency Protection:** Tabel `idempotency_records` dengan *unique key* mencegah double-billing dan transaksi ganda akibat latensi jaringan.

---

## 2. Struktur Entitas Utama

### A. Modul Identity
- `users`: User autentikasi, PIN kasir, dan penugasan lokasi kerja.
- `roles`: Role template (`owner`, `admin_ops`, `supervisor`, `cashier`, `warehouse`, `accountant`, `hr_payroll`, `auditor`).
- `permissions`: Hak akses granular (`pos.sell`, `inventory.receive`, `journal.post`, dll).
- `role_permissions` & `user_roles`: Pemetaan relasi many-to-many.
- `audit_logs`: Jejak audit terpusat seluruh aksi penting sistem.
- `idempotency_records`: Kunci pencegah submit berulang.

### B. Modul Inventory & Purchasing
- `categories` & `units`: Kategori dan satuan dasar barang.
- `locations`: Lokasi stok (`STORE-01`, `WH-MAIN`, `DAMAGED`, `QUARANTINE`).
- `products`: Master barang, SKU unik, harga jual, dan harga biaya rata-rata bergerak (Moving Weighted Average).
- `product_barcodes`: Relasi barcode satu atau lebih per produk.
- `stock_balances`: Saldo proyeksi per `(product_id, location_id)` dengan *unique constraint*.
- `inventory_movements`: Ledger mutasi persediaan append-only.
- `purchase_orders` & `purchase_order_items`: Dokumen PO ke supplier.
- `goods_receipts` & `goods_receipt_items`: Dokumen penerimaan barang (Goods Receipt).
- `supplier_invoices`: Pengakuan utang usaha pemasok (AP).
- `supplier_payments`: Pembayaran faktur pemasok dari kas/bank.
- `stock_transfers` & `stock_transfer_items`: Pemindahan stok antar-lokasi.
- `stocktakes` & `stocktake_items`: Dokumen sesi stok opname fisik.

### C. Modul POS (Point of Sale)
- `pos_shifts`: Sesi kerja kasir (kas awal, kas akhir actual, expected, variance).
- `pos_cash_movements`: Kas masuk, kas keluar operasional kasir, dan setoran.
- `sales`: Dokumen transaksi penjualan final.
- `sale_items`: Snapshot nama, SKU, harga, dan biaya saat transaksi checkout.
- `sale_payments`: Tender kas, verifikasi QRIS statis, dan kredit piutang.
- `pos_held_carts`: Keranjang sementara ditahan (Hold cart).
- `sales_returns` & `sales_return_items`: Dokumen retur penjualan dan refund.

### D. Modul Akuntansi & Keuangan
- `accounts`: Bagan akun (Chart of Accounts) standar ritel Indonesia.
- `journal_entries`: Header jurnal umum (No. Jurnal, tanggal, referensi dokumen, total debit, total kredit).
- `journal_lines`: Rincian baris debit dan kredit per akun.
- `bank_accounts`: Master rekening bank operasional minimarket.
- `bank_transfers`: Mutasi transfer antarbank dengan pencatatan beban admin.
- `expenses`: Catatan beban operasional toko.
- `payroll_runs` & `payslips`: Sesi penggajian bulanan dan slip gaji karyawan.
