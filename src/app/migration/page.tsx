"use client";

import React, { useState } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Database,
  ShieldAlert,
  Download
} from "lucide-react";
import * as xlsx from "xlsx";
import { formatIDR } from "@/shared/kernel/formatting";

export default function AccurateMigrationPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState("");
  const [allRows, setAllRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);

  // Column mapping
  const [skuCol, setSkuCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [barcodeCol, setBarcodeCol] = useState("");
  const [costCol, setCostCol] = useState("");
  const [sellCol, setSellCol] = useState("");
  const [stockCol, setStockCol] = useState("");
  const [conflictStrategy, setConflictStrategy] = useState<"skip" | "update">("skip");

  // Dry run results
  const [dryRunData, setDryRunData] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // File Upload & Client Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = xlsx.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (data.length === 0) {
          alert("File kosong!");
          return;
        }

        const cols = Object.keys(data[0]);
        setHeaders(cols);
        setAllRows(data);
        setSampleRows(data.slice(0, 5));

        // Auto-detect common Accurate Online Indonesian column names
        const findCol = (keywords: string[]) =>
          cols.find((c) => keywords.some((k) => c.toLowerCase().includes(k))) || "";

        setSkuCol(findCol(["kode", "sku", "item no", "nomor barang"]));
        setNameCol(findCol(["nama", "name", "deskripsi", "item description"]));
        setBarcodeCol(findCol(["barcode", "upc"]));
        setCostCol(findCol(["harga beli", "cost", "biaya"]));
        setSellCol(findCol(["harga jual", "price", "jual"]));
        setStockCol(findCol(["stok", "kuantitas", "saldo", "qty"]));

        setStep(2);
      } catch (err: any) {
        alert("Gagal membaca file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Run Dry-Run Simulation
  const handleDryRun = async () => {
    if (!skuCol || !nameCol) {
      alert("Kolom SKU dan Nama Barang wajib dipilih!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/migration/accurate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dry_run",
          rows: allRows,
          mapping: {
            skuColumn: skuCol,
            nameColumn: nameCol,
            barcodeColumn: barcodeCol || undefined,
            costPriceColumn: costCol || undefined,
            sellingPriceColumn: sellCol || undefined,
            stockQtyColumn: stockCol || undefined,
            conflictStrategy,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setDryRunData(data.data);
      setStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/migration/accurate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          jobName: `Migrasi Accurate - ${fileName}`,
          fileName,
          rows: allRows,
          mapping: {
            skuColumn: skuCol,
            nameColumn: nameCol,
            barcodeColumn: barcodeCol || undefined,
            costPriceColumn: costCol || undefined,
            sellingPriceColumn: sellCol || undefined,
            stockQtyColumn: stockCol || undefined,
            conflictStrategy,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setImportResult(data.data);
      setStep(4);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load sample accurate demo data for quick test
  const loadDemoAccurateData = () => {
    const demoData = [
      {
        "Kode Barang": "ACC-KOP-01",
        "Nama Barang": "Kopi Luwak White Koffie 10x20g",
        "Barcode": "089923456781",
        "Harga Beli": 12000,
        "Harga Jual": 15000,
        "Kuantitas": 40,
      },
      {
        "Kode Barang": "ACC-MIE-02",
        "Nama Barang": "Mie Sedaap Goreng Ayam Krispi 88g",
        "Barcode": "089934567892",
        "Harga Beli": 2700,
        "Harga Jual": 3400,
        "Kuantitas": 100,
      },
      {
        "Kode Barang": "IDM-GRG-85G", // intentionally duplicate to test conflict detection!
        "Nama Barang": "Indomie Goreng Lama",
        "Barcode": "089686010118",
        "Harga Beli": 2800,
        "Harga Jual": 3500,
        "Kuantitas": 50,
      },
    ];

    setFileName("demo_accurate_online_products.xlsx");
    setHeaders(Object.keys(demoData[0]));
    setAllRows(demoData);
    setSampleRows(demoData);

    setSkuCol("Kode Barang");
    setNameCol("Nama Barang");
    setBarcodeCol("Barcode");
    setCostCol("Harga Beli");
    setSellCol("Harga Jual");
    setStockCol("Kuantitas");

    setStep(2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="migration" title="Wizard Migrasi Accurate.id" />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Wizard Steps Navigation Bar */}
        <div className="mb-8 bg-slate-850 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <div className={`flex items-center space-x-2 ${step >= 1 ? "text-purple-400 font-bold" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono">1</span>
            <span>Unggah File</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`flex items-center space-x-2 ${step >= 2 ? "text-purple-400 font-bold" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono">2</span>
            <span>Pemetaan Kolom</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`flex items-center space-x-2 ${step >= 3 ? "text-purple-400 font-bold" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono">3</span>
            <span>Simulasi Dry-Run</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`flex items-center space-x-2 ${step >= 4 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono">4</span>
            <span>Rekonsiliasi Impor</span>
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-8 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 mx-auto mb-4">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unggah File Ekspor Accurate.id</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Mendukung file Excel (.xlsx / .xls) dan CSV dari Accurate Online. Data akan divalidasi dan disimulasikan terlebih dahulu sebelum diimpor ke database aktif.
            </p>

            <label className="inline-flex items-center space-x-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-md">
              <Upload className="w-4 h-4" />
              <span>Pilih File Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={loadDemoAccurateData}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Gunakan Contoh File Ekspor Accurate Demo (Uji Langsung)
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === 2 && (
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Pemetaan Kolom Sumber ke ERP</h3>
                <span className="text-xs text-slate-400">File: {fileName} ({allRows.length} baris terbaca)</span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Ganti File
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Kolom SKU / Kode Barang <span className="text-rose-400">*</span>
                </label>
                <select
                  value={skuCol}
                  onChange={(e) => setSkuCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Pilih kolom...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Kolom Nama Barang <span className="text-rose-400">*</span>
                </label>
                <select
                  value={nameCol}
                  onChange={(e) => setNameCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Pilih kolom...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kolom Barcode</label>
                <select
                  value={barcodeCol}
                  onChange={(e) => setBarcodeCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">(Tidak ada barcode / lewati)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kolom Harga Beli (Biaya Satuan)</label>
                <select
                  value={costCol}
                  onChange={(e) => setCostCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">(Kosongkan)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kolom Harga Jual</label>
                <select
                  value={sellCol}
                  onChange={(e) => setSellCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">(Kosongkan)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kolom Saldo Stok Awal</label>
                <select
                  value={stockCol}
                  onChange={(e) => setStockCol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">(Kosongkan)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conflict Strategy */}
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 mb-6 text-xs">
              <label className="block text-slate-200 font-semibold mb-2">
                Strategi Duplikasi & Konflik Data (Jika SKU sudah ada di database)
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="skip"
                    checked={conflictStrategy === "skip"}
                    onChange={() => setConflictStrategy("skip")}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Lewati baris duplikat (Skip - Rekomendasi Aman)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="update"
                    checked={conflictStrategy === "update"}
                    onChange={() => setConflictStrategy("update")}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>Perbarui data produk yang cocok (Update existing)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleDryRun}
                disabled={loading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2"
              >
                <span>{loading ? "Menjalankan Simulasi..." : "JALANKAN SIMULASI DRY-RUN"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Dry-Run Summary */}
        {step === 3 && dryRunData && (
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-white mb-2">Hasil Simulasi Dry-Run</h3>
            <p className="text-xs text-slate-400 mb-6">
              Simulasi membuktikan validitas baris sebelum eksekusi commit ke database produksi.
            </p>

            <div className="grid grid-cols-4 gap-3 mb-6 text-center text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Baris</span>
                <span className="text-xl font-bold text-white font-mono">{dryRunData.totalRows}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-emerald-400 block text-[10px]">Valid untuk Impor</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">{dryRunData.validRows}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-amber-400 block text-[10px]">Duplikat Terdeteksi</span>
                <span className="text-xl font-bold text-amber-400 font-mono">{dryRunData.duplicateRows}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-rose-400 block text-[10px]">Baris Error</span>
                <span className="text-xl font-bold text-rose-400 font-mono">{dryRunData.errorRows}</span>
              </div>
            </div>

            {/* Duplicate & Conflict list */}
            {dryRunData.duplicates?.length > 0 && (
              <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800 rounded-lg text-xs">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Daftar Konflik / Duplikasi ({dryRunData.duplicates.length})</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-slate-300">
                  {dryRunData.duplicates.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>Baris {d.row}: <strong>{d.sku}</strong></span>
                      <span className="text-amber-400">{d.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Ubah Pemetaan
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={loading || dryRunData.validRows === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-md disabled:opacity-40"
              >
                <span>{loading ? "Mengimpor Data..." : "SETUJUI & EKSEKUSI BATCH IMPORT"}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Reconciliation Report */}
        {step === 4 && importResult && (
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 shadow-sm">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Laporan Rekonsiliasi Migrasi Accurate</h3>
                <span className="text-xs text-slate-400 font-mono">Status: COMPLETED (Commit Sukses)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Produk Berhasil Diimpor</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">
                  {importResult.importedCount} Item
                </span>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Total Kuantitas Fisik</span>
                <span className="text-2xl font-bold text-white font-mono">
                  {importResult.totalStockImported.toLocaleString("id-ID")} Pcs
                </span>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Total Nilai Persediaan Awal</span>
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {formatIDR(importResult.totalValuationImported)}
                </span>
              </div>
            </div>

            {/* Reconciliation summary */}
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 mb-6">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Seluruh saldo pembukuan awal persediaan telah tercatat pada ledger mutasi.</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Produk yang diimpor langsung dapat discan pada Terminal Kasir (POS) dan dipantau saldonya pada Saldo Stok Gudang.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Impor File Lain
              </button>
              <a
                href="/inventory/products"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Lihat di Master Katalog
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
