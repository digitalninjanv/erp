# ARSITEKTUR OFFLINE POS & SYNC ENGINE
**ERP Modular Minimarket — POS, Gudang & Akuntansi**

---

## 1. Desain PWA & Penyimpanan Lokal

Untuk menjamin kelancaran operasional kasir minimarket ketika terjadi gangguan koneksi internet, sistem menerapkan arsitektur **Progressive Web App (PWA)** dengan kombinasi teknologi:
1. **Service Worker (`public/sw.js`):** Meng-cache app shell, stylesheet, aset visual, dan script aplikasi.
2. **IndexedDB (via Dexie.js `src/modules/pos/offline-db.ts`):** Menyimpan snapshot katalog produk dan antrean transaksi offline.
3. **Penyimpanan Lokal Terstruktur:** Tidak menggunakan `localStorage` untuk ribuan produk karena keterbatasan kuota 5MB dan sifat synchronous yang memblokir render UI.

---

## 2. Struktur Antrean Transaksi Offline (`offlineQueue`)

Setiap transaksi yang dilakukan saat perangkat offline diberi identitas unik:
- `clientTxId`: UUID lokal unik per perangkat.
- `offlineIdempotencyKey`: Kunci komposit unik (`offline_{clientTxId}`) untuk mencegah duplikasi saat tersinkronisasi.
- `items`: Snapshot produk, kuantitas, harga, dan diskon.
- `paymentMethod`: Metode pembayaran yang diizinkan saat offline (Tunai diutamakan; QRIS statis offline dicatat sebagai *pending verification*).
- `status`: State machine antrean:
  `queued → syncing → synced / failed`.

---

## 3. Alur Rekonsiliasi & Sinkronisasi Idempoten

```text
[Kasir Offline] ──> Simpan Transaksi ke IndexedDB (status: queued)
                            │
              (Koneksi Internet Pulih Kembali)
                            │
                            ▼
[Sync Engine] ──> Kirim Batch Transaksi ke `/api/pos/sync`
                            │
                            ▼
[Server ERP] ───► Periksa Idempotency Key pada Database
                  ├── Jika key belum ada:
                  │   1. Potong stok pada inventory ledger
                  │   2. Catat penjualan dan penerimaan kas
                  │   3. Buat ayat jurnal seimbang
                  │   4. Simpan status: completed pada idempotency_records
                  │   5. Kembalikan response: synced
                  └── Jika key sudah ada:
                      Kembalikan response: synced (Idempotent replay)
                            │
                            ▼
[Client POS] ───► Tandai Transaksi di IndexedDB sebagai `synced`
```

---

## 4. Mitigasi Risiko & Batasan Offline

1. **Potensi Oversell Stok:**
   - Stok pada perangkat offline adalah snapshot tersinkronisasi terakhir. Jika dua perangkat offline menjual unit stok terakhir secara bersamaan, server akan mencatat pergerakan stok dan menandai rekonsiliasi supervisor tanpa menghentikan checkout kasir.
2. **Keamanan Kredensial:**
   - Dilarang menyimpan password plaintext, token jangka panjang, atau data payroll pada storage browser lokal.
3. **Verifikasi QRIS Statis:**
   - Saat offline, transaksi QRIS statis tidak otomatis dianggap lunas tanpa verifikasi manual kasir sesuai SOP toko.
