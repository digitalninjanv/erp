import Dexie, { type Table } from "dexie";

export interface CachedProduct {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  sellingPrice: number;
  stockQty: number;
  updatedAt: number;
}

export interface OfflineSaleQueueItem {
  clientTxId: string;
  offlineIdempotencyKey: string;
  shiftId?: string;
  customerId?: string;
  locationId: string;
  items: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
  paymentMethod: "cash" | "qris_static" | "credit";
  cashTendered?: number;
  qrisReferenceNumber?: string;
  createdAt: number;
  status: "queued" | "syncing" | "synced" | "failed";
  retryCount: number;
  error?: string;
}

export class PosOfflineDatabase extends Dexie {
  cachedProducts!: Table<CachedProduct, string>;
  offlineQueue!: Table<OfflineSaleQueueItem, string>;

  constructor() {
    super("ErpPosOfflineDB");
    this.version(1).stores({
      cachedProducts: "id, sku, barcode",
      offlineQueue: "clientTxId, offlineIdempotencyKey, status, createdAt",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new PosOfflineDatabase() : null;

/**
 * Sync all pending transactions in IndexedDB to server
 */
export async function syncOfflineQueue(): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  if (!offlineDb) return { syncedCount: 0, failedCount: 0 };

  const queued = await offlineDb.offlineQueue.where("status").equals("queued").toArray();
  if (queued.length === 0) return { syncedCount: 0, failedCount: 0 };

  // Mark syncing
  await offlineDb.offlineQueue
    .where("clientTxId")
    .anyOf(queued.map((q) => q.clientTxId))
    .modify({ status: "syncing" });

  try {
    const res = await fetch("/api/pos/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: `batch_${Date.now()}`,
        transactions: queued,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Gagal melakukan batch sync");
    }

    let synced = 0;
    let failed = 0;

    for (const r of data.results) {
      if (r.status === "synced") {
        await offlineDb.offlineQueue.update(r.clientTxId, { status: "synced" });
        synced++;
      } else {
        await offlineDb.offlineQueue.update(r.clientTxId, {
          status: "failed",
          error: r.error,
        });
        failed++;
      }
    }

    return { syncedCount: synced, failedCount: failed };
  } catch (err: any) {
    // Revert status to queued on network error
    await offlineDb.offlineQueue
      .where("clientTxId")
      .anyOf(queued.map((q) => q.clientTxId))
      .modify((item) => {
        item.status = "queued";
        item.retryCount = (item.retryCount || 0) + 1;
      });
    throw err;
  }
}
