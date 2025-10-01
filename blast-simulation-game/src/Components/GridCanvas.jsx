import React, { useRef, useEffect, useCallback } from 'react';
import OreBlock from './OreBlock';

/**
 * Canvas component that handles the rendering of the ore grid
 */
const GridCanvas = ({ 
  gridData, 
  canvasSize, 
  blockSize, 
  className = ""
}) => {
  const canvasRef = useRef(null);
  const blocksRef = useRef([]);

  // Create OreBlock instances for each cell in the grid
  const createBlocks = useCallback(() => {
    if (!gridData) return [];

    const blocks = [];
    const { grid } = gridData;
    const options = {
      emptyColor: '#ffffff'
    };

    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const block = new OreBlock(cell, x, y, blockSize, options);
        blocks.push(block);
      });
    });

    return blocks;
  }, [gridData, blockSize]);

  // Update blocks when dependencies change
  useEffect(() => {
    blocksRef.current = createBlocks();
  }, [createBlocks]);

  // Render all blocks on the canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData) return;

    const ctx = canvas.getContext('2d');
    const { grid } = gridData;

    // Clear and set background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate actual grid dimensions
    const actualGridWidth = grid[0].length * blockSize;
    const actualGridHeight = grid.length * blockSize;

    // Calculate centering offsets
    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    // Save the context state
    ctx.save();
    
    // Translate to center the grid
    ctx.translate(offsetX, offsetY);

    // Render all blocks (they'll now be centered)
    blocksRef.current.forEach(block => {
      block.render(ctx);
    });

    // Restore the context state
    ctx.restore();

    console.log(`Canvas rendered: ${blocksRef.current.length} blocks, centered with offset (${offsetX}, ${offsetY})`);
  }, [gridData, blockSize]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  if (!gridData) {
    return (
      <div className="flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50" 
           style={{ width: canvasSize.width, height: canvasSize.height }}>
        <p className="text-gray-500">No grid data available</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden inline-block">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`${className}`}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default GridCanvas;