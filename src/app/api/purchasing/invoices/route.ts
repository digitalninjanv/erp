import { NextRequest, NextResponse } from "next/server";
import { PurchasingService } from "@/modules/purchasing/purchasing.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const invoices = await db
      .select({
        id: s.supplierInvoices.id,
        invoiceNumber: s.supplierInvoices.invoiceNumber,
        supplierName: s.suppliers.name,
        invoiceDate: s.supplierInvoices.invoiceDate,
        dueDate: s.supplierInvoices.dueDate,
        totalAmount: s.supplierInvoices.totalAmount,
        paidAmount: s.supplierInvoices.paidAmount,
        status: s.supplierInvoices.status,
      })
      .from(s.supplierInvoices)
      .innerJoin(s.suppliers, eq(s.supplierInvoices.supplierId, s.suppliers.id))
      .orderBy(desc(s.supplierInvoices.invoiceDate));

    return NextResponse.json({ success: true, data: invoices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_invoice") {
      const res = await PurchasingService.postSupplierInvoice({
        supplierId: body.supplierId,
        goodsReceiptId: body.goodsReceiptId,
        poId: body.poId,
        totalAmount: parseFloat(body.totalAmount),
        createdBy: body.userId || "usr_akuntan1",
      });
      return NextResponse.json({ success: true, data: res });
    }

    if (action === "pay_invoice") {
      const res = await PurchasingService.paySupplierInvoice({
        invoiceId: body.invoiceId,
        amount: parseFloat(body.amount),
        paymentMethod: body.paymentMethod || "bank_transfer",
        bankAccountId: body.bankAccountId || "bank_bca",
        notes: body.notes,
        createdBy: body.userId || "usr_akuntan1",
      });
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
