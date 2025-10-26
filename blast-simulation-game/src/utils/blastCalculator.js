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
        // angle from blast center to cell (radians)
        // Note: grid y increases downward which matches canvas coordinate system
        const angle = Math.atan2(dy, dx); // dy first then dx

        // Unit direction vector from blast center outward to cell
        const magnitude = distance === 0 ? 1 : distance;
        const dirX = dx / magnitude;
        const dirY = dy / magnitude;

        // Normalized closeness factor (1.0 at center, 0.0 at radius edge)
        const normalizedDistance = Math.min(distance / radius, 1);
        const forceFactor = Math.max(0, 1 - normalizedDistance); // 1 -> 0

        affected.push({
          x,
          y,
          distance,
          normalizedDistance,
          forceFactor,
          angle,
          dirX,
          dirY,
          blastX,
          blastY,
          oreType: grid[y][x]?.oreType
        });
      }
    }
  }
  
  return affected;
};


export const calculateAllAffectedCells = (grid, blasts) => {

 if (!blasts) return [];

  //blasts is always an array
  const blastArray = Array.isArray(blasts) ? blasts : [blasts];

  const allAffected = new Map();
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


export function applyBlastToGrid(grid, affectedCells) {
  grid.map((row, y) =>
    row.map((cell, x) => {
      const hit = affectedCells.some((c) => c.x === x && c.y === y);
      if (hit) {
        return { ...cell, oreType: "destroyed" };
      }
      return cell;
    })
  );
}
