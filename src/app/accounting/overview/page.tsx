"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  CreditCard, 
  PieChart, 
  ArrowRight,
  BookOpen,
  FileText
} from "lucide-react";
import Link from "next/link";
import { formatIDR } from "@/shared/kernel/formatting";

export default function AccountingOverviewPage() {
  const [tb, setTb] = useState<any | null>(null);
  const [pnl, setPnl] = useState<any | null>(null);
  const [bs, setBs] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounting/trial-balance").then((r) => r.json()),
      fetch("/api/accounting/profit-loss").then((r) => r.json()),
      fetch("/api/accounting/balance-sheet").then((r) => r.json()),
    ])
      .then(([tbRes, pnlRes, bsRes]) => {
        if (tbRes.success) setTb(tbRes.data);
        if (pnlRes.success) setPnl(pnlRes.data);
        if (bsRes.success) setBs(bsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="accounting" title="Ringkasan Keuangan & Buku Besar" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Banner with Double-Entry Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span>Pusat Kendali Keuangan Minimarket</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Prinsip pembukuan double-entry (Debit = Kredit) terintegrasi otomatis dari operasional kasir dan gudang.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Jurnal 100% Seimbang</span>
            </span>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span>Pendapatan Penjualan</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatIDR(pnl?.totalRevenue || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Akun 4100</span>
          </div>

          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span>Beban & HPP</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatIDR(pnl?.totalExpense || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Akun 5100, 6100, 6200</span>
          </div>

          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span>Laba Bersih Berjalan</span>
              <PieChart className="w-4 h-4 text-blue-400" />
            </div>
            <div className={`text-2xl font-bold font-mono ${pnl?.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatIDR(pnl?.netIncome || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Laba Rugi Bersih</span>
          </div>

          <div className="bg-slate-850 p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span>Total Aset (Aktiva)</span>
              <CreditCard className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {formatIDR(bs?.totalAssets || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Kas, Bank & Persediaan</span>
          </div>
        </div>

        {/* Quick Report Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/accounting/reports/trial-balance"
            className="p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-lg flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-amber-300">Neraca Saldo (Trial Balance)</h4>
                <p className="text-[11px] text-slate-400">Pemeriksaan total Debit dan Kredit seluruh akun</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/accounting/journals"
            className="p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-lg flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-amber-300">Jurnal Umum (General Journal)</h4>
                <p className="text-[11px] text-slate-400">Daftar ayat jurnal transaksi posted & audit trail</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/accounting/banking"
            className="p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-lg flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-amber-300">Kas & Rekening Bank</h4>
                <p className="text-[11px] text-slate-400">Transfer antarbank dan biaya administrasi</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
