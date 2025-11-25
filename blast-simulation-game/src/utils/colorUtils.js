const hexToRgb = (hex) => {
  // Defensive: if not provided or not a string, return a neutral gray
  if (!hex || typeof hex !== "string") return { r: 200, g: 200, b: 200 };
  const h = hex.replace("#", "").trim();
  // If it's already an rgb(...) string, try to parse numbers
  if (h.startsWith("rgb")) {
    const nums = h
      .replace(/[^0-9,.-]/g, "")
      .split(",")
      .map(Number);
    if (nums.length >= 3 && nums.every((n) => !Number.isNaN(n))) {
      return { r: nums[0], g: nums[1], b: nums[2] };
    }
    return { r: 200, g: 200, b: 200 };
  }

  // Fallback for hex parsing
  const bigint = parseInt(h, 16);
  if (!Number.isNaN(bigint) && (h.length === 6 || h.length === 3)) {
    if (h.length === 6) {
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }
    // short hex like 'abc' -> 'aabbcc'
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }

  // fallback
  return { r: 200, g: 200, b: 200 };
};

const rgbToHex = (r, g, b) => {
  const toHex = (v) => {
    const h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const adjustColor = (hex, factor) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 + factor), g * (1 + factor), b * (1 + factor));
};
