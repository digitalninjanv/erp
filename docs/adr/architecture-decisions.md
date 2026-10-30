# ARCHITECTURE DECISION RECORDS (ADR)

## ADR-0001: Target Stack & Runtime Selection
- **Status:** Accepted
- **Context:** Sistem ERP Minimarket memerlukan performa tinggi untuk pencarian produk, konsistensi transaksi finansial, dukungan offline POS (PWA), dan arsitektur modular yang mudah dipelihara.
- **Decision:**
  - Runtime: Node.js 24 + TypeScript (strict mode).
  - Framework: Next.js 15 (React 19 App Router).
  - Database: PostgreSQL 16 (ACID-compliant, decimal numeric, robust transactions).
  - ORM: Drizzle ORM (type-safe SQL, explicit migrations, lightweight footprint).
  - Styling: Tailwind CSS (enterprise utility-first design system).
  - Offline POS: PWA Service Worker + IndexedDB.
  - Testing: Vitest (unit/integration) + Playwright (E2E).
- **Consequences:** Struktur kode terstandarisasi, tipe data aman end-to-end dari database hingga UI, dan latensi query minimal.

---

## ADR-0002: Modular Monolith with Domain Boundaries
- **Status:** Accepted
- **Context:** Mengurangi kompleksitas operasional mikroservis sambil menjaga isolasi domain bisnis agar tidak terjadi *spaghetti code*.
- **Decision:**
  - Modul domain diisolasi ke dalam `src/modules/{identity,inventory,purchasing,pos,accounting,payroll,migration}`.
  - Setiap modul memiliki lapisan `domain`, `application`, `infrastructure`, dan `presentation`.
  - Akses lintas modul hanya boleh melalui Application Service publik / Contract interface, dilarang direct import internal table modul lain untuk mutasi liar.
- **Consequences:** Domain terisolasi dengan rapi, mudah diuji secara modular, siap dipisah ke service mandiri di masa depan jika skala toko berkembang.

---

## ADR-0003: Inventory Movement Ledger & Moving Weighted Average (MWA)
- **Status:** Accepted
- **Context:** Nilai persediaan dan kuantitas barang harus dapat ditelusuri riwayatnya secara auditabel, tidak boleh mengedit saldo stok secara mutlak.
- **Decision:**
  - Setiap perubahan stok wajib menghasilkan baris baru di `inventory_movements` (append-only ledger).
  - Biaya pokok barang dihitung menggunakan metode **Moving Weighted Average (MWA)**:
    $$\text{Biaya Baru} = \frac{\text{Nilai Saldo Sebelum} + \text{Nilai Penerimaan Baru}}{\text{Qty Saldo Sebelum} + \text{Qty Penerimaan Baru}}$$
  - Transfer internal antar-lokasi tidak menciptakan laba/rugi fiktif.
  - Stock negative dicegah secara default pada level constraint database.
- **Consequences:** Konsistensi kartu stok 100% dapat direkonsiliasi dengan akun persediaan buku besar.

---

## ADR-0004: Double-Entry Accounting Engine & GRNI Accrual
- **Status:** Accepted
- **Context:** Kepatuhan prinsip akuntansi Indonesia (SAK) dan integritas transaksi keuangan minimarket.
- **Decision:**
  - Seluruh pencatatan finansial wajib melalui `journal_entries` dan `journal_lines` dengan invariant $\sum \text{Debit} = \sum \text{Kredit}$.
  - Transaksi yang sudah `POSTED` bersifat *immutable*. Koreksi wajib melalui *reversal journal*.
  - Sediakan akun kliring **Goods Received Not Invoiced (GRNI)** untuk menampung pengakuan persediaan saat Goods Receipt tiba sebelum faktur tagihan supplier diproses.
- **Consequences:** Laporan keuangan (Neraca Saldo, Laba Rugi, Neraca, Arus Kas) dapat diverifikasi dan diaudit secara independen kapan saja.

---

## ADR-0005: Offline POS with Idempotency Key & Sync Queue
- **Status:** Accepted
- **Context:** Kasir tetap harus bisa bertransaksi saat koneksi internet toko putus sementara.
- **Decision:**
  - Data katalog minimum dicache di IndexedDB kasir lokal.
  - Setiap transaksi offline diberi UUID unik dan `idempotency_key` (berisi device ID + sequential timestamp).
  - Saat kembali online, antrean dikirimkan secara berurutan dengan retry backoff. Server memeriksa tabel `idempotency_records` untuk mencegah transaksi ganda.
  - Status QRIS statis offline disimpan sebagai pending verifikasi.
- **Consequences:** Kasir tidak terhenti saat listrik/internet putus sesaat tanpa risiko duplikasi transaksi atau pencatatan ganda.
