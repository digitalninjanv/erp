import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq, and, sql, or, ilike, desc } from "drizzle-orm";
import { normalizeBarcode } from "../../shared/kernel/formatting";

export interface StockMovementInput {
  productId: string;
  locationId: string;
  refType: string;
  refId: string;
  qtyChange: number;
  costPerUnit?: number;
  notes?: string;
  createdBy?: string;
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0];
}

export class InventoryService {
  /**
   * Calculates new Moving Weighted Average (MWA) cost
   */
  static calculateMovingAverage(params: {
    currentQty: number;
    currentCost: number;
    receivedQty: number;
    receivedCost: number;
  }): number {
    const existingVal = Math.max(0, params.currentQty) * params.currentCost;
    const receivedVal = params.receivedQty * params.receivedCost;
    const totalQty = Math.max(0, params.currentQty) + params.receivedQty;
    if (totalQty <= 0) return params.receivedCost;
    return Number(((existingVal + receivedVal) / totalQty).toFixed(2));
  }

  /**
   * Search and list products with pagination and barcode/sku/name query
   */
  static async searchProducts(params: {
    query?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.isActive !== undefined) {
      conditions.push(eq(s.products.isActive, params.isActive));
    }
    if (params.categoryId) {
      conditions.push(eq(s.products.categoryId, params.categoryId));
    }

    if (params.query) {
      const q = params.query.trim();
      const normBarcode = normalizeBarcode(q);

      // Find product IDs matching barcode
      const barcodeMatches = await db
        .select({ productId: s.productBarcodes.productId })
        .from(s.productBarcodes)
        .where(eq(s.productBarcodes.barcode, normBarcode));

      const matchedIds = barcodeMatches.map((b) => b.productId);

      if (matchedIds.length > 0) {
        conditions.push(
          or(
            ilike(s.products.sku, `%${q}%`),
            ilike(s.products.name, `%${q}%`),
            sql`${s.products.id} IN ${matchedIds}`
          )
        );
      } else {
        conditions.push(
          or(
            ilike(s.products.sku, `%${q}%`),
            ilike(s.products.name, `%${q}%`),
            ilike(s.products.brand, `%${q}%`)
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<string>`count(*)` })
      .from(s.products)
      .where(whereClause);

    const total = parseInt(countResult.count, 10);

    const products = await db
      .select({
        id: s.products.id,
        sku: s.products.sku,
        name: s.products.name,
        categoryId: s.products.categoryId,
        baseUnitId: s.products.baseUnitId,
        purchasePrice: s.products.purchasePrice,
        costPrice: s.products.costPrice,
        sellingPrice: s.products.sellingPrice,
        minStock: s.products.minStock,
        brand: s.products.brand,
        isActive: s.products.isActive,
      })
      .from(s.products)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(s.products.name);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Fast lookup product by Barcode (normalized, leading zeros preserved)
   */
  static async getProductByBarcode(rawBarcode: string, locationId?: string) {
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) return null;

    const [barcodeRow] = await db
      .select()
      .from(s.productBarcodes)
      .where(eq(s.productBarcodes.barcode, barcode))
      .limit(1);

    if (!barcodeRow) return null;

    const [product] = await db
      .select()
      .from(s.products)
      .where(eq(s.products.id, barcodeRow.productId))
      .limit(1);

    if (!product) return null;

    let stockQty = 0;
    if (locationId) {
      const [balance] = await db
        .select({ qty: s.stockBalances.qty })
        .from(s.stockBalances)
        .where(
          and(
            eq(s.stockBalances.productId, product.id),
            eq(s.stockBalances.locationId, locationId)
          )
        )
        .limit(1);
      stockQty = balance ? parseFloat(balance.qty) : 0;
    }

    return {
      ...product,
      scannedBarcode: barcode,
      stockQty,
    };
  }

  /**
   * Records a stock movement in the append-only ledger and updates stock_balances atomically.
   */
  static async recordMovement(params: StockMovementInput) {
    const runner = params.tx || db;

    // 1. Fetch product
    const [product] = await runner
      .select()
      .from(s.products)
      .where(eq(s.products.id, params.productId))
      .limit(1);

    if (!product) throw new Error("Produk tidak ditemukan");

    const costPerUnit = params.costPerUnit !== undefined ? params.costPerUnit : parseFloat(product.costPrice);

    // 2. Fetch or initialize stock balance for this location
    let [balance] = await runner
      .select()
      .from(s.stockBalances)
      .where(
        and(
          eq(s.stockBalances.productId, params.productId),
          eq(s.stockBalances.locationId, params.locationId)
        )
      )
      .limit(1);

    const currentQty = balance ? parseFloat(balance.qty) : 0;
    const newQty = currentQty + params.qtyChange;

    // Prevent negative stock unless configured otherwise
    if (newQty < 0) {
      throw new Error(
        `Stok tidak mencukupi untuk ${product.name}! Saldo saat ini: ${currentQty}, perubahan: ${params.qtyChange}`
      );
    }

    if (!balance) {
      const balanceId = `sb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await runner.insert(s.stockBalances).values({
        id: balanceId,
        productId: params.productId,
        locationId: params.locationId,
        qty: newQty.toFixed(2),
      });
    } else {
      await runner
        .update(s.stockBalances)
        .set({
          qty: newQty.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(s.stockBalances.id, balance.id));
    }

    // 3. Append to inventory ledger
    const totalCost = Math.abs(params.qtyChange * costPerUnit);
    const movementId = `im_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await runner.insert(s.inventoryMovements).values({
      id: movementId,
      productId: params.productId,
      locationId: params.locationId,
      refType: params.refType,
      refId: params.refId,
      qtyChange: params.qtyChange.toFixed(2),
      costPerUnit: costPerUnit.toFixed(2),
      totalCost: totalCost.toFixed(2),
      balanceAfter: newQty.toFixed(2),
      notes: params.notes || null,
      createdBy: params.createdBy || null,
    });

    return { movementId, newQty, costPerUnit };
  }

  /**
   * Internal Stock Transfer between locations (atomic, conserves mass, no fake P&L)
   */
  static async transferStock(params: {
    fromLocationId: string;
    toLocationId: string;
    items: Array<{ productId: string; qty: number }>;
    notes?: string;
    createdBy?: string;
  }) {
    if (params.fromLocationId === params.toLocationId) {
      throw new Error("Lokasi asal dan tujuan tidak boleh sama");
    }

    return await withTransaction(async (tx) => {
      const transferId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.stockTransfers).values({
        id: transferId,
        transferNumber,
        fromLocationId: params.fromLocationId,
        toLocationId: params.toLocationId,
        transferDate: new Date(),
        status: "received", // Direct transfer
        notes: params.notes || null,
        createdBy: params.createdBy || null,
      });

      for (const item of params.items) {
        const [prod] = await tx.select().from(s.products).where(eq(s.products.id, item.productId)).limit(1);
        const unitCost = parseFloat(prod?.costPrice || "0");

        await tx.insert(s.stockTransferItems).values({
          id: `trfi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          transferId,
          productId: item.productId,
          qty: item.qty.toFixed(2),
          unitCost: unitCost.toFixed(2),
        });

        // 1. Deduct from origin location
        await this.recordMovement({
          productId: item.productId,
          locationId: params.fromLocationId,
          refType: "transfer_out",
          refId: transferId,
          qtyChange: -Math.abs(item.qty),
          costPerUnit: unitCost,
          notes: `Transfer keluar ke lokasi tujuan (${transferNumber})`,
          createdBy: params.createdBy,
          tx,
        });

        // 2. Add to destination location
        await this.recordMovement({
          productId: item.productId,
          locationId: params.toLocationId,
          refType: "transfer_in",
          refId: transferId,
          qtyChange: Math.abs(item.qty),
          costPerUnit: unitCost,
          notes: `Transfer masuk dari lokasi asal (${transferNumber})`,
          createdBy: params.createdBy,
          tx,
        });
      }

      return { transferId, transferNumber };
    });
  }

  /**
   * Stocktake (Stok Opname) & variance adjustment
   */
  static async postStocktake(params: {
    locationId: string;
    items: Array<{ productId: string; physicalQty: number; notes?: string }>;
    notes?: string;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const stocktakeId = `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const stocktakeNumber = `SO-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.stocktakes).values({
        id: stocktakeId,
        stocktakeNumber,
        locationId: params.locationId,
        startDate: new Date(),
        status: "posted",
        notes: params.notes || null,
        createdBy: params.createdBy || null,
      });

      for (const item of params.items) {
        const [prod] = await tx.select().from(s.products).where(eq(s.products.id, item.productId)).limit(1);
        const [bal] = await tx
          .select()
          .from(s.stockBalances)
          .where(
            and(
              eq(s.stockBalances.productId, item.productId),
              eq(s.stockBalances.locationId, params.locationId)
            )
          )
          .limit(1);

        const systemQty = bal ? parseFloat(bal.qty) : 0;
        const physicalQty = item.physicalQty;
        const varianceQty = physicalQty - systemQty;
        const unitCost = parseFloat(prod?.costPrice || "0");
        const varianceAmount = varianceQty * unitCost;

        await tx.insert(s.stocktakeItems).values({
          id: `sti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          stocktakeId,
          productId: item.productId,
          systemQty: systemQty.toFixed(2),
          physicalQty: physicalQty.toFixed(2),
          varianceQty: varianceQty.toFixed(2),
          unitCost: unitCost.toFixed(2),
          varianceAmount: varianceAmount.toFixed(2),
          notes: item.notes || null,
        });

        // If variance != 0, record adjustment
        if (varianceQty !== 0) {
          await this.recordMovement({
            productId: item.productId,
            locationId: params.locationId,
            refType: "stocktake_adj",
            refId: stocktakeId,
            qtyChange: varianceQty,
            costPerUnit: unitCost,
            notes: `Penyesuaian stok opname (${stocktakeNumber})`,
            createdBy: params.createdBy,
            tx,
          });
        }
      }

      return { stocktakeId, stocktakeNumber };
    });
  }

  /**
   * Stock card (Kartu Stok) for audit trail
   */
  static async getStockCard(productId: string, locationId?: string) {
    const conditions = [eq(s.inventoryMovements.productId, productId)];
    if (locationId) {
      conditions.push(eq(s.inventoryMovements.locationId, locationId));
    }

    const rows = await db
      .select({
        id: s.inventoryMovements.id,
        locationId: s.inventoryMovements.locationId,
        refType: s.inventoryMovements.refType,
        refId: s.inventoryMovements.refId,
        qtyChange: s.inventoryMovements.qtyChange,
        costPerUnit: s.inventoryMovements.costPerUnit,
        totalCost: s.inventoryMovements.totalCost,
        balanceAfter: s.inventoryMovements.balanceAfter,
        notes: s.inventoryMovements.notes,
        createdAt: s.inventoryMovements.createdAt,
      })
      .from(s.inventoryMovements)
      .where(and(...conditions))
      .orderBy(desc(s.inventoryMovements.createdAt));

    return rows;
  }
}
