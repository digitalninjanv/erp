import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculateCashRounding } from "../../shared/kernel/formatting";
import { processWithIdempotency } from "../../shared/kernel/idempotency";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";

export interface CheckoutItemInput {
  productId: string;
  qty: number;
  unitPrice?: number;
  discountAmount?: number;
}

export interface CheckoutSaleInput {
  shiftId?: string;
  customerId?: string;
  locationId: string;
  items: CheckoutItemInput[];
  paymentMethod: "cash" | "qris_static" | "split" | "credit";
  cashTendered?: number;
  qrisAmount?: number;
  qrisReferenceNumber?: string;
  roundCashTo?: number; // default 500
  notes?: string;
  idempotencyKey?: string;
  createdBy: string;
  isOfflineSynced?: boolean;
}

export interface ReturnItemInput {
  saleItemId: string;
  qty: number;
  condition: "saleable" | "damaged";
  refundAmount?: number;
}

export class PosService {
  /**
   * Open Cash Shift
   */
  static async openShift(params: {
    userId: string;
    locationId: string;
    openingCash: number;
    notes?: string;
  }) {
    // Check if user already has an active open shift
    const [existing] = await db
      .select()
      .from(s.posShifts)
      .where(and(eq(s.posShifts.userId, params.userId), eq(s.posShifts.status, "open")))
      .limit(1);

    if (existing) {
      return existing;
    }

    const shiftId = `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shiftNumber = `SH-${Date.now().toString().slice(-6)}`;

    const [newShift] = await db
      .insert(s.posShifts)
      .values({
        id: shiftId,
        shiftNumber,
        userId: params.userId,
        locationId: params.locationId,
        openingCash: params.openingCash.toFixed(2),
        status: "open",
        startTime: new Date(),
        notes: params.notes || null,
      })
      .returning();

    return newShift;
  }

  /**
   * Close Cash Shift & Reconcile
   */
  static async closeShift(params: {
    shiftId: string;
    closingCashActual: number;
    notes?: string;
  }) {
    const [shift] = await db.select().from(s.posShifts).where(eq(s.posShifts.id, params.shiftId)).limit(1);
    if (!shift || shift.status !== "open") throw new Error("Shift tidak ditemukan atau sudah ditutup");

    // Calculate cash movements during shift
    const cashMovements = await db
      .select()
      .from(s.posCashMovements)
      .where(eq(s.posCashMovements.shiftId, params.shiftId));

    let netCashMovement = 0;
    cashMovements.forEach((m) => {
      const amt = parseFloat(m.amount);
      if (m.movementType === "cash_in") netCashMovement += amt;
      else if (m.movementType === "cash_out" || m.movementType === "deposit") netCashMovement -= amt;
    });

    // Calculate cash sales in this shift
    const cashPayments = await db
      .select({ amount: s.salePayments.amount })
      .from(s.salePayments)
      .where(
        and(
          eq(s.salePayments.shiftId, params.shiftId),
          eq(s.salePayments.paymentMethod, "cash"),
          eq(s.salePayments.status, "completed")
        )
      );

    const totalCashSales = cashPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const openingCash = parseFloat(shift.openingCash);
    const expectedCash = openingCash + totalCashSales + netCashMovement;
    const variance = params.closingCashActual - expectedCash;

    const [updated] = await db
      .update(s.posShifts)
      .set({
        closingCashActual: params.closingCashActual.toFixed(2),
        closingCashExpected: expectedCash.toFixed(2),
        variance: variance.toFixed(2),
        status: "closed",
        endTime: new Date(),
        notes: params.notes || shift.notes,
      })
      .where(eq(s.posShifts.id, params.shiftId))
      .returning();

    return {
      shift: updated,
      openingCash,
      totalCashSales,
      netCashMovement,
      expectedCash,
      actualCash: params.closingCashActual,
      variance,
    };
  }

  /**
   * Cash In / Cash Out / Setoran
   */
  static async recordCashMovement(params: {
    shiftId: string;
    movementType: "cash_in" | "cash_out" | "deposit";
    amount: number;
    reason: string;
    createdBy: string;
  }) {
    const movementId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [created] = await db
      .insert(s.posCashMovements)
      .values({
        id: movementId,
        shiftId: params.shiftId,
        movementType: params.movementType,
        amount: params.amount.toFixed(2),
        reason: params.reason,
        createdBy: params.createdBy,
      })
      .returning();

    return created;
  }

  /**
   * Main POS Checkout Sale (with atomic stock deduction, rounding, double-entry balancing, and idempotency)
   */
  static async checkoutSale(params: CheckoutSaleInput) {
    const idempotencyKey = params.idempotencyKey || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await processWithIdempotency(idempotencyKey, "pos_checkout", async () => {
      return await withTransaction(async (tx) => {
        const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const saleNumber = `POS-${Date.now().toString().slice(-6)}`;

        let subtotal = 0;
        let totalDiscount = 0;
        let totalCostOfGoods = 0;

        const preparedItems: Array<{
          productId: string;
          skuSnapshot: string;
          nameSnapshot: string;
          unitSnapshot: string;
          qty: number;
          unitPrice: number;
          unitCost: number;
          discountAmount: number;
          subtotal: number;
        }> = [];

        for (const item of params.items) {
          const [prod] = await tx.select().from(s.products).where(eq(s.products.id, item.productId)).limit(1);
          if (!prod || !prod.isActive) {
            throw new Error(`Produk tidak ditemukan atau tidak aktif: ${item.productId}`);
          }

          const unitPrice = item.unitPrice !== undefined ? item.unitPrice : parseFloat(prod.sellingPrice);
          const unitCost = parseFloat(prod.costPrice);
          const itemDiscount = item.discountAmount || 0;
          const lineSubtotal = item.qty * unitPrice - itemDiscount;

          subtotal += item.qty * unitPrice;
          totalDiscount += itemDiscount;
          totalCostOfGoods += item.qty * unitCost;

          preparedItems.push({
            productId: item.productId,
            skuSnapshot: prod.sku,
            nameSnapshot: prod.name,
            unitSnapshot: prod.baseUnitId || "PCS",
            qty: item.qty,
            unitPrice,
            unitCost,
            discountAmount: itemDiscount,
            subtotal: lineSubtotal,
          });

          // 1. Deduct stock and append to inventory ledger
          await InventoryService.recordMovement({
            productId: item.productId,
            locationId: params.locationId,
            refType: "sale",
            refId: saleId,
            qtyChange: -Math.abs(item.qty),
            costPerUnit: unitCost,
            notes: `Penjualan Kasir (${saleNumber})`,
            createdBy: params.createdBy,
            tx,
          });
        }

        const netBill = subtotal - totalDiscount;

        // 2. Calculate Cash Rounding (Rp500 or specified)
        let roundingDiff = 0;
        let finalPayable = netBill;

        if (params.paymentMethod === "cash" || params.paymentMethod === "split") {
          const roundRule = params.roundCashTo !== undefined ? params.roundCashTo : 500;
          const rounding = calculateCashRounding(netBill, roundRule);
          roundingDiff = rounding.roundingDifference;
          finalPayable = rounding.roundedTotal;
        }

        // 3. Payment verification & tendering
        let paidAmount = 0;
        let changeAmount = 0;
        const paymentsToRecord: Array<{
          method: "cash" | "qris_static" | "bank_transfer" | "credit";
          amount: number;
          status: "completed" | "pending_verification";
          refNo?: string;
        }> = [];

        if (params.paymentMethod === "cash") {
          const cashTendered = params.cashTendered || finalPayable;
          if (cashTendered < finalPayable) {
            throw new Error(`Uang tunai kurang! Tagihan: ${finalPayable}, Diterima: ${cashTendered}`);
          }
          paidAmount = finalPayable;
          changeAmount = cashTendered - finalPayable;
          paymentsToRecord.push({
            method: "cash",
            amount: finalPayable,
            status: "completed",
          });
        } else if (params.paymentMethod === "qris_static") {
          paidAmount = netBill; // QRIS uses exact bill
          paymentsToRecord.push({
            method: "qris_static",
            amount: netBill,
            status: "completed", // Verified by cashier
            refNo: params.qrisReferenceNumber,
          });
        } else if (params.paymentMethod === "credit") {
          paidAmount = 0;
          if (!params.customerId) throw new Error("Penjualan piutang wajib memilih pelanggan terdaftar");

          // Update customer current debt
          await tx
            .update(s.customers)
            .set({
              currentDebt: sql`${s.customers.currentDebt} + ${netBill.toFixed(2)}`,
            })
            .where(eq(s.customers.id, params.customerId));

          paymentsToRecord.push({
            method: "credit",
            amount: netBill,
            status: "completed",
          });
        }

        const paymentStatus =
          params.paymentMethod === "credit" ? "unpaid" : "paid";

        // 4. Insert Sale Document
        await tx.insert(s.sales).values({
          id: saleId,
          saleNumber,
          shiftId: params.shiftId || null,
          customerId: params.customerId || null,
          locationId: params.locationId,
          saleDate: new Date(),
          status: "posted",
          paymentStatus,
          fulfillmentStatus: "delivered",
          subtotal: subtotal.toFixed(2),
          discountAmount: totalDiscount.toFixed(2),
          taxAmount: "0.00",
          roundingAmount: roundingDiff.toFixed(2),
          totalAmount: finalPayable.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          changeAmount: changeAmount.toFixed(2),
          paymentMethod: params.paymentMethod,
          isOfflineSynced: params.isOfflineSynced || false,
          offlineIdempotencyKey: params.idempotencyKey || null,
          notes: params.notes || null,
          createdBy: params.createdBy,
        });

        // 5. Insert Sale Items
        for (const item of preparedItems) {
          await tx.insert(s.saleItems).values({
            id: `si_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            saleId,
            productId: item.productId,
            skuSnapshot: item.skuSnapshot,
            nameSnapshot: item.nameSnapshot,
            unitSnapshot: item.unitSnapshot,
            qty: item.qty.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            unitCost: item.unitCost.toFixed(2),
            discountAmount: item.discountAmount.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
            qtyReturned: "0.00",
          });
        }

        // 6. Insert Sale Payments
        for (const p of paymentsToRecord) {
          await tx.insert(s.salePayments).values({
            id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            saleId,
            shiftId: params.shiftId || null,
            paymentMethod: p.method,
            amount: p.amount.toFixed(2),
            status: p.status,
            referenceNumber: p.refNo || null,
            verifiedBy: params.createdBy,
            verifiedAt: new Date(),
          });
        }

        // 7. Post Automated Balanced Accounting Journal:
        // Dr. Kas Toko (pm_cash) / QRIS Clearing (pm_qris) / Piutang (pm_credit) -> total paid/bill
        // Cr. Pendapatan Penjualan (acc_4100) -> subtotal
        // Dr. Diskon Penjualan (acc_4110) -> totalDiscount (if any)
        // Dr. HPP (acc_5100) -> totalCostOfGoods
        // Cr. Persediaan (acc_1140) -> totalCostOfGoods
        // Rounding adjustment: Cr Pendapatan Pembulatan (if > 0) OR Dr Beban Pembulatan (if < 0)

        const debitAccount =
          params.paymentMethod === "cash"
            ? "acc_1110"
            : params.paymentMethod === "qris_static"
            ? "acc_1125"
            : "acc_1130";

        const journalLines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [
          // 1. Payment receipt
          { accountId: debitAccount, debit: finalPayable, credit: 0, description: `Penerimaan kas/piutang penjualan ${saleNumber}` },
          // 2. Revenue
          { accountId: "acc_4100", debit: 0, credit: subtotal, description: `Pendapatan penjualan ${saleNumber}` },
          // 3. COGS and Inventory
          { accountId: "acc_5100", debit: totalCostOfGoods, credit: 0, description: `HPP penjualan ${saleNumber}` },
          { accountId: "acc_1140", debit: 0, credit: totalCostOfGoods, description: `Pengurangan persediaan penjualan ${saleNumber}` },
        ];

        if (totalDiscount > 0) {
          journalLines.push({
            accountId: "acc_4110",
            debit: totalDiscount,
            credit: 0,
            description: "Diskon penjualan",
          });
        }

        if (roundingDiff > 0) {
          journalLines.push({
            accountId: "acc_4200", // Pendapatan Pembulatan Kas
            debit: 0,
            credit: roundingDiff,
            description: "Pembulatan kas masuk",
          });
        } else if (roundingDiff < 0) {
          journalLines.push({
            accountId: "acc_6500", // Beban Pembulatan Kas
            debit: Math.abs(roundingDiff),
            credit: 0,
            description: "Pembulatan kas keluar (diskon pembulatan)",
          });
        }

        await AccountingService.postJournalEntry({
          refType: "pos_sale",
          refId: saleId,
          description: `Penjualan POS #${saleNumber}`,
          lines: journalLines,
          createdBy: params.createdBy,
          tx,
        });

        const saleData = {
          saleId,
          saleNumber,
          subtotal,
          totalDiscount,
          roundingDiff,
          finalPayable,
          paidAmount,
          changeAmount,
          paymentMethod: params.paymentMethod,
          items: preparedItems,
        };

        return {
          resourceId: saleId,
          data: saleData,
        };
      });
    });

    return result;
  }

  /**
   * Return & Refund Sale Items (physical condition routing & reversal accounting)
   */
  static async returnSale(params: {
    saleId: string;
    items: ReturnItemInput[];
    reason: string;
    refundMethod: "cash" | "bank_transfer" | "store_credit";
    createdBy: string;
  }) {
    return await withTransaction(async (tx) => {
      const [sale] = await tx.select().from(s.sales).where(eq(s.sales.id, params.saleId)).limit(1);
      if (!sale) throw new Error("Transaksi penjualan tidak ditemukan");

      const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      let totalRefund = 0;
      let totalCostReversed = 0;

      for (const item of params.items) {
        const [saleItem] = await tx.select().from(s.saleItems).where(eq(s.saleItems.id, item.saleItemId)).limit(1);
        if (!saleItem) throw new Error(`Item penjualan tidak ditemukan: ${item.saleItemId}`);

        const originalQty = parseFloat(saleItem.qty);
        const alreadyReturned = parseFloat(saleItem.qtyReturned);
        const maxReturnable = originalQty - alreadyReturned;

        if (item.qty > maxReturnable) {
          throw new Error(
            `Kuantitas retur (${item.qty}) melebihi sisa yang dapat diretur (${maxReturnable}) untuk ${saleItem.nameSnapshot}`
          );
        }

        const unitPrice = parseFloat(saleItem.unitPrice);
        const unitCost = parseFloat(saleItem.unitCost);
        const refundAmt = item.refundAmount !== undefined ? item.refundAmount : item.qty * unitPrice;

        totalRefund += refundAmt;
        totalCostReversed += item.qty * unitCost;

        // Update saleItem qtyReturned
        await tx
          .update(s.saleItems)
          .set({
            qtyReturned: (alreadyReturned + item.qty).toFixed(2),
          })
          .where(eq(s.saleItems.id, item.saleItemId));

        // Insert return item record
        await tx.insert(s.salesReturnItems).values({
          id: `ri_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          returnId,
          saleItemId: item.saleItemId,
          productId: saleItem.productId,
          qty: item.qty.toFixed(2),
          condition: item.condition,
          refundAmount: refundAmt.toFixed(2),
          unitCost: unitCost.toFixed(2),
        });

        // Physical routing based on condition:
        if (item.condition === "saleable") {
          // Restore to active store inventory
          await InventoryService.recordMovement({
            productId: saleItem.productId,
            locationId: sale.locationId,
            refType: "sale_return",
            refId: returnId,
            qtyChange: item.qty,
            costPerUnit: unitCost,
            notes: `Retur Penjualan Layak Jual (${returnNumber})`,
            createdBy: params.createdBy,
            tx,
          });
        } else {
          // Route to damaged goods location
          await InventoryService.recordMovement({
            productId: saleItem.productId,
            locationId: "loc_damaged",
            refType: "damage_write_off",
            refId: returnId,
            qtyChange: item.qty,
            costPerUnit: unitCost,
            notes: `Retur Penjualan Barang Rusak (${returnNumber})`,
            createdBy: params.createdBy,
            tx,
          });
        }
      }

      await tx.insert(s.salesReturns).values({
        id: returnId,
        returnNumber,
        saleId: params.saleId,
        returnDate: new Date(),
        status: "posted",
        totalRefundAmount: totalRefund.toFixed(2),
        refundMethod: params.refundMethod,
        reason: params.reason,
        createdBy: params.createdBy,
      });

      // Post Reversal Journal:
      // Dr. Retur Penjualan (acc_4120) -> totalRefund
      // Cr. Kas Toko (acc_1110) -> totalRefund
      // Dr. Persediaan (acc_1140) -> totalCostReversed
      // Cr. HPP (acc_5100) -> totalCostReversed
      await AccountingService.postJournalEntry({
        refType: "sales_return",
        refId: returnId,
        description: `Retur Penjualan ${returnNumber} (Ref: ${sale.saleNumber})`,
        lines: [
          { accountId: "acc_4120", debit: totalRefund, credit: 0 },
          { accountId: "acc_1110", debit: 0, credit: totalRefund },
          { accountId: "acc_1140", debit: totalCostReversed, credit: 0 },
          { accountId: "acc_5100", debit: 0, credit: totalCostReversed },
        ],
        createdBy: params.createdBy,
        tx,
      });

      return { returnId, returnNumber, totalRefund };
    });
  }

  /**
   * Hold Cart & Resume Cart
   */
  static async holdCart(params: {
    userId: string;
    customerId?: string;
    label: string;
    cartData: any;
  }) {
    const holdId = `hc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [created] = await db
      .insert(s.posHeldCarts)
      .values({
        id: holdId,
        userId: params.userId,
        customerId: params.customerId || null,
        label: params.label,
        cartData: params.cartData,
      })
      .returning();

    return created;
  }

  static async listHeldCarts(userId: string) {
    return await db.select().from(s.posHeldCarts).where(eq(s.posHeldCarts.userId, userId));
  }

  static async removeHeldCart(holdId: string) {
    await db.delete(s.posHeldCarts).where(eq(s.posHeldCarts.id, holdId));
  }
}
