"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Lock, User, ArrowRight, AlertCircle, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal masuk");
      }

      // Check role to direct to module or launcher
      const roles: string[] = data.data.roles || [];
      if (roles.includes("cashier") && !roles.includes("owner")) {
        router.push("/pos");
      } else if (roles.includes("warehouse") && !roles.includes("owner")) {
        router.push("/inventory/products");
      } else if (roles.includes("accountant") && !roles.includes("owner")) {
        router.push("/accounting/overview");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setPresetUser = (u: string) => {
    setUsername(u);
    setPassword("Admin123!");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 mx-auto flex items-center justify-center font-bold text-white shadow-lg mb-4">
          <Store className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          ERP Minimarket Masuk
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Autentikasi role-based access control (RBAC) terproteksi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-6 shadow-xl rounded-xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username Pengguna
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Masukkan kata sandi"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              <span>{loading ? "Memverifikasi..." : "Masuk ke Sistem"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick preset selector for testing PRD role scopes */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-xs">
            <span className="text-[11px] font-medium text-slate-400 block mb-2 text-center uppercase tracking-wider">
              Pilih Akun Demo (Uji Role)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPresetUser("admin")}
                className={`p-2 rounded border text-left transition ${
                  username === "admin"
                    ? "bg-slate-800 border-emerald-500 text-white"
                    : "bg-slate-850 border-slate-750 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="font-semibold text-emerald-400">Owner / Admin</div>
                <div className="text-[10px] text-slate-400">Akses Penuh</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser("kasir1")}
                className={`p-2 rounded border text-left transition ${
                  username === "kasir1"
                    ? "bg-slate-800 border-emerald-500 text-white"
                    : "bg-slate-850 border-slate-750 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="font-semibold text-emerald-400">Kasir 1</div>
                <div className="text-[10px] text-slate-400">POS & Shift Kasir</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser("gudang1")}
                className={`p-2 rounded border text-left transition ${
                  username === "gudang1"
                    ? "bg-slate-800 border-blue-500 text-white"
                    : "bg-slate-850 border-slate-750 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="font-semibold text-blue-400">Petugas Gudang</div>
                <div className="text-[10px] text-slate-400">Stok, PO & Opname</div>
              </button>

              <button
                type="button"
                onClick={() => setPresetUser("akuntan1")}
                className={`p-2 rounded border text-left transition ${
                  username === "akuntan1"
                    ? "bg-slate-800 border-amber-500 text-white"
                    : "bg-slate-850 border-slate-750 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="font-semibold text-amber-400">Akuntan</div>
                <div className="text-[10px] text-slate-400">Jurnal & Neraca</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
