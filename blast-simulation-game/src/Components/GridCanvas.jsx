import React, { useState, useRef, useEffect, useCallback } from "react";
import OreBlock from "../utils/OreBlock";
import { Engine, World, Runner, Events } from "matter-js";
import {
  createBlastBodies,
  applyBlastForce,
  cleanupPhysicsEngine,
  createBoundaryWalls,
} from "../utils/physicsEngine";
import { gsap } from "gsap";

const GridCanvas = ({
  gridData,
  canvasSize,
  blockSize,
  blastTrigger,
  onBlastComplete,
  className = "",
  blasts = [],
  onBlockClick,
  selectedBlast = null,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
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
    blasts.forEach((blast) => {
      const { x, y } = blast;
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

      // Draw direction overlay for this blast (small arrow) so users can see per-blast dirKey
      if (blast.dirKey) {
        const arrowLen = blockSize * 0.28;
        const angleMap = {
          left: Math.PI,
          right: 0,
          up: -Math.PI / 2,
          down: Math.PI / 2,
          "up-left": (-3 * Math.PI) / 4,
          "up-right": -Math.PI / 4,
          "down-right": Math.PI / 4,
          "down-left": (3 * Math.PI) / 4,
        };
        const ang = angleMap[blast.dirKey] ?? 0;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, -arrowLen * 0.2);
        ctx.lineTo(arrowLen, 0);
        ctx.lineTo(0, arrowLen * 0.2);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // If this blast is selected, draw a selection ring
      if (selectedBlast && selectedBlast.x === x && selectedBlast.y === y) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(37, 99, 235, 0.9)"; // indigo-600
        ctx.arc(centerX, centerY, blockSize * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    // END NEW RENDERING LOGIC

    // Restore the context state
    ctx.restore();

    console.log(
      `Canvas rendered: ${blocksRef.current.length} blocks, centered with offset (${offsetX}, ${offsetY})`
    );
  }, [
    gridData,
    blockSize,
    blasts,
    hoveredBlock,
    destroyedCells,
    selectedBlast,
  ]);
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

  // Add a ref to track if blast is already running
  const isBlastRunningRef = useRef(false);

  useEffect(() => {
    if (!blastTrigger || !gridData || !gridData.grid || !gridData.grid.length)
      return;

    // PREVENT DOUBLE EXECUTION
    if (isBlastRunningRef.current) {
      console.log("Blast already running, skipping duplicate trigger");
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");

    const { affectedCells } = blastTrigger;

    // Mark blast as running
    isBlastRunningRef.current = true;
    console.log("Starting blast animation...");

    // Calculate grid offset for centering (same as in renderCanvas)
    const actualGridWidth = gridData.grid[0].length * blockSize;
    const actualGridHeight = gridData.grid.length * blockSize;
    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    // VIOLENT CANVAS SHAKE 🔥
    gsap.to(container, {
      x: "random(-12, 12)",
      y: "random(-12, 12)",
      duration: 0.05,
      repeat: 7,
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(container, { x: 0, y: 0 });
      }
    });

    // Create Matter.js physics engine
    const engine = Engine.create({
      gravity: { x: 0, y: 0.8 },
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

    // Calculate blast centers in pixel coordinates including their dirKey (use blasts prop so dirKey is preserved)
    const blastCenters = (blasts || []).map((b) => ({
      x: b.x * blockSize + offsetX + blockSize / 2,
      y: b.y * blockSize + offsetY + blockSize / 2,
      dirKey: b.dirKey || null,
    }));

    // Apply MORE POWERFUL blast forces 🔥
    applyBlastForce(bodies, blastCenters, 0.08);

    // Shockwave animation state
    const shockwaves = blastCenters.map(() => ({
      radius: 0,
      opacity: 1,
      flashOpacity: 1
    }));

    // Start physics simulation
    Runner.run(runner, engine);

    const startTime = performance.now();
    const duration = 5000;
    const shockwaveDuration = 500; // 0.5s for shockwave
    const flashDuration = 150; // Quick flash
    let animationFrame;

    const animatePhysics = (time) => {
      // Safety check - if grid data is gone, stop animation
      if (!gridData || !gridData.grid || !gridData.grid.length) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        Runner.stop(runner);
        cleanupPhysicsEngine(engine, null);
        isBlastRunningRef.current = false; // Reset flag
        return;
      }

      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const shockwaveProgress = Math.min(elapsed / shockwaveDuration, 1);
      const flashProgress = Math.min(elapsed / flashDuration, 1);

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

      // RENDER SHOCKWAVES 🔥
      blastCenters.forEach((center, i) => {
        const shockwave = shockwaves[i];
        
        // Update shockwave properties
        shockwave.radius = shockwaveProgress * blockSize * 4; // Expand to 4 block radius
        shockwave.opacity = Math.max(0, 1 - shockwaveProgress);
        shockwave.flashOpacity = Math.max(0, 1 - flashProgress * 2);

        // FIRE/EXPLOSION PARTICLES 🔥💥
        if (elapsed < 800) { // Fire particles last 0.8s
          const particleProgress = Math.min(elapsed / 800, 1);
          const numParticles = 12;
          
          for (let p = 0; p < numParticles; p++) {
            const angle = (p / numParticles) * Math.PI * 2 + elapsed * 0.01;
            const distance = particleProgress * blockSize * 2.5 * (1 + Math.sin(elapsed * 0.02 + p) * 0.3);
            const particleX = center.x + Math.cos(angle) * distance;
            const particleY = center.y + Math.sin(angle) * distance - particleProgress * blockSize * 0.5; // Rise up
            
            // Particle size shrinks over time
            const particleSize = blockSize * 0.15 * (1 - particleProgress * 0.7);
            
            // Color shifts from white -> yellow -> orange -> red -> fade
            let particleColor;
            if (particleProgress < 0.2) {
              particleColor = '#ffffff';
            } else if (particleProgress < 0.4) {
              particleColor = '#ffff00';
            } else if (particleProgress < 0.6) {
              particleColor = '#ff8800';
            } else {
              particleColor = '#ff3300';
            }
            
            ctx.save();
            ctx.globalAlpha = (1 - particleProgress) * 0.8;
            
            // Draw flame particle with glow
            const particleGradient = ctx.createRadialGradient(
              particleX, particleY, 0,
              particleX, particleY, particleSize
            );
            particleGradient.addColorStop(0, particleColor);
            particleGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // SMOKE PUFFS 💨
        if (elapsed > 200 && elapsed < 1500) { // Smoke appears after initial flash
          const smokeProgress = Math.min((elapsed - 200) / 1300, 1);
          const numPuffs = 6;
          
          for (let s = 0; s < numPuffs; s++) {
            const angle = (s / numPuffs) * Math.PI * 2 + elapsed * 0.005;
            const distance = smokeProgress * blockSize * 1.8;
            const puffX = center.x + Math.cos(angle) * distance;
            const puffY = center.y + Math.sin(angle) * distance - smokeProgress * blockSize * 1.2; // Rise up more
            
            const puffSize = blockSize * 0.4 * (1 + smokeProgress);
            
            ctx.save();
            ctx.globalAlpha = (1 - smokeProgress) * 0.4;
            
            // Gray smoke
            const smokeGradient = ctx.createRadialGradient(
              puffX, puffY, 0,
              puffX, puffY, puffSize
            );
            smokeGradient.addColorStop(0, '#666666');
            smokeGradient.addColorStop(1, 'rgba(50, 50, 50, 0)');
            
            ctx.fillStyle = smokeGradient;
            ctx.beginPath();
            ctx.arc(puffX, puffY, puffSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // Draw initial flash
        if (shockwave.flashOpacity > 0) {
          ctx.save();
          ctx.globalAlpha = shockwave.flashOpacity;
          const gradient = ctx.createRadialGradient(
            center.x, center.y, 0,
            center.x, center.y, blockSize * 1.5
          );
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.3, '#ffff00');
          gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(center.x, center.y, blockSize * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw expanding shockwave rings
        if (shockwave.opacity > 0 && shockwave.radius > 0) {
          // Outer ring (red)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity * 0.6;
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Middle ring (orange)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity * 0.8;
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Inner ring (yellow-white)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity;
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Render physics bodies (affected cells as debris) with motion trails 🔥
      bodies.forEach((body) => {
        const opacity = Math.max(0, 1 - progress * 0.8);

        // Draw motion trail
        if (body.velocity.x !== 0 || body.velocity.y !== 0) {
          const trailLength = Math.sqrt(
            body.velocity.x ** 2 + body.velocity.y ** 2
          ) * 3;
          
          ctx.save();
          ctx.globalAlpha = opacity * 0.3;
          ctx.strokeStyle = body.render.fillStyle;
          ctx.lineWidth = blockSize * 0.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(body.position.x, body.position.y);
          ctx.lineTo(
            body.position.x - body.velocity.x * 2,
            body.position.y - body.velocity.y * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        // Draw debris block
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        ctx.globalAlpha = opacity;
        ctx.fillStyle = body.render.fillStyle;
        ctx.fillRect(
          -blockSize * 0.4,
          -blockSize * 0.4,
          blockSize * 0.8,
          blockSize * 0.8
        );

        // Add border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          -blockSize * 0.4,
          -blockSize * 0.4,
          blockSize * 0.8,
          blockSize * 0.8
        );

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
          isBlastRunningRef.current = false; // Reset flag BEFORE callback
          console.log("Blast animation completed");
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
      isBlastRunningRef.current = false; // Reset on cleanup
    };
  }, [blastTrigger, gridData, blockSize, canvasSize, onBlastComplete]); // Remove 'blasts' from dependencies

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
    <div 
      ref={containerRef}
      className="border border-gray-300 rounded-lg overflow-hidden inline-block"
    >
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