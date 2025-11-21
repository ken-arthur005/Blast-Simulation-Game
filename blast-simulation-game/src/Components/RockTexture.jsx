import React, { useRef, useEffect } from "react";
import { drawRockTexture } from "../utils/rockTextureUtils";

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
