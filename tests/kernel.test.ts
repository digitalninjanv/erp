import { describe, it, expect } from "vitest";
import { normalizeBarcode, calculateCashRounding, formatIDR } from "../src/shared/kernel/formatting";
import { hashPassword, verifyPassword } from "../src/shared/kernel/security";

describe("Shared Kernel & Formatting Unit Tests", () => {
  it("preserves leading zeros and cleans barcode", () => {
    expect(normalizeBarcode("  089927532101 \n")).toBe("089927532101");
    expect(normalizeBarcode("00012345")).toBe("00012345");
    expect(normalizeBarcode("")).toBe("");
  });

  it("calculates cash rounding correctly to nearest Rp500", () => {
    // Exact multiple
    const r1 = calculateCashRounding(15000, 500);
    expect(r1.roundedTotal).toBe(15000);
    expect(r1.roundingDifference).toBe(0);

    // Below midpoint (15100 -> rounds down to 15000)
    const r2 = calculateCashRounding(15100, 500);
    expect(r2.roundedTotal).toBe(15000);
    expect(r2.roundingDifference).toBe(-100);

    // Above midpoint (15350 -> rounds up to 15500)
    const r3 = calculateCashRounding(15350, 500);
    expect(r3.roundedTotal).toBe(15500);
    expect(r3.roundingDifference).toBe(150);

    // 15250 (at midpoint) -> rounds up to 15500
    const r4 = calculateCashRounding(15250, 500);
    expect(r4.roundedTotal).toBe(15500);
    expect(r4.roundingDifference).toBe(250);
  });

  it("formats IDR properly", () => {
    expect(formatIDR(15000)).toMatch(/15\.000/);
    expect(formatIDR(0)).toMatch(/0/);
  });

  it("hashes and verifies password securely", () => {
    const plain = "SecretPassword123!";
    const hashed = hashPassword(plain);
    expect(hashed).toContain(":");
    expect(verifyPassword(plain, hashed)).toBe(true);
    expect(verifyPassword("WrongPassword", hashed)).toBe(false);
  });
});
