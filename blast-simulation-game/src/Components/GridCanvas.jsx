import React, { useRef, useEffect, useCallback } from "react";
import OreBlock from "./OreBlock";
// import { gsap } from "gsap";


const GridCanvas = ({
  gridData,
  canvasSize,
  blockSize,
  blastTrigger,
  onBlastComplete,
  className = "",
}) => {
  const canvasRef = useRef(null);
  const blocksRef = useRef([]);

  // Create OreBlock instances for each cell in the grid
  const createBlocks = useCallback(() => {
    if (!gridData) return [];
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
    blocksRef.current = createBlocks();
  }, [createBlocks]);

  // Render all blocks on the canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData) return;
    const ctx = canvas.getContext("2d");
    const { grid } = gridData;

    // Clear & fill background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate centering
    const actualGridWidth = grid[0].length * blockSize;
    const actualGridHeight = grid.length * blockSize;
    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw each block
    blocksRef.current.forEach((block) => block.render(ctx));

    ctx.restore();
  }, [gridData, blockSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  
  useEffect(() => {
  if (!blastTrigger || !gridData) return;

  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const { affectedCells } = blastTrigger;
  let animationFrame;
  const startTime = performance.now();
  const duration = 800; // explosion duration (ms)

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
          block.opacity = 1 - progress;      // fade out
          block.scale = 1 + 0.3 * progress;  // slight pop
        }

        block.render(ctx);
      });
    });

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateExplosion);
    } else {
      cancelAnimationFrame(animationFrame);
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
      />
    </div>
  );
};

export default GridCanvas;
