import { describe, it, expect } from "vitest";
import { PurchasingService } from "../src/modules/purchasing/purchasing.service";
import { InventoryService } from "../src/modules/inventory/inventory.service";
import { AccountingService } from "../src/modules/accounting/accounting.service";

describe("Purchasing & GRNI Accrual Flow Tests", () => {
  it("processes PO -> Goods Receipt (stock increase + GRNI accrual) -> Supplier Invoice -> Payment", async () => {
    // 1. Create PO
    const po = await PurchasingService.createPurchaseOrder({
      supplierId: "sup_indofood",
      items: [
        {
          productId: "prod_indomie_goreng",
          qtyOrdered: 40,
          unitPrice: 2800,
        },
      ],
      notes: "Pesanan mingguan",
      createdBy: "usr_admin",
    });
    expect(po.poNumber).toContain("PO-");

    // 2. Receive Goods (GR) into WH-MAIN
    const whStockBefore = (await InventoryService.getProductByBarcode("089686010118", "loc_wh"))?.stockQty || 0;

    const gr = await PurchasingService.receiveGoods({
      poId: po.poId,
      supplierId: "sup_indofood",
      locationId: "loc_wh",
      items: [
        {
          productId: "prod_indomie_goreng",
          qtyReceived: 40,
          unitCost: 2800,
        },
      ],
      receivedBy: "usr_gudang1",
    });

    expect(gr.grNumber).toContain("GR-");
    expect(gr.totalReceivedCost).toBe(112000);

    // Stock must have increased
    const whStockAfter = (await InventoryService.getProductByBarcode("089686010118", "loc_wh"))?.stockQty || 0;
    expect(whStockAfter).toBe(whStockBefore + 40);

    // Check GRNI General Ledger has been credited
    const grniLedger = await AccountingService.getGeneralLedger("acc_2120");
    expect(grniLedger.endingBalance).toBeGreaterThan(0);

    // 3. Post Supplier Invoice (Closes GRNI, recognizes Accounts Payable)
    const inv = await PurchasingService.postSupplierInvoice({
      supplierId: "sup_indofood",
      goodsReceiptId: gr.grId,
      poId: po.poId,
      totalAmount: 112000,
      createdBy: "usr_akuntan1",
    });
    expect(inv.invoiceNumber).toContain("INV-SUP-");

    // 4. Pay Supplier Invoice from BCA
    const pay = await PurchasingService.paySupplierInvoice({
      invoiceId: inv.invoiceId,
      amount: 112000,
      paymentMethod: "bank_transfer",
      bankAccountId: "bank_bca",
      createdBy: "usr_akuntan1",
    });
    expect(pay.updatedStatus).toBe("paid");

    // Accounting check: Trial balance must be 100% balanced
    const tb = await AccountingService.getTrialBalance();
    expect(tb.isBalanced).toBe(true);
  });
});
