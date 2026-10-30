"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/shared/ui/Navbar";
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  ArrowRight, 
  FileSpreadsheet, 
  ShieldCheck, 
  Layers, 
  Database,
  CheckCircle2,
  Users
} from "lucide-react";
import { formatIDR } from "@/shared/kernel/formatting";

export default function LauncherPage() {
  const [stats, setStats] = useState({
    productCount: 8,
    activeShift: false,
    trialBalanced: true,
  });

  useEffect(() => {
    // Quick status check
    fetch("/api/inventory/products?limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats((prev) => ({ ...prev, productCount: d.total }));
      })
      .catch(() => {});

    fetch("/api/accounting/trial-balance")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats((prev) => ({ ...prev, trialBalanced: d.data.isBalanced }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Enterprise Welcome Banner */}
        <div className="mb-10 text-center sm:text-left sm:flex sm:items-center sm:justify-between border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sistem Operasional Minimarket
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Pusat kendali ritel terintegrasi: Kasir POS, Gudang & Persediaan, serta Akuntansi Buku Besar.
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center justify-center sm:justify-end space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/80 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostgreSQL 16</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/80 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>RBAC Aktif</span>
            </span>
            <Link
              href="/migration"
              className="flex items-center space-x-1.5 bg-purple-950/80 hover:bg-purple-900/80 px-3 py-1.5 rounded-md border border-purple-700 text-purple-200 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-300" />
              <span>Migrasi Accurate.id</span>
            </Link>
          </div>
        </div>

        {/* 3 Core Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: POS */}
          <Link
            href="/pos"
            className="group relative bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 rounded-xl p-6 transition-all duration-200 shadow-sm hover:shadow-emerald-950/30 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Kasir (POS)
                </h2>
                <span className="text-[11px] font-mono uppercase bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                  Operasional
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Transaksi kasir ritel berkecepatan tinggi, scanner barcode keyboard-wedge, multi-tender (Tunai, QRIS Statis, Kredit Piutang), pembulatan Rp500, hold cart, retur, dan cetak struk thermal 58/80mm.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
              <span className="flex items-center space-x-1">
                <span>Buka Terminal Kasir</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-slate-500 text-[11px]">PWA Ready</span>
            </div>
          </Link>

          {/* Card 2: Gudang & Persediaan */}
          <Link
            href="/inventory/products"
            className="group relative bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500 rounded-xl p-6 transition-all duration-200 shadow-sm hover:shadow-blue-950/30 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-blue-950 border border-blue-700/60 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Gudang & Stok
                </h2>
                <span className="text-[11px] font-mono uppercase bg-blue-950/80 text-blue-400 px-2 py-0.5 rounded border border-blue-800/60">
                  Logistik
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Katalog 10.000+ produk, barcode normalizer (leading zeros), multi-lokasi (Toko, Gudang Utama, Rusak, Retur), ledger mutasi stok immutable, valuasi Moving Weighted Average (MWA), PO & Goods Receipt, dan stok opname.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-medium text-blue-400 group-hover:text-blue-300">
              <span className="flex items-center space-x-1">
                <span>Kelola Persediaan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-slate-500 text-[11px]">{stats.productCount} Produk</span>
            </div>
          </Link>

          {/* Card 3: Akuntansi & Keuangan */}
          <Link
            href="/accounting/overview"
            className="group relative bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 rounded-xl p-6 transition-all duration-200 shadow-sm hover:shadow-amber-950/30 hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Akuntansi & Keuangan
                </h2>
                <span className="text-[11px] font-mono uppercase bg-amber-950/80 text-amber-400 px-2 py-0.5 rounded border border-amber-800/60">
                  Finansial
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Standar Double-Entry Bookkeeping seimbang, posting jurnal otomatis (Penjualan, Penerimaan GRNI, Tagihan AP, Beban), Buku Besar, Neraca Saldo, Laba Rugi, Posisi Keuangan, Kas/Bank dengan biaya admin, dan Penggajian.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-medium text-amber-400 group-hover:text-amber-300">
              <span className="flex items-center space-x-1">
                <span>Buka Pembukuan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-emerald-400 text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 inline" />
                <span>Balanced</span>
              </span>
            </div>
          </Link>
        </div>

        {/* System Integrity & Quality Gates Footnote */}
        <div className="bg-slate-850 border border-slate-800 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Integritas Data Transaksional Terjamin</h4>
              <p className="text-[11px] text-slate-400">
                Penerapan ACID transactions, moving weighted average, append-only ledger, and double-entry balancing invariant.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Zona Waktu: <strong className="text-slate-200">Asia/Jakarta (WIB)</strong></span>
            <span>•</span>
            <span>Mata Uang: <strong className="text-slate-200">IDR (Rp)</strong></span>
          </div>
        </div>
      </main>
    </div>
  );
}
