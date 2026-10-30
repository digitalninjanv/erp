import * as xlsx from "xlsx";
import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq, inArray } from "drizzle-orm";
import { normalizeBarcode } from "../../shared/kernel/formatting";
import { InventoryService } from "../inventory/inventory.service";

export interface MigrationMappingConfig {
  skuColumn: string;
  nameColumn: string;
  barcodeColumn?: string;
  costPriceColumn?: string;
  sellingPriceColumn?: string;
  unitColumn?: string;
  categoryColumn?: string;
  stockQtyColumn?: string;
  locationId?: string;
  conflictStrategy?: "skip" | "update" | "review";
}

export interface DryRunResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  duplicates: Array<{ row: number; sku: string; barcode?: string; reason: string }>;
  errors: Array<{ row: number; reason: string; sampleData: any }>;
  sampleValid: any[];
}

export class AccurateMigrationService {
  /**
   * Parse uploaded Excel or CSV buffer
   */
  static parseFileBuffer(buffer: Buffer, fileName: string) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    if (rawRows.length === 0) {
      throw new Error("File kosong atau tidak memiliki data yang dapat dibaca.");
    }

    const headers = Object.keys(rawRows[0]);
    const sampleRows = rawRows.slice(0, 10);

    return {
      fileName,
      totalRows: rawRows.length,
      headers,
      sampleRows,
      allRows: rawRows,
    };
  }

  /**
   * Dry-Run simulation: Validates rows and detects duplicates without touching production tables
   */
  static async runDryRun(
    rows: Array<Record<string, any>>,
    mapping: MigrationMappingConfig
  ): Promise<DryRunResult> {
    const existingProducts = await db
      .select({ id: s.products.id, sku: s.products.sku })
      .from(s.products);

    const existingBarcodes = await db
      .select({ barcode: s.productBarcodes.barcode })
      .from(s.productBarcodes);

    const existingSkuSet = new Set(existingProducts.map((p) => p.sku.toLowerCase()));
    const existingBarcodeSet = new Set(existingBarcodes.map((b) => b.barcode));

    const duplicates: DryRunResult["duplicates"] = [];
    const errors: DryRunResult["errors"] = [];
    const sampleValid: any[] = [];
    let validCount = 0;

    const seenInBatchSku = new Set<string>();
    const seenInBatchBarcode = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const sku = String(row[mapping.skuColumn] || "").trim();
      const name = String(row[mapping.nameColumn] || "").trim();
      const rawBarcode = mapping.barcodeColumn ? String(row[mapping.barcodeColumn] || "") : "";
      const barcode = normalizeBarcode(rawBarcode);

      if (!sku || !name) {
        errors.push({
          row: rowNum,
          reason: `SKU atau Nama Barang wajib diisi (SKU: '${sku}', Nama: '${name}')`,
          sampleData: row,
        });
        return;
      }

      // Check duplicate in DB or within current batch
      let isDuplicate = false;
      if (existingSkuSet.has(sku.toLowerCase()) || seenInBatchSku.has(sku.toLowerCase())) {
        duplicates.push({
          row: rowNum,
          sku,
          barcode,
          reason: `SKU '${sku}' sudah ada di database atau duplikat dalam file.`,
        });
        isDuplicate = true;
      }

      if (barcode) {
        if (existingBarcodeSet.has(barcode) || seenInBatchBarcode.has(barcode)) {
          duplicates.push({
            row: rowNum,
            sku,
            barcode,
            reason: `Barcode '${barcode}' sudah terdaftar pada sistem atau duplikat dalam file.`,
          });
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        return;
      }

      seenInBatchSku.add(sku.toLowerCase());
      if (barcode) seenInBatchBarcode.add(barcode);

      validCount++;
      if (sampleValid.length < 5) {
        sampleValid.push({
          row: rowNum,
          sku,
          name,
          barcode,
          costPrice: mapping.costPriceColumn ? row[mapping.costPriceColumn] : 0,
          sellingPrice: mapping.sellingPriceColumn ? row[mapping.sellingPriceColumn] : 0,
          stockQty: mapping.stockQtyColumn ? row[mapping.stockQtyColumn] : 0,
        });
      }
    });

    return {
      totalRows: rows.length,
      validRows: validCount,
      duplicateRows: duplicates.length,
      errorRows: errors.length,
      duplicates,
      errors,
      sampleValid,
    };
  }

  /**
   * Execute Batch Import:
   * Inserts valid products, barcodes, stock balances, and ledger entries with full reconciliation summary
   */
  static async executeBatchImport(params: {
    jobName: string;
    fileName: string;
    rows: Array<Record<string, any>>;
    mapping: MigrationMappingConfig;
    createdBy?: string;
  }) {
    const targetLocationId = params.mapping.locationId || "loc_store";
    const conflictStrategy = params.mapping.conflictStrategy || "skip";

    return await withTransaction(async (tx) => {
      const jobId = `mig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let importedCount = 0;
      let skippedCount = 0;
      let totalStockImported = 0;
      let totalValuationImported = 0;
      const logs: Array<{ row: number; sku: string; status: string; message: string }> = [];

      for (let i = 0; i < params.rows.length; i++) {
        const row = params.rows[i];
        const rowNum = i + 1;
        const sku = String(row[params.mapping.skuColumn] || "").trim();
        const name = String(row[params.mapping.nameColumn] || "").trim();
        const rawBarcode = params.mapping.barcodeColumn ? String(row[params.mapping.barcodeColumn] || "") : "";
        const barcode = normalizeBarcode(rawBarcode);

        const costPrice = params.mapping.costPriceColumn ? parseFloat(row[params.mapping.costPriceColumn]) || 0 : 0;
        const sellingPrice = params.mapping.sellingPriceColumn ? parseFloat(row[params.mapping.sellingPriceColumn]) || 0 : 0;
        const stockQty = params.mapping.stockQtyColumn ? parseFloat(row[params.mapping.stockQtyColumn]) || 0 : 0;

        if (!sku || !name) {
          logs.push({ row: rowNum, sku: sku || "-", status: "error", message: "SKU atau Nama kosong" });
          skippedCount++;
          continue;
        }

        // Check if SKU exists
        const [existing] = await tx.select().from(s.products).where(eq(s.products.sku, sku)).limit(1);

        if (existing) {
          if (conflictStrategy === "skip") {
            logs.push({ row: rowNum, sku, status: "skipped", message: "SKU sudah ada, dilewati (skip)" });
            skippedCount++;
            continue;
          } else if (conflictStrategy === "update") {
            await tx
              .update(s.products)
              .set({
                name,
                costPrice: costPrice.toFixed(2),
                sellingPrice: sellingPrice.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(s.products.id, existing.id));

            logs.push({ row: rowNum, sku, status: "updated", message: "Data produk diperbarui" });
            importedCount++;
            continue;
          }
        }

        // Insert new product
        const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await tx.insert(s.products).values({
          id: productId,
          sku,
          name,
          categoryId: "cat_grocery", // default category
          baseUnitId: "unit_pcs",
          purchasePrice: costPrice.toFixed(2),
          costPrice: costPrice.toFixed(2),
          sellingPrice: sellingPrice.toFixed(2),
          minStock: "10.00",
          isActive: true,
        });

        // Insert barcode if provided
        if (barcode) {
          await tx.insert(s.productBarcodes).values({
            id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            productId,
            barcode,
            isPrimary: true,
          }).onConflictDoNothing();
        }

        // Insert stock balance and ledger movement if stockQty > 0
        if (stockQty > 0) {
          await InventoryService.recordMovement({
            productId,
            locationId: targetLocationId,
            refType: "goods_receipt",
            refId: jobId,
            qtyChange: stockQty,
            costPerUnit: costPrice,
            notes: `Saldo awal migrasi Accurate (${params.fileName})`,
            createdBy: params.createdBy,
            tx,
          });

          totalStockImported += stockQty;
          totalValuationImported += stockQty * costPrice;
        }

        importedCount++;
        logs.push({ row: rowNum, sku, status: "success", message: "Berhasil diimpor" });
      }

      await tx.insert(s.migrationJobs).values({
        id: jobId,
        jobName: params.jobName,
        entityType: "products",
        fileName: params.fileName,
        totalRows: params.rows.length.toString(),
        validRows: importedCount.toString(),
        errorRows: skippedCount.toString(),
        duplicateRows: "0",
        importedRows: importedCount.toString(),
        status: "completed",
        mappingConfig: params.mapping as any,
        logDetails: logs as any,
        createdBy: params.createdBy || null,
      });

      return {
        jobId,
        status: "completed",
        totalRows: params.rows.length,
        importedCount,
        skippedCount,
        totalStockImported,
        totalValuationImported,
        logs: logs.slice(0, 50),
      };
    });
  }
}
