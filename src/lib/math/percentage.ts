export function percentOf(percent: number, value: number): number {
  return (percent / 100) * value;
}

export function whatPercent(part: number, whole: number): number {
  if (whole === 0) throw new Error("Whole cannot be zero");
  return (part / whole) * 100;
}

export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) throw new Error("Original value cannot be zero");
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}
