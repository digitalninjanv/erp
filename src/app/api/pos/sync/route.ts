import { NextRequest, NextResponse } from "next/server";
import { PosService, CheckoutSaleInput } from "@/modules/pos/pos.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, transactions, userId } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ success: false, error: "Daftar transaksi offline tidak valid" }, { status: 400 });
    }

    const results: Array<{
      clientTxId: string;
      status: "synced" | "conflict" | "error";
      saleId?: string;
      error?: string;
    }> = [];

    for (const tx of transactions) {
      try {
        const checkoutInput: CheckoutSaleInput = {
          shiftId: tx.shiftId,
          customerId: tx.customerId,
          locationId: tx.locationId || "loc_store",
          items: tx.items,
          paymentMethod: tx.paymentMethod || "cash",
          cashTendered: tx.cashTendered,
          qrisReferenceNumber: tx.qrisReferenceNumber,
          idempotencyKey: tx.offlineIdempotencyKey || `offline_${tx.clientTxId}`,
          createdBy: userId || tx.userId || "usr_kasir1",
          isOfflineSynced: true,
        };

        const res = await PosService.checkoutSale(checkoutInput);
        results.push({
          clientTxId: tx.clientTxId,
          status: "synced",
          saleId: res.data.saleId,
        });
      } catch (err: any) {
        results.push({
          clientTxId: tx.clientTxId,
          status: "error",
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "synced").length;

    return NextResponse.json({
      success: true,
      batchId,
      total: transactions.length,
      synced: successCount,
      failed: transactions.length - successCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
