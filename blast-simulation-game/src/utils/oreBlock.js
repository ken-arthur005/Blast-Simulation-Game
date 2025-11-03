import OreColorMapper from "./oreColorMapper";

// Minimal OreBlock class used by the canvas renderer.
// The original implementation was removed during a merge — provide a small
// compatible replacement that exposes the properties/methods used by
// GridCanvas.jsx (gridX, gridY, cachedCanvas, getBlockColor).
export default class OreBlock {
  constructor(cell = {}, gridX = 0, gridY = 0, size = 8) {
    this.cell = cell || {};
    this.gridX = gridX;
    this.gridY = gridY;
    this.size = size;
    // cachedCanvas is optionally set by callers when pre-rendering
    this.cachedCanvas = null;
  }

  // Return a hex color string for this block's ore type
  getBlockColor() {
    const oreType = (this.cell?.oreType || this.cell?.type || "ore").toString();
    const color = OreColorMapper.getColor(oreType);
    return color || "#9ca3af"; // fallback gray
  }

  // Return underlying cell data
  getCellData() {
    return this.cell;
  }
}
