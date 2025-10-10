// utils/blastCalculator.js

/**
 * Calculate which grid cells are affected by blast
 * @param {Array} grid - 2D array of grid cells
 * @param {Object} blast - {x, y, radius}
 * @returns {Array} - Array of affected cell coordinates [{x, y}, ...]
 */
export const calculateAffectedCells = (grid, blast) => {
  const affected = [];
  const { x: blastX, y: blastY, radius } = blast;
  
  // Loop through all cells
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      // Calculate distance from blast center
      const distance = Math.sqrt(
        Math.pow(x - blastX, 2) + Math.pow(y - blastY, 2)
      );
      
      // If within radius, add to affected cells
      if (distance <= radius) {
        affected.push({ x, y, distance }); // Include distance for animation stagger
      }
    }
  }
  
  return affected;
};

/**
 * Get all affected cells from multiple blasts
 */
export const calculateAllAffectedCells = (grid, blasts) => {
  const allAffected = new Map(); // Use Map to avoid duplicates
  
  blasts.forEach(blast => {
    const affected = calculateAffectedCells(grid, blast);
    affected.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      if (!allAffected.has(key)) {
        allAffected.set(key, cell);
      }
    });
  });
  
  return Array.from(allAffected.values());
};

/**
 * Update grid with destroyed cells
 */
export const applyBlastToGrid = (grid, affectedCells) => {
  // Create a deep copy of the grid
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  
  // Mark affected cells as destroyed
  affectedCells.forEach(({ x, y }) => {
    if (newGrid[y] && newGrid[y][x]) {
      newGrid[y][x].oreType = 'destroyed';
      // or newGrid[y][x].state = 'destroyed';
      // depending on your data structure
    }
  });
  
  return newGrid;
};