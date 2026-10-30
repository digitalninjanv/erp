# ARSITEKTUR SISTEM & BATAS DOMAIN (OVERVIEW)
**ERP Modular Minimarket — POS, Gudang & Akuntansi**

---

## 1. Pola Arsitektur: Domain-Driven Modular Monolith

Sistem dirancang sebagai **Modular Monolith** dengan pemisahan domain bisnis yang tegas (*bounded contexts*). Arsitektur ini dipilih untuk memadukan kemudahan operasional satu database relasional (ACID transaction) dengan skalabilitas modularitas kode.

```
                    ┌─────────────────────────┐
                    │      Module Launcher    │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     POS UI      │     │    Gudang UI    │     │   Akuntansi UI  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   POS Service   │◄───►│Inventory Service│◄───►│Accounting Service│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ PostgreSQL Transaction│
                     │  (ACID Single Commit) │
                     └───────────────────────┘
```

---

## 2. Batas Domain (Domain Boundaries)

1. **Identity & Access Control (`identity`)**:
   - Tanggung jawab: Mengelola user, sesi, role, dan hak akses izin granular (*permission keys*).
   - Invariant: *Default Deny* pada semua server endpoint. Kasir tanpa otorisasi tidak dapat memanggil endpoint Akuntansi atau Gudang.

2. **Inventory & Persediaan (`inventory`)**:
   - Tanggung jawab: Master katalog, barcode, multi-lokasi stok, ledger mutasi barang, valuasi Moving Weighted Average (MWA).
   - Invariant: Saldo stok dihitung dari *append-only inventory movements*. Dilarang mengedit saldo langsung. Kuantitas tidak boleh negatif secara default.

3. **Purchasing & Logistik (`purchasing`)**:
   - Tanggung jawab: Purchase Order (PO), Goods Receipt (GR), Supplier Invoice (3-way matching), Supplier Return.
   - Invariant: PO tidak menambah stok fisik. Penerimaan barang yang diposting menambah stok dan menjurnal akrual GRNI.

4. **Point of Sale (`pos`)**:
   - Tanggung jawab: Transaksi belanja kasir, barcode scan, tender multi-metode, cash rounding Rp500, hold cart, customer orders, shift kasir, dan struk.
   - Invariant: Setiap checkout penjualan wajib mereduksi stok via ledger mutasi dan menghasilkan ayat jurnal seimbang. Menggunakan Idempotency Key untuk mencegah duplikasi submit.

5. **Accounting & Keuangan (`accounting`)**:
   - Tanggung jawab: General ledger, bagan akun (COA), posting jurnal otomatis, kas/bank, beban toko, utang-piutang, laporan keuangan.
   - Invariant: $\sum \text{Debit} = \sum \text{Kredit}$. Jurnal posted bersifat immutable (koreksi wajib via reversal/adjustment).

6. **Penggajian (`payroll`)**:
   - Tanggung jawab: Master karyawan, periode payroll, perhitungan gaji bersih, approval & posting jurnal utang gaji, dan pembayaran via bank.
   - Invariant: Data slip gaji privat dan hanya dapat diakses role yang berwenang.

7. **Migrasi Accurate.id (`migration`)**:
   - Tanggung jawab: Wizard preview-first, pemetaan kolom, deteksi duplikasi, dry-run simulation, batch import idempoten, dan laporan rekonsiliasi.
   - Invariant: Tidak ada import data produksi sebelum lolos dry-run dan verifikasi duplikasi.
