import OreColorMapper from '../utils/oreColorMapper';

class OreBlock {
  constructor(cell, x, y, blockSize) {
    this.cell = cell;
    this.x = x;
    this.y = y;
    this.blockSize = blockSize;
  }

  getPixelPosition() {
    return {
      pixelX: this.x * this.blockSize,
      pixelY: this.y * this.blockSize
    };
  }

  getBlockColor() {
    return this.cell && this.cell.oreType 
      ? OreColorMapper.getColor(this.cell.oreType)
      : '#ffffff';
  }

  render(ctx) {
    const { pixelX, pixelY } = this.getPixelPosition();
    ctx.fillStyle = this.getBlockColor();
    ctx.fillRect(pixelX, pixelY, this.blockSize, this.blockSize);
  }

  containsPoint(pixelX, pixelY) {
    const { pixelX: blockX, pixelY: blockY } = this.getPixelPosition();
    return pixelX >= blockX && pixelX < blockX + this.blockSize && 
           pixelY >= blockY && pixelY < blockY + this.blockSize;
  }

  getBlockInfo() {
    return {
      gridPosition: { x: this.x, y: this.y },
      oreType: this.cell ? this.cell.oreType : 'empty',
      color: this.getBlockColor()
    };
  }
}

export default OreBlock;