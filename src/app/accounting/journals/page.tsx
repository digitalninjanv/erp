"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { FileText, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { formatIDR, formatDateID } from "@/shared/kernel/formatting";

export default function GeneralJournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounting/journals")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEntries(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Jurnal Umum (General Journal)" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Daftar Ayat Jurnal Umum</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Catatan jurnal otomatis terposting dari transaksi operasional ritel. Jurnal posted bersifat immutable.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-md">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Immutable Posting</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-850 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Jurnal</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4">Tipe Dokumen</th>
                <th className="py-3 px-4">Keterangan / Uraian</th>
                <th className="py-3 px-4 text-right">Total Debit</th>
                <th className="py-3 px-4 text-right">Total Kredit</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat jurnal umum...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada ayat jurnal transaksi.
                  </td>
                </tr>
              ) : (
                entries.map((je) => (
                  <tr key={je.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{je.entryNumber}</td>
                    <td className="py-3 px-4 text-slate-400">{formatDateID(je.entryDate)}</td>
                    <td className="py-3 px-4 font-mono text-slate-300 uppercase text-[10px]">{je.refType}</td>
                    <td className="py-3 px-4 font-medium text-white truncate max-w-xs">{je.description}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                      {formatIDR(je.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                      {formatIDR(je.totalCredit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Posted</span>
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
