"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { CreditCard, ArrowRightLeft, Plus, CheckCircle2, X } from "lucide-react";
import { formatIDR } from "@/shared/kernel/formatting";

export default function BankingPage() {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromBank, setFromBank] = useState("bank_bca");
  const [toBank, setToBank] = useState("bank_mandiri");
  const [amount, setAmount] = useState("500000");
  const [adminFee, setAdminFee] = useState("2500");
  const [notes, setNotes] = useState("Transfer saldo operasional");
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBank === toBank) {
      alert("Rekening asal dan tujuan tidak boleh sama");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/accounting/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBankAccountId: fromBank,
          toBankAccountId: toBank,
          amount: parseFloat(amount) || 0,
          adminFee: parseFloat(adminFee) || 0,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setShowTransferModal(false);
      alert(`Transfer bank ${data.data.transferNumber} berhasil! Jurnal seimbang dan biaya admin telah dicatat.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Kas & Rekening Bank" />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Rekening Bank & Kas Toko</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pengelolaan rekening perbankan minimarket dan transfer antarbank dengan pencatatan biaya admin.
            </p>
          </div>

          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Antarbank</span>
          </button>
        </div>

        {/* Bank Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono uppercase bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800">
              Bank Central Asia (BCA)
            </span>
            <div className="mt-3">
              <span className="text-xs text-slate-400 block">No. Rekening: 8820192831</span>
              <span className="text-sm font-semibold text-white">Minimarket Berkah Jaya</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
              <span>Akun Buku Besar:</span>
              <span className="font-mono text-slate-200">1120 - Bank BCA</span>
            </div>
          </div>

          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono uppercase bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800">
              Bank Mandiri
            </span>
            <div className="mt-3">
              <span className="text-xs text-slate-400 block">No. Rekening: 1420019283741</span>
              <span className="text-sm font-semibold text-white">Minimarket Berkah Jaya</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
              <span>Akun Buku Besar:</span>
              <span className="font-mono text-slate-200">1121 - Bank Mandiri</span>
            </div>
          </div>
        </div>
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Transfer Dana Antarbank</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rekening Asal</label>
                  <select
                    value={fromBank}
                    onChange={(e) => setFromBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="bank_bca">BCA (8820192831)</option>
                    <option value="bank_mandiri">Mandiri (1420019283741)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rekening Tujuan</label>
                  <select
                    value={toBank}
                    onChange={(e) => setToBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="bank_mandiri">Mandiri (1420019283741)</option>
                    <option value="bank_bca">BCA (8820192831)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nominal Transfer (Rp)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Biaya Administrasi Bank (Rp)</label>
                <input
                  type="number"
                  value={adminFee}
                  onChange={(e) => setAdminFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Akan dijurnal ke Akun 6300 (Beban Administrasi Bank).
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  {loading ? "Memproses..." : "Eksekusi Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
