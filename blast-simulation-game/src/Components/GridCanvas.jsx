import React, { useState, useRef, useEffect, useCallback } from "react";
import OreBlock from "../utils/oreBlock";
import { Engine, World, Runner, Events, Body } from "matter-js";
import {
  createBlastBodies,
  applyBlastForce,
  cleanupPhysicsEngine,
  createBoundaryWalls,
} from "../utils/physicsEngine";
import { gsap } from "gsap";


const capturePhysicsTrajectories = (bodies, engine, steps = 120) => {
  const trajectories = new Map();
  
  // Initialize trajectory storage with original positions
  bodies.forEach(body => {
    trajectories.set(body.id, {
      body: body,
      keyframes: [{
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        time: 0
      }]
    });
  });

  // Run physics simulation and capture keyframes
  const sampleInterval = 4; // Capture every 4th frame for efficiency
  
  for (let i = 0; i < steps; i++) {
    Engine.update(engine, 1000 / 60); // 60fps simulation
    
    if (i % sampleInterval === 0 || i === steps - 1) {
      bodies.forEach(body => {
        const trajectory = trajectories.get(body.id);
        trajectory.keyframes.push({
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          velocityX: body.velocity.x,
          velocityY: body.velocity.y,
          time: (i / steps)
        });
      });
    }
  }

  return Array.from(trajectories.values());
};

/**
 * Animate blocks using GSAP based on physics trajectories
 */
const animateBlastWithGSAP = (
  trajectories,
  duration = 2.5
) => {
  const timeline = gsap.timeline();

  // Create animation state objects for each body
  const animStates = trajectories.map(traj => {
    const body = traj.body;
    const startFrame = traj.keyframes[0];
    const finalFrame = traj.keyframes[traj.keyframes.length - 1];
    
    return {
      body: body,
      animX: startFrame.x,
      animY: startFrame.y,
      animAngle: startFrame.angle,
      animVelocityX: 0,
      animVelocityY: 0,
      targetX: finalFrame.x,
      targetY: finalFrame.y,
      targetAngle: finalFrame.angle,
      keyframes: traj.keyframes
    };
  });

  // Animate each body with stagger effect
  animStates.forEach((state) => {
    const delay = (state.body.blastDistance || 0) * 0.008;
    
    timeline.to(state, {
      animX: state.targetX,
      animY: state.targetY,
      animAngle: state.targetAngle,
      duration: duration,
      delay: delay,
      ease: "power2.out",
      onUpdate: function() {
        // Calculate current keyframe for velocity (for motion trails)
        const progress = this.progress();
        const kfIndex = Math.floor(progress * (state.keyframes.length - 1));
        const kf = state.keyframes[Math.min(kfIndex, state.keyframes.length - 1)];
        
        state.animVelocityX = kf.velocityX || 0;
        state.animVelocityY = kf.velocityY || 0;
        
        // Update body's animated position for rendering
        state.body.animatedPosition = {
          x: state.animX,
          y: state.animY,
          angle: state.animAngle,
          velocityX: state.animVelocityX,
          velocityY: state.animVelocityY
        };
      }
    }, 0);
  });

  return { timeline, animStates };
};



