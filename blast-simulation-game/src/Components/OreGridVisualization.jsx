import React, { useEffect, useRef, useState } from 'react';
import GridDataProcessor from '../utils/gridDataProcessor';
import OreColorMapper from '../utils/oreColorMapper';

/** 
 * This component takes CSV data, processes it into a grid structure,
 * and renders it as a visual canvas with color-coded ore blocks.
 */
const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  const canvasRef = useRef(null);
  const [gridData, setGridData] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [blockSize, setBlockSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  // Process CSV data when it changes
  useEffect(() => {
    if (csvData) {
      console.log('Processing CSV data for grid visualization...');
      const processedGrid = GridDataProcessor.processCSVToGrid(csvData);
      
      if (processedGrid && GridDataProcessor.validateGridData(processedGrid)) {
        setGridData(processedGrid);
        
        // Calculate optimal canvas size and block size
        calculateOptimalSizing(processedGrid);
        
        // Console debug output
        printGridDebugInfo(processedGrid);
        
        // Notify parent component
        if (onGridProcessed) {
          onGridProcessed(processedGrid);
        }
      } else {
        console.error('Failed to process CSV data into grid');
      }
    }
  }, [csvData, onGridProcessed]);

  // Calculate optimal sizing for the canvas and blocks
  const calculateOptimalSizing = (processedGrid) => {
    const { dimensions } = processedGrid;
    const maxCanvasWidth = 800;
    const maxCanvasHeight = 600;
    const minBlockSize = 10;
    const maxBlockSize = 50;

    // Calculate block size based on grid dimensions
    const blockSizeByWidth = Math.floor(maxCanvasWidth / dimensions.width);
    const blockSizeByHeight = Math.floor(maxCanvasHeight / dimensions.height);
    const optimalBlockSize = Math.max(
      minBlockSize,
      Math.min(maxBlockSize, Math.min(blockSizeByWidth, blockSizeByHeight))
    );

    const canvasWidth = dimensions.width * optimalBlockSize;
    const canvasHeight = dimensions.height * optimalBlockSize;

    setBlockSize(optimalBlockSize);
    setCanvasSize({ width: canvasWidth, height: canvasHeight });

    console.log(`Canvas sizing: ${canvasWidth}x${canvasHeight}, Block size: ${optimalBlockSize}`);
  };

  // Print grid information to console for debugging
  const printGridDebugInfo = (processedGrid) => {
    const { grid, dimensions, metadata } = processedGrid;
    
    console.log('=== GRID DEBUG INFORMATION ===');
    console.log('Grid Dimensions:', dimensions);
    console.log('Total Blocks:', metadata.totalBlocks);
    console.log('Ore Types Found:', metadata.oreTypes);
    
    // Print color mapping
    const colorMapping = OreColorMapper.getColorsForOreTypes(metadata.oreTypes);
    console.log('Color Mapping:', colorMapping);
    
    // Print grid structure (for small grids only)
    if (dimensions.width <= 10 && dimensions.height <= 10) {
      console.log('Grid Structure:');
      grid.forEach((row, y) => {
        const rowStr = row.map(cell => {
          if (cell) {
            return cell.oreType.charAt(0).toUpperCase();
          }
          return '.';
        }).join(' ');
        console.log(`Row ${y}: ${rowStr}`);
      });
    } else {
      console.log('Grid too large for console display');
    }
    
    console.log('=== END GRID DEBUG ===');
  };

  // Render the grid on canvas
  useEffect(() => {
    if (gridData && canvasRef.current) {
      renderGrid();
    }
  }, [gridData, canvasSize, blockSize, showGrid, showLabels]);

  const renderGrid = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { grid, dimensions } = gridData;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render each block
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const pixelX = x * blockSize;
        const pixelY = y * blockSize;

        if (cell) {
          // Fill block with ore color
          ctx.fillStyle = OreColorMapper.getColor(cell.oreType);
          ctx.fillRect(pixelX, pixelY, blockSize, blockSize);

          // Add block labels if enabled
          if (showLabels && blockSize > 15) {
            ctx.fillStyle = 'black';
            ctx.font = `${Math.floor(blockSize / 3)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const text = cell.oreType.charAt(0).toUpperCase();
            ctx.fillText(text, pixelX + blockSize / 2, pixelY + blockSize / 2);
          }
        } else {
          // Empty cell
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pixelX, pixelY, blockSize, blockSize);
        }

        // Draw grid lines if enabled
        if (showGrid) {
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(pixelX, pixelY, blockSize, blockSize);
        }
      });
    });

    console.log('Grid rendered successfully');
  };

  // Handle canvas click (for future interactivity)
  const handleCanvasClick = (event) => {
    if (!gridData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gridX = Math.floor(x / blockSize);
    const gridY = Math.floor(y / blockSize);

    if (gridX >= 0 && gridX < gridData.dimensions.width && 
        gridY >= 0 && gridY < gridData.dimensions.height) {
      const cell = gridData.grid[gridY][gridX];
      if (cell) {
        console.log(`Clicked on block at (${cell.x}, ${cell.y}): ${cell.oreType}`);
      } else {
        console.log(`Clicked on empty cell at grid position (${gridX}, ${gridY})`);
      }
    }
  };

  // Create legend for ore types
  const renderLegend = () => {
    if (!gridData) return null;

    const { oreTypes } = gridData.metadata;
    const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Ore Types Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {oreTypes.map(oreType => (
            <div key={oreType} className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 border border-gray-400 rounded"
                style={{ backgroundColor: colorMapping[oreType] }}
              />
              <span className="text-sm capitalize">{oreType}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!csvData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Upload a CSV file to visualize the ore grid</p>
      </div>
    );
  }

  if (!gridData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Processing grid data...</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">2D Ore Grid Visualization</h2>
        
        {/* Grid Information */}
        <div className="mb-4 text-sm text-gray-600">
          <p>Grid Size: {gridData.dimensions.width} × {gridData.dimensions.height}</p>
          <p>Total Blocks: {gridData.metadata.totalBlocks}</p>
          <p>Ore Types: {gridData.metadata.oreTypes.length}</p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Grid Lines</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Ore Labels</span>
          </label>
        </div>

        {/* Canvas */}
        <div className="border border-gray-300 rounded-lg overflow-hidden inline-block">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={handleCanvasClick}
            className="cursor-crosshair"
            style={{ display: 'block' }}
          />
        </div>

        {/* Legend */}
        {renderLegend()}
      </div>
    </div>
  );
};

export default OreGridVisualization;