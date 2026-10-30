"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { Layers, Search, History, ArrowRightLeft, AlertTriangle, X } from "lucide-react";
import { formatIDR, formatDateID } from "@/shared/kernel/formatting";

export default function StockBalancesPage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedProductCard, setSelectedProductCard] = useState<any | null>(null);
  const [stockCardEntries, setStockCardEntries] = useState<any[]>([]);
  const [cardLoading, setCardLoading] = useState(false);

  const loadBalances = (loc = selectedLocation) => {
    setLoading(true);
    const url = loc ? `/api/inventory/stock?locationId=${loc}` : "/api/inventory/stock";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBalances(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBalances("");
  }, []);

  const openStockCard = async (productId: string, productName: string, sku: string) => {
    setSelectedProductCard({ productId, productName, sku });
    setCardLoading(true);
    try {
      const res = await fetch(`/api/inventory/stock?productId=${productId}&view=card`);
      const data = await res.json();
      if (data.success) {
        setStockCardEntries(data.data);
      }
    } finally {
      setCardLoading(false);
    }
  };

  const totalValuation = balances.reduce((sum, b) => sum + parseFloat(b.totalValuation || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="inventory" title="Saldo Stok Multi-Lokasi" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Saldo Persediaan Per Lokasi</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pemantauan kuantitas fisik dan nilai valuasi Moving Weighted Average (MWA).
            </p>
          </div>

          <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 flex items-center space-x-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Nilai Persediaan</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{formatIDR(totalValuation)}</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="my-5 flex items-center space-x-3 text-xs">
          <label className="text-slate-400 font-medium">Filter Lokasi Fisik:</label>
          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              loadBalances(e.target.value);
            }}
            className="px-3 py-1.5 bg-slate-850 border border-slate-700 rounded-lg text-white"
          >
            <option value="">Semua Lokasi Toko & Gudang</option>
            <option value="loc_store">Area Penjualan Toko (STORE-01)</option>
            <option value="loc_wh">Gudang Utama (WH-MAIN)</option>
            <option value="loc_damaged">Barang Rusak (DAMAGED)</option>
            <option value="loc_quarantine">Karantina & Retur (QUARANTINE)</option>
          </select>
        </div>

        {/* Stock Balances Table */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Lokasi Fisik</th>
                  <th className="py-3 px-4 text-right">Kuantitas Stok</th>
                  <th className="py-3 px-4 text-right">Biaya Satuan (MWA)</th>
                  <th className="py-3 px-4 text-right">Total Valuasi</th>
                  <th className="py-3 px-4 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Memuat saldo persediaan...
                    </td>
                  </tr>
                ) : balances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada catatan saldo stok.
                    </td>
                  </tr>
                ) : (
                  balances.map((b) => (
                    <tr key={b.balanceId} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">{b.sku}</td>
                      <td className="py-3 px-4 font-medium text-white">{b.productName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {b.locationName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {parseFloat(b.qty).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatIDR(b.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        {formatIDR(b.totalValuation)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openStockCard(b.productId, b.productName, b.sku)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded border border-slate-700 flex items-center space-x-1 mx-auto transition"
                          title="Lihat Kartu Stok"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Kartu Stok</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Stock Card Modal */}
      {selectedProductCard && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Kartu Stok (Inventory Ledger)</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedProductCard.sku} — {selectedProductCard.productName}
                </span>
              </div>
              <button onClick={() => setSelectedProductCard(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto mb-4 border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Tipe Mutasi</th>
                    <th className="py-2.5 px-3 text-right">Perubahan Qty</th>
                    <th className="py-2.5 px-3 text-right">Biaya/Unit</th>
                    <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {cardLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Memuat riwayat ledger...
                      </td>
                    </tr>
                  ) : stockCardEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Belum ada pergerakan stok tercatat.
                      </td>
                    </tr>
                  ) : (
                    stockCardEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-[11px] text-slate-400">{formatDateID(e.createdAt)}</td>
                        <td className="py-2 px-3 font-mono text-slate-300 uppercase text-[10px]">{e.refType}</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${parseFloat(e.qtyChange) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {parseFloat(e.qtyChange) > 0 ? `+${e.qtyChange}` : e.qtyChange}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatIDR(e.costPerUnit)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-white">{e.balanceAfter}</td>
                        <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[150px]">{e.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProductCard(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
