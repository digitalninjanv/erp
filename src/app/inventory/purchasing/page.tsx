"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { ShoppingBag, Plus, ArrowDownCircle, CheckCircle2, FileText, X } from "lucide-react";
import { formatIDR, formatDateID } from "@/shared/kernel/formatting";

export default function PurchasingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New PO Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [supplierId, setSupplierId] = useState("sup_indofood");
  const [selectedProductId, setSelectedProductId] = useState("prod_indomie_goreng");
  const [poQty, setPoQty] = useState("50");
  const [poPrice, setPoPrice] = useState("2800");

  // Receive Goods (GR) Modal
  const [showGRModal, setShowGRModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [grLocationId, setGrLocationId] = useState("loc_wh");
  const [grQty, setGrQty] = useState("50");
  const [grCost, setGrCost] = useState("2800");

  const loadOrders = () => {
    setLoading(true);
    fetch("/api/purchasing/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/purchasing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: [
            {
              productId: selectedProductId,
              qtyOrdered: parseFloat(poQty) || 1,
              unitPrice: parseFloat(poPrice) || 0,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setShowPOModal(false);
      loadOrders();
      alert(`Purchase Order ${data.data.poNumber} berhasil dibuat!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenGR = (po: any) => {
    setSelectedPO(po);
    setShowGRModal(true);
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    try {
      const res = await fetch("/api/purchasing/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: selectedPO.id,
          supplierId: selectedPO.supplierId,
          locationId: grLocationId,
          items: [
            {
              productId: "prod_indomie_goreng",
              qtyReceived: parseFloat(grQty) || 1,
              unitCost: parseFloat(grCost) || 0,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setShowGRModal(false);
      loadOrders();
      alert(
        `Penerimaan barang ${data.data.grNumber} berhasil! Stok telah bertambah, biaya rata-rata (MWA) diperbarui, dan akrual GRNI telah dijurnal otomatis.`
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="inventory" title="Pembelian & Penerimaan Barang (GRNI)" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <span>Purchase Order & Penerimaan Barang</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Alur 3-way matching dan akrual GRNI (Goods Received Not Invoiced) sesuai standar akuntansi ritel.
            </p>
          </div>

          <button
            onClick={() => setShowPOModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Purchase Order (PO)</span>
          </button>
        </div>

        {/* PO Table */}
        <div className="mt-6 bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">No. PO</th>
                  <th className="py-3 px-4">Tanggal Pesan</th>
                  <th className="py-3 px-4">Pemasok / Supplier</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Penerimaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Memuat daftar pesanan...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Belum ada Purchase Order (PO).
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">{po.poNumber}</td>
                      <td className="py-3 px-4 text-slate-300">{formatDateID(po.orderDate)}</td>
                      <td className="py-3 px-4 font-medium text-white">{po.supplierName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {formatIDR(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenGR(po)}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded flex items-center space-x-1 mx-auto transition"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          <span>Terima Barang (GR)</span>
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

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Buat Purchase Order Baru</span>
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Supplier Pemasok</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="sup_indofood">PT Indofood Sukses Makmur</option>
                  <option value="sup_unilever">PT Unilever Indonesia Tbk</option>
                  <option value="sup_mayora">PT Mayora Indah Tbk</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Produk Pesanan</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="prod_indomie_goreng">Indomie Mi Goreng Spesial 85g</option>
                  <option value="prod_aqua_600ml">Aqua Air Mineral Botol 600ml</option>
                  <option value="prod_bengbeng">Beng-Beng Wafer Cokelat Karamel 25g</option>
                  <option value="prod_minyak_goreng_bimoli_2l">Bimoli Minyak Goreng 2 Liter</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kuantitas Pesan</label>
                  <input
                    type="number"
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Harga Beli Satuan (Rp)</label>
                  <input
                    type="number"
                    value={poPrice}
                    onChange={(e) => setPoPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Buat PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods (GR) Modal */}
      {showGRModal && selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  <span>Penerimaan Barang (Goods Receipt)</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Ref PO: {selectedPO.poNumber}</span>
              </div>
              <button onClick={() => setShowGRModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveGoods} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Lokasi Penerimaan Fisik</label>
                <select
                  value={grLocationId}
                  onChange={(e) => setGrLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="loc_wh">Gudang Utama (WH-MAIN)</option>
                  <option value="loc_store">Area Penjualan Toko (STORE-01)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kuantitas Diterima</label>
                  <input
                    type="number"
                    value={grQty}
                    onChange={(e) => setGrQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Biaya Masuk Satuan</label>
                  <input
                    type="number"
                    value={grCost}
                    onChange={(e) => setGrCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                Penerimaan barang akan langsung menambah saldo stok fisik, menghitung ulang Moving Weighted Average (MWA), dan menjurnal debit persediaan vs kredit akrual GRNI secara atomik.
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGRModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Posting Penerimaan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
