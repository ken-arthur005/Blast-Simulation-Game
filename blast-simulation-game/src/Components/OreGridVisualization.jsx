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
      
      console.log(`Using adaptive canvas: ${canvasWidth}x${canvasHeight} for extreme grid size`);
    } else {
      // Calculate exact canvas size to fit the grid perfectly
      const exactWidth = dimensions.width * blockSize;
      const exactHeight = dimensions.height * blockSize;
      
      setCanvasSize({ width: exactWidth, height: exactHeight });
      console.log(`Using exact fit canvas: ${exactWidth}x${exactHeight}`);
    }
    
    setBlockSize(blockSize);

    console.log(`Block size: ${blockSize}px for ${dimensions.width}x${dimensions.height} grid`);
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
        />

        {/* Legend */}
        <GridLegend oreTypes={gridData.metadata.oreTypes} />
      </div>
    </div>
  );
};

export default OreGridVisualization;