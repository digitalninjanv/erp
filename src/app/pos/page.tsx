"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/shared/ui/Navbar";
import { ThermalReceipt, ReceiptData } from "@/shared/ui/ThermalReceipt";
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  PauseCircle, 
  RotateCcw, 
  Printer, 
  CheckCircle, 
  QrCode, 
  CreditCard, 
  UserCheck,
  AlertCircle,
  Clock,
  X
} from "lucide-react";
import { formatIDR, calculateCashRounding } from "@/shared/kernel/formatting";

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  qty: number;
  discountAmount: number;
  subtotal: number;
}

export default function PosTerminalPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modals
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris_static" | "credit">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [qrisVerified, setQrisVerified] = useState(false);
  const [qrisRefNumber, setQrisRefNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [heldCarts, setHeldCarts] = useState<any[]>([]);

  // Barcode input ref for autofocus
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Quick Catalog state
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    // Focus barcode input on mount
    barcodeInputRef.current?.focus();

    // Check active shift
    fetch("/api/pos/shift")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setActiveShift(d.data);
      })
      .catch(() => {});

    // Fetch initial catalog
    fetch("/api/pos/products?limit=12")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.products) setCatalog(d.data.products);
      })
      .catch(() => {});
  }, []);

  // Compute bill figures
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0);
  const netBill = subtotal - totalDiscount;

  // Rounding for cash (Rp500)
  const rounding = calculateCashRounding(netBill, 500);
  const finalTotal = paymentMethod === "cash" ? rounding.roundedTotal : netBill;
  const roundingDiff = paymentMethod === "cash" ? rounding.roundingDifference : 0;

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeAmount = Math.max(0, tenderedNum - finalTotal);

  // Scan / Search Barcode handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/pos/products?barcode=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.success && data.data) {
        addToCart(data.data);
        setBarcodeInput("");
      } else {
        setStatusMessage({ type: "error", text: `Produk dengan barcode '${code}' tidak ditemukan.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Gagal memindai barcode." });
    } finally {
      setLoading(false);
      barcodeInputRef.current?.focus();
    }
  };

  const addToCart = (prod: any) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const item = copy[existingIdx];
        item.qty += 1;
        item.subtotal = item.qty * item.unitPrice - item.discountAmount;
        return copy;
      } else {
        const price = parseFloat(prod.sellingPrice);
        return [
          ...prev,
          {
            productId: prod.id,
            sku: prod.sku,
            name: prod.name,
            unitPrice: price,
            qty: 1,
            discountAmount: 0,
            subtotal: price,
          },
        ];
      }
    });
  };

  const updateItemQty = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return copy.filter((_, idx) => idx !== index);
      }
      item.qty = newQty;
      item.subtotal = item.qty * item.unitPrice - item.discountAmount;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Open Checkout Modal
  const handleOpenTender = () => {
    if (cart.length === 0) {
      setStatusMessage({ type: "error", text: "Keranjang masih kosong." });
      return;
    }
    setCashTendered(finalTotal.toString());
    setShowTenderModal(true);
  };

  // Execute Checkout
  const handleCompleteSale = async () => {
    if (paymentMethod === "cash" && tenderedNum < finalTotal) {
      alert(`Uang tunai kurang! Tagihan: ${formatIDR(finalTotal)}, Diterima: ${formatIDR(tenderedNum)}`);
      return;
    }
    if (paymentMethod === "qris_static" && !qrisVerified) {
      alert("Harap verifikasi pembayaran QRIS pelanggan terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shiftId: activeShift?.id || null,
        customerId: paymentMethod === "credit" ? selectedCustomerId || "cust_member1" : undefined,
        locationId: "loc_store",
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
        })),
        paymentMethod,
        cashTendered: paymentMethod === "cash" ? tenderedNum : undefined,
        qrisReferenceNumber: qrisRefNumber || undefined,
        idempotencyKey: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses checkout");
      }

      // Prepare Receipt
      const receiptData: ReceiptData = {
        saleNumber: data.data.saleNumber,
        saleDate: new Date(),
        cashierName: "Siti (Kasir 1)",
        items: cart.map((i) => ({
          nameSnapshot: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          discountAmount: i.discountAmount,
        })),
        subtotal,
        discountAmount: totalDiscount,
        roundingAmount: roundingDiff,
        finalPayable: finalTotal,
        paidAmount: paymentMethod === "cash" ? tenderedNum : finalTotal,
        changeAmount: paymentMethod === "cash" ? changeAmount : 0,
        paymentMethod: paymentMethod.toUpperCase(),
      };

      setLastReceipt(receiptData);
      setShowTenderModal(false);
      setShowReceiptModal(true);
      setCart([]);
      setStatusMessage({ type: "success", text: `Transaksi ${data.data.saleNumber} berhasil diselesaikan!` });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hold current cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const label = `Hold #${heldCarts.length + 1} (${cart.length} item - ${formatIDR(finalTotal)})`;
    setHeldCarts((prev) => [...prev, { id: Date.now(), label, items: [...cart] }]);
    setCart([]);
    setStatusMessage({ type: "info", text: "Keranjang berhasil ditahan sementara (Hold)." });
  };

  const handleResumeCart = (holdItem: any) => {
    setCart(holdItem.items);
    setHeldCarts((prev) => prev.filter((h) => h.id !== holdItem.id));
    setShowHoldModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar currentModule="pos" title="Terminal Kasir POS" />

      {/* Main POS Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 gap-4">
        {/* Left Area: Product Scanner & Fast Catalog */}
        <div className="flex-1 flex flex-col bg-slate-850 rounded-xl border border-slate-800 p-4 shadow-sm overflow-hidden">
          {/* Barcode Search Bar */}
          <div className="flex items-center space-x-2 mb-4">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Barcode className="w-5 h-5 text-emerald-400" />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode scanner atau ketik barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider"
              />
            </form>
            <button
              onClick={handleBarcodeSubmit}
              disabled={loading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Scan
            </button>
          </div>

          {/* Quick Notification alert */}
          {statusMessage && (
            <div className={`mb-3 p-2.5 rounded-lg text-xs flex items-center justify-between ${
              statusMessage.type === "success" ? "bg-emerald-950 border border-emerald-800 text-emerald-300" :
              statusMessage.type === "error" ? "bg-rose-950 border border-rose-800 text-rose-300" :
              "bg-blue-950 border border-blue-800 text-blue-300"
            }`}>
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Fast Product Catalog Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Katalog Cepat (Klik untuk menambah)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {catalog.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => addToCart(prod)}
                  className="p-3 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-emerald-500 rounded-lg text-left transition flex flex-col justify-between group"
                >
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-0.5">{prod.sku}</span>
                    <h4 className="text-xs font-medium text-slate-100 group-hover:text-emerald-300 line-clamp-2 leading-snug">
                      {prod.name}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">{formatIDR(prod.sellingPrice)}</span>
                    <span className="text-[10px] text-slate-400">Pcs</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Area: Transaction Cart & Payment Summary */}
        <div className="w-full lg:w-[420px] flex flex-col bg-slate-850 rounded-xl border border-slate-800 p-4 shadow-sm">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="font-bold text-base text-white">Keranjang Belanja</h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {cart.length} Baris Item
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleHoldCart}
                disabled={cart.length === 0}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 transition disabled:opacity-40"
                title="Hold Keranjang"
              >
                Hold
              </button>
              {heldCarts.length > 0 && (
                <button
                  onClick={() => setShowHoldModal(true)}
                  className="px-2 py-1 text-xs bg-amber-950 text-amber-300 rounded border border-amber-800 font-semibold animate-pulse"
                >
                  Held ({heldCarts.length})
                </button>
              )}
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[240px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                <Barcode className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                <p className="text-xs">Keranjang masih kosong.</p>
                <p className="text-[11px]">Scan barcode atau pilih barang dari katalog.</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex-1 mr-3 min-w-0">
                    <h5 className="text-xs font-medium text-slate-200 truncate">{item.name}</h5>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span>{formatIDR(item.unitPrice)}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-300">{formatIDR(item.subtotal)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateItemQty(index, -1)}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono text-xs font-semibold">{item.qty}</span>
                    <button
                      onClick={() => updateItemQty(index, 1)}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(index)}
                      className="w-6 h-6 rounded hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Cash Rounding Preview */}
          <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
            {roundingDiff !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Pembulatan Kas (Rp500):</span>
                <span>{formatIDR(roundingDiff)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800 font-bold">
              <span className="text-sm text-slate-300">TOTAL:</span>
              <span className="text-2xl text-emerald-400 tracking-tight">{formatIDR(finalTotal)}</span>
            </div>
          </div>

          {/* Pay Button */}
          <div className="mt-4 pt-2">
            <button
              onClick={handleOpenTender}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-md transition disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>BAYAR SEKARANG ({formatIDR(finalTotal)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tender Modal */}
      {showTenderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-lg font-bold text-white">Pembayaran Kasir</h3>
              <button onClick={() => setShowTenderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-slate-900 p-4 rounded-lg text-center mb-5 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Total Tagihan</span>
              <span className="text-3xl font-bold text-emerald-400 font-mono">{formatIDR(finalTotal)}</span>
            </div>

            {/* Tender Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition ${
                  paymentMethod === "cash"
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                }`}
              >
                <DollarSign className="w-4 h-4 mb-1" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("qris_static")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition ${
                  paymentMethod === "qris_static"
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                }`}
              >
                <QrCode className="w-4 h-4 mb-1" />
                <span>QRIS Statis</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("credit")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition ${
                  paymentMethod === "credit"
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1" />
                <span>Piutang</span>
              </button>
            </div>

            {/* Dynamic Form based on Tender Method */}
            {paymentMethod === "cash" && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-lg font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCashTendered(finalTotal.toString())}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered("10000")}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    10.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered("20000")}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    20.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered("50000")}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered("100000")}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    100.000
                  </button>
                </div>

                {/* Change Display */}
                <div className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm border border-slate-800">
                  <span className="text-slate-400">Kembalian:</span>
                  <span className="font-bold text-lg text-amber-400 font-mono">
                    {formatIDR(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === "qris_static" && (
              <div className="space-y-3 mb-6 p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold mb-1">
                  <QrCode className="w-4 h-4" />
                  <span>Instruksi QRIS Statis Toko</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Tunjukkan barcode QRIS minimarket kepada pelanggan. Tagihan aktual sebesar{" "}
                  <strong className="text-white">{formatIDR(netBill)}</strong>.
                </p>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    No. Referensi / RRN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={qrisRefNumber}
                    onChange={(e) => setQrisRefNumber(e.target.value)}
                    placeholder="Contoh: 1029384756"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
                <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrisVerified}
                    onChange={(e) => setQrisVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300 font-medium">
                    Saya sudah memeriksa bukti pembayaran pelanggan sah.
                  </span>
                </label>
              </div>
            )}

            {paymentMethod === "credit" && (
              <div className="space-y-3 mb-6 p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <label className="block text-slate-300 font-medium mb-1">
                  Pilih Pelanggan Terdaftar
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="cust_member1">Ibu Ratna (Member Toko) - Limit Rp1.000.000</option>
                  <option value="cust_warung1">Warung Pak Joko (Grosir) - Limit Rp5.000.000</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Transaksi akan dicatat sebagai piutang jatuh tempo 14 hari dan dibukukan ke kartu piutang pelanggan.
                </p>
              </div>
            )}

            {/* Complete Button */}
            <button
              onClick={handleCompleteSale}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition shadow-md disabled:opacity-50"
            >
              {loading ? "Menyimpan Transaksi..." : "SELESAIKAN TRANSAKSI"}
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Struk Transaksi Kasir</span>
              </h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Preview */}
            <div className="max-h-[380px] overflow-y-auto mb-5 p-2 bg-slate-900 rounded-lg border border-slate-800">
              <ThermalReceipt data={lastReceipt} />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal (58/80mm)</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Carts Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white">Daftar Keranjang Tertahan (Held)</h3>
              <button onClick={() => setShowHoldModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {heldCarts.map((h) => (
                <div key={h.id} className="p-3 bg-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block">{h.label}</span>
                    <span className="text-[10px] text-slate-400">{h.items.length} macam produk</span>
                  </div>
                  <button
                    onClick={() => handleResumeCart(h)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                  >
                    Buka Kembali
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
