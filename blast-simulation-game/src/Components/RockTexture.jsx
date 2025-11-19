import React, { useRef, useEffect } from "react";

// Simple deterministic PRNG (mulberry32) for per-cell deterministic textures
const mulberry32 = (a) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== "string") return { r: 200, g: 200, b: 200 };
  const h = hex.replace("#", "").trim();
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
  const bigint = parseInt(h, 16);
  if (!Number.isNaN(bigint) && (h.length === 6 || h.length === 3)) {
    if (h.length === 6) {
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  return { r: 200, g: 200, b: 200 };
};

const rgbToHex = (r, g, b) => {
  const toHex = (v) => {
    const h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const adjustColor = (hex, factor) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 + factor), g * (1 + factor), b * (1 + factor));
};

const drawRockTexture = (ctx, size, baseColor, seedNumber, alpha = 1) => {
  const rand = mulberry32(seedNumber);
  const prevGlobalAlpha = ctx.globalAlpha ?? 1;

  const cx = size / 2;
  const cy = size / 2;
  const points = 8 + Math.floor(rand() * 6);
  const outerR = size * 0.48;
  const jagged = [];
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2;
    const r = outerR * (0.75 + rand() * 0.5);
    jagged.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
  }

  ctx.beginPath();
  jagged.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  );
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 1 * alpha;
  ctx.fill();

  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeStyle = adjustColor(baseColor, -0.35);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  jagged.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  );
  ctx.closePath();
  ctx.clip();

  const blotches = 6 + Math.floor(rand() * 6);
  for (let i = 0; i < blotches; i++) {
    const bx = cx + (rand() * 2 - 1) * outerR * 0.6;
    const by = cy + (rand() * 2 - 1) * outerR * 0.5;
    const br = (0.08 + rand() * 0.18) * size;
    const shade = (rand() - 0.4) * 0.4;
    ctx.beginPath();
    ctx.fillStyle = adjustColor(baseColor, shade);
    ctx.globalAlpha = (0.55 + rand() * 0.35) * alpha;
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  const speckles = 18 + Math.floor(rand() * 36);
  for (let i = 0; i < speckles; i++) {
    const sx = cx + (rand() * 2 - 1) * outerR * 0.85;
    const sy = cy + (rand() * 2 - 1) * outerR * 0.85;
    const sr = Math.max(0.4, rand() * 1.8);
    const shade = (rand() - 0.7) * 0.6;
    ctx.beginPath();
    ctx.fillStyle = adjustColor(baseColor, shade);
    ctx.globalAlpha = 0.6 * rand() * alpha;
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const veins = 1 + Math.floor(rand() * 3);
  ctx.lineWidth = Math.max(0.5, size * 0.01);
  for (let v = 0; v < veins; v++) {
    ctx.beginPath();
    const sx = cx + (rand() * 2 - 1) * outerR * 0.5;
    const sy = cy + (rand() * 2 - 1) * outerR * 0.5;
    const segs = 2 + Math.floor(rand() * 3);
    ctx.moveTo(sx, sy);
    for (let s = 0; s < segs; s++) {
      const nx = sx + (rand() - 0.5) * size * 0.25;
      const ny = sy + (rand() - 0.5) * size * 0.25;
      ctx.lineTo(nx, ny);
    }
    ctx.strokeStyle = adjustColor(baseColor, -0.28);
    ctx.globalAlpha = 0.45 * rand() * alpha;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx - size * 0.08, cy - size * 0.12, outerR * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = adjustColor(baseColor, 0.28);
  ctx.globalAlpha = 0.18 * alpha;
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = prevGlobalAlpha;
};

/**
 * RockTexture component - Renders a procedural rock texture on a canvas
 * @param {string} color - Hex color for the rock
 * @param {number} gridX - Grid X coordinate (for deterministic seed)
 * @param {number} gridY - Grid Y coordinate (for deterministic seed)
 * @param {number} size - Size of the canvas (width and height)
 * @param {string} className - Optional CSS classes
 */
const RockTexture = ({ color, gridX, gridY, size = 32, className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && color) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Generate deterministic seed based on grid position
      const seed = (gridX * 73856093) ^ (gridY * 19349663);
      const colorHash = color
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

      // Draw rock texture
      drawRockTexture(ctx, size, color, seed + colorHash);
    }
  }, [color, gridX, gridY, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

export default RockTexture;
