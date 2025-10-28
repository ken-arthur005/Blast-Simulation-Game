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

  // Loop through all cells
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < (grid[y] || []).length; x++) {
      // distance from blast center (grid coordinate space)
      const dx = x - blastX;
      const dy = y - blastY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If within radius, add to affected cells
      if (distance <= radius) {
        // include blast metadata (e.g., dirKey) so affected cells know which blast influenced them
        affected.push({ x, y, distance, blastX, blastY, oreType: grid[y][x]?.oreType, dirKey: blast.dirKey || null });
      }
    }
  }
  
  return affected;
};


export const calculateAllAffectedCells = (grid, blasts) => {
  if (!blasts) return [];

  // blasts is always an array
  const blastArray = Array.isArray(blasts) ? blasts : [blasts];

  // We'll choose the strongest effect per cell when multiple blasts overlap.
  const allAffected = new Map();

  blastArray.forEach((blast) => {
    const affected = calculateAffectedCells(grid, blast);
    affected.forEach((cell) => {
      const key = `${cell.x},${cell.y}`;
      const existing = allAffected.get(key);
      // If not seen yet, or this blast produces a stronger effect (higher forceFactor), replace
      if (!existing || cell.forceFactor > existing.forceFactor) {
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
    return grid.map(row => row.map(cell => ({ ...cell })));
  }

  const hitSet = new Set(affectedCells.map(c => `${c.x},${c.y}`));

  // Create a new grid (map rows and cells)
  const newGrid = grid.map((row, y) =>
    row.map((cell, x) => {
      const key = `${x},${y}`;
      if (hitSet.has(key)) {
        // Return a new object with oreType marked destroyed
        return { ...(cell || {}), oreType: "destroyed" };
      }
      // Return a shallow clone to preserve immutability guarantees
      return { ...(cell || {}) };
    })
  );

  return newGrid;
}
