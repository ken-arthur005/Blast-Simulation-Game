import React, { useEffect, useState, useCallback } from 'react';
import GridDataProcessor from '../utils/gridDataProcessor';
import printGridDebugInfo from '../utils/printGridDebugInfo';
import GridCanvas from './GridCanvas';
import GridLegend from './GridLegend';
import GridInfo from './GridInfo';

/** 
 * Main orchestrator component for ore grid visualization
 * This component coordinates all the sub-components and manages the overall state
 */
const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  // State management
  const [gridData, setGridData] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [blockSize, setBlockSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate optimal sizing for the canvas and blocks
  const calculateOptimalSizing = useCallback((processedGrid) => {
    const { dimensions } = processedGrid;
    const maxCanvasWidth = 1000;
    const maxCanvasHeight = 700;
    const minBlockSize = 8;
    const maxBlockSize = 60;

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
  }, []);

  // Process CSV data when it changes
  useEffect(() => {
    if (csvData) {
      setIsProcessing(true);
      console.log('Processing CSV data for grid visualization...');
      
      try {
        const processedGrid = GridDataProcessor.processCSVToGrid(csvData);
        
        if (processedGrid && GridDataProcessor.validateGridData(processedGrid)) {
          setGridData(processedGrid);
          calculateOptimalSizing(processedGrid);
          printGridDebugInfo(processedGrid);
          
          // Notify parent component
          if (onGridProcessed) {
            onGridProcessed(processedGrid);
          }
        } else {
          console.error('Failed to process CSV data into grid');
          setGridData(null);
        }
      } catch (error) {
        console.error('Error processing CSV data:', error);
        setGridData(null);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [csvData, onGridProcessed, calculateOptimalSizing]);


  // Handle block click events from canvas
  const handleBlockClick = useCallback((blockInfo) => {
    if (blockInfo.oreType !== 'empty') {
      // Future: Add blast simulation logic here
    } else {
      // Handle empty cell click
    }
  }, []);

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
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
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
          onBlockClick={handleBlockClick}
        />

        {/* Legend */}
        <GridLegend oreTypes={gridData.metadata.oreTypes} />
      </div>
    </div>
  );
};

export default OreGridVisualization;