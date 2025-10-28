import OreColorMapper from "./oreColorMapper";

class OreBlock {
  constructor(cell, x, y, blockSize) {
    this.cell = cell;
    this.x = x;
    this.y = y;
    this.gridX = x;
    this.gridY = y;
    this.blockSize = blockSize;

    this.scale = 1;
    this.opacity = 1;
    this.rotation = 0;
  }

  getPixelPosition() {
    return {
      pixelX: this.x * this.blockSize,
      pixelY: this.y * this.blockSize,
    };
  }

  getBlockColor() {
    // Check if block is destroyed
    if (this.cell && this.cell.oreType === "destroyed") {
      return "#9ca3af"; // Gray color for destroyed blocks
    }

    return this.cell && this.cell.oreType
      ? OreColorMapper.getColor(this.cell.oreType)
      : "#ffffff";
      // your other ore color mappings
  // return this.cell?.color || "#cccccc";
  }

  render(ctx) {
    const { pixelX, pixelY } = this.getPixelPosition();

    //transformations for animation
    ctx.save();

    // Set opacity
    ctx.globalAlpha = this.opacity;

    //center point for transformations
    const centerX = pixelX + this.blockSize / 2;
    const centerY = pixelY + this.blockSize / 2;

    //transformations from center
    ctx.translate(centerX, centerY);
    ctx.rotate((this.rotation * Math.PI) / 180); // Convert degrees to radians
    ctx.scale(this.scale, this.scale);
    ctx.translate(-centerX, -centerY);
     const color = this.cell.oreType === "destroyed" ? "#9ca3af" : this.getBlockColor();

    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, this.blockSize, this.blockSize);

    //border (helps see the blocks better)
    ctx.strokeStyle = "#00000022"; 
    ctx.lineWidth = 1;
    ctx.strokeRect(pixelX, pixelY, this.blockSize, this.blockSize);

    ctx.restore();
  }

  containsPoint(pixelX, pixelY) {
    const { pixelX: blockX, pixelY: blockY } = this.getPixelPosition();
    return (
      pixelX >= blockX &&
      pixelX < blockX + this.blockSize &&
      pixelY >= blockY &&
      pixelY < blockY + this.blockSize
    );
  }

  getBlockInfo() {
    return {
      gridPosition: { x: this.x, y: this.y },
      oreType: this.cell ? this.cell.oreType : "empty",
      color: this.getBlockColor(),
    };
  }
}

export default OreBlock;
