import React, { useState, useRef, useEffect, useCallback } from "react";
import OreBlock from "./OreBlock";
// import { gsap } from "gsap";


const GridCanvas = ({
  gridData,
  canvasSize,
  blockSize,
  blastTrigger,
  onBlastComplete,
  className = "",
  blasts = [], 
  onBlockClick,
}) => {
  const canvasRef = useRef(null);
  const blocksRef = useRef([]);
  const [hoveredBlock, setHoveredBlock] = useState(null); 
  const [destroyedCells, setDestroyedCells] = useState([]);


  // Create OreBlock instances for each cell in the grid
  const createBlocks = useCallback(() => {
    if (!gridData || !gridData.grid) return [];
    const blocks = [];
    const { grid } = gridData;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const block = new OreBlock(cell, x, y, blockSize);
        blocks.push(block);
      });
    });
    return blocks;
  }, [gridData, blockSize]);

  // Initialize blocks when grid changes
  useEffect(() => {
   if (gridData && gridData.grid) {
      blocksRef.current = createBlocks();
    }
  }, [createBlocks, gridData]);

  // Render all blocks on the canvas
  const renderCanvas = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas || !gridData || !gridData.grid || gridData.grid.length === 0) return;
  const ctx = canvas.getContext("2d");
  const { grid } = gridData;

  // Avoid accessing grid[0] if grid is empty
const columns = grid[0]?.length || 0;
  const rows = grid.length;

if (columns === 0 || rows === 0) return; //stop if empty grid

  // ... (Calculations for centering offsets: actualGridWidth, actualGridHeight, offsetX, offsetY)
  const actualGridWidth = grid[0].length * blockSize;
  const actualGridHeight = grid.length * blockSize;
  const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
  const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);


  // Clear & fill background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  

  // Save the context state
  ctx.save();
  
  // Translate to center the grid
  ctx.translate(offsetX, offsetY);

  // Render all blocks
  blocksRef.current.forEach(block => {
    const isDestroyed = destroyedCells.some((cell) => cell.x === block.gridX && cell.y === block.gridY);

    if(isDestroyed){
      block.cell.oreType = "destroyed";
    }
    block.render(ctx);
  });

  // NEW RENDERING LOGIC
  
  // 1. Draw Hover Highlight
  if (hoveredBlock) {
    const { x, y } = hoveredBlock;
    // Highlight the block boundary
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      x * blockSize + 1, // +1 for slight border padding
      y * blockSize + 1,
      blockSize - 2,
      blockSize - 2
    );
  }

  // 2. Draw Blast Markers
  blasts.forEach(({ x, y }) => {
    // Calculate center of the block
    const centerX = x * blockSize + blockSize / 2;
    const centerY = y * blockSize + blockSize / 2;

    // Draw a red circle (blast icon)
    ctx.beginPath();
    ctx.arc(centerX, centerY, blockSize * 0.3, 0, Math.PI * 2); // Radius 30% of block size
    ctx.fillStyle = '#dc2626'; // Red
    ctx.fill();
    
    // Optional: Add a white flash/dot for visibility
    ctx.beginPath();
    ctx.arc(centerX, centerY, blockSize * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; 
    ctx.fill();
  });
  // END NEW RENDERING LOGIC

  // Restore the context state
  ctx.restore();

  console.log(`Canvas rendered: ${blocksRef.current.length} blocks, centered with offset (${offsetX}, ${offsetY})`);
}, [gridData, blockSize, blasts, hoveredBlock, destroyedCells]); 
  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // GridCanvas.jsx

// Helper function to convert pixel coords to grid coords
const getGridCoords = useCallback((pixelX, pixelY) => {
  const canvas = canvasRef.current;
  if (!canvas || !gridData) return null;
  
  const { grid } = gridData;
  
  // Calculate centering offsets (same as in renderCanvas)
  const actualGridWidth = grid[0].length * blockSize;
  const actualGridHeight = grid.length * blockSize;
  const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
  const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);
  
  // Adjust for centering translation
  const relativeX = pixelX - offsetX;
  const relativeY = pixelY - offsetY;

  // Check if the click is within the actual grid
  if (relativeX < 0 || relativeX >= actualGridWidth || 
      relativeY < 0 || relativeY >= actualGridHeight) {
    return null; // Clicked outside the centered grid area
  }

  // Convert relative pixel coords to grid coords
  const gridX = Math.floor(relativeX / blockSize);
  const gridY = Math.floor(relativeY / blockSize);

  return { x: gridX, y: gridY };
}, [gridData, blockSize]);

// Click Handler
const handleClick = useCallback((event) => {
  if (!onBlockClick || !canvasRef.current) return;
  
  // Get canvas-relative click coordinates
  const rect = canvasRef.current.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;
  
  const gridCoords = getGridCoords(pixelX, pixelY);

  if (gridCoords) {
    onBlockClick(gridCoords.x, gridCoords.y);
  }
}, [onBlockClick, getGridCoords]); // Dependency on 'onBlockClick' and 'getGridCoords'

// Mouse Move Handler (for hover)
  const handleMouseMove = useCallback((event) => {
  const rect = canvasRef.current.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;

  const gridCoords = getGridCoords(pixelX, pixelY);
  
  // Only update state if hover is over a new valid block
  if (gridCoords && 
      (!hoveredBlock || hoveredBlock.x !== gridCoords.x || hoveredBlock.y !== gridCoords.y)) {
    setHoveredBlock(gridCoords);
  } else if (!gridCoords && hoveredBlock) {
    // Clear hover if mouse leaves the grid
    setHoveredBlock(null);
  }
}, [getGridCoords, hoveredBlock]); // Dependency on 'getGridCoords' and 'hoveredBlock'

// Mouse Leave Handler
const handleMouseLeave = useCallback(() => {
  setHoveredBlock(null);
}, []);

  
  useEffect(() => {
  if (!blastTrigger || !gridData) return;

  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const { affectedCells } = blastTrigger;
  let animationFrame;
  const startTime = performance.now();
  const duration = 1000; // explosion duration (ms)

  const animateExplosion = (time) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Redraw grid with animation
    gridData.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const block = new OreBlock(cell, x, y, blockSize);
        const hit = affectedCells.some(c => c.x === x && c.y === y);

        if (hit) {
          // explosion effect update
          block.scale = 1 + progress * 1.2;         //expand outward
          block.opacity = 1 - progress * 0.8;      // fade out
          block.rotation = progress * 180          // spin a bit
        }

        block.render(ctx);
      });
    });

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateExplosion);
    } else {
      cancelAnimationFrame(animationFrame);
      setDestroyedCells((prev) => [...prev, ...affectedCells]);
      onBlastComplete?.(); // grid update after animation
    }
  };

  animationFrame = requestAnimationFrame(animateExplosion);
  return () => cancelAnimationFrame(animationFrame);
}, [blastTrigger, gridData, blockSize, canvasSize, onBlastComplete]);


  if (!gridData) {
    return (
      <div
        className="flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
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
        style={{ display: "block" }}
        // ATTACH HANDLERS HERE
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default GridCanvas;
