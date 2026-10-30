/**
 * Indonesian Currency & Number Formatting Helpers
 */

export function formatIDR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(amount: number | string, decimals = 0): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDateID(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/**
 * Normalizes barcode strings to preserve leading zeros and strip whitespace.
 */
export function normalizeBarcode(barcode: string): string {
  if (!barcode) return "";
  return barcode.trim().replace(/[\s\r\n\t]/g, "");
}

/**
 * Cash rounding rules (e.g. Rp500 or Rp1000)
 */
export function calculateCashRounding(amount: number, roundTo = 500): { roundedTotal: number; roundingDifference: number } {
  if (roundTo <= 0) return { roundedTotal: amount, roundingDifference: 0 };
  const remainder = amount % roundTo;
  if (remainder === 0) return { roundedTotal: amount, roundingDifference: 0 };

  // Indonesian retail convention: round to nearest multiple
  // If remainder < half of roundTo, round down; otherwise round up.
  let rounded: number;
  if (remainder < roundTo / 2) {
    rounded = amount - remainder;
  } else {
    rounded = amount + (roundTo - remainder);
  }
  return {
    roundedTotal: rounded,
    roundingDifference: rounded - amount, // positive means rounding surcharge, negative means rounding discount
  };
}
