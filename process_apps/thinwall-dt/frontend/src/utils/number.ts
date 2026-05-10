export function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatNumber(value: number, digits = 3) {
  if (!Number.isFinite(value)) return "—";
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return normalized.toFixed(digits).replace(/\.?0+$/, "") || "0";
}
