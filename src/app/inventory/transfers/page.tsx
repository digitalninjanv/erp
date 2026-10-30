"use client";

import React, { useState } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { ArrowRightLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function StockTransferPage() {
  const [fromLoc, setFromLoc] = useState("loc_wh");
  const [toLoc, setToLoc] = useState("loc_store");
  const [selectedProductId, setSelectedProductId] = useState("prod_indomie_goreng");
  const [transferQty, setTransferQty] = useState("20");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLoc === toLoc) {
      alert("Lokasi asal dan tujuan tidak boleh sama!");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: fromLoc,
          toLocationId: toLoc,
          items: [
            {
              productId: selectedProductId,
              qty: parseFloat(transferQty) || 1,
            },
          ],
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setResult(data.data);
      alert(`Transfer stok ${data.data.transferNumber} berhasil diproses!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="inventory" title="Transfer Lokasi Stok" />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span>Transfer Stok Antar Lokasi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Memindahkan stok fisik antara Gudang Utama dan Area Penjualan Toko secara atomik tanpa merusak Moving Weighted Average.
          </p>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleTransfer} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Lokasi Asal (Pengurang)</label>
                <select
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="loc_wh">Gudang Utama (WH-MAIN)</option>
                  <option value="loc_store">Area Penjualan Toko (STORE-01)</option>
                  <option value="loc_quarantine">Area Retur & Karantina (QUARANTINE)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Lokasi Tujuan (Penambah)</label>
                <select
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="loc_store">Area Penjualan Toko (STORE-01)</option>
                  <option value="loc_wh">Gudang Utama (WH-MAIN)</option>
                  <option value="loc_damaged">Barang Rusak (DAMAGED)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Pilih Produk</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              >
                <option value="prod_indomie_goreng">Indomie Mi Goreng Spesial 85g</option>
                <option value="prod_indomie_ayam_bawang">Indomie Kuah Ayam Bawang 69g</option>
                <option value="prod_aqua_600ml">Aqua Air Mineral Botol 600ml</option>
                <option value="prod_teh_botol_kotak">Teh Botol Sosro Kotak 250ml</option>
                <option value="prod_bengbeng">Beng-Beng Wafer 25g</option>
                <option value="prod_lifebuoy_red">Lifebuoy Sabun Batang 75g</option>
                <option value="prod_minyak_goreng_bimoli_2l">Bimoli Minyak Goreng 2 Liter</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Kuantitas Transfer (Pcs)</label>
              <input
                type="number"
                min="1"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Catatan Dokumen Transfer</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pengisian rak display minimarket lantai 1"
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? "Memproses Transfer..." : "EKSEKUSI TRANSFER STOK"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