const mulberry32 = (a) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex) => {
  // Defensive: if not provided or not a string, return a neutral gray
  if (!hex || typeof hex !== "string") return { r: 200, g: 200, b: 200 };
  const h = hex.replace("#", "").trim();
  // If it's already an rgb(...) string, try to parse numbers
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

  // Fallback for hex parsing
  const bigint = parseInt(h, 16);
  if (!Number.isNaN(bigint) && (h.length === 6 || h.length === 3)) {
    if (h.length === 6) {
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }
    // short hex like 'abc' -> 'aabbcc'
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }

  // fallback
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

// Draw a simple rock-like texture inside current origin (0,0) sized to (size)
// baseColor is a hex string, seedNumber is a deterministic seed per cell
const drawRockTexture = (ctx, size, baseColor, seedNumber, alpha = 1) => {
  const rand = mulberry32(seedNumber);
  const prevGlobalAlpha = ctx.globalAlpha ?? 1;

  // Create a jagged blob silhouette (centered) to emulate a rock outline
  const cx = size / 2;
  const cy = size / 2;
  const points = 8 + Math.floor(rand() * 6);
  const outerR = size * 0.48;
  const jagged = [];
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2;
    const r = outerR * (0.75 + rand() * 0.5); // vary radius
    jagged.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
  }

  // Fill jagged blob with the base color so the rock takes the cell's color
  ctx.beginPath();
  jagged.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  );
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 1 * alpha;
  ctx.fill();

  // Stroke with a darker ring to emphasize the rock edge
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeStyle = adjustColor(baseColor, -0.35);
  ctx.stroke();

  // Clip to jagged blob so subsequent speckles sit inside the rock silhouette
  ctx.save();
  ctx.beginPath();
  jagged.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  );
  ctx.closePath();
  ctx.clip();

  // blotches: a few soft, slightly lighter/darker blobs
  const blotches = 6 + Math.floor(rand() * 6);
  for (let i = 0; i < blotches; i++) {
    const bx = cx + (rand() * 2 - 1) * outerR * 0.6;
    const by = cy + (rand() * 2 - 1) * outerR * 0.5;
    const br = (0.08 + rand() * 0.18) * size;
    const shade = (rand() - 0.4) * 0.4; // slight variation
    ctx.beginPath();
    ctx.fillStyle = adjustColor(baseColor, shade);
    ctx.globalAlpha = (0.55 + rand() * 0.35) * alpha;
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // speckles: small mineral flecks
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

  // subtle veins: short lines
  const veins = 1 + Math.floor(rand() * 3);
  ctx.lineWidth = Math.max(0.5, size * 0.01);
  for (let v = 0; v < veins; v++) {
    ctx.beginPath();
    const sx = cx + (rand() * 2 - 1) * outerR * 0.5;
    const sy = cy + (rand() * 2 - 1) * outerR * 0.5;
    ctx.moveTo(sx, sy);
    const segs = 2 + Math.floor(rand() * 3);
    for (let s = 0; s < segs; s++) {
      const nx = sx + (rand() - 0.5) * size * 0.25;
      const ny = sy + (rand() - 0.5) * size * 0.25;
      ctx.lineTo(nx, ny);
    }
    ctx.strokeStyle = adjustColor(baseColor, -0.28);
    ctx.globalAlpha = 0.45 * rand() * alpha;
    ctx.stroke();
  }

  // inner highlight to give a 'bouncy' stylized rock look (optional)
  ctx.beginPath();
  ctx.arc(cx - size * 0.08, cy - size * 0.12, outerR * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = adjustColor(baseColor, 0.28);
  ctx.globalAlpha = 0.18 * alpha;
  ctx.fill();

  // restore alpha and clipping
  ctx.restore();
  ctx.globalAlpha = prevGlobalAlpha;
};

const GridCanvas = ({
  gridData,
  canvasSize,
  blockSize,
  blastTrigger,
  onBlastComplete,
  className = "",
  blasts = [],
  onBlockClick,
  cellGap = 8, // optional prop to control spacing between cells
  selectedBlast = null,
  fileResetKey = 0, // Trigger to force cleanup when new file is uploaded
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const blocksRef = useRef([]);
  // Use a ref for hover to avoid frequent React state updates on mousemove
  const hoveredBlockRef = useRef(null);
  const [destroyedCells, setDestroyedCells] = useState([]);
  const hoverRafRef = useRef(null);
  const pendingHoverRef = useRef(null);
  // Cache for static grid during blast animation
  const staticGridCacheRef = useRef(null);
  const staticGridCacheParamsRef = useRef(null);
  const cellSpacing = cellGap;
  const innerBlockSize = Math.max(4, blockSize - cellSpacing);
  const isBlastRunningRef = useRef(false);
  
  // NEW: Store current animation timeline for cleanup
  const animationTimelineRef = useRef(null);
  const animationStatesRef = useRef(null);

  const drawRoundedRect = (ctx, x, y, width, height, radius = 6) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const createStaticGridCache = useCallback(
    (affectedCells) => {
      if (!gridData || !gridData.grid || !canvasRef.current) return null;

      const canvas = canvasRef.current;
      const { grid } = gridData;

      // Calculate grid dimensions
      const actualGridWidth =
        grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
      const actualGridHeight =
        grid.length * (innerBlockSize + cellSpacing) - cellSpacing;

      const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
      const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

      // Create offscreen canvas for static grid
      const cacheCanvas = document.createElement("canvas");
      cacheCanvas.width = canvas.width;
      cacheCanvas.height = canvas.height;
      const cacheCtx = cacheCanvas.getContext("2d");

      cacheCtx.save();
      cacheCtx.translate(offsetX, offsetY);

      // Draw only non-affected cells
      grid.forEach((row, y) => {
        row.forEach((cell, x) => {
          const isAffected = affectedCells.some((c) => c.x === x && c.y === y);

          if (!isAffected) {
            const block = new OreBlock(cell, x, y, innerBlockSize);
            cacheCtx.save();
            cacheCtx.translate(
              x * (innerBlockSize + cellSpacing),
              y * (innerBlockSize + cellSpacing)
            );

            const rrx = 0;
            const rry = 0;
            const rrad = Math.max(4, innerBlockSize * 0.12);
            drawRoundedRect(
              cacheCtx,
              rrx,
              rry,
              innerBlockSize,
              innerBlockSize,
              rrad
            );
            cacheCtx.fillStyle = "rgba(255, 255, 255, 0.08)";
            cacheCtx.fill();

            cacheCtx.save();
            drawRoundedRect(
              cacheCtx,
              rrx,
              rry,
              innerBlockSize,
              innerBlockSize,
              rrad
            );
            cacheCtx.clip();
            const seedB = (block.gridX * 73856093) ^ (block.gridY * 19349663);
            const colorHashB = (block.getBlockColor() || "#ffffff")
              .split("")
              .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const rockScaleB = 0.72;
            const rockSizeB = Math.max(
              2,
              Math.round(innerBlockSize * rockScaleB)
            );
            const rockOffsetB = Math.round((innerBlockSize - rockSizeB) / 2);
            cacheCtx.translate(rockOffsetB, rockOffsetB);
            drawRockTexture(
              cacheCtx,
              rockSizeB,
              block.getBlockColor(),
              seedB + colorHashB
            );
            cacheCtx.restore();

            drawRoundedRect(
              cacheCtx,
              rrx,
              rry,
              innerBlockSize,
              innerBlockSize,
              rrad
            );
            cacheCtx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            cacheCtx.lineWidth = 1.2;
            cacheCtx.stroke();
            cacheCtx.restore();
          }
        });
      });

      cacheCtx.restore();

      return cacheCanvas;
    },
    [gridData, innerBlockSize, cellSpacing]
  );

  const createBlocks = useCallback(() => {
    if (!gridData || !gridData.grid) return [];
    const blocks = [];
    const { grid } = gridData;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const block = new OreBlock(cell, x, y, innerBlockSize);

        try {
          const off = document.createElement("canvas");
          off.width = innerBlockSize;
          off.height = innerBlockSize;
          const octx = off.getContext("2d");

          const rrad = Math.max(4, innerBlockSize * 0.12);
          drawRoundedRect(octx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          octx.fillStyle = "rgba(255, 255, 255, 0.08)";
          octx.fill();

          octx.save();
          drawRoundedRect(octx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          octx.clip();
          const seedA = (x * 73856093) ^ (y * 19349663);
          const colorHashA = (block.getBlockColor() || "#ffffff")
            .split("")
            .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const rockScale = 0.72;
          const rockSize = Math.max(2, Math.round(innerBlockSize * rockScale));
          const rockOffset = Math.round((innerBlockSize - rockSize) / 2);
          octx.translate(rockOffset, rockOffset);
          drawRockTexture(
            octx,
            rockSize,
            block.getBlockColor(),
            seedA + colorHashA
          );
          octx.restore();

          drawRoundedRect(octx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          octx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          octx.lineWidth = 1.2;
          octx.stroke();

          block.cachedCanvas = off;
        } catch {
          block.cachedCanvas = null;
        }

        blocks.push(block);
      });
    });
    return blocks;
  }, [gridData, innerBlockSize]);

  useEffect(() => {
    if (gridData && gridData.grid) {
      blocksRef.current = createBlocks();
      setDestroyedCells([]);
      console.log("Grid reset: blocks reinitialized");
    }
  }, [gridData, createBlocks, fileResetKey]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData || !gridData.grid || gridData.grid.length === 0)
      return;
    const ctx = canvas.getContext("2d");
    const { grid } = gridData;

    const columns = grid[0]?.length || 0;
    const rows = grid.length;

    if (columns === 0 || rows === 0) return;

    const actualGridWidth =
      grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
    const actualGridHeight =
      grid.length * (innerBlockSize + cellSpacing) - cellSpacing;

    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    blocksRef.current.forEach((block) => {
      const isDestroyed = destroyedCells.some(
        (cell) => cell.x === block.gridX && cell.y === block.gridY
      );

      const renderX = block.gridX * (innerBlockSize + cellSpacing);
      const renderY = block.gridY * (innerBlockSize + cellSpacing);

      ctx.save();
      ctx.translate(renderX, renderY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.2;
      const rx = 0;
      const ry = 0;
      const rrad = Math.max(4, innerBlockSize * 0.12);
      drawRoundedRect(ctx, rx, ry, innerBlockSize, innerBlockSize, rrad);
      ctx.fill();

      if (block.cachedCanvas && !isDestroyed) {
        ctx.drawImage(block.cachedCanvas, 0, 0);
      } else if (isDestroyed) {
        ctx.fillStyle = "#9ca3af";
        ctx.fillRect(0, 0, innerBlockSize, innerBlockSize);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, innerBlockSize, innerBlockSize);
      } else {
        ctx.save();
        drawRoundedRect(ctx, rx, ry, innerBlockSize, innerBlockSize, rrad);
        ctx.clip();
        const seedA = (block.gridX * 73856093) ^ (block.gridY * 19349663);
        const colorHashA = (block.getBlockColor() || "#ffffff")
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const rockScale = 0.72;
        const rockSize = Math.max(2, Math.round(innerBlockSize * rockScale));
        const rockOffset = Math.round((innerBlockSize - rockSize) / 2);
        ctx.translate(rockOffset, rockOffset);
        drawRockTexture(
          ctx,
          rockSize,
          block.getBlockColor(),
          seedA + colorHashA
        );
        ctx.restore();
        drawRoundedRect(ctx, rx, ry, innerBlockSize, innerBlockSize, rrad);
        ctx.stroke();
      }

      ctx.restore();
    });

    blasts.forEach((blast) => {
      const { x, y } = blast;

      const centerX = x * (innerBlockSize + cellSpacing) + innerBlockSize / 2;
      const centerY = y * (innerBlockSize + cellSpacing) + innerBlockSize / 2;

      // Draw a red circle (blast icon)
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerBlockSize * 0.3, 0, Math.PI * 2); // Radius 30% of inner block size
      ctx.fillStyle = "#dc2626"; // Red
      ctx.fill();

      // Optional: Add a white flash/dot for visibility
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerBlockSize * 0.1, 0, Math.PI * 2);
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

    console.debug(
      `Canvas rendered: ${blocksRef.current.length} blocks, centered with offset (${offsetX}, ${offsetY})`
    );
  }, [
    gridData,
    blasts,
    destroyedCells,
    innerBlockSize,
    cellSpacing,
    blockSize,
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
      const actualGridWidth =
        grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
      const actualGridHeight =
        grid.length * (innerBlockSize + cellSpacing) - cellSpacing;

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
      // Each cell occupies (innerBlockSize + cellSpacing) pixels, but we need to check
      // if the click is within the actual cell or in the gap between cells
      const stride = innerBlockSize + cellSpacing;

      // Calculate which "block unit" the click is in
      const unitX = Math.floor(relativeX / stride);
      const unitY = Math.floor(relativeY / stride);

      // Check if the click is within the cell part or the gap part
      const posInUnitX = relativeX - unitX * stride;
      const posInUnitY = relativeY - unitY * stride;

      // If click is in the gap region (after the cell content), clamp to the cell
      const gridX =
        posInUnitX < innerBlockSize
          ? unitX
          : Math.min(unitX + 1, grid[0].length - 1);
      const gridY =
        posInUnitY < innerBlockSize
          ? unitY
          : Math.min(unitY + 1, grid.length - 1);

      // Final bounds check
      if (gridX >= grid[0].length || gridY >= grid.length) {
        return null;
      }

      return { x: gridX, y: gridY };
    },
    [gridData, innerBlockSize, cellSpacing]
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
  // Helper to compute grid offsets (used for hover overlay drawing)
  const getGridOffsets = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData || !gridData.grid) return null;
    const grid = gridData.grid;
    const actualGridWidth =
      grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
    const actualGridHeight =
      grid.length * (innerBlockSize + cellSpacing) - cellSpacing;
    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);
    return { offsetX, offsetY, actualGridWidth, actualGridHeight };
  }, [gridData, innerBlockSize, cellSpacing]);

  const drawHoverOverlay = useCallback(
    (block) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const offsets = getGridOffsets();
      if (!offsets) return;
      const { offsetX, offsetY } = offsets;

      // draw overlay without clearing base render
      try {
        ctx.save();
        if (block) {
          const hx = block.x * (innerBlockSize + cellSpacing) + offsetX;
          const hy = block.y * (innerBlockSize + cellSpacing) + offsetY;
          ctx.strokeStyle = "rgba(37, 99, 235, 0.9)"; // match selection color
          ctx.lineWidth = 3;
          drawRoundedRect(
            ctx,
            hx,
            hy,
            innerBlockSize,
            innerBlockSize,
            Math.max(4, innerBlockSize * 0.12)
          );
          ctx.stroke();
        }
        ctx.restore();
      } catch {
        /* ignore overlay errors */
      }
    },
    [getGridOffsets, innerBlockSize, cellSpacing]
  );

  const handleMouseMove = useCallback(
    (event) => {
      // Throttle hover updates via requestAnimationFrame to reduce full-canvas redraws
      const rect = canvasRef.current.getBoundingClientRect();
      const pixelX = event.clientX - rect.left;
      const pixelY = event.clientY - rect.top;

      const gridCoords = getGridCoords(pixelX, pixelY);
      pendingHoverRef.current = gridCoords || null;

      if (hoverRafRef.current) return;
      hoverRafRef.current = requestAnimationFrame(() => {
        const next = pendingHoverRef.current;
        const prev = hoveredBlockRef.current;
        // Only redraw overlay if changed
        if (
          (next && !prev) ||
          (next && prev && (next.x !== prev.x || next.y !== prev.y))
        ) {
          hoveredBlockRef.current = next;
          // re-draw base canvas then overlay to ensure overlay is on top
          renderCanvas();
          drawHoverOverlay(next);
        } else if (!next && prev) {
          hoveredBlockRef.current = null;
          // clear overlay by re-rendering the base canvas
          renderCanvas();
        }
        hoverRafRef.current = null;
      });
    },
    [getGridCoords, renderCanvas, drawHoverOverlay]
  ); // Dependency on 'getGridCoords' and 'hoveredBlock'

  // Mouse Leave Handler
  const handleMouseLeave = useCallback(() => {
    // cancel pending RAF and clear
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingHoverRef.current = null;
    hoveredBlockRef.current = null;
    // re-render base canvas to clear overlays
    renderCanvas();
  }, [renderCanvas]);

  // ===== MAIN BLAST ANIMATION EFFECT =====
  useEffect(() => {
    if (!blastTrigger || !gridData || !gridData.grid || !gridData.grid.length)
      return;

    if (isBlastRunningRef.current) {
      console.log("Blast already running, skipping duplicate trigger");
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");

    const { affectedCells } = blastTrigger;

    isBlastRunningRef.current = true;
    console.log("🎬 Starting ANIMATED blast...");

    // Calculate grid offset for centering
    const actualGridWidth =
      gridData.grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
    const actualGridHeight =
      gridData.grid.length * (innerBlockSize + cellSpacing) - cellSpacing;

    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    // CANVAS SHAKE EFFECT 🔥
    gsap.to(container, {
      x: "random(-20, 20)",
      y: "random(-20, 20)",
      duration: 0.07,
      repeat: 9,
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(container, { x: 0, y: 0 });
      },
    });

    // Step 1: Create physics engine for trajectory calculation
    const engine = Engine.create({
      gravity: { x: 0, y: 0.6 },
    });

    const walls = createBoundaryWalls(canvasSize);
    World.add(engine.world, walls);

    // Step 2: Create bodies
    const stride = innerBlockSize + cellSpacing;
    const bodies = createBlastBodies(
      affectedCells,
      innerBlockSize,
      { x: offsetX, y: offsetY },
      gridData,
      stride
    );

    console.log(`✅ Created ${bodies.length} physics bodies`);

    World.add(engine.world, bodies);

    // Step 3: Calculate blast centers with directional bias
    const uniqueCoords = [
      ...new Set(affectedCells.map((c) => `${c.blastX},${c.blastY}`)),
    ];
    const blastCenters = uniqueCoords.map((coord) => {
      const [x, y] = coord.split(",").map(Number);
      const matchingBlast = blasts?.find((b) => b.x === x && b.y === y) || {};
      return {
        x: x * stride + offsetX + innerBlockSize / 2,
        y: y * stride + offsetY + innerBlockSize / 2,
        dirKey: matchingBlast.dirKey || null,
      };
    });

    // Step 4: Apply blast forces
    applyBlastForce(bodies, blastCenters, 0.02);

    // Step 5: Run headless physics simulation to capture trajectories
    console.log("📊 Capturing physics trajectories...");
    const trajectories = capturePhysicsTrajectories(bodies, engine, 120);
    console.log(`✅ Captured ${trajectories.length} trajectories`);

    // Step 6: Reset bodies to original positions for animation
    bodies.forEach(body => {
      const startPos = trajectories.find(t => t.body.id === body.id)?.keyframes[0];
      if (startPos) {
        Body.setPosition(body, { x: startPos.x, y: startPos.y });
        Body.setAngle(body, 0);
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
      }
    });

    // Step 7: Create static grid cache for performance
    const staticGridCache = createStaticGridCache(affectedCells);
    staticGridCacheRef.current = staticGridCache;
    staticGridCacheParamsRef.current = {
      offsetX,
      offsetY,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    // Mark affected cells as destroyed
    setDestroyedCells((prev) => [...prev, ...affectedCells]);

    // Step 8: Animate using GSAP
    console.log("🎨 Starting GSAP animation...");
    const animationDuration = 2.5; // seconds
    const { timeline, animStates } = animateBlastWithGSAP(trajectories, animationDuration);
    
    animationTimelineRef.current = timeline;
    animationStatesRef.current = animStates;

    // Shockwave animation state
    const shockwaves = blastCenters.map(() => ({
      radius: 0,
      opacity: 1,
      flashOpacity: 1,
    }));

    const startTime = performance.now();
    const shockwaveDuration = 700;
    const flashDuration = 200;
    let animationFrame;

    // Step 9: Render loop
    const animateFrame = (time) => {
      // Safety check
      if (!gridData || !gridData.grid || !gridData.grid.length) {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        timeline.kill();
        cleanupPhysicsEngine(engine, null);
        isBlastRunningRef.current = false;
        return;
      }

      const elapsed = time - startTime;
      const progress = Math.min(elapsed / (animationDuration * 1000), 1);
      const shockwaveProgress = Math.min(elapsed / shockwaveDuration, 1);
      const flashProgress = Math.min(elapsed / flashDuration, 1);

      // Clear and draw background
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw cached static grid
      if (staticGridCache) {
        try {
          ctx.drawImage(staticGridCache, 0, 0);
        } catch {}
      }

      // Draw affected cells at their original grid positions
      // (the debris bodies are flying around, but we show fading ores for visual continuity)
      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Only show affected cells at the very start of blast (first 3ms)
      // then hide them to let debris take center stage
      if (elapsed < 3) {
        affectedCells.forEach((cell) => {
          const block = new OreBlock(
            gridData.grid[cell.y][cell.x],
            cell.x,
            cell.y,
            innerBlockSize
          );
          const renderX = cell.x * (innerBlockSize + cellSpacing);
          const renderY = cell.y * (innerBlockSize + cellSpacing);

          ctx.save();
          ctx.translate(renderX, renderY);

          // Draw faint grid with rounded corners
          const rrad = Math.max(4, innerBlockSize * 0.12);
          drawRoundedRect(ctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          ctx.fill();

          // Draw the ore
          ctx.save();
          drawRoundedRect(ctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          ctx.clip();
          const seedCell = (cell.x * 73856093) ^ (cell.y * 19349663);
          const colorHashCell = (block.getBlockColor() || "#ffffff")
            .split("")
            .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const rockScaleCell = 0.72;
          const rockSizeCell = Math.max(
            2,
            Math.round(innerBlockSize * rockScaleCell)
          );
          const rockOffsetCell = Math.round(
            (innerBlockSize - rockSizeCell) / 2
          );
          ctx.translate(rockOffsetCell, rockOffsetCell);
          drawRockTexture(
            ctx,
            rockSizeCell,
            block.getBlockColor(),
            seedCell + colorHashCell
          );
          ctx.restore();

          // Border
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.2;
          drawRoundedRect(ctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          ctx.stroke();

          ctx.restore();
        });
      }
      ctx.restore();

      // Debris bodies are already positioned with absolute canvas coordinates
      // (they include offsetX and offsetY from physics engine)
      // so we render them directly without additional translation

      // RENDER SHOCKWAVES 🔥
      blastCenters.forEach((center, i) => {
        const shockwave = shockwaves[i];

        // Update shockwave properties
        shockwave.radius = shockwaveProgress * blockSize * 3; // Reduced from 4 to 3 block radius
        shockwave.opacity = Math.max(0, 1 - shockwaveProgress);
        shockwave.flashOpacity = Math.max(0, 1 - flashProgress * 2);

        // FIRE/EXPLOSION PARTICLES 🔥💥
        if (elapsed < 900) {
          // Reduced from 800ms to 600ms
          // Fire particles last 0.6s
          const particleProgress = Math.min(elapsed / 900, 1);
          const numParticles = 15; // Reduced from 12 to 8 particles

          for (let p = 0; p < numParticles; p++) {
            const angle = (p / numParticles) * Math.PI * 2 + elapsed * 0.01 + (p * 0.2);
            const distance =
              particleProgress *
              blockSize *
              3.5 *
              (1 + Math.sin(elapsed * 0.02 + p) * 0.3);
            const particleX = center.x + Math.cos(angle) * distance;
            const particleY =
              center.y +
              Math.sin(angle) * distance -
              particleProgress * blockSize * 0.5; // Rise up

            // Particle size shrinks over time
            const particleSize =
              blockSize * 0.25 * (1 - particleProgress * 0.7);

            // Color shifts from white -> yellow -> orange -> red -> fade
            let particleColor;
            if (particleProgress < 0.2) {
              particleColor = "#ffffff";
            } else if (particleProgress < 0.4) {
              particleColor = "#ffff00";
            } else if (particleProgress < 0.6) {
              particleColor = "#ff8800";
            } else {
              particleColor = "#ff3300";
            }

            ctx.save();
            ctx.globalAlpha = (1 - particleProgress) * 0.8;

            // Draw flame particle with glow
            const particleGradient = ctx.createRadialGradient(
              particleX,
              particleY,
              0,
              particleX,
              particleY,
              particleSize
            );
            particleGradient.addColorStop(0, particleColor);
            particleGradient.addColorStop(1, "rgba(255, 0, 0, 0)");

            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // SMOKE PUFFS 💨
        if (elapsed > 150 && elapsed < 1500) {
          // Reduced smoke duration from 1500ms to 1000ms
          // Smoke appears after initial flash
          const smokeProgress = Math.min((elapsed - 150) / 1350, 1);
          const numPuffs = 8; // Reduced from 6 to 4 puffs

          for (let s = 0; s < numPuffs; s++) {
            const angle = (s / numPuffs) * Math.PI * 2 + elapsed * 0.005 + (s * 0.5);
            const distance = smokeProgress * blockSize * 1.8;
            const puffX = center.x + Math.cos(angle) * distance;
            const puffY =center.y +
+           Math.sin(angle) * distance - smokeProgress * blockSize * 1.5; // Rise up more
            const puffSize = blockSize * 0.6 * (1 + smokeProgress * 0.5);

            ctx.save();
            ctx.globalAlpha = (1 - smokeProgress) * 0.75;

            // Gray smoke
            const smokeGradient = ctx.createRadialGradient(
              puffX,
              puffY,
              0,
              puffX,
              puffY,
              puffSize
            );
            smokeGradient.addColorStop(0, "#bbbbbb");
            smokeGradient.addColorStop(1, "rgba(80, 80, 80, 0)");

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
            center.x,
            center.y,
            0,
            center.x,
            center.y,
            blockSize * 2.5
          );
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(0.3, "#ffff00");
          gradient.addColorStop(1, "rgba(255, 200, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(center.x, center.y, blockSize * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw expanding shockwave rings
        if (shockwave.opacity > 0 && shockwave.radius > 0) {
          // Outer ring (red)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity * 0.8;
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Middle ring (orange)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity * 0.1;
          ctx.strokeStyle = "#ff6600";
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Inner ring (yellow-white)
          ctx.save();
          ctx.globalAlpha = shockwave.opacity;
          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(center.x, center.y, shockwave.radius * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // RENDER ANIMATED DEBRIS 🎯
      animStates.forEach((state) => {
        const body = state.body;
        const animPos = body.animatedPosition;
        
        if (!animPos) return;

        const opacity = Math.max(0, 1 - progress * 0.8);

        // Draw motion trail
        const velocityX = animPos.velocityX || 0;
        const velocityY = animPos.velocityY || 0;
        
        if (velocityX !== 0 || velocityY !== 0) {
          ctx.save();
          ctx.globalAlpha = opacity * 0.5;
          ctx.strokeStyle = body.render.fillStyle;
          ctx.lineWidth = blockSize * 0.8;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(animPos.x, animPos.y);
          ctx.lineTo(
            animPos.x - velocityX * 2,
            animPos.y - velocityY * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        // Draw debris block
        ctx.save();
        ctx.translate(animPos.x, animPos.y);
        ctx.rotate(animPos.angle);

        const dW = innerBlockSize * 0.8;
        const dH = innerBlockSize * 0.8;
        ctx.translate(-dW / 2, -dH / 2);

        const seedBody = (body.gridX * 73856093) ^ (body.gridY * 19349663);
        const colorHashBody = (body.render?.fillStyle || "#ffffff")
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

        drawRockTexture(
          ctx,
          Math.max(2, Math.min(dW, dH)),
          body.render?.fillStyle || "#999999",
          seedBody + colorHashBody,
          opacity
        );

        // Optional: stroke outer rock bounding to match debris look
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        // Draw a faint rounded rect boundary for readability
        ctx.beginPath();
        drawRoundedRect(ctx, 0, 0, dW, dH, Math.max(2, dW * 0.12));
        ctx.stroke();

        ctx.restore();
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateFrame);
      } else {
        if (animationFrame) cancelAnimationFrame(animationFrame);

        // Cleanup
        timeline.kill();
        cleanupPhysicsEngine(engine, null);
        staticGridCacheRef.current = null;
        staticGridCacheParamsRef.current = null;
        animationTimelineRef.current = null;
        animationStatesRef.current = null;

        setTimeout(() => {
          isBlastRunningRef.current = false;
          console.log("✅ Blast animation completed");
          onBlastComplete?.();
        }, 200);
      }
    };

    animationFrame = requestAnimationFrame(animateFrame);

    // Cleanup function
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (timeline) timeline.kill();
      cleanupPhysicsEngine(engine, null);
      isBlastRunningRef.current = false;
      staticGridCacheRef.current = null;
      staticGridCacheParamsRef.current = null;
      animationTimelineRef.current = null;
      animationStatesRef.current = null;
    };
  }, [
    blastTrigger,
    gridData,
    blockSize,
    canvasSize,
    innerBlockSize,
    cellSpacing,
    onBlastComplete,
    blasts,
    createStaticGridCache,
  ]);

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
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        borderRadius: "20px",
        backdropFilter: "blur(12px)",
        background: "rgba(255, 255, 255, 0.15)",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        padding: "10px",
        overflow: "hidden", // clip canvas to rounded container so textures can't escape
        boxSizing: "border-box",
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default GridCanvas;
