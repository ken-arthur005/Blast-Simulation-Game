import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useRef,
} from "react";
import GridDataProcessor from "../utils/gridDataProcessor";
import printGridDebugInfo from "../utils/printGridDebugInfo";
import GridCanvas from "./GridCanvas";
import GridLegend from "./GridLegend";
import GridInfo from "./GridInfo";
import { GameContext } from "./GameContext";
import {
  calculateAllAffectedCells,
  applyBlastToGrid,
} from "../utils/blastCalculator";
import BlastResults from "./BlastResults";


const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  const [gridData, setGridData] = useState(null);
  const [originalGridData, setOriginalGridData] = useState(null); // to keep an original deep copy of grid.
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [blockSize, setBlockSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    gameState,
    clearBlasts,
    setGameState,
    pendingDirection,
    setPendingDirection,
  } = useContext(GameContext);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastTrigger, setBlastTrigger] = useState(null);
  const [selectedBlast, setSelectedBlast] = useState(null);
  const csvDataRef = useRef(null);
  // Ref for synchronous next-placement direction to avoid setState batching/race conditions
  // Shape: { dir: string|null, explicit: boolean }
  // explicit === true means the user explicitly set this as the default for next placements
  const nextPlacementDirRef = useRef(
    pendingDirection
      ? { dir: pendingDirection, explicit: true }
      : { dir: null, explicit: false }
  );
  // Track the last placed blast synchronously so quick direction clicks after placement
  // can be applied to that blast even if React state hasn't updated selectedBlast yet.
  const lastPlacedRef = useRef(null);
  const [showBlastResults, setShowBlastResults] = useState(false);
  const handleCloseBlastResults = () => setShowBlastResults(false);
  const handleOpenBlastResults = () => setShowBlastResults(true);

  const handleTriggerBlast = () => {
    console.log("Blasts before calculating:", gameState.blasts);

    if (isBlasting) return;

    // Check if there are any blasts to trigger
    if (!gameState.blasts || gameState.blasts.length === 0) {
      console.log("No blasts to trigger");
      return;
    }

    // Use per-blast dirKey values (set at placement or via selection) when triggering.
    // mark local blasting state and prevent further placements immediately
    setIsBlasting(true);
    setGameState((prev) => ({ ...prev, canPlaceExplosives: false }));

    const affectedCells = calculateAllAffectedCells(
      gridData.grid,
      gameState.blasts
    );

    console.log("Affected cells count:", affectedCells.length);
    console.log("Affected cells:", affectedCells);
    console.log("Blast centers:", gameState.blasts);

    setBlastTrigger({ affectedCells, timestamp: Date.now() });
  };

  // Allow selecting a placed blast and updating its direction
  const setBlastDirection = (x, y, dirKey) => {
    console.debug("setBlastDirection called ->", { x, y, dirKey });
    setGameState((prev) => ({
      ...prev,
      blasts: prev.blasts.map((b) => {
        if (b.x === x && b.y === y) return { ...b, dirKey };
        return b;
      }),
    }));
  };

  // Handler passed to GridLegend: if a blast is selected, update that blast's dirKey,
  // otherwise update the global pendingDirection for future placements.
  // dir: direction key, opts: { applyToNext: boolean }
  const onSelectDirection = (dir, opts = {}) => {
    console.debug("onSelectDirection called ->", { dir, opts, selectedBlast });
    const applyToNext = opts.applyToNext === true;
    if (selectedBlast) {
      // Update the selected blast
      setBlastDirection(selectedBlast.x, selectedBlast.y, dir);
      // If requested, also set this as default for future placements
      if (applyToNext) {
        if (setPendingDirection) setPendingDirection(dir);
        nextPlacementDirRef.current = { dir, explicit: true };
        console.debug(
          "nextPlacementDirRef set (applyToNext) ->",
          nextPlacementDirRef.current
        );
      }
    } else {
      // If there was a very recent placement, and the user clicked a direction
      // immediately after placing, apply the direction to that last placed
      // blast so the UX is: place -> choose direction (no extra select needed).
      const last = lastPlacedRef.current;
      const now = Date.now();
      if (last && now - last.t < 2000) {
        console.debug("Applying direction to recently placed blast ->", {
          last,
          dir,
          applyToNext,
        });
        setBlastDirection(last.x, last.y, dir);
        // If requested, also set this as default for future placements
        if (applyToNext) {
          if (setPendingDirection) setPendingDirection(dir);
          nextPlacementDirRef.current = { dir, explicit: true };
        }
        // Clear lastPlaced marker after applying
        lastPlacedRef.current = null;
        return;
      }
      if (setPendingDirection) setPendingDirection(dir);
      // update ref synchronously so immediate next placement reads correct value
      nextPlacementDirRef.current = { dir, explicit: true };
      console.debug(
        "nextPlacementDirRef set (global select) ->",
        nextPlacementDirRef.current
      );
    }
  };

  const handleBlastComplete = () => {
    if (!gridData || !gridData.grid) {
      console.error("Grid data not ready yet.");
      return;
    }

    const affectedCells = calculateAllAffectedCells(
      gridData.grid,
      gameState.blasts
    );

    const updatedGrid = applyBlastToGrid(gridData.grid, affectedCells);

    const totalBlocks = gridData.grid.flat().length;
    const remainingBlocks = totalBlocks - affectedCells.length;
    console.log("Remaining blocks:", remainingBlocks);

    setGameState({
      ...gameState,
      materialsRemainedAfterDestroy: remainingBlocks,
      numberOfMaterialsDestroyed: affectedCells.length,
    });

    // Don't store destroyed grid in GameContext - only update local state
    setGridData((prevState) => ({
      ...prevState,
      grid: updatedGrid,
      remainingBlocks,
    }));

    setBlastTrigger(null);
    setIsBlasting(false);
    clearBlasts();
    setSelectedBlast(null);
    // reset pending direction for the next placement to no-selection (null)
    if (setPendingDirection) setPendingDirection(null);
    // clear next-placement ref
    if (nextPlacementDirRef) nextPlacementDirRef.current = null;

    // Add delay to ensure destroyed cells are rendered before showing alert
    setTimeout(() => {
      handleOpenBlastResults();

      setGameState((prev) => ({
        ...prev,
        canPlaceExplosives: false,
      }));
    }, 100); // Wait 0.1 seconds to ensure gray cells are visible

    console.log(
      "Blast complete! Destroyed:",
      affectedCells.length,
      "Remaining:",
      remainingBlocks,
      "TotalBlocks: ",
      totalBlocks
    );
  };

  const calculateOptimalSizing = useCallback((processedGrid) => {
    const { dimensions } = processedGrid;

    const preferredWidth = 576;
    const preferredHeight = 456;

    // Calculate what block size would be needed for preferred size
    const blockSizeByWidth = Math.floor(preferredWidth / dimensions.width);
    const blockSizeByHeight = Math.floor(preferredHeight / dimensions.height);
    let blockSize = Math.min(blockSizeByWidth, blockSizeByHeight);

    // Size constraints for readability
    const minBlockSize = 6;
    const maxBlockSize = 80;

    if (blockSize < minBlockSize || blockSize > maxBlockSize) {
      // Fall back to adaptive sizing if fixed size doesn't work well
      blockSize = Math.max(minBlockSize, Math.min(maxBlockSize, blockSize));

      // Use adaptive canvas size
      const canvasWidth = Math.min(dimensions.width * blockSize, 800);
      const canvasHeight = Math.min(dimensions.height * blockSize, 600);

      setCanvasSize({ width: canvasWidth, height: canvasHeight });

      console.log(
        `Using adaptive canvas: ${canvasWidth}x${canvasHeight} for extreme grid size`
      );
    } else {
      // Calculate exact canvas size to fit the grid perfectly
      const exactWidth = dimensions.width * blockSize;
      const exactHeight = dimensions.height * blockSize;

      setCanvasSize({ width: exactWidth, height: exactHeight });
      console.log(`Using exact fit canvas: ${exactWidth}x${exactHeight}`);
    }

    setBlockSize(blockSize);

    console.log(
      `Block size: ${blockSize}px for ${dimensions.width}x${dimensions.height} grid`
    );
  }, []);

  const MAX_BLASTS = 5;

  // Handler for when a block is clicked
  const handleCellClick = useCallback(
    (x, y) => {
      if (!gameState.canPlaceExplosives) {
        alert(
          "Please import a new CSV file or refresh the page to continue placing explosives."
        );
        return;
      }

      // If clicking an occupied cell, toggle selection for editing its direction
      const existing = gameState.blasts.find(
        (blast) => blast.x === x && blast.y === y
      );
      if (existing) {
        if (selectedBlast && selectedBlast.x === x && selectedBlast.y === y) {
          setSelectedBlast(null);
        } else {
          setSelectedBlast({ x, y });
        }
        return;
      }

      const newBlast = {
        x,
        y,
        radius: gameState.blastRadius,
        // Only assign a dirKey if the ref was explicitly set as a default for next placements
        dirKey:
          nextPlacementDirRef.current && nextPlacementDirRef.current.explicit
            ? nextPlacementDirRef.current.dir
            : null,
      };
      console.log(
        `Placing blast at (${x}, ${y}) with pendingDirection=`,
        pendingDirection,
        "newBlast=",
        newBlast
      );
      console.debug(
        "nextPlacementDirRef at placement ->",
        nextPlacementDirRef.current
      );

      // Check if we've reached the maximum number of blasts
      if (gameState.blasts.length >= MAX_BLASTS) {
        console.log(`Maximum number of blasts (${MAX_BLASTS}) reached.`);
        return;
      }

      setGameState((prev) => ({
        ...prev,
        blasts: [...prev.blasts, newBlast],
      }));
      // Select the newly placed blast so the user can immediately choose a direction
      // (clicking a direction will update this blast). This improves the UX where
      // users place an explosive then pick its direction.
      setSelectedBlast({ x, y });
      lastPlacedRef.current = { x, y, t: Date.now() };

      // After placing a blast we should not carry over the previous
      // pending direction UNLESS it was explicitly set by the user
      // as a default for next placements (applyToNext). If it's not
      // explicit, clear the ref/state to avoid accidental inheritance.
      if (
        !nextPlacementDirRef.current ||
        !nextPlacementDirRef.current.explicit
      ) {
        nextPlacementDirRef.current = { dir: null, explicit: false };
        if (setPendingDirection) setPendingDirection(null);
      }
    },
    [
      gameState.blasts,
      gameState.canPlaceExplosives,
      setGameState,
      gameState.blastRadius,
      pendingDirection,
      selectedBlast,
      setPendingDirection,
    ]
  );

  // Process CSV data when it changes
  useEffect(() => {
    if (csvData && csvData !== csvDataRef.current) {
      csvDataRef.current = csvData;

      // Immediately clear everything before processing
      setBlastTrigger(null);
      setIsBlasting(false);
      setGridData(null); // Clear grid data first

      setIsProcessing(true);
      console.log("Processing CSV data for grid visualization...");

      try {
        const processedGrid = GridDataProcessor.processCSVToGrid(csvData);

        if (
          processedGrid &&
          GridDataProcessor.validateGridData(processedGrid)
        ) {
          // Set new grid data
          setGridData(processedGrid);
          calculateOptimalSizing(processedGrid);
          printGridDebugInfo(processedGrid);

          // set originalGridData with deep copy of processedGrid
          setOriginalGridData(
            structuredClone
              ? structuredClone(processedGrid)
              : JSON.parse(JSON.stringify(processedGrid))
          );

          // Reset game state with fresh grid
          setGameState((prev) => ({
            ...prev,
            grid: processedGrid.grid,
            blasts: [],
            canPlaceExplosives: true,
          }));

          console.log("New CSV imported - game state reset");

          // Notify parent component
          if (onGridProcessed) {
            onGridProcessed(processedGrid);
          }
        } else {
          console.error("Failed to process CSV data into grid");
          setGridData(null);
        }
      } catch (error) {
        console.error("Error processing CSV data:", error);
        setGridData(null);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [csvData, onGridProcessed, calculateOptimalSizing, setGameState]);

  // Debug: watch blasts array for changes to help trace dirKey updates
  useEffect(() => {
    console.debug("gameState.blasts changed ->", gameState.blasts);
    console.debug("pendingDirection (state) ->", pendingDirection);
    console.debug(
      "nextPlacementDirRef (snapshot) ->",
      nextPlacementDirRef.current
    );
  }, [gameState.blasts, pendingDirection]);

  const handleCanvasReset = () => {
    if (!originalGridData) {
      console.error("No original grid data to restore");
      return;
    }

    // Deep clone to avoid reference issues
    const restoredGrid = structuredClone
      ? structuredClone(originalGridData)
      : JSON.parse(JSON.stringify(originalGridData));

    setGridData(restoredGrid);

    // Reset game state
    setGameState((prev) => ({
      ...prev,
      grid: restoredGrid.grid,
      blasts: [],
      canPlaceExplosives: true,
      materialsRemainedAfterDestroy: 0,
      numberOfMaterialsDestroyed: 0,
    }));

    // clear any selection
    setSelectedBlast(null);

    // also clear next-placement ref
    if (nextPlacementDirRef) nextPlacementDirRef.current = null;

    console.log("Canvas reset to original state");
  };

  // Loading state
  if (!csvData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Upload a CSV file to visualize the ore grid</p>
      </div>
    );
  }

  // Processing state
  if (isProcessing || !gridData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p>Processing grid data...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative">
      {/* center container */}
      <div className="absolute left-1/2 transform -translate-x-1/2  max-w-[70%]">
        <h2 className="text-xl font-bold mb-4">2D Ore Grid Visualization</h2>

        {/* Grid Information */}
        <GridInfo
          gridData={gridData}
          blockSize={blockSize}
          canvasSize={canvasSize}
        />

        {/* Canvas */}
        <GridCanvas
          gridData={gridData}
          canvasSize={canvasSize}
          blockSize={blockSize}
          blasts={gameState.blasts}
          selectedBlast={selectedBlast}
          onBlockClick={handleCellClick}
          blastTrigger={blastTrigger}
          onBlastComplete={handleBlastComplete}
        />
      </div>

      {/* Legend */}
      <div
        className="absolute top-8 right-4 w-66 z-50"
        style={{ zIndex: 50, pointerEvents: "auto" }}
      >
        <GridLegend
          oreTypes={gridData.metadata.oreTypes}
          onTriggerBlast={handleTriggerBlast}
          resetCanvas={handleCanvasReset}
          isBlasting={isBlasting}
          selectedBlast={selectedBlast}
          onSelectDirection={onSelectDirection}
        />
      </div>

      {/** BlastResults */}
      <BlastResults
        show={showBlastResults}
        onClose={handleCloseBlastResults}
        blastRadiusUsed={gameState.blastRadius}
        materialsDestroyed={gameState.numberOfMaterialsDestroyed}
        score={gameState.score}
        materialsRemained={gameState.materialsRemainedAfterDestroy}
        resetCanvas={handleCanvasReset}
      />
    </div>
  );
};

export default OreGridVisualization;
