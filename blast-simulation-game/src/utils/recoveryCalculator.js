import {
  minMaxStats,
  safeMinMaxNormalize,
  logTransform,
} from "./normalization";

/**
 * Build min/max stats for affected cells (per-blast scope)
 * grid: 2D grid array with cell props
 * affectedCells: array of {x, y, distance, ...}
 */
export function buildNormalizationStats(affectedCells, grid, options = {}) {
  const useLogDensity = options.useLogDensity === true;

  const densities = [];
  const hardnesses = [];
  const fragmentations = [];
  const distances = [];

  affectedCells.forEach((c) => {
    const cell = (grid?.[c.y] || [])[c.x] || {};
    const rawDensity = Number(cell.density ?? NaN);
    densities.push(useLogDensity ? logTransform(rawDensity) : rawDensity);
    hardnesses.push(Number(cell.hardness ?? NaN));
    fragmentations.push(Number(cell.fragmentation_index ?? NaN));
    distances.push(Number(c.distance ?? NaN));
  });

  return {
    densityStats: minMaxStats(densities),
    hardnessStats: minMaxStats(hardnesses),
    fragmentationStats: minMaxStats(fragmentations),
    distanceStats: minMaxStats(distances),
    useLogDensity,
  };
}
