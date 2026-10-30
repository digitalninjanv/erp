"use client";

import React, { useState } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { ClipboardCheck, CheckCircle2, AlertTriangle, Send } from "lucide-react";

export default function StocktakePage() {
  const [locationId, setLocationId] = useState("loc_store");
  const [physicalIndomie, setPhysicalIndomie] = useState("118"); // system: 120 (diff: -2)
  const [physicalAqua, setPhysicalAqua] = useState("98"); // system: 96 (diff: +2)
  const [notes, setNotes] = useState("Stok opname berkala akhir bulan");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handlePostStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/inventory/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          items: [
            {
              productId: "prod_indomie_goreng",
              physicalQty: parseFloat(physicalIndomie) || 0,
              notes: "Hitung fisik Indomie",
            },
            {
              productId: "prod_aqua_600ml",
              physicalQty: parseFloat(physicalAqua) || 0,
              notes: "Hitung fisik Aqua",
            },
          ],
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setResult(data.data);
      alert(`Stok Opname ${data.data.stocktakeNumber} berhasil diposting! Selisih stok telah disesuaikan di ledger.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="inventory" title="Stok Opname Fisik" />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" />
            <span>Sesi Stok Opname (Stocktake)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Penyesuaian saldo fisik terhadap saldo sistem secara transparan dengan pencatatan selisih otomatis pada ledger mutasi.
          </p>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 shadow-sm">
          <form onSubmit={handlePostStocktake} className="space-y-5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Lokasi Penghitungan Fisik</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              >
                <option value="loc_store">Area Penjualan Toko (STORE-01)</option>
                <option value="loc_wh">Gudang Utama (WH-MAIN)</option>
              </select>
            </div>

            {/* Items count table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Produk</th>
                    <th className="py-2.5 px-3 text-right">Hitung Fisik Aktual (Input)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">Indomie Mi Goreng Spesial 85g</span>
                      <span className="text-[10px] text-slate-400 font-mono">IDM-GRG-85G</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={physicalIndomie}
                        onChange={(e) => setPhysicalIndomie(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-sm text-white"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">Aqua Air Mineral Botol 600ml</span>
                      <span className="text-[10px] text-slate-400 font-mono">AQU-BTL-600ML</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={physicalAqua}
                        onChange={(e) => setPhysicalAqua(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-sm text-white"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Catatan Opname</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? "Menyesuaikan Ledger..." : "POSTING HASIL STOK OPNAME"}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
