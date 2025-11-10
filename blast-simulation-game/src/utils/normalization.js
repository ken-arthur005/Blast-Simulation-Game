// Min-max normalization helpers with safe handling of constant ranges
export function minMaxStats(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max };
}

export function safeMinMaxNormalize(value, min, max) {
  const v = Number.isFinite(value) ? value : NaN;
  if (!Number.isFinite(v)) return 0.5; // neutral when value is missing
  if (min === max) return 0.5; // prevent division by zero; neutral value
  return (v - min) / (max - min);
}

// Optional: log transform to reduce skew before normalization (e.g. density)
export function logTransform(value, eps = 1e-6) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return Math.log(eps);
  return Math.log(v);
}
