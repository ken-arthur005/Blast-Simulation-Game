import React, { useState, useRef, useEffect, useCallback } from "react";
import OreBlock from "./OreBlock";
import { Engine, World, Runner, Events } from "matter-js";
import { createBlastBodies, applyBlastForce, cleanupPhysicsEngine, createBoundaryWalls } from "../utils/physicsEngine";
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

  // Initialize blocks when grid changes and reset destroyed cells
  useEffect(() => {
    if (gridData && gridData.grid) {
      blocksRef.current = createBlocks();
      setDestroyedCells([]);
    }
  }, [createBlocks, gridData]);

  // Render all blocks on the canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData || !gridData.grid || gridData.grid.length === 0)
      return;
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
    blocksRef.current.forEach((block) => {
      const isDestroyed = destroyedCells.some(
        (cell) => cell.x === block.gridX && cell.y === block.gridY
      );

      // Create a temporary cell object for rendering if destroyed
      if (isDestroyed) {
        const destroyedBlock = new OreBlock(
          { ...block.cell, oreType: "destroyed" },
          block.gridX,
          block.gridY,
          blockSize
        );
        destroyedBlock.render(ctx);
      } else {
        block.render(ctx);
      }
    });

    // NEW RENDERING LOGIC

    // 1. Draw Hover Highlight
    if (hoveredBlock) {
      const { x, y } = hoveredBlock;
      // Highlight the block boundary
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
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
      ctx.fillStyle = "#dc2626"; // Red
      ctx.fill();

      // Optional: Add a white flash/dot for visibility
      ctx.beginPath();
      ctx.arc(centerX, centerY, blockSize * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });
    // END NEW RENDERING LOGIC

    // Restore the context state
    ctx.restore();

    console.log(
      `Canvas rendered: ${blocksRef.current.length} blocks, centered with offset (${offsetX}, ${offsetY})`
    );
  }, [gridData, blockSize, blasts, hoveredBlock, destroyedCells]);
  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // GridCanvas.jsx

  // Helper function to convert pixel coords to grid coords
  const getGridCoords = useCallback(
    (pixelX, pixelY) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        !gridData ||
        !gridData.grid ||
        !gridData.grid.length ||
        !gridData.grid[0]
      )
        return null;

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
      if (
        relativeX < 0 ||
        relativeX >= actualGridWidth ||
        relativeY < 0 ||
        relativeY >= actualGridHeight
      ) {
        return null; // Clicked outside the centered grid area
      }

      // Convert relative pixel coords to grid coords
      const gridX = Math.floor(relativeX / blockSize);
      const gridY = Math.floor(relativeY / blockSize);

      return { x: gridX, y: gridY };
    },
    [gridData, blockSize]
  );

  // Click Handler
  const handleClick = useCallback(
    (event) => {
      if (!onBlockClick || !canvasRef.current) return;

      // Get canvas-relative click coordinates
      const rect = canvasRef.current.getBoundingClientRect();
      const pixelX = event.clientX - rect.left;
      const pixelY = event.clientY - rect.top;

      const gridCoords = getGridCoords(pixelX, pixelY);

      if (gridCoords) {
        onBlockClick(gridCoords.x, gridCoords.y);
      }
    },
    [onBlockClick, getGridCoords]
  ); // Dependency on 'onBlockClick' and 'getGridCoords'

  // Mouse Move Handler (for hover)
  const handleMouseMove = useCallback(
    (event) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const pixelX = event.clientX - rect.left;
      const pixelY = event.clientY - rect.top;

      const gridCoords = getGridCoords(pixelX, pixelY);

      // Only update state if hover is over a new valid block
      if (
        gridCoords &&
        (!hoveredBlock ||
          hoveredBlock.x !== gridCoords.x ||
          hoveredBlock.y !== gridCoords.y)
      ) {
        setHoveredBlock(gridCoords);
      } else if (!gridCoords && hoveredBlock) {
        // Clear hover if mouse leaves the grid
        setHoveredBlock(null);
      }
    },
    [getGridCoords, hoveredBlock]
  ); // Dependency on 'getGridCoords' and 'hoveredBlock'

  // Mouse Leave Handler
  const handleMouseLeave = useCallback(() => {
    setHoveredBlock(null);
  }, []);

  useEffect(() => {
    if (!blastTrigger || !gridData || !gridData.grid || !gridData.grid.length)
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const { affectedCells } = blastTrigger;
    
    // Calculate grid offset for centering (same as in renderCanvas)
    const actualGridWidth = gridData.grid[0].length * blockSize;
    const actualGridHeight = gridData.grid.length * blockSize;
    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    // Create Matter.js physics engine
    const engine = Engine.create({
      gravity: { x: 0, y: 0.8 }
    });

    const runner = Runner.create();
    
    // Create boundary walls to contain debris
    const walls = createBoundaryWalls(canvasSize);
    World.add(engine.world, walls);
    
    // Create bodies for affected cells
    const bodies = createBlastBodies(
      affectedCells, 
      blockSize, 
      { x: offsetX, y: offsetY },
      gridData
    );
    
    // Add bodies to the world
    World.add(engine.world, bodies);
    
    // Calculate blast centers in pixel coordinates
    const blastCenters = [...new Set(affectedCells.map(c => `${c.blastX},${c.blastY}`))]
      .map(coord => {
        const [x, y] = coord.split(',').map(Number);
        return {
          x: x * blockSize + offsetX + blockSize / 2,
          y: y * blockSize + offsetY + blockSize / 2
        };
      });
    
    // Apply blast forces
    applyBlastForce(bodies, blastCenters, 0.1);
    
    // Start physics simulation
    Runner.run(runner, engine);

    const startTime = performance.now();
    const duration = 5000; 
    let animationFrame;

    const animatePhysics = (time) => {
      // Safety check - if grid data is gone, stop animation
      if (!gridData || !gridData.grid || !gridData.grid.length) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        Runner.stop(runner);
        cleanupPhysicsEngine(engine, null);
        return;
      }

      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas with background
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Render static grid (non-affected cells)
      gridData.grid.forEach((row, y) => {
        row.forEach((cell, x) => {
          const isAffected = affectedCells.some((c) => c.x === x && c.y === y);
          
          if (!isAffected) {
            const block = new OreBlock(cell, x, y, blockSize);
            block.render(ctx);
          }
        });
      });

      ctx.restore();

      // Render physics bodies (affected cells as debris)
      bodies.forEach(body => {
        const opacity = Math.max(0, 1 - progress * 0.8);
        
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = body.render.fillStyle;
        ctx.fillRect(-blockSize * 0.4, -blockSize * 0.4, blockSize * 0.8, blockSize * 0.8);
        
        // Add border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-blockSize * 0.4, -blockSize * 0.4, blockSize * 0.8, blockSize * 0.8);
        
        ctx.restore();
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animatePhysics);
      } else {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        
        // Stop physics simulation and cleanup
        Runner.stop(runner);
        cleanupPhysicsEngine(engine, null);
        
        // Set destroyed cells first, then wait a bit before calling completion
        setDestroyedCells((prev) => [...prev, ...affectedCells]);

        // Allow time for destroyed cells to render before completion callback
        setTimeout(() => {
          onBlastComplete?.(); 
        }, 200); 
      }
    };

    animationFrame = requestAnimationFrame(animatePhysics);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      Runner.stop(runner);
      cleanupPhysicsEngine(engine, null);
    };
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
