import React from "react";
import { formatIDR, formatDateID } from "../kernel/formatting";

export interface ReceiptData {
  saleNumber: string;
  saleDate: Date | string;
  cashierName?: string;
  items: Array<{
    nameSnapshot: string;
    qty: number | string;
    unitPrice: number | string;
    subtotal: number | string;
    discountAmount?: number | string;
  }>;
  subtotal: number;
  discountAmount?: number;
  roundingAmount?: number;
  finalPayable: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentMethod: string;
}

export function ThermalReceipt({ data }: { data: ReceiptData }) {
  return (
    <div id="printable-receipt" className="text-black bg-white p-3 font-mono text-[12px] leading-tight max-w-[80mm] mx-auto border border-dashed border-gray-300">
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h2 className="font-bold text-sm tracking-wider uppercase">MINIMARKET BERKAH JAYA</h2>
        <p className="text-[10px]">Jl. Sukses Makmur No. 88, Jakarta</p>
        <p className="text-[10px]">Telp: (021) 8899-7766</p>
      </div>

      {/* Meta info */}
      <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>No: {data.saleNumber}</span>
          <span>{formatDateID(data.saleDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir: {data.cashierName || "Kasir"}</span>
          <span className="uppercase">Bayar: {data.paymentMethod}</span>
        </div>
      </div>

      {/* Items table */}
      <div className="py-2 border-b border-dashed border-black space-y-1">
        {data.items.map((item, idx) => (
          <div key={idx} className="text-[11px]">
            <div className="font-medium truncate">{item.nameSnapshot}</div>
            <div className="flex justify-between pl-2 text-[10px] text-gray-700">
              <span>
                {item.qty} x {formatIDR(item.unitPrice)}
              </span>
              <span>{formatIDR(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatIDR(data.subtotal)}</span>
        </div>
        {data.discountAmount && data.discountAmount > 0 ? (
          <div className="flex justify-between text-gray-700">
            <span>Diskon:</span>
            <span>-{formatIDR(data.discountAmount)}</span>
          </div>
        ) : null}
        {data.roundingAmount && data.roundingAmount !== 0 ? (
          <div className="flex justify-between text-gray-700">
            <span>Pembulatan:</span>
            <span>{formatIDR(data.roundingAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-dotted border-black">
          <span>TOTAL:</span>
          <span>{formatIDR(data.finalPayable)}</span>
        </div>
        {data.paidAmount !== undefined && (
          <div className="flex justify-between text-[11px]">
            <span>Diterima:</span>
            <span>{formatIDR(data.paidAmount)}</span>
          </div>
        )}
        {data.changeAmount !== undefined && (
          <div className="flex justify-between text-[11px]">
            <span>Kembalian:</span>
            <span>{formatIDR(data.changeAmount)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 text-center text-[10px] space-y-1 text-gray-800">
        <p className="font-semibold">Terima Kasih Atas Kunjungan Anda</p>
        <p>Barang yang sudah dibeli dapat ditukar dalam 1x24 jam dengan struk asli.</p>
        <p className="text-[8px] text-gray-500 pt-1">*** ERP Modular Minimarket v2.1 ***</p>
      </div>
    </div>
  );
}
