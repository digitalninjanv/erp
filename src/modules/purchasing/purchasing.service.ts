import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq } from "drizzle-orm";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";

export interface CreatePOItemInput {
  productId: string;
  qtyOrdered: number;
  unitPrice: number;
}

export interface ReceiveGRItemInput {
  poItemId?: string;
  productId: string;
  qtyReceived: number;
  unitCost: number;
  qtyDamaged?: number;
}

export class PurchasingService {
  /**
   * Creates a Purchase Order (does not affect stock or accounts)
   */
  static async createPurchaseOrder(params: {
    supplierId: string;
    items: CreatePOItemInput[];
    orderDate?: Date;
    expectedDate?: Date;
    notes?: string;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const poId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;

      let totalAmount = 0;
      for (const item of params.items) {
        totalAmount += item.qtyOrdered * item.unitPrice;
      }

      await tx.insert(s.purchaseOrders).values({
        id: poId,
        poNumber,
        supplierId: params.supplierId,
        orderDate: params.orderDate || new Date(),
        expectedDate: params.expectedDate || null,
        status: "approved",
        totalAmount: totalAmount.toFixed(2),
        notes: params.notes || null,
        createdBy: params.createdBy || null,
      });

      for (const item of params.items) {
        const subtotal = item.qtyOrdered * item.unitPrice;
        await tx.insert(s.purchaseOrderItems).values({
          id: `poi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          poId,
          productId: item.productId,
          qtyOrdered: item.qtyOrdered.toFixed(2),
          qtyReceived: "0.00",
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: subtotal.toFixed(2),
        });
      }

      return { poId, poNumber, totalAmount };
    });
  }

  /**
   * Receives goods from supplier (Goods Receipt):
   * 1. Increases stock balance & records inventory ledger
   * 2. Recalculates Moving Weighted Average (MWA) cost price for product
   * 3. Posts automated balanced journal:
   *    Dr. Persediaan Barang Dagang (acc_1140)
   *    Cr. Goods Received Not Invoiced (GRNI) (acc_2120)
   */
  static async receiveGoods(params: {
    poId?: string;
    supplierId: string;
    locationId: string;
    items: ReceiveGRItemInput[];
    notes?: string;
    receivedBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const grId = `gr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const grNumber = `GR-${Date.now().toString().slice(-6)}`;

      let totalReceivedCost = 0;

      await tx.insert(s.goodsReceipts).values({
        id: grId,
        grNumber,
        poId: params.poId || null,
        supplierId: params.supplierId,
        locationId: params.locationId,
        receivedDate: new Date(),
        status: "posted",
        notes: params.notes || null,
        receivedBy: params.receivedBy || null,
      });

      for (const item of params.items) {
        const subtotalCost = item.qtyReceived * item.unitCost;
        totalReceivedCost += subtotalCost;

        await tx.insert(s.goodsReceiptItems).values({
          id: `gri_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          goodsReceiptId: grId,
          poItemId: item.poItemId || null,
          productId: item.productId,
          qtyReceived: item.qtyReceived.toFixed(2),
          qtyDamaged: (item.qtyDamaged || 0).toFixed(2),
          unitCost: item.unitCost.toFixed(2),
          subtotalCost: subtotalCost.toFixed(2),
        });

        // Update PO item received quantity if linked
        if (item.poItemId) {
          const [poItem] = await tx
            .select()
            .from(s.purchaseOrderItems)
            .where(eq(s.purchaseOrderItems.id, item.poItemId))
            .limit(1);
          if (poItem) {
            const currentRec = parseFloat(poItem.qtyReceived);
            await tx
              .update(s.purchaseOrderItems)
              .set({
                qtyReceived: (currentRec + item.qtyReceived).toFixed(2),
              })
              .where(eq(s.purchaseOrderItems.id, item.poItemId));
          }
        }

        // Fetch product & calculate new Moving Weighted Average (MWA)
        const [prod] = await tx.select().from(s.products).where(eq(s.products.id, item.productId)).limit(1);
        if (prod) {
          const currentCost = parseFloat(prod.costPrice);

          // Get total stock across all active locations
          const stockRows = await tx
            .select({ qty: s.stockBalances.qty })
            .from(s.stockBalances)
            .where(eq(s.stockBalances.productId, item.productId));

          const totalCurrentQty = stockRows.reduce((sum, r) => sum + parseFloat(r.qty), 0);

          const newMwaCost = InventoryService.calculateMovingAverage({
            currentQty: totalCurrentQty,
            currentCost,
            receivedQty: item.qtyReceived,
            receivedCost: item.unitCost,
          });

          // Update product costPrice (MWA) and purchasePrice
          await tx
            .update(s.products)
            .set({
              costPrice: newMwaCost.toFixed(2),
              purchasePrice: item.unitCost.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(s.products.id, item.productId));
        }

        // Record stock movement into designated location
        await InventoryService.recordMovement({
          productId: item.productId,
          locationId: params.locationId,
          refType: "goods_receipt",
          refId: grId,
          qtyChange: item.qtyReceived,
          costPerUnit: item.unitCost,
          notes: `Penerimaan Barang Supplier (${grNumber})`,
          createdBy: params.receivedBy,
          tx,
        });
      }

      // Automated Accounting Journal (GRNI Accrual):
      // Dr. Persediaan Barang Dagang (acc_1140)
      // Cr. Goods Received Not Invoiced (GRNI) (acc_2120)
      await AccountingService.postJournalEntry({
        refType: "goods_receipt",
        refId: grId,
        description: `Penerimaan Barang ${grNumber} (GRNI Accrual)`,
        lines: [
          { accountId: "acc_1140", debit: totalReceivedCost, credit: 0 },
          { accountId: "acc_2120", debit: 0, credit: totalReceivedCost },
        ],
        createdBy: params.receivedBy,
        tx,
      });

      return { grId, grNumber, totalReceivedCost };
    });
  }

  /**
   * Process Supplier Invoice (Matches against GR, closes GRNI, recognizes AP):
   * Dr. Goods Received Not Invoiced (GRNI) (acc_2120)
   * Cr. Utang Usaha (acc_2110)
   */
  static async postSupplierInvoice(params: {
    supplierId: string;
    goodsReceiptId?: string;
    poId?: string;
    totalAmount: number;
    invoiceDate?: Date;
    dueDate?: Date;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const invoiceId = `sinv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const invoiceNumber = `INV-SUP-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.supplierInvoices).values({
        id: invoiceId,
        invoiceNumber,
        supplierId: params.supplierId,
        goodsReceiptId: params.goodsReceiptId || null,
        poId: params.poId || null,
        invoiceDate: params.invoiceDate || new Date(),
        dueDate: params.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: params.totalAmount.toFixed(2),
        paidAmount: "0.00",
        status: "posted",
        createdBy: params.createdBy || null,
      });

      // Automated Accounting Journal:
      // Dr. GRNI (acc_2120)
      // Cr. Utang Usaha (acc_2110)
      await AccountingService.postJournalEntry({
        refType: "supplier_invoice",
        refId: invoiceId,
        description: `Tagihan Faktur Supplier ${invoiceNumber}`,
        lines: [
          { accountId: "acc_2120", debit: params.totalAmount, credit: 0 },
          { accountId: "acc_2110", debit: 0, credit: params.totalAmount },
        ],
        createdBy: params.createdBy,
        tx,
      });

      return { invoiceId, invoiceNumber };
    });
  }

  /**
   * Pay Supplier Invoice:
   * Dr. Utang Usaha (acc_2110)
   * Cr. Bank BCA / Kas (acc_1120 / acc_1110)
   */
  static async paySupplierInvoice(params: {
    invoiceId: string;
    amount: number;
    paymentMethod: "bank_transfer" | "cash";
    bankAccountId?: string;
    notes?: string;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const [invoice] = await tx.select().from(s.supplierInvoices).where(eq(s.supplierInvoices.id, params.invoiceId)).limit(1);
      if (!invoice) throw new Error("Faktur supplier tidak ditemukan");

      const currentPaid = parseFloat(invoice.paidAmount);
      const totalAmount = parseFloat(invoice.totalAmount);
      const newPaid = currentPaid + params.amount;

      if (newPaid > totalAmount + 0.01) {
        throw new Error("Nominal pembayaran melebihi sisa tagihan!");
      }

      const paymentId = `spay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const paymentNumber = `PAY-SUP-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.supplierPayments).values({
        id: paymentId,
        paymentNumber,
        supplierId: invoice.supplierId,
        invoiceId: invoice.id,
        paymentDate: new Date(),
        amount: params.amount.toFixed(2),
        paymentMethod: params.paymentMethod,
        bankAccountId: params.bankAccountId || null,
        notes: params.notes || null,
        createdBy: params.createdBy || null,
      });

      const updatedStatus = newPaid >= totalAmount - 0.01 ? "paid" : "partially_paid";
      await tx
        .update(s.supplierInvoices)
        .set({
          paidAmount: newPaid.toFixed(2),
          status: updatedStatus,
        })
        .where(eq(s.supplierInvoices.id, params.invoiceId));

      // Automated Accounting Journal:
      // Dr. Utang Usaha (acc_2110)
      // Cr. Bank BCA / Kas Toko
      const creditAccountId = params.paymentMethod === "bank_transfer" ? "acc_1120" : "acc_1110";

      await AccountingService.postJournalEntry({
        refType: "supplier_payment",
        refId: paymentId,
        description: `Pelunasan Utang Faktur ${invoice.invoiceNumber} (${paymentNumber})`,
        lines: [
          { accountId: "acc_2110", debit: params.amount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: params.amount },
        ],
        createdBy: params.createdBy,
        tx,
      });

      return { paymentId, paymentNumber, updatedStatus, newPaid };
    });
  }
}
