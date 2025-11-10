// Min-max normalization helpers with safe handling of constant ranges
export function minMaxStats(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max };
}
