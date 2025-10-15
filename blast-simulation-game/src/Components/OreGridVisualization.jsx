import React, { useEffect, useState, useCallback, useContext } from "react";
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

const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  const [gridData, setGridData] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [blockSize, setBlockSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const { gameState, updateGrid, clearBlasts, setGameState } =
    useContext(GameContext);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastTrigger, setBlastTrigger] = useState(null);

  const handleTriggerBlast = () => {
    console.log("Blasts before calculating:", gameState.blasts);

    if (isBlasting) return;

    setIsBlasting(true);

    const affectedCells = calculateAllAffectedCells(
      gridData.grid,
      gameState.blasts
    );

    console.log("Affected cells count:", affectedCells.length);
    console.log("Affected cells:", affectedCells);

    setBlastTrigger({ affectedCells, timestamp: Date.now() });
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

    updateGrid(updatedGrid);

    setGridData((prevState) => ({
      ...prevState,
      grid: updatedGrid,
      remainingBlocks,
    }));

    clearBlasts();
    setBlastTrigger(null);

    setIsBlasting(false);

    // Add a delay to show the alert after the animation completes
    setTimeout(() => {
      // Show alert and prevent placing explosives after animation completes
      alert(
        "Please import a new CSV file or refresh the page to continue placing explosives."
      );
      setGameState((prev) => ({
        ...prev,
        canPlaceExplosives: false,
      }));
    }, 1000); // Wait 1 second for the animation to complete

    // short smoke/fade-in animation for destroyed blocks
    // setTimeout(() => {
    //   const canvas = document.querySelector("canvas");
    //   if (canvas) {
    //     canvas.style.transition = "opacity 0.8s ease-in-out";
    //     canvas.style.opacity = "0.7";
    //     setTimeout(() => (canvas.style.opacity = "1"), 800);
    //   }
    // }, 100);

    console.log(
      "Blast complete! Destroyed:",
      affectedCells.length,
      "Remaining:",
      remainingBlocks,
      "TotalBlocks: ",
      totalBlocks
    );
  };

  // Calculate optimal sizing for the canvas and blocks
  const calculateOptimalSizing = useCallback((processedGrid) => {
    const { dimensions } = processedGrid;

    // Preferred canvas size
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

      const newBlast = { x, y, radius: 3 };

      // Check if cell already has a blast
      const isOccupied = gameState.blasts.some(
        (blast) => blast.x === x && blast.y === y
      );
      if (isOccupied) {
        console.log(`Cell (${x}, ${y}) already has a blast.`);
        return;
      }

      // Check if we've reached the maximum number of blasts
      if (gameState.blasts.length >= MAX_BLASTS) {
        console.log(`Maximum number of blasts (${MAX_BLASTS}) reached.`);
        return;
      }

      setGameState((prev) => ({
        ...prev,
        blasts: [...prev.blasts, newBlast],
      }));
    },
    [gameState.blasts, gameState.canPlaceExplosives, setGameState]
  );

  // Process CSV data when it changes
  useEffect(() => {
    if (csvData) {
      setIsProcessing(true);
      console.log("Processing CSV data for grid visualization...");

      try {
        const processedGrid = GridDataProcessor.processCSVToGrid(csvData);

        if (
          processedGrid &&
          GridDataProcessor.validateGridData(processedGrid)
        ) {
          setGridData(processedGrid);
          calculateOptimalSizing(processedGrid);
          printGridDebugInfo(processedGrid);

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
  }, [csvData, onGridProcessed, calculateOptimalSizing]);

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
          onBlockClick={handleCellClick}
          blastTrigger={blastTrigger}
          onBlastComplete={handleBlastComplete}
        />
      </div>

      {/* Legend */}
      <div className="absolute top-8 right-4 w-60">
        <GridLegend
          oreTypes={gridData.metadata.oreTypes}
          onTriggerBlast={handleTriggerBlast}
        />
      </div>
    </div>
  );
};

export default OreGridVisualization;
