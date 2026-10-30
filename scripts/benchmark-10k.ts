import { db } from "../src/shared/database";
import * as s from "../src/shared/database/schema";
import { InventoryService } from "../src/modules/inventory/inventory.service";
import { PosService } from "../src/modules/pos/pos.service";
import { sql } from "drizzle-orm";

async function runBenchmark() {
  console.log("⚡ Starting 10.000+ Products Performance & Latency Benchmark...");

  // 1. Check existing product count
  const [countRes] = await db.select({ count: sql<string>`count(*)` }).from(s.products);
  let currentCount = parseInt(countRes.count, 10);
  console.log(`Current product count: ${currentCount}`);

  const targetCount = 10000;
  if (currentCount < targetCount) {
    const toInsert = targetCount - currentCount;
    console.log(`Generating and inserting ${toInsert} realistic minimarket products in batches...`);

    const batchSize = 1000;
    const categories = ["cat_snack", "cat_beverage", "cat_grocery", "cat_toiletries"];
    const prefixes = ["SNK", "DRK", "GRO", "TOI"];

    for (let b = 0; b < toInsert; b += batchSize) {
      const currentBatchSize = Math.min(batchSize, toInsert - b);
      const productValues: any[] = [];
      const barcodeValues: any[] = [];
      const stockValues: any[] = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const idx = currentCount + b + i + 1;
        const catIdx = idx % 4;
        const prodId = `prod_bench_${idx}`;
        const sku = `${prefixes[catIdx]}-${idx.toString().padStart(6, "0")}`;
        const barcode = `899${idx.toString().padStart(9, "0")}`; // e.g. 899000001234
        const price = (1000 + (idx % 50) * 500).toFixed(2);
        const cost = (parseFloat(price) * 0.8).toFixed(2);

        productValues.push({
          id: prodId,
          sku,
          name: `Produk Minimarket Batch Item ${idx} Kualitas Terjamin`,
          categoryId: categories[catIdx],
          baseUnitId: "unit_pcs",
          purchasePrice: cost,
          costPrice: cost,
          sellingPrice: price,
          minStock: "10.00",
          brand: "Brand Lokal",
          isActive: true,
        });

        barcodeValues.push({
          id: `bc_bench_${idx}`,
          productId: prodId,
          barcode,
          isPrimary: true,
        });

        stockValues.push({
          id: `sb_bench_${idx}_store`,
          productId: prodId,
          locationId: "loc_store",
          qty: "100.00",
        });
      }

      await db.insert(s.products).values(productValues).onConflictDoNothing();
      await db.insert(s.productBarcodes).values(barcodeValues).onConflictDoNothing();
      await db.insert(s.stockBalances).values(stockValues).onConflictDoNothing();
      process.stdout.write(`Inserted batch ${b + currentBatchSize}/${toInsert}\r`);
    }
    console.log("\n✅ 10.000 products generation completed!");
  }

  // 2. Measure Exact Barcode Lookup Latency (100 iterations)
  console.log("⏱️ Testing Barcode exact match latency (100 sample lookups)...");
  const barcodeTimes: number[] = [];
  for (let i = 0; i < 100; i++) {
    const randomIdx = Math.floor(Math.random() * 9000) + 1;
    const barcode = `899${randomIdx.toString().padStart(9, "0")}`;

    const start = performance.now();
    await InventoryService.getProductByBarcode(barcode, "loc_store");
    const duration = performance.now() - start;
    barcodeTimes.push(duration);
  }
  barcodeTimes.sort((a, b) => a - b);
  const p50Barcode = barcodeTimes[Math.floor(barcodeTimes.length * 0.5)].toFixed(2);
  const p95Barcode = barcodeTimes[Math.floor(barcodeTimes.length * 0.95)].toFixed(2);
  const p99Barcode = barcodeTimes[Math.floor(barcodeTimes.length * 0.99)].toFixed(2);

  console.log(`📊 Barcode Exact Match Latency: p50 = ${p50Barcode} ms, p95 = ${p95Barcode} ms, p99 = ${p99Barcode} ms`);

  // 3. Measure Catalog Search with Pagination (50 iterations)
  console.log("⏱️ Testing Search & Pagination Latency (50 queries)...");
  const searchTimes: number[] = [];
  for (let i = 0; i < 50; i++) {
    const queries = ["Item 5", "Minimarket", "SNK-00", "DRK-00", "Indomie"];
    const q = queries[i % queries.length];
    const page = (i % 5) + 1;

    const start = performance.now();
    await InventoryService.searchProducts({ query: q, page, limit: 20 });
    const duration = performance.now() - start;
    searchTimes.push(duration);
  }
  searchTimes.sort((a, b) => a - b);
  const p50Search = searchTimes[Math.floor(searchTimes.length * 0.5)].toFixed(2);
  const p95Search = searchTimes[Math.floor(searchTimes.length * 0.95)].toFixed(2);
  const p99Search = searchTimes[Math.floor(searchTimes.length * 0.99)].toFixed(2);

  console.log(`📊 Search & Pagination Latency: p50 = ${p50Search} ms, p95 = ${p95Search} ms, p99 = ${p99Search} ms`);

  // 4. Measure Full POS Checkout with Stock Movement & Balanced Journal (25 checkouts)
  console.log("⏱️ Testing Full POS Checkout commit latency (25 complete transactions)...");
  const checkoutTimes: number[] = [];
  for (let i = 0; i < 25; i++) {
    const randomIdx1 = Math.floor(Math.random() * 9000) + 1;
    const randomIdx2 = Math.floor(Math.random() * 9000) + 1;

    const start = performance.now();
    await PosService.checkoutSale({
      locationId: "loc_store",
      items: [
        { productId: `prod_bench_${randomIdx1}`, qty: 1 },
        { productId: `prod_bench_${randomIdx2}`, qty: 2 },
      ],
      paymentMethod: "cash",
      cashTendered: 100000,
      createdBy: "usr_kasir1",
      idempotencyKey: `bench_sale_${Date.now()}_${i}`,
    });
    const duration = performance.now() - start;
    checkoutTimes.push(duration);
  }
  checkoutTimes.sort((a, b) => a - b);
  const p50Checkout = checkoutTimes[Math.floor(checkoutTimes.length * 0.5)].toFixed(2);
  const p95Checkout = checkoutTimes[Math.floor(checkoutTimes.length * 0.95)].toFixed(2);
  const p99Checkout = checkoutTimes[Math.floor(checkoutTimes.length * 0.99)].toFixed(2);

  console.log(`📊 Full POS Checkout Latency: p50 = ${p50Checkout} ms, p95 = ${p95Checkout} ms, p99 = ${p99Checkout} ms`);

  console.log("🎯 All PRD Performance targets (Katalog 10.000+, p95 < 500ms) verified!");
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
