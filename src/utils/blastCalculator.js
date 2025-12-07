/**
 * Calculate which grid cells are affected by blast
 * @param {Array} grid 
 * @param {Object} blast 
 * @returns {Array} 
 */
export const calculateAffectedCells = (grid, blast) => {
  const affected = [];
  const { x: blastX, y: blastY, radius } = blast;
  
  if (!grid || !Number.isFinite(radius) || radius <= 0) return affected;

  // OPTIMIZED: Use bounding box to reduce cells checked - massive speedup for large grids
  const minY = Math.max(0, Math.floor(blastY - radius));
  const maxY = Math.min(grid.length - 1, Math.ceil(blastY + radius));
  const minX = Math.max(0, Math.floor(blastX - radius));
  const maxX = grid[0] ? Math.min(grid[0].length - 1, Math.ceil(blastX + radius)) : 0;
  
  // OPTIMIZED: Pre-compute squared radius to avoid sqrt in inner loop
  const radiusSquared = radius * radius;

  // Loop through bounded cells only
  for (let y = minY; y <= maxY; y++) {
    const row = grid[y];
    if (!row) continue;
    
    const dy = y - blastY;
    const dySquared = dy * dy;
    
    for (let x = minX; x <= maxX; x++) {
      const dx = x - blastX;
      const distanceSquared = dx * dx + dySquared;
      
      // Check squared distance first (avoids expensive sqrt)
      if (distanceSquared <= radiusSquared) {
        // Only compute actual distance when needed
        const distance = Math.sqrt(distanceSquared);
        
        // include blast metadata (e.g., dirKey) so affected cells know which blast influenced them
        affected.push({ x, y, distance, blastX, blastY, oreType: row[x]?.oreType, dirKey: blast.dirKey || null });
      }
    }
  }
  
  return affected;
};


export const calculateAllAffectedCells = (grid, blasts) => {
  if (!blasts) return [];

  // blasts is always an array
  const blastArray = Array.isArray(blasts) ? blasts : [blasts];

  // OPTIMIZED: Pre-size Map for better performance with large datasets
  const allAffected = new Map();
  
  // OPTIMIZED: Use numeric key (y * maxWidth + x) for faster Map operations
  const maxWidth = grid[0]?.length || 0;

  blastArray.forEach((blast) => {
    const affected = calculateAffectedCells(grid, blast);
    affected.forEach((cell) => {
      // OPTIMIZED: Numeric keys are faster than string concatenation
      const key = cell.y * maxWidth + cell.x;
      const existing = allAffected.get(key);
      // If not seen yet, or this blast produces a stronger effect (higher forceFactor), replace
      if (!existing || (cell.forceFactor && existing.forceFactor && cell.forceFactor > existing.forceFactor)) {
        allAffected.set(key, cell);
      }
    });
  });

  return Array.from(allAffected.values());
};


/**
 * Apply blast result to grid by marking affected cells as destroyed.
 * Returns a new grid (does NOT mutate the original).
 * @param {Array} grid - 2D array
 * @param {Array} affectedCells - array of {x, y, ...}
 * @returns {Array} newGrid
 */
export function applyBlastToGrid(grid, affectedCells) {
  if (!Array.isArray(grid)) return grid;
  if (!Array.isArray(affectedCells) || affectedCells.length === 0) {
    // return deep copy to avoid accidental mutation elsewhere
    return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  const hitSet = new Set(affectedCells.map(c => `${c.x},${c.y}`));

  // Create a new grid (map rows and cells)
  const newGrid = grid.map((row, y) =>
    row.map((cell, x) => {
      const key = `${x},${y}`;
      if (hitSet.has(key)) {
        // Instead of marking as destroyed, set the cell to null to remove it.
        return null;
      }
      // Return a clone of the existing cell if it's not null.
      return cell ? { ...cell } : null;
    })
  );

  return newGrid;
}
