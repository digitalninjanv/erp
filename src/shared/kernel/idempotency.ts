import { db } from "../database";
import { idempotencyRecords } from "../database/schema";
import { eq } from "drizzle-orm";

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  data: T;
}

export async function processWithIdempotency<T>(
  key: string,
  scope: string,
  executor: () => Promise<{ resourceId?: string; data: T }>
): Promise<IdempotencyResult<T>> {
  if (!key) {
    // If no key is provided, execute directly
    const res = await executor();
    return { isDuplicate: false, data: res.data };
  }

  // Check if key already exists
  const [existing] = await db
    .select()
    .from(idempotencyRecords)
    .where(eq(idempotencyRecords.key, key))
    .limit(1);

  if (existing) {
    if (existing.status === "completed" && existing.responsePayload) {
      return {
        isDuplicate: true,
        data: existing.responsePayload as T,
      };
    }
    if (existing.status === "failed") {
      throw new Error(`Transaksi sebelumnya dengan kunci idempotency '${key}' gagal. Silakan gunakan kunci baru.`);
    }
  }

  try {
    const result = await executor();
    await db
      .insert(idempotencyRecords)
      .values({
        id: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        key,
        scope,
        resourceId: result.resourceId || null,
        responsePayload: result.data as any,
        status: "completed",
      })
      .onConflictDoUpdate({
        target: idempotencyRecords.key,
        set: {
          status: "completed",
          responsePayload: result.data as any,
          resourceId: result.resourceId || null,
        },
      });

    return { isDuplicate: false, data: result.data };
  } catch (err: any) {
    await db
      .insert(idempotencyRecords)
      .values({
        id: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        key,
        scope,
        status: "failed",
        responsePayload: { error: err.message },
      })
      .onConflictDoUpdate({
        target: idempotencyRecords.key,
        set: {
          status: "failed",
          responsePayload: { error: err.message },
        },
      });
    throw err;
  }
}
