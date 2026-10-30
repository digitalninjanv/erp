"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { Scale, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import { formatIDR } from "@/shared/kernel/formatting";

export default function TrialBalancePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounting/trial-balance")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Neraca Saldo (Trial Balance)" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span>Neraca Saldo (Trial Balance)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verifikasi matematis keseimbangan total saldo Debit dan Kredit buku besar.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {data?.isBalanced ? (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SEIMBANG (BALANCED)</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950 border border-rose-800 text-rose-300 text-xs font-semibold rounded-md animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>TIDAK SEIMBANG</span>
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
              title="Cetak Laporan"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Kode Akun</th>
                <th className="py-3 px-4">Nama Akun Buku Besar</th>
                <th className="py-3 px-4">Tipe Akun</th>
                <th className="py-3 px-4 text-right">Saldo Debit</th>
                <th className="py-3 px-4 text-right">Saldo Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Menghitung neraca saldo...
                  </td>
                </tr>
              ) : (
                data?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-400">{row.code}</td>
                    <td className="py-2.5 px-4 font-medium text-white">{row.name}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] text-slate-400">{row.type}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-200">
                      {row.endingDebit > 0 ? formatIDR(row.endingDebit) : "-"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-200">
                      {row.endingCredit > 0 ? formatIDR(row.endingCredit) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data && (
              <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-sm">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-300 uppercase">
                    TOTAL KESEIMBANGAN
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatIDR(data.grandTotalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatIDR(data.grandTotalCredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}
