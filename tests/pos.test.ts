import { describe, it, expect } from "vitest";
import { PosService } from "../src/modules/pos/pos.service";
import { InventoryService } from "../src/modules/inventory/inventory.service";
import { AccountingService } from "../src/modules/accounting/accounting.service";
import { db } from "../src/shared/database";
import * as s from "../src/shared/database/schema";
import { eq, and } from "drizzle-orm";

describe("POS Engine & Checkout End-to-End Tests", () => {
  it("opens and closes cashier shift with cash variance tracking", async () => {
    // Close any previous open shift for usr_kasir1 to ensure pristine test state
    const openShifts = await db
      .select()
      .from(s.posShifts)
      .where(and(eq(s.posShifts.userId, "usr_kasir1"), eq(s.posShifts.status, "open")));

    for (const sh of openShifts) {
      await db.update(s.posShifts).set({ status: "closed" }).where(eq(s.posShifts.id, sh.id));
    }

    const shift = await PosService.openShift({
      userId: "usr_kasir1",
      locationId: "loc_store",
      openingCash: 200000,
    });
    expect(shift).toBeDefined();
    expect(shift.status).toBe("open");

    // Close shift with actual cash
    const closed = await PosService.closeShift({
      shiftId: shift.id,
      closingCashActual: 200000,
    });
    expect(closed.shift.status).toBe("closed");
    expect(closed.variance).toBe(0);
  });

  it("completes checkout with cash payment, stock deduction, and balanced journal", async () => {
    // 1. Check stock before sale
    const prodBefore = await InventoryService.getProductByBarcode("089686010118", "loc_store");
    const stockBefore = prodBefore?.stockQty || 0;

    // 2. Open shift for sale
    const shift = await PosService.openShift({
      userId: "usr_kasir1",
      locationId: "loc_store",
      openingCash: 100000,
    });

    // 3. Checkout 2 pcs Indomie Goreng (@ Rp3.500 = Rp7.000)
    const idempotencyKey = `test_pos_${Date.now()}`;
    const checkout = await PosService.checkoutSale({
      shiftId: shift.id,
      locationId: "loc_store",
      items: [
        {
          productId: "prod_indomie_goreng",
          qty: 2,
        },
      ],
      paymentMethod: "cash",
      cashTendered: 10000,
      idempotencyKey,
      createdBy: "usr_kasir1",
    });

    expect(checkout.isDuplicate).toBe(false);
    expect(checkout.data.finalPayable).toBe(7000);
    expect(checkout.data.changeAmount).toBe(3000);

    // 4. Stock must be decremented by 2
    const prodAfter = await InventoryService.getProductByBarcode("089686010118", "loc_store");
    expect(prodAfter?.stockQty).toBe(stockBefore - 2);

    // 5. Test idempotency: resending with same key returns duplicate
    const duplicateCheckout = await PosService.checkoutSale({
      shiftId: shift.id,
      locationId: "loc_store",
      items: [{ productId: "prod_indomie_goreng", qty: 2 }],
      paymentMethod: "cash",
      idempotencyKey,
      createdBy: "usr_kasir1",
    });
    expect(duplicateCheckout.isDuplicate).toBe(true);
    expect(duplicateCheckout.data.saleId).toBe(checkout.data.saleId);

    // 6. Trial Balance must remain balanced
    const tb = await AccountingService.getTrialBalance();
    expect(tb.isBalanced).toBe(true);
  });
});
