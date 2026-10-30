"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { BookOpen, Search, ShieldCheck } from "lucide-react";

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounting/trial-balance")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAccounts(d.data.rows);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Bagan Akun (Chart of Accounts)" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Bagan Akun Standar (COA Minimarket)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Struktur akun buku besar sesuai Pedoman Standar Akuntansi Keuangan (PSAK/SAK Indonesia).
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-mono bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
            {accounts.length} Akun Terdaftar
          </span>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Kode Akun</th>
                <th className="py-3 px-4">Nama Akun Buku Besar</th>
                <th className="py-3 px-4">Klasifikasi</th>
                <th className="py-3 px-4">Saldo Normal</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Memuat bagan akun...
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{acc.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{acc.name}</td>
                    <td className="py-3 px-4 uppercase text-[10px] text-slate-400">{acc.type}</td>
                    <td className="py-3 px-4 font-mono uppercase text-[10px] text-slate-300">
                      {acc.normalBalance}
                    </td>
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
      </main>
    </div>
  );
}
