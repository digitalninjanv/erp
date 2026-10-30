import { describe, it, expect } from "vitest";
import { AccurateMigrationService } from "../src/modules/migration/accurate-migration.service";

describe("Accurate.id Migration Wizard Unit & Integration Tests", () => {
  it("detects duplicates and valid rows accurately during dry run", async () => {
    const mockRows = [
      {
        "Kode Barang": "NEW-PROD-01",
        "Nama Barang": "Kopi Kapal Api Spesial 65g",
        "Barcode": "089912345678",
        "Harga Beli": 3000,
        "Harga Jual": 4000,
        "Stok": 50,
      },
      {
        // Duplicate SKU (already exists in seed database: IDM-GRG-85G)
        "Kode Barang": "IDM-GRG-85G",
        "Nama Barang": "Indomie Goreng Duplikat",
        "Barcode": "099999999999",
        "Harga Beli": 2800,
        "Harga Jual": 3500,
        "Stok": 10,
      },
      {
        // Invalid row (empty SKU)
        "Kode Barang": "",
        "Nama Barang": "Barang Tanpa Kode",
        "Barcode": "0123456789",
        "Harga Beli": 1000,
        "Harga Jual": 1500,
        "Stok": 5,
      },
    ];

    const dryRun = await AccurateMigrationService.runDryRun(mockRows, {
      skuColumn: "Kode Barang",
      nameColumn: "Nama Barang",
      barcodeColumn: "Barcode",
      costPriceColumn: "Harga Beli",
      sellingPriceColumn: "Harga Jual",
      stockQtyColumn: "Stok",
      conflictStrategy: "skip",
    });

    expect(dryRun.totalRows).toBe(3);
    expect(dryRun.validRows).toBe(1);
    expect(dryRun.duplicateRows).toBe(1);
    expect(dryRun.errorRows).toBe(1);
    expect(dryRun.duplicates[0].sku).toBe("IDM-GRG-85G");
    expect(dryRun.errors[0].reason).toContain("SKU atau Nama Barang wajib diisi");
  });

  it("executes batch import safely with stock balance and ledger creation", async () => {
    const uniqueSku = `SNACK-${Date.now()}`;
    const validRows = [
      {
        "Kode Barang": uniqueSku,
        "Nama Barang": "Chitato Sapi Panggang 68g",
        "Barcode": `0899${Date.now().toString().slice(-8)}`,
        "Harga Beli": 8000,
        "Harga Jual": 11000,
        "Stok": 30,
      },
    ];

    const result = await AccurateMigrationService.executeBatchImport({
      jobName: "Import Test Snack",
      fileName: "accurate_sample_produk.xlsx",
      rows: validRows,
      mapping: {
        skuColumn: "Kode Barang",
        nameColumn: "Nama Barang",
        barcodeColumn: "Barcode",
        costPriceColumn: "Harga Beli",
        sellingPriceColumn: "Harga Jual",
        stockQtyColumn: "Stok",
        locationId: "loc_store",
        conflictStrategy: "skip",
      },
      createdBy: "usr_admin",
    });

    expect(result.status).toBe("completed");
    expect(result.importedCount).toBe(1);
    expect(result.totalStockImported).toBe(30);
    expect(result.totalValuationImported).toBe(240000); // 30 * 8000
  });
});
