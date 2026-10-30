"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Store, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  ArrowLeft, 
  User, 
  Wifi, 
  WifiOff, 
  LogOut,
  FileSpreadsheet
} from "lucide-react";

interface NavbarProps {
  currentModule?: "pos" | "inventory" | "accounting" | "migration";
  title?: string;
}

export function Navbar({ currentModule, title }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ fullName: string; roles: string[]; username: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fetch user session
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSession(json.data);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Module Switcher */}
        <div className="flex items-center space-x-3">
          {currentModule ? (
            <Link
              href="/"
              className="flex items-center space-x-2 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition text-sm font-medium"
              title="Kembali ke Launcher Modul"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Launcher</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block leading-tight">Minimarket Berkah</span>
                <span className="text-[11px] text-slate-400 font-mono">ERP Enterprise v2.1</span>
              </div>
            </div>
          )}

          {title && (
            <>
              <span className="text-slate-600">/</span>
              <h1 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center space-x-2">
                {currentModule === "pos" && <ShoppingCart className="w-4 h-4 text-emerald-400 inline" />}
                {currentModule === "inventory" && <Package className="w-4 h-4 text-blue-400 inline" />}
                {currentModule === "accounting" && <DollarSign className="w-4 h-4 text-amber-400 inline" />}
                {currentModule === "migration" && <FileSpreadsheet className="w-4 h-4 text-purple-400 inline" />}
                <span>{title}</span>
              </h1>
            </>
          )}
        </div>

        {/* Center: Module-Specific Quick Links if in a module */}
        {currentModule === "inventory" && (
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/inventory/products"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname.startsWith("/inventory/products")
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Katalog Produk
            </Link>
            <Link
              href="/inventory/stock"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/inventory/stock"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Saldo Stok
            </Link>
            <Link
              href="/inventory/purchasing"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/inventory/purchasing"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pembelian & Penerimaan
            </Link>
            <Link
              href="/inventory/transfers"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/inventory/transfers"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Transfer Lokasi
            </Link>
            <Link
              href="/inventory/stocktake"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/inventory/stocktake"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Stok Opname
            </Link>
          </nav>
        )}

        {currentModule === "accounting" && (
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/accounting/overview"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/accounting/overview"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Ringkasan
            </Link>
            <Link
              href="/accounting/coa"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/accounting/coa"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bagan Akun
            </Link>
            <Link
              href="/accounting/journals"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/accounting/journals"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Jurnal Umum
            </Link>
            <Link
              href="/accounting/reports/trial-balance"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname.startsWith("/accounting/reports")
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Laporan Keuangan
            </Link>
            <Link
              href="/accounting/banking"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/accounting/banking"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Kas & Bank
            </Link>
            <Link
              href="/accounting/payroll"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                pathname === "/accounting/payroll"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Penggajian
            </Link>
          </nav>
        )}

        {/* Right: Status & User Info */}
        <div className="flex items-center space-x-4">
          {/* Online/Offline Badge */}
          <div className="flex items-center space-x-1.5">
            {isOnline ? (
              <span className="flex items-center space-x-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[11px] font-medium text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-300" />
                <span>Offline Mode</span>
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left text-xs">
              <span className="font-medium text-slate-200 block leading-tight">
                {session?.fullName || "Administrator"}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                {session?.roles[0] || "Owner"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
