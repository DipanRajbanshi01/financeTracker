// Money helpers. All amounts are stored as integer minor units (paisa for NPR).
// NEVER do floating-point math on money.

const MINOR_PER_MAJOR = 100;

export function toMinor(input: string | number): number {
  const s = typeof input === "number" ? input.toString() : input.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error(`Invalid money input: ${input}`);
  }
  const [whole, frac = ""] = s.split(".");
  const paddedFrac = (frac + "00").slice(0, 2);
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeAbs = whole.replace("-", "");
  return sign * (parseInt(wholeAbs, 10) * MINOR_PER_MAJOR + parseInt(paddedFrac, 10));
}

export function fromMinor(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / MINOR_PER_MAJOR);
  const frac = (abs % MINOR_PER_MAJOR).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

export function formatMoney(minor: number, currency = "NPR"): string {
  return `${currency} ${fromMinor(minor)}`;
}

// Split an integer total across n shares as evenly as possible.
// The remainder (always < n) is distributed one paisa at a time to the first
// `remainder` shares, so the sum is exact.
export function splitEqually(totalMinor: number, n: number): number[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new Error(`splitEqually: totalMinor must be a non-negative integer, got ${totalMinor}`);
  }
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`splitEqually: n must be a positive integer, got ${n}`);
  }
  const base = Math.floor(totalMinor / n);
  const remainder = totalMinor - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}
