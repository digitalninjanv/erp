"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { 
  Package, 
  Search, 
  Plus, 
  Barcode, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X,
  FileSpreadsheet
} from "lucide-react";
import { formatIDR, normalizeBarcode } from "@/shared/kernel/formatting";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minStock, setMinStock] = useState("10");
  const [brand, setBrand] = useState("");

  const loadProducts = (p = 1, q = query) => {
    setLoading(true);
    fetch(`/api/inventory/products?page=${p}&limit=15&query=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.products);
          setTotal(d.total);
          setTotalPages(d.totalPages);
          setPage(d.page);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts(1, "");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(1, query);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name) return;

    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          purchasePrice: parseFloat(purchasePrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          minStock: parseFloat(minStock) || 0,
          brand,
          barcodes: barcode ? [normalizeBarcode(barcode)] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setShowAddModal(false);
      setSku("");
      setName("");
      setBarcode("");
      setPurchasePrice("");
      setSellingPrice("");
      loadProducts(1, "");
      alert("Produk berhasil ditambahkan!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="inventory" title="Katalog Produk" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Master Katalog Produk</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Mendukung 10.000+ produk dengan pencarian barcode ternormalisasi dan paging server-side.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="my-5 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berdasarkan SKU, Nama barang, Merek, atau Barcode..."
              className="w-full pl-9 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
          >
            Cari
          </button>
        </div>

        {/* Product Table */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">SKU Internal</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Merek</th>
                  <th className="py-3 px-4 text-right">Biaya Rata-Rata (MWA)</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Min. Stok</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Memuat data produk...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">{p.sku}</td>
                      <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                      <td className="py-3 px-4 text-slate-400">{p.brand || "-"}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{formatIDR(p.costPrice)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        {formatIDR(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{p.minStock}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="py-3 px-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Menampilkan {products.length} dari total <strong className="text-white">{total}</strong> produk
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadProducts(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-200">
                Halaman {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => loadProducts(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Tambah Produk Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">SKU Produk *</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Contoh: KOP-KPL-65G"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nama Barang *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kapal Api Kopi Spesial 65g"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Barcode (Leading zero aman)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Contoh: 089912345678"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Harga Beli / Biaya</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="3000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Harga Jual</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="4000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Merek</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Kapal Api"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
