# PANDUAN WIZARD MIGRASI DATA ACCURATE.ID
**ERP Modular Minimarket — POS, Gudang & Akuntansi**

---

## 1. Prinsip Preview-First & Rekonsiliasi

Migrasi data dari Accurate.id atau Accurate Online menerapkan prinsip **Preview-First**:
- Dilarang mengimpor file ekspor secara langsung ke tabel produksi tanpa proses pemetaan kolom, verifikasi duplikasi, dan simulasi dry-run.
- Menjamin konsistensi saldo awal kuantitas dan nilai buku persediaan sebelum kasir mulai bertransaksi pada sistem baru.

---

## 2. Alur 4 Langkah Wizard Migrasi

```text
[Langkah 1: Unggah File]
  ├── Format yang didukung: Excel (.xlsx / .xls) dan CSV
  └── Ekstraksi seluruh header kolom dan pembacaan baris data

[Langkah 2: Pemetaan Kolom Sumber ke Target ERP]
  ├── SKU / Kode Barang (Wajib)
  ├── Nama Barang / Deskripsi (Wajib)
  ├── Barcode / UPC (Opsional - leading zero preserved)
  ├── Harga Beli / Biaya Satuan (Opsional)
  ├── Harga Jual (Opsional)
  ├── Saldo Stok Awal (Opsional)
  └── Strategi Duplikasi: "Skip" (Lewati) atau "Update" (Perbarui)

[Langkah 3: Simulasi Dry-Run]
  ├── Memeriksa apakah SKU sudah terdaftar di database ERP
  ├── Memeriksa apakah Barcode bentrok dengan produk lain
  ├── Memvalidasi kelengkapan baris wajib
  └── Menampilkan ringkasan: Total Baris, Valid, Duplikat, dan Error

[Langkah 4: Eksekusi Batch Import & Rekonsiliasi]
  ├── Penyimpanan data produk baru dan barcode
  ├── Penambahan saldo stok fisik pada lokasi yang dipilih
  ├── Pencatatan mutasi saldo awal pada Inventory Movement Ledger
  └── Pembuatan Laporan Rekonsiliasi:
      - Total produk terimpor
      - Total kuantitas fisik masuk
      - Total nilai valuasi persediaan awal
```

---

## 3. Strategi Deduplikasi & Resolusi Konflik

Jika SKU atau Barcode pada file ekspor Accurate sudah ada di database ERP:
1. **Pilihan `skip` (Rekomendasi Aman):** Baris duplikat dilewati tanpa mengubah data master yang sudah ada di ERP. Baris dicatat dalam log migrasi.
2. **Pilihan `update`:** Memperbarui nama, harga beli, dan harga jual produk yang cocok dengan data terbaru dari file ekspor.

---

## 4. Format Contoh File Ekspor Accurate Online

Kolom standar yang dihasilkan ekspor Master Barang Accurate Online:
| Kolom Accurate | Target Field ERP | Catatan |
|---|---|---|
| `Kode Barang` | `sku` | Wajib diisi, unik |
| `Nama Barang` | `name` | Wajib diisi |
| `Barcode` | `barcode` | String dengan leading-zeros |
| `Harga Beli` | `purchasePrice` & `costPrice` | Numerik |
| `Harga Jual` | `sellingPrice` | Numerik |
| `Kuantitas` | `stockQty` | Kuantitas awal fisik |
