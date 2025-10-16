

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
      // distance from blast center
      const distance = Math.sqrt(
        Math.pow(x - blastX, 2) + Math.pow(y - blastY, 2)
      );
      
      // If within radius, add to affected cells
      if (distance <= radius) {
        affected.push({ x, y, distance });
      }
    }
  }
  
  return affected;
};


export const calculateAllAffectedCells = (grid, blasts) => {

 if (!blasts) return [];

  //blasts is always an array
  const blastArray = Array.isArray(blasts) ? blasts : [blasts];

  const allAffected = new Map(); // Use Map to avoid duplicates
  
  blastArray.forEach(blast => {
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


// export const applyBlastToGrid = (grid, affectedCells) => {
//   //a deep copy of the grid
//   const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  
//   //affected cells as destroyed
//   affectedCells.forEach(({ x, y }) => {
//     if (newGrid[y] && newGrid[y][x]) {
//       newGrid[y][x].oreType = 'destroyed';

//     }
//   });
  
//   return newGrid;
// };

export function applyBlastToGrid(grid, affectedCells) {
  grid.map((row, y) =>
    row.map((cell, x) => {
      const hit = affectedCells.some((c) => c.x === x && c.y === y);
      if (hit) {
        return { ...cell, oreType: "destroyed" }; // mark as destroyed
      }
      return cell;
    })
  );
}
