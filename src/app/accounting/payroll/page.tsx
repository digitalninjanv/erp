"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { Users, Plus, CheckCircle2, DollarSign, Calendar, FileText, X } from "lucide-react";
import { formatIDR, formatDateID } from "@/shared/kernel/formatting";

export default function PayrollPage() {
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodName, setPeriodName] = useState("Oktober 2026");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");

  const loadPayroll = () => {
    setLoading(true);
    fetch("/api/accounting/payroll")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPayrollRuns(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/accounting/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_run",
          periodName,
          startDate,
          endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setShowCreateModal(false);
      loadPayroll();
      alert(`Payroll periode ${periodName} berhasil dihitung untuk ${data.data.employeeCount} karyawan!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprovePost = async (payrollRunId: string) => {
    if (!confirm("Setujui dan posting beban penggajian ke buku besar?")) return;
    try {
      const res = await fetch("/api/accounting/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_post",
          payrollRunId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      loadPayroll();
      alert("Penggajian berhasil diposting! Jurnal beban gaji & utang gaji telah dibuat.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePay = async (payrollRunId: string) => {
    if (!confirm("Eksekusi pembayaran gaji karyawan dari Bank BCA?")) return;
    try {
      const res = await fetch("/api/accounting/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          payrollRunId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      loadPayroll();
      alert("Gaji berhasil dibayarkan! Jurnal pelunasan utang gaji dari Bank BCA telah tercatat.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Penggajian & Data Karyawan (Payroll)" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Penggajian Karyawan Toko & Gudang</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Perhitungan gaji pokok, tunjangan, posting jurnal beban ke buku besar, dan pencetakan slip gaji.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Proses Periode Gaji Baru</span>
          </button>
        </div>

        {/* Payroll Runs Table */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Rentang Tanggal</th>
                <th className="py-3 px-4 text-right">Total Gaji Kotor</th>
                <th className="py-3 px-4 text-right">Gaji Bersih (Net)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tindakan Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Memuat data penggajian...
                  </td>
                </tr>
              ) : payrollRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada sesi penggajian dibuat.
                  </td>
                </tr>
              ) : (
                payrollRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-white">{run.periodName}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(run.startDate).toLocaleDateString("id-ID")} - {new Date(run.endDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{formatIDR(run.totalGross)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatIDR(run.totalNet)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${
                        run.status === "paid" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                        run.status === "posted" ? "bg-blue-950 text-blue-300 border-blue-800" :
                        "bg-amber-950 text-amber-300 border-amber-800"
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {run.status === "draft" && (
                        <button
                          onClick={() => handleApprovePost(run.id)}
                          className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded font-medium"
                        >
                          Approve & Post Jurnal
                        </button>
                      )}
                      {run.status === "posted" && (
                        <button
                          onClick={() => handlePay(run.id)}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded font-medium"
                        >
                          Bayarkan via Bank BCA
                        </button>
                      )}
                      {run.status === "paid" && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lunas Terbayar</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Buat Periode Payroll Baru</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="Contoh: November 2026"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  Hitung Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
