# WORKFLOW BISNIS & JURNAL OTOMATIS (SOP TEKNIS)
**ERP Modular Minimarket — POS, Gudang & Akuntansi**

---

## 1. Alur Penjualan POS (POS Checkout)

### Alur Operasional:
1. Kasir membuka shift kasir dengan modal kas awal (`pos_shifts`).
2. Kasir memindai barcode produk dengan barcode scanner keyboard-wedge atau memilih dari katalog.
3. Sistem memvalidasi stok aktif dan menghitung total tagihan beserta pembulatan kas (kelipatan Rp500 untuk tunai).
4. Kasir menerima pembayaran (Tunai / QRIS Statis / Kredit Piutang).
5. Transaksi selesai; struk thermal dicetak.

### Ayat Jurnal Otomatis yang Dihasilkan:
```text
Penjualan Tunai:
  (Dr) 1110 - Kas Toko / Kasir            [Total Bayar Tunai]
  (Cr) 4100 - Pendapatan Penjualan        [Subtotal Penjualan]
  (Dr) 5100 - Harga Pokok Penjualan (HPP) [Total Biaya Pokok]
  (Cr) 1140 - Persediaan Barang Dagang    [Total Biaya Pokok]
  (Cr) 4200 - Pendapatan Pembulatan Kas   [Jika pembulatan positif]
  (Dr) 6500 - Beban Pembulatan Kas        [Jika pembulatan negatif / diskon]

Penjualan Kredit (Piutang Pelanggan):
  (Dr) 1130 - Piutang Usaha Pelanggan     [Total Tagihan]
  (Cr) 4100 - Pendapatan Penjualan        [Total Penjualan]
  (Dr) 5100 - Harga Pokok Penjualan (HPP) [Total Biaya Pokok]
  (Cr) 1140 - Persediaan Barang Dagang    [Total Biaya Pokok]
```

---

## 2. Alur Penerimaan Barang Sebelum Tagihan (GRNI Accrual)

### Alur Operasional:
1. Bagian pembelian membuat Purchase Order (PO) ke supplier. PO **tidak** menambah stok fisik dan **tidak** membuat utang final.
2. Petugas gudang menerima barang fisik (Goods Receipt).
3. Sistem menambah kuantitas stok fisik pada lokasi yang dipilih (`WH-MAIN` atau `STORE-01`).
4. Sistem memperbarui harga biaya rata-rata (Moving Weighted Average) produk.
5. Sistem menerbitkan ayat jurnal akrual **GRNI (Goods Received Not Invoiced)**.
6. Saat tagihan faktur supplier tiba, GRNI ditutup ke Utang Usaha (AP).

### Ayat Jurnal Otomatis:
```text
Saat Goods Receipt (Penerimaan Barang Fisik):
  (Dr) 1140 - Persediaan Barang Dagang                    [Nilai Penerimaan]
  (Cr) 2120 - Goods Received Not Invoiced (GRNI)          [Nilai Penerimaan]

Saat Supplier Invoice (Faktur Tagihan Supplier Tiba):
  (Dr) 2120 - Goods Received Not Invoiced (GRNI)          [Nilai Tagihan]
  (Cr) 2110 - Utang Usaha / Pemasok                       [Nilai Tagihan]

Saat Pelunasan Utang Supplier via Bank:
  (Dr) 2110 - Utang Usaha / Pemasok                       [Nominal Pelunasan]
  (Cr) 1120 - Bank BCA                                    [Nominal Pelunasan]
```

---

## 3. Alur Retur Penjualan & Refund

### Alur Operasional:
1. Pelanggan membawa struk belanja asli dalam masa berlaku retur (1x24 jam).
2. Kasir memasukkan nomor transaksi penjualan asli.
3. Kasir memilih item dan kuantitas retur (sistem memvalidasi agar tidak melebihi sisa yang dapat diretur).
4. Kasir menentukan kondisi barang:
   - **Layak Jual (`saleable`)**: Stok dikembalikan ke Area Penjualan Toko.
   - **Rusak (`damaged`)**: Stok dialokasikan ke Area Barang Rusak (`DAMAGED`).
5. Kasir mengembalikan uang tunai / kredit toko.

### Ayat Jurnal Otomatis:
```text
Barang Layak Jual:
  (Dr) 4120 - Retur Penjualan                             [Nilai Refund]
  (Cr) 1110 - Kas Toko / Kasir                            [Nilai Refund]
  (Dr) 1140 - Persediaan Barang Dagang                    [Nilai HPP Semula]
  (Cr) 5100 - Harga Pokok Penjualan (HPP)                 [Nilai HPP Semula]

Barang Rusak:
  (Dr) 4120 - Retur Penjualan                             [Nilai Refund]
  (Cr) 1110 - Kas Toko / Kasir                            [Nilai Refund]
  (Dr) 6400 - Beban Kerusakan Persediaan                  [Nilai HPP Semula]
  (Cr) 5100 - Harga Pokok Penjualan (HPP)                 [Nilai HPP Semula]
```

---

## 4. Alur Transfer Antar-Bank & Beban Administrasi

```text
Transfer Dana dari Bank BCA ke Bank Mandiri dengan Biaya Admin Rp2.500:
  (Dr) 1121 - Bank Mandiri                                [Dana Bersih Masuk]
  (Dr) 6300 - Beban Administrasi Bank                     [Biaya Transfer]
  (Cr) 1120 - Bank BCA                                    [Total Dana Keluar]
```

---

## 5. Alur Penggajian Karyawan (Payroll)

```text
Saat Approval Periode Gaji (Pengakuan Beban):
  (Dr) 6100 - Beban Gaji & Upah                           [Total Gaji Bersih]
  (Cr) 2130 - Utang Gaji Karyawan                         [Total Gaji Bersih]

Saat Pembayaran Gaji Karyawan via Bank BCA:
  (Dr) 2130 - Utang Gaji Karyawan                         [Total Gaji Terbayar]
  (Cr) 1120 - Bank BCA                                    [Total Gaji Terbayar]
```
