import React, { useState, useRef, useEffect, useCallback } from "react";
import OreBlock from "../utils/oreBlock";
import { Engine, World, Runner, Events, Body } from "matter-js";
import {
  createBlastBodies,
  applyBlastForce,
  // cleanupPhysicsEngine,
  createBoundaryWalls,
  cleanupPhysicsEngine,
} from "../utils/physicsEngine";
import { gsap } from "gsap";
import OreValueMapper from "../utils/oreValueMapper";
import scoringLogic from "../utils/scoringLogic";
import GridTooltip from "./GridTooltip";
import {
  capturePhysicsTrajectories,
  animateBlastWithGSAP,
} from "../utils/animationHelpers";

import { drawRockTexture, drawRoundedRect } from "../utils/canvasUtils";

const GridCanvas = ({
  gridData,
  canvasSize,
  blockSize,
  blastTrigger,
  onBlastComplete,
  onDebrisSettled,
  fallenDebris,
  className = "",
  blasts = [],
  onBlockClick,
  cellGap = 8, // optional prop to control spacing between cells
  selectedBlast = null,
  fileResetKey = 0, // Trigger to force cleanup when new file is uploaded
  addRecoveryRecordToGameContext,
  updateScore,
  isPreparingReplay = false,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const blocksRef = useRef([]);
  // Use a ref for hover to avoid frequent React state updates on mousemove
  const hoveredBlockRef = useRef(null);
  const [destroyedCells, setDestroyedCells] = useState([]);
  // Tooltip state - disable on mobile devices based on screen width and user agent
  const isMobileDevice = () => {
    const userAgent =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const smallScreen = window.innerWidth < 768;
    return userAgent || smallScreen;
  };
  const [tooltipData, setTooltipData] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // const [fallenDebris, setFallenDebris] = useState([]);
  const hoverRafRef = useRef(null);
  const pendingHoverRef = useRef(null);
  // Cache for static grid during blast animation
  const staticGridCacheRef = useRef(null);
  const staticGridCacheParamsRef = useRef(null);
  // Merged offscreen cache for batch drawing the entire grid
  const gridRenderCacheRef = useRef(null);

  const [blastCompleted, setBlastCompleted] = useState(false);
  const isBlastRunningRef = useRef(false);

  const cellSpacing = cellGap; // spacing between cells in pixels
  const innerBlockSize = Math.max(4, blockSize - cellSpacing); // ensure a minimum inner size

  // Store current animation timeline for cleanup
  const animationTimelineRef = useRef(null);
  const animationStatesRef = useRef(null);

  // Helper: Create a cached canvas of static (non-affected) cells for fast rendering during blast
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

      // Note: Do NOT draw background here - it's drawn separately in animatePhysics
      // This prevents double background and z-order issues

      cacheCtx.save();
      cacheCtx.translate(offsetX, offsetY);

      // Draw only non-affected cells
      grid.forEach((row, y) => {
        row.forEach((cell, x) => {
          const isAffected = affectedCells.some((c) => c.x === x && c.y === y);

          if (!isAffected && cell) {
            const block = new OreBlock(cell, x, y, innerBlockSize);
            cacheCtx.save();
            cacheCtx.translate(
              x * (innerBlockSize + cellSpacing),
              y * (innerBlockSize + cellSpacing)
            );

            // Draw rounded background
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

            // Render ore clipped to rounded shape
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
            const colorToUse = blastCompleted
              ? "#808080"
              : block.getBlockColor();
            drawRockTexture(
              cacheCtx,
              rockSizeB,
              colorToUse,
              seedB + colorHashB
            );
            cacheCtx.restore();

            // Stroke border
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
    [gridData, innerBlockSize, cellSpacing, blastCompleted]
  );

  // Create OreBlock instances for each cell in the grid
  const createBlocks = useCallback(() => {
    if (!gridData || !gridData.grid) return [];
    const blocks = [];
    const { grid } = gridData;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        // Create OreBlock sized to the inner block size (so render aligns with spacing)
        const block = new OreBlock(cell, x, y, innerBlockSize);

        // Pre-render each block into an offscreen canvas to avoid expensive
        // procedural drawing on every animation frame.
        try {
          const off = document.createElement("canvas");
          off.width = innerBlockSize;
          off.height = innerBlockSize;
          const octx = off.getContext("2d");

          // Draw faint rounded background and the rock texture into cache
          const rrad = Math.max(4, innerBlockSize * 0.12);
          // background fill
          drawRoundedRect(octx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          octx.fillStyle = "rgba(255, 255, 255, 0.08)";
          octx.fill();

          // Clip and draw rock texture
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

          // stroke border
          drawRoundedRect(octx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          octx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          octx.lineWidth = 1.2;
          octx.stroke();

          block.cachedCanvas = off;
        } catch {
          // If offscreen canvas creation fails (non-browser env), ignore caching
          block.cachedCanvas = null;
        }

        blocks.push(block);
      });
    });
    return blocks;
  }, [gridData, innerBlockSize]);

  // Initialize blocks when grid changes and reset destroyed cells
  // Use gridData.grid as a dependency trigger since it changes on canvas reset
  useEffect(() => {
    if (gridData && gridData.grid) {
      blocksRef.current = createBlocks();
      setDestroyedCells([]);
      onDebrisSettled([]); // Clear fallen debris on reset
      setBlastCompleted(false); // Reset blast state
      // Clear gray caches
      // blocksRef.current.forEach((b) => (b.grayCachedCanvas = null));
      console.log(
        "Grid reset: blocks reinitialized and destroyed cells cleared"
      );
    }
  }, [fileResetKey]);

  // Create gray caches when blast completes
  useEffect(() => {
    if (!blastCompleted || !blocksRef.current.length) return;

    blocksRef.current.forEach((block) => {
      const isAffected = destroyedCells.some(
        (c) => c.x === block.gridX && c.y === block.gridY
      );

      if (
        !isAffected &&
        block.cell &&
        block.cell.oreType &&
        !block.grayCachedCanvas
      ) {
        const grayCanvas = document.createElement("canvas");
        grayCanvas.width = innerBlockSize;
        grayCanvas.height = innerBlockSize;
        const gctx = grayCanvas.getContext("2d");

        const rrad = Math.max(4, innerBlockSize * 0.12);
        drawRoundedRect(gctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
        gctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        gctx.fill();

        gctx.save();
        drawRoundedRect(gctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
        gctx.clip();
        const seed = (block.gridX * 73856093) ^ (block.gridY * 19349663);
        const hash = "#808080"
          .split("")
          .reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rockScale = 0.72;
        const rockSize = Math.max(2, Math.round(innerBlockSize * rockScale));
        const rockOffset = Math.round((innerBlockSize - rockSize) / 2);
        gctx.translate(rockOffset, rockOffset);
        drawRockTexture(gctx, rockSize, "#808080", seed + hash);
        gctx.restore();

        drawRoundedRect(gctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
        gctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        gctx.lineWidth = 1.2;
        gctx.stroke();

        block.grayCachedCanvas = grayCanvas;
      }
    });

    console.log("Gray caches created for unaffected blocks");
  }, [blastCompleted, destroyedCells, innerBlockSize]);

  // Render all blocks on the canvas
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

    // 1. Clear & fill background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- START: NEW RENDER LOGIC ---

    if (blastCompleted) {
      // --- RENDER PATH 1: POST-BLAST STATE ---
      // Draw the final state: a grayed-out grid with colored debris on top.

      // A. Draw the grayed-out background grid
      ctx.save();
      ctx.translate(offsetX, offsetY);
      grid.forEach((row, y) => {
        row.forEach((cell, x) => {
          const renderX = x * (innerBlockSize + cellSpacing);
          const renderY = y * (innerBlockSize + cellSpacing);
          const rrad = Math.max(4, innerBlockSize * 0.12);

          ctx.save();
          ctx.translate(renderX, renderY);

          // Draw the empty grid slot background and border
          drawRoundedRect(ctx, 0, 0, innerBlockSize, innerBlockSize, rrad);
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // If the cell still exists (was not destroyed), draw it in gray
          if (cell) {
            const seed = (x * 73856093) ^ (y * 19349663);
            const colorHash = "#808080"
              .split("")
              .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const rockSize = Math.max(2, Math.round(innerBlockSize * 0.72));
            const rockOffset = Math.round((innerBlockSize - rockSize) / 2);

            ctx.save();
            ctx.clip(); // Clip to the rounded rect of the slot
            ctx.translate(rockOffset, rockOffset);
            drawRockTexture(ctx, rockSize, "#808080", seed + colorHash);
            ctx.restore();
          }

          ctx.restore();
        });
      });
      ctx.restore(); // Restore from the grid's main translation

      // B. Draw the colored fallen debris on top
      fallenDebris.forEach((debris) => {
        ctx.save();
        ctx.translate(debris.x, debris.y);
        ctx.rotate(debris.angle);
        ctx.translate(-debris.width / 2, -debris.height / 2);

        const seedDebris =
          (debris.gridX * 73856093) ^ (debris.gridY * 19349663);
        const colorHashDebris = (debris.color || "#ffffff")
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

        drawRockTexture(
          ctx,
          Math.max(2, debris.width),
          debris.color,
          seedDebris + colorHashDebris
        );
        ctx.restore();
      });
    } else {
      // --- RENDER PATH 2: PRE-BLAST STATE ---
      // Draw the normal, full-color grid with blast markers.
      ctx.save();
      ctx.translate(offsetX, offsetY);
      blocksRef.current.forEach((block) => {
        if (block.cachedCanvas && block.cell && block.cell.oreType) {
          const renderX = block.gridX * (innerBlockSize + cellSpacing);
          const renderY = block.gridY * (innerBlockSize + cellSpacing);
          ctx.drawImage(block.cachedCanvas, renderX, renderY);
        }
      });

      // Draw Blast Markers
      blasts.forEach((blast) => {
        const { x, y } = blast;
        const centerX = x * (innerBlockSize + cellSpacing) + innerBlockSize / 2;
        const centerY = y * (innerBlockSize + cellSpacing) + innerBlockSize / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerBlockSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerBlockSize * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

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
        if (selectedBlast && selectedBlast.x === x && selectedBlast.y === y) {
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(37, 99, 235, 0.9)";
          ctx.arc(centerX, centerY, blockSize * 0.42, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // --- END: NEW RENDER LOGIC ---
  }, [
    gridData,
    blasts,
    innerBlockSize,
    cellSpacing,
    blockSize,
    selectedBlast,
    blastCompleted,
    fallenDebris,
  ]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Clear visual state when preparing for replay
  useEffect(() => {
    if (!isPreparingReplay) return;

    console.log("🔄 Preparing for replay - clearing all visual state...");

    // Clear destroyed cells to show all blocks
    setDestroyedCells([]);
    setBlastCompleted(false);

    // Clear all gray caches so original colors show
    blocksRef.current.forEach((block) => {
      block.grayCachedCanvas = null;
    });

    // Force render cache rebuild
    gridRenderCacheRef.current = null;

    // Trigger a re-render
    renderCanvas();
  }, [isPreparingReplay, renderCanvas]);

  // Build or rebuild the merged offscreen cache used by the fast-path draw.
  // This is purely visual optimization and does not change any UI or behavior.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridData || !gridData.grid) {
      gridRenderCacheRef.current = null;
      return;
    }

    try {
      // createStaticGridCache returns an offscreen canvas sized to match the main canvas
      gridRenderCacheRef.current = createStaticGridCache(destroyedCells || []);
      console.log("Grid render cache rebuilt", {
        blastCompleted,
        destroyedCellsCount: destroyedCells?.length || 0,
        cacheCreated: !!gridRenderCacheRef.current,
      });
    } catch {
      gridRenderCacheRef.current = null;
    }

    return () => {
      gridRenderCacheRef.current = null;
    };
  }, [
    gridData,
    destroyedCells,
    innerBlockSize,
    cellSpacing,
    canvasSize,
    createStaticGridCache,
    blastCompleted,
  ]);

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
      // this guard clause disables clicks during the animation.
      if (isBlastRunningRef.current) return;

      if (!onBlockClick || !canvasRef.current) return;

      // Get canvas-relative click coordinates
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const pixelX = (event.clientX - rect.left) * scaleX;
      const pixelY = (event.clientY - rect.top) * scaleY;

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

  // Throttle timestamp for hover - limit to 60fps max (16ms)
  const lastHoverTimeRef = useRef(0);

  const handleMouseMove = useCallback(
    (event) => {
      // this guard clause disables the entire hover effect during the animation.
      if (isBlastRunningRef.current) return;

      // Throttle to max 60fps to prevent excessive updates
      const now = performance.now();
      if (now - lastHoverTimeRef.current < 16) return;
      lastHoverTimeRef.current = now;

      // Update mouse position for tooltip
      setMousePosition({ x: event.clientX, y: event.clientY });

      // Throttle hover updates via requestAnimationFrame to reduce full-canvas redraws
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const pixelX = (event.clientX - rect.left) * scaleX;
      const pixelY = (event.clientY - rect.top) * scaleY;

      const gridCoords = getGridCoords(pixelX, pixelY);
      pendingHoverRef.current = gridCoords || null;

      // Update tooltip data - skip on mobile devices
      if (!isMobileDevice() && gridCoords && gridData?.grid) {
        const cell = gridData.grid[gridCoords.y]?.[gridCoords.x];
        if (cell) {
          setTooltipData({
            cell,
            gridX: gridCoords.x,
            gridY: gridCoords.y,
          });
        } else {
          setTooltipData(null);
        }
      } else {
        setTooltipData(null);
      }

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
    [getGridCoords, renderCanvas, drawHoverOverlay, gridData]
  ); // Dependency on 'getGridCoords' and 'hoveredBlock'

  // Mouse Leave Handler
  const handleMouseLeave = useCallback(() => {
    // this guard clause prevents clearing the canvas when the mouse leaves during an animation.
    if (isBlastRunningRef.current) return;

    // cancel pending RAF and clear
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingHoverRef.current = null;
    hoveredBlockRef.current = null;
    // Clear tooltip
    setTooltipData(null);
    // re-render base canvas to clear overlays
    renderCanvas();
  }, [renderCanvas]);

  // Add a ref to track if blast is already running
  // const isBlastRunningRef = useRef(false);
  const bodiesRef = useRef([]);
  const isInReplayModeRef = useRef(false);

  useEffect(() => {
    // Clear ALL flags if trigger is cleared after replay
    if (
      !blastTrigger &&
      (isInReplayModeRef.current || isBlastRunningRef.current)
    ) {
      console.log("🎬 Trigger cleared - resetting all blast flags");
      isInReplayModeRef.current = false;
      isBlastRunningRef.current = false;
      return;
    }

    if (!blastTrigger || !gridData || !gridData.grid || !gridData.grid.length)
      return;

    const isReplayMode = blastTrigger.isReplay === true;

    // PREVENT DOUBLE EXECUTION - check both running flag and replay mode
    if (isBlastRunningRef.current) {
      // Silently skip duplicate trigger (common in React StrictMode during development)
      return;
    }

    // Check if we're already in replay mode (prevents duplicate replay processing)
    if (isReplayMode && isInReplayModeRef.current) {
      console.warn(
        "⚠️ Already in replay mode, skipping duplicate replay trigger",
        {
          currentTimestamp: blastTrigger.timestamp,
          isBlastRunning: isBlastRunningRef.current,
        }
      );
      return;
    }

    // Mark blast as running IMMEDIATELY before any state changes
    // This prevents duplicate triggers during state update renders
    isBlastRunningRef.current = true;

    // Track replay mode BEFORE any state changes
    if (isReplayMode) {
      isInReplayModeRef.current = true;
      console.log("🔒 Replay mode locked");
    }
    console.log(
      isReplayMode
        ? "🎬 Starting REPLAY animation"
        : "✅ Starting NEW blast animation"
    );
    console.log("🔍 Flag states at animation start:", {
      isBlastRunning: isBlastRunningRef.current,
      isInReplayMode: isInReplayModeRef.current,
      triggerTimestamp: blastTrigger.timestamp,
    });

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");

    const { affectedCells, replayData } = blastTrigger;

    // If replay mode, reset the visual state to show original colors
    if (isReplayMode) {
      console.log("🔄 Resetting visual state for replay...");
      // Clear destroyed cells to show all original ore colors
      setDestroyedCells([]);
      setBlastCompleted(false); // Reset blast completed flag

      // Clear gray caches so original colors show
      blocksRef.current.forEach((block) => {
        block.grayCachedCanvas = null;
      });

      gridRenderCacheRef.current = null; // Force cache rebuild with original colors
    }
    console.debug("GridCanvas: blastTrigger received", {
      affectedCellsCount: affectedCells?.length,
      affectedSample: affectedCells?.slice?.(0, 6),
      blastTrigger,
    });
    console.log("Starting blast animation...");

    // Calculate grid offset for centering (same as in renderCanvas)
    // const actualGridWidth = gridData.grid[0].length * blockSize;
    // const actualGridHeight = gridData.grid.length * blockSize;
    const actualGridWidth =
      gridData.grid[0].length * (innerBlockSize + cellSpacing) - cellSpacing;
    const actualGridHeight =
      gridData.grid.length * (innerBlockSize + cellSpacing) - cellSpacing;

    const offsetX = Math.floor((canvas.width - actualGridWidth) / 2);
    const offsetY = Math.floor((canvas.height - actualGridHeight) / 2);

    // VIOLENT CANVAS SHAKE 🔥
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

    // Create Matter.js physics engine
    const engine = Engine.create({
      gravity: { x: 0, y: 0.6 }, // Reduced gravity from 0.8 to 0.6 for faster settling
    });

    // const runner = Runner.create();

    // Create boundary walls to contain debris
    const walls = createBoundaryWalls(canvasSize);
    World.add(engine.world, walls);

    // Create bodies for affected cells
    // Create physics bodies sized to the inner block size so visual debris matches spacing
    // Pass stride = innerBlockSize + cellSpacing so bodies are positioned in the same grid layout
    const stride = innerBlockSize + cellSpacing;

    // Use replay data if available
    const replayPhysicsData =
      isReplayMode && replayData
        ? {
            initialPositions: replayData.initialPositions,
            physicsState: replayData.physicsState,
          }
        : null;

    const { bodies, initialPositions } = createBlastBodies(
      affectedCells,
      innerBlockSize,
      { x: offsetX, y: offsetY },
      gridData,
      stride,
      replayPhysicsData
    );

    console.debug("GridCanvas: created bodies", {
      count: bodies.length,
      initialPositions: initialPositions.length,
      replayMode: isReplayMode,
    });

    // Add bodies to the world
    World.add(engine.world, bodies);

    // Store bodies in ref so we can access them later with updated colors
    bodiesRef.current = bodies;

    // Calculate blast centers - use replay data if available
    let blastCenters;
    if (isReplayMode && replayData?.blastCenters) {
      blastCenters = replayData.blastCenters;
      console.log("🎬 Using stored blast centers for replay");
    } else {
      // Calculate blast centers in pixel coordinates and include dirKey for directional bias
      const uniqueCoords = [
        ...new Set(affectedCells.map((c) => `${c.blastX},${c.blastY}`)),
      ];
      blastCenters = uniqueCoords.map((coord) => {
        const [x, y] = coord.split(",").map(Number);
        // find matching blast object (if available) to read dirKey
        const matchingBlast = blasts?.find((b) => b.x === x && b.y === y) || {};
        console.log(
          `🎯 Creating blast center at grid(${x}, ${y}) with direction: "${
            matchingBlast.dirKey || "radial"
          }"`
        );
        return {
          x: x * stride + offsetX + innerBlockSize / 2,
          y: y * stride + offsetY + innerBlockSize / 2,
          dirKey: matchingBlast.dirKey || null,
        };
      });
    }

    // Apply blast forces (tunable factor)
    // Diagnostic overlay: draw small markers at computed blast centers so we can see where
    // the engine expects the epicenters (helpful when debugging off-canvas placements)
    try {
      ctx.save();
      blastCenters.forEach((c, i) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,0,0,0.9)";
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.fillText(String(i), c.x + 6, c.y + 4);
      });
      ctx.restore();
    } catch {
      /* ignore diagnostics errors */
    }

    // Apply blast force - use replay data if available
    const physicsState = applyBlastForce(
      bodies,
      blastCenters,
      0.02,
      isReplayMode && replayData ? replayData.physicsState : null
    );

    console.log("📊 Capturing physics trajectories...");

    // Use stored trajectories in replay mode, otherwise capture new ones
    let trajectories;
    if (isReplayMode && replayData?.trajectories) {
      // Reconstruct trajectories by linking keyframes back to bodies
      trajectories = replayData.trajectories.map((t) => {
        const body = bodies.find(
          (b) =>
            b.gridX === t.body.gridX &&
            b.gridY === t.body.gridY &&
            b.oreType === t.body.oreType
        );
        return {
          body: body || t.body, // Use actual body or fallback to stored data
          keyframes: t.keyframes,
        };
      });
      console.log(
        `🎬 Using ${trajectories.length} stored trajectories for replay`
      );
    } else {
      trajectories = capturePhysicsTrajectories(bodies, engine, 120);
      console.log(`✅ Captured ${trajectories.length} new trajectories`);

      // Store physics state for future replay (only for new blasts)
      // Note: score will be added later after it's calculated
      // Strip out circular references from trajectories for storage
      if (typeof window !== "undefined") {
        const cleanTrajectories = trajectories.map((t) => ({
          body: {
            id: t.body.id,
            gridX: t.body.gridX,
            gridY: t.body.gridY,
            oreType: t.body.oreType,
          },
          keyframes: t.keyframes.map((kf) => ({
            x: kf.x,
            y: kf.y,
            angle: kf.angle,
            frame: kf.frame,
          })),
        }));

        window.lastBlastPhysicsState = {
          initialPositions,
          physicsState,
          trajectories: cleanTrajectories,
          affectedCells,
          blastCenters,
          timestamp: Date.now(),
          expectedScore: null, // Will be set after score calculation
        };
      }
    }

    // Step 6: Reset bodies to original positions for animation
    bodies.forEach((body) => {
      const startPos = trajectories.find((t) => t.body.id === body.id)
        ?.keyframes[0];
      if (startPos) {
        Body.setPosition(body, { x: startPos.x, y: startPos.y });
        Body.setAngle(body, 0);
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
      }
    });
    // OPTIMIZED: Reduced from 6s to 4.5s to match faster animation (meets 5s requirement)
    const scoringTimeout = setTimeout(() => {
      const recoveryY = canvas.height * 0.8;
      const neighborRadius = 50; // Pixels to check for mixing
      const highValueThreshold = 50; // From oreValueMapper

      // Apply colors to bodies (needed for both normal blast and replay)
      bodies.forEach((body) => {
        const value = OreValueMapper.getValue(body.oreType);
        let isDiluted = false;

        if (body.position.y > recoveryY) {
          // In recovery zone: check for mixing
          const neighbors = bodies.filter((other) => {
            if (other === body) return false;
            const dist = Math.hypot(
              body.position.x - other.position.x,
              body.position.y - other.position.y
            );
            return dist <= neighborRadius;
          });
          const lowValueNeighbors = neighbors.filter(
            (n) => OreValueMapper.getValue(n.oreType) < highValueThreshold
          ).length;

          if (value >= highValueThreshold && lowValueNeighbors >= 1) {
            isDiluted = true; // High-value mixed with low-value
          } else if (value < highValueThreshold) {
            isDiluted = true; // Low-value is always diluted
          }
        } else {
          isDiluted = true; // Outside zone
        }

        body.render.fillStyle = isDiluted ? "#FF0000" : "#00FF00";
      });

      // Update the ref with the colored bodies so snapshot can use them
      bodiesRef.current = bodies;

      // Skip score calculation and updates during replay
      if (isReplayMode) {
        console.log(
          "🎬 Skipping score calculation for replay (colors applied)"
        );
        return;
      }

      // Calculate feedback
      const totalOres = bodies.length;
      const recovered = bodies.filter(
        (b) => b.render.fillStyle === "#00FF00"
      ).length;
      const diluted = bodies.filter(
        (b) => b.render.fillStyle === "#FF0000"
      ).length;
      const totalValue = bodies.reduce(
        (sum, b) => sum + OreValueMapper.getValue(b.oreType),
        0
      );
      const recoveredValue = bodies
        .filter((b) => b.render.fillStyle === "#00FF00")
        .reduce((sum, b) => sum + OreValueMapper.getValue(b.oreType), 0);
      const efficiency =
        totalValue > 0 ? Math.round((recoveredValue / totalValue) * 100) : 0;

      console.log(
        `Recovery Info:
        Total: ${totalOres}, Recovered: ${recovered}, Diluted: ${diluted}, Efficiency: ${efficiency}%
        `
      );

      // Calculate final score using scoringLogic
      const scoreResult = scoringLogic(totalOres, recovered, diluted, 10);
      console.log("📊 Score calculated:", scoreResult.finalScore);

      // Store the score with physics state for future replay validation
      if (typeof window !== "undefined" && window.lastBlastPhysicsState) {
        window.lastBlastPhysicsState.expectedScore = scoreResult.finalScore;
        window.lastBlastPhysicsState.expectedRecoveryRate =
          scoreResult.recoveryRate;
        window.lastBlastPhysicsState.expectedDilutionRate =
          scoreResult.dilutionRate;
      }

      // Update the game score
      if (updateScore) {
        updateScore(scoreResult.finalScore);
      }

      // Add recovery record to game context
      addRecoveryRecordToGameContext({
        totalOres: totalOres,
        recoveredCount: recovered,
        dilutedCount: diluted,
        efficiency: efficiency,
        finalScore: scoreResult.finalScore,
        recoveryRate: scoreResult.recoveryRate,
        dilutionRate: scoreResult.dilutionRate,
      });
    }, 4500); // OPTIMIZED: Reduced from 6000ms to match 7s animation

    // Shockwave animation state
    const shockwaves = blastCenters.map(() => ({
      radius: 0,
      opacity: 1,
      flashOpacity: 1,
    }));

    // Pre-render static grid cache for faster animation rendering
    const staticGridCache = createStaticGridCache(affectedCells);
    staticGridCacheRef.current = staticGridCache;
    staticGridCacheParamsRef.current = {
      offsetX,
      offsetY,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    console.debug("GridCanvas: Static cache created", {
      affectedCellsCount: affectedCells.length,
      cacheCreated: !!staticGridCache,
    });

    // Mark affected cells as destroyed immediately ONLY for new blasts
    // For replay, add a delay to show original colors first
    if (!isReplayMode) {
      setDestroyedCells((prev) => [...prev, ...affectedCells]);
    } else {
      // For replay, mark them destroyed after a delay to show original colors
      setTimeout(() => {
        setDestroyedCells((prev) => [...prev, ...affectedCells]);
      }, 500); // 500ms delay to show all original colors before blast starts
    }

    console.log(" Starting GSAP animation...");
    const animationDuration = 2.5; // seconds
    const { timeline, animStates } = animateBlastWithGSAP(
      trajectories,
      animationDuration
    );

    animationTimelineRef.current = timeline;
    animationStatesRef.current = animStates;

    // After GSAP animation ends, keep syncing animatedPosition with physics positions
    let physicsSyncTicker = null;
    timeline.eventCallback("onComplete", () => {
      console.log(
        "GSAP animation complete - switching to physics-driven rendering"
      );

      // Create a ticker function that updates animatedPosition from physics
      physicsSyncTicker = () => {
        animStates.forEach((state) => {
          // Sync visual position with physics position
          state.body.animatedPosition = {
            x: state.body.position.x,
            y: state.body.position.y,
            angle: state.body.angle,
            velocityX: state.body.velocity.x,
            velocityY: state.body.velocity.y,
          };
        });
      };

      // Add ticker to GSAP's global ticker (runs every frame)
      gsap.ticker.add(physicsSyncTicker);
    });

    const startTime = performance.now();

    // OPTIMIZED: Reduced from 9s to 7s for faster blast completion (meets 5s requirement with margin)
    const duration = 7000;
    const shockwaveDuration = 350;
    const flashDuration = 100;
    let animationFrame;

    const animatePhysics = (time) => {
      // Safety check - if grid data is gone, stop animation
      if (!gridData || !gridData.grid || !gridData.grid.length) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        // Runner.stop(runner);
        timeline.kill();
        cleanupPhysicsEngine(engine, null);
        isBlastRunningRef.current = false; // Reset flag
        return;
      }

      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const shockwaveProgress = Math.min(elapsed / shockwaveDuration, 1);
      const flashProgress = Math.min(elapsed / flashDuration, 1);

      // OPTIMIZED: Use adaptive physics update - 30fps after GSAP phase for better performance
      const physicsTimestep = elapsed < 3000 ? 1000 / 60 : 1000 / 30;
      Engine.update(engine, physicsTimestep);

      // During GSAP animation phase (first 3s): sync physics bodies to GSAP positions
      if (elapsed < 3000) {
        animStates.forEach((state) => {
          const animPos = state.body.animatedPosition;
          if (animPos) {
            // Override physics positions with GSAP animated positions
            Body.setPosition(state.body, { x: animPos.x, y: animPos.y });
            Body.setAngle(state.body, animPos.angle);
            //  Apply some velocity for momentum carry-over
            Body.setVelocity(state.body, {
              x: state.animVelocityX * 0.5,
              y: state.animVelocityY * 0.5,
            });
          }
        });
      }

      // OPTIMIZED: Batch canvas operations for better performance
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw cached static grid instead of redrawing every frame
      if (staticGridCache) {
        try {
          ctx.drawImage(staticGridCache, 0, 0);
        } catch {
          // fallback if cache fails
        }
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // OPTIMIZED: Skip this expensive rendering - affected cells are cached in staticGridCache
      // Only render for first few milliseconds if really needed
      if (false && elapsed < 3) {
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
      // OPTIMIZED: Skip shockwave rendering entirely if all effects are faded
      if (elapsed < shockwaveDuration + 1000) {
        blastCenters.forEach((center, i) => {
          const shockwave = shockwaves[i];

          // Update shockwave properties
          shockwave.radius = shockwaveProgress * blockSize * 3; // Reduced from 4 to 3 block radius
          shockwave.opacity = Math.max(0, 1 - shockwaveProgress);
          shockwave.flashOpacity = Math.max(0, 1 - flashProgress * 2);

          // FIRE/EXPLOSION PARTICLES 🔥💥
          if (elapsed < 600) {
            // Fire particles last ~0.6s (visual window)
            const particleProgress = Math.min(elapsed / 600, 1);
            // Optimized particle count for 10k+ blocks - reduced from 6 to 4 for better performance
            const numParticles = 4;

            for (let p = 0; p < numParticles; p++) {
              const angle =
                (p / numParticles) * Math.PI * 2 + elapsed * 0.01 + p * 0.2;
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
          if (elapsed > 200 && elapsed < 1000) {
            // Smoke appears after initial flash; keep duration short to reduce work
            const smokeProgress = Math.min((elapsed - 200) / 800, 1);
            const numPuffs = 2; // Optimized for 10k+ blocks - reduced from 3 to 2 for better performance

            for (let s = 0; s < numPuffs; s++) {
              const angle =
                (s / numPuffs) * Math.PI * 2 + elapsed * 0.005 + s * 0.5;
              const distance = smokeProgress * blockSize * 1.8;
              const puffX = center.x + Math.cos(angle) * distance;
              const puffY =
                center.y +
                Math.sin(angle) * distance -
                smokeProgress * blockSize * 1.5; // Rise up more
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
      } // End shockwave early exit optimization

      // Render physics bodies (affected cells as debris) with motion trails 🔥
      // OPTIMIZED: Add viewport culling and pre-compute shared values
      const canvasWidth = canvasSize.width;
      const canvasHeight = canvasSize.height;
      const cullMargin = blockSize * 2; // Allow some margin for partially visible blocks
      const minX = -cullMargin;
      const maxX = canvasWidth + cullMargin;
      const minY = -cullMargin;
      const maxY = canvasHeight + cullMargin;
      const opacity = Math.max(0, 1 - progress * 0.8);

      animStates.forEach((state) => {
        const body = state.body;
        // Use GSAP position during animation phase, physics position after
        const animPos = body.animatedPosition || {
          x: body.position.x, // ← Fallback to actual physics position
          y: body.position.y,
          angle: body.angle,
          velocityX: body.velocity.x,
          velocityY: body.velocity.y,
        };

        // OPTIMIZED: Skip rendering debris that's completely off-screen
        if (
          animPos.x < minX ||
          animPos.x > maxX ||
          animPos.y < minY ||
          animPos.y > maxY
        ) {
          return; // Cull off-screen debris
        }

        // Draw motion trail - skip for very slow moving debris to save draw calls
        const velocityX = animPos.velocityX || 0;
        const velocityY = animPos.velocityY || 0;
        const velocityMag = Math.hypot(velocityX, velocityY);

        // Only draw trail if velocity is significant (optimization for 10k+ blocks)
        if (velocityMag > 0.5) {
          ctx.save();
          ctx.globalAlpha = opacity * 0.05;
          ctx.strokeStyle = body.render.fillStyle;
          ctx.lineWidth = blockSize * 0.4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(body.position.x, body.position.y);
          ctx.lineTo(animPos.x - velocityX * 2, animPos.y - velocityY * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Draw debris block
        ctx.save();
        ctx.translate(animPos.x, animPos.y);
        ctx.rotate(body.angle);

        // OPTIMIZED: Use pre-computed debris dimensions
        const dW = innerBlockSize * 0.8;
        const dH = innerBlockSize * 0.8;
        // Position the rock texture so it's centered at the body's position
        const halfDW = dW * 0.5;
        ctx.translate(-halfDW, -halfDW);

        // OPTIMIZED: Compute seed and color hash more efficiently
        const seedBody = (body.gridX * 73856093) ^ (body.gridY * 19349663);
        const fillStyle = body.render?.fillStyle || "#999999";
        const colorHashBody = fillStyle.charCodeAt(1) + fillStyle.charCodeAt(2); // Simplified hash

        // Draw rock texture with overall opacity applied
        drawRockTexture(
          ctx,
          dW, // Use dW directly since we know it's > 2
          fillStyle,
          seedBody + colorHashBody,
          opacity
        );

        // OPTIMIZED: Simplified border rendering
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cornerRadius = dW * 0.12;
        drawRoundedRect(ctx, 0, 0, dW, dH, cornerRadius);
        ctx.stroke();

        ctx.restore();
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animatePhysics);
      } else {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }

        // Stop physics simulation and cleanup
        timeline.kill();

        if (physicsSyncTicker) {
          gsap.ticker.remove(physicsSyncTicker);
          physicsSyncTicker = null;
        }

        cleanupPhysicsEngine(engine, null);
        staticGridCacheRef.current = null;
        staticGridCacheParamsRef.current = null;
        animationTimelineRef.current = null;
        animationStatesRef.current = null;

        // Clear cache immediately when animation completes to prevent next blast interference
        staticGridCacheRef.current = null;
        staticGridCacheParamsRef.current = null;

        // For replays, keep isBlastRunningRef true until after onBlastComplete is called
        // This prevents duplicate replay triggers during state updates
        if (!isReplayMode) {
          isBlastRunningRef.current = false;
        }
        setBlastCompleted(true);

        // Apply recovery colors immediately before creating snapshot
        // This ensures debris colors are captured correctly
        const recoveryY = canvas.height * 0.8;
        const neighborRadius = 50;
        const highValueThreshold = 50;

        bodies.forEach((body) => {
          const value = OreValueMapper.getValue(body.oreType);
          let isDiluted = false;

          if (body.position.y > recoveryY) {
            const neighbors = bodies.filter((other) => {
              if (other === body) return false;
              const dist = Math.hypot(
                body.position.x - other.position.x,
                body.position.y - other.position.y
              );
              return dist <= neighborRadius;
            });
            const lowValueNeighbors = neighbors.filter(
              (n) => OreValueMapper.getValue(n.oreType) < highValueThreshold
            ).length;

            if (value >= highValueThreshold && lowValueNeighbors >= 1) {
              isDiluted = true;
            } else if (value < highValueThreshold) {
              isDiluted = true;
            }
          } else {
            isDiluted = true;
          }

          body.render.fillStyle = isDiluted ? "#FF0000" : "#00FF00";
        });

        bodiesRef.current = bodies;

        // Save fallen debris positions WITH their final colors (green/red)
        // Use bodiesRef which has been updated with colors from the recovery timeout
        // const debrisSnapshot = bodiesRef.current.map((body) => ({
        //   x: body.position.x,
        //   y: body.position.y,
        //   angle: body.angle,
        //   width: innerBlockSize * 0.8,
        //   height: innerBlockSize * 0.8,
        //   color: body.render?.fillStyle || "#999999",
        //   gridX: body.gridX,
        //   gridY: body.gridY,
        //   oreType: body.oreType,
        // }));

        // --- CORRECTED DEBRIS SNAPSHOT LOGIC ---
        // We now map over `bodiesRef.current`, which holds the live Matter.js bodies
        // with their final, settled positions and the correct recovery colors.
        const debrisSnapshot = bodiesRef.current.map((body) => ({
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          width: innerBlockSize * 0.8,
          height: innerBlockSize * 0.8,
          color: body.render?.fillStyle || "#999999", // This color was set by the scoring timeout
          gridX: body.gridX,
          gridY: body.gridY,
          oreType: body.oreType,
        }));

        // setFallenDebris(debrisSnapshot);
        if (onDebrisSettled) {
          onDebrisSettled(debrisSnapshot);
        }

        // Invalidate grid cache to trigger rebuild with gray colors
        gridRenderCacheRef.current = null;

        console.log("Blast animation completed", {
          debrisCount: debrisSnapshot.length,
          blastCompletedSet: true,
          isReplay: isReplayMode,
        });

        // Trigger onBlastComplete for both new blasts and replays
        if (!isReplayMode && onBlastComplete) {
          onBlastComplete();
        } else if (isReplayMode) {
          console.log(
            "🎬 Replay completed - showing results and clearing trigger"
          );

          // Show results modal after a delay to ensure animation is fully complete
          // Keep both isInReplayModeRef and isBlastRunningRef set to true
          // They will be cleared automatically when the effect detects trigger is null
          setTimeout(() => {
            console.log("🎬 Showing results after replay");

            // Show results modal (true = replay completion, clears trigger and opens modal)
            // This will set blastTrigger to null, which triggers the early check above
            // that clears both isInReplayModeRef and isBlastRunningRef
            if (onBlastComplete) {
              onBlastComplete(true);
            }
          }, 200); // Wait 200ms after debris settles for gray caches to render
        }
      }
    };

    animationFrame = requestAnimationFrame(animatePhysics);

    return () => {
      // Only cleanup if we're not in the middle of a blast
      // This prevents killing the animation when duplicate triggers are blocked
      if (!isBlastRunningRef.current && !isInReplayModeRef.current) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        if (timeline) timeline.kill();

        if (physicsSyncTicker) {
          gsap.ticker.remove(physicsSyncTicker);
        }
      }

      // Clear the scoring timeout
      if (scoringTimeout) {
        clearTimeout(scoringTimeout);
      }

      cleanupPhysicsEngine(engine, null);
      // Don't reset blast flags here - they're managed explicitly in the effect logic
      // Resetting them in cleanup causes duplicate triggers during state updates
      // isBlastRunningRef.current = false;
      // isInReplayModeRef.current = false;
      bodiesRef.current = [];
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
    blasts,
    createStaticGridCache,
    renderCanvas,
    // NOTE: Deliberately excluding onBlastComplete, addRecoveryRecordToGameContext, updateScore, onDebrisSettled
    // from dependencies because they're used inside setTimeout/animation callbacks and we don't want
    // the effect to retrigger when they change. They're captured at the time the effect runs.
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
    <>
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          borderRadius: window.innerWidth < 640 ? "12px" : "20px",
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.15)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          padding:
            window.innerWidth >= 1024 && window.innerHeight <= 700
              ? "4px"
              : window.innerWidth < 640
              ? "6px"
              : "10px",
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
      <GridTooltip
        cell={tooltipData?.cell}
        gridX={tooltipData?.gridX}
        gridY={tooltipData?.gridY}
        mouseX={mousePosition.x}
        mouseY={mousePosition.y}
        visible={!!tooltipData}
      />
    </>
  );
};

export default GridCanvas;
