class GridDataProcessor {
  /**
   * Processes CSV data into a 2D grid structure
   * @param {Object} csvResults - The validated CSV results from react-papaparse
   * @returns {Object} - Contains grid data, dimensions, and metadata
   */
  static processCSVToGrid(csvResults) {
    if (!csvResults || !csvResults.data || csvResults.data.length < 2) {
      console.error('Invalid CSV data provided to GridDataProcessor');
      return null;
    }

    const { data } = csvResults;
    const headers = data[0];
    const dataRows = data.slice(1);

    // Find column indices (normalize headers to lowercase for comparison)
    const normalizedHeaders = headers.map(h => h.toString().trim().toLowerCase());
    const xIndex = normalizedHeaders.indexOf('x');
    const yIndex = normalizedHeaders.indexOf('y');
    const oreTypeIndex = normalizedHeaders.indexOf('ore_type');
    const densityIndex = normalizedHeaders.indexOf('density');
    const hardnessIndex = normalizedHeaders.indexOf('hardness');
    const fragmentationIndex = normalizedHeaders.indexOf('fragmentation_index');

    if (xIndex === -1 || yIndex === -1 || oreTypeIndex === -1) {
      console.error('Required columns (x, y, ore_type) not found in CSV data');
      return null;
    }

    // Extract all coordinates and ore types
    const blocks = [];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const oreTypes = new Set();

    dataRows.forEach((row, index) => {
      const x = parseInt(row[xIndex]);
      const y = parseInt(row[yIndex]);
      const oreType = row[oreTypeIndex].toString().trim();
      const density = parseFloat(row[densityIndex]);
      const hardness = parseFloat(row[hardnessIndex]);
      const fragmentation_index = parseFloat(row[fragmentationIndex]);

      // Skip invalid rows
      if (isNaN(x) || isNaN(y) || !oreType) {
        console.warn(`Skipping invalid row ${index + 2}: x=${row[xIndex]}, y=${row[yIndex]}, ore_type=${row[oreTypeIndex]}`);
        return;
      }

      // Log warnings for any NaN (shouldn't happen due to validation, but safety check)
      if (isNaN(density) || isNaN(hardness) || isNaN(fragmentation_index)) {
        console.warn(`Unexpected NaN in material properties for row ${index + 2} - this should not happen due to validation`);
      }

      blocks.push({ x, y, oreType, density, hardness, fragmentation_index });
      
      // Update bounds
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Track unique ore types
      oreTypes.add(oreType);
    });

    if (blocks.length === 0) {
      console.error('No valid blocks found in CSV data');
      return null;
    }

    // Calculate grid dimensions
    const gridWidth = maxX - minX + 1;
    const gridHeight = maxY - minY + 1;

    // Initialize 2D grid array
    const grid = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill(null)
    );

    // Fill grid with ore data
    blocks.forEach(block => {
      const gridX = block.x - minX;
      const gridY = block.y - minY;
      grid[gridY][gridX] = {
        x: block.x,
        y: block.y,
        oreType: block.oreType,
        gridX,
        gridY
      };
    });

    const gridData = {
      grid,
      dimensions: {
        width: gridWidth,
        height: gridHeight,
        minX,
        maxX,
        minY,
        maxY
      },
      metadata: {
        totalBlocks: blocks.length,
        oreTypes: Array.from(oreTypes).sort(),
        originalBlocks: blocks
      }
    };

    console.log('Grid data processed successfully:', {
      dimensions: gridData.dimensions,
      totalBlocks: gridData.metadata.totalBlocks,
      oreTypes: gridData.metadata.oreTypes
    });

    return gridData;
  }

  /**
   * Validates that the grid data is properly structured
   */
  static validateGridData(gridData) {
    if (!gridData || !gridData.grid || !gridData.dimensions || !gridData.metadata) {
      return false;
    }

    const { grid, dimensions } = gridData;
    
    // Check if grid dimensions match the actual grid array
    if (grid.length !== dimensions.height) {
      console.error('Grid height mismatch');
      return false;
    }

    if (grid[0] && grid[0].length !== dimensions.width) {
      console.error('Grid width mismatch');
      return false;
    }

    return true;
  }
}

export default GridDataProcessor;