import { describe, it, expect } from "vitest";
import { InventoryService } from "../src/modules/inventory/inventory.service";

describe("Inventory & Moving Weighted Average (MWA) Unit Tests", () => {
  it("calculates moving weighted average accurately", () => {
    // Current: 100 pcs @ Rp2.000 = Rp200.000
    // Received: 50 pcs @ Rp2.600 = Rp130.000
    // Total Value = Rp330.000, Total Qty = 150 pcs
    // Expected New Cost = 330.000 / 150 = Rp2.200
    const newCost = InventoryService.calculateMovingAverage({
      currentQty: 100,
      currentCost: 2000,
      receivedQty: 50,
      receivedCost: 2600,
    });
    expect(newCost).toBe(2200);
  });

  it("handles initial stock when current qty is 0", () => {
    const newCost = InventoryService.calculateMovingAverage({
      currentQty: 0,
      currentCost: 0,
      receivedQty: 40,
      receivedCost: 3500,
    });
    expect(newCost).toBe(3500);
  });

  it("finds product by normalized barcode", async () => {
    const product = await InventoryService.getProductByBarcode("089686010118", "loc_store");
    expect(product).not.toBeNull();
    expect(product?.name).toContain("Indomie");
    expect(product?.stockQty).toBeGreaterThan(0);
  });

  it("prevents negative stock", async () => {
    await expect(
      InventoryService.recordMovement({
        productId: "prod_indomie_goreng",
        locationId: "loc_store",
        refType: "sale",
        refId: "TEST-OVERDRAW",
        qtyChange: -999999, // overdraw
        costPerUnit: 2800,
      })
    ).rejects.toThrow(/Stok tidak mencukupi/);
  });
});
