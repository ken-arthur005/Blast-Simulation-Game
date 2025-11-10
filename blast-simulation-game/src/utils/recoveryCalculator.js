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

/**
 * Compute recovery score given normalized features.
 * - densNorm, hardNorm, fragNorm, distNorm ∈ [0..1]
 * - frag is treated as a penalty (higher fragmentation => worse recovery)
 */
export function computeRecoveryScoreFromNorms({
  densNorm = 0.5,
  hardNorm = 0.5,
  fragNorm = 0.5,
  distNorm = 0.5,
  blastForceNorm = 0.5,
  weights = { materialHardness: 0.6, materialDensity: 0.4 }, // should always be equal to 1
}) {
  const fragPenalty = 1 - fragNorm; // fragNorm=1 => penalty=0 (bad)
  const materialFactor =
    (weights.materialHardness ?? 0.6) * hardNorm +
    (weights.materialDensity ?? 0.4) * densNorm;

  const raw = materialFactor * fragPenalty * distNorm;

  // blast force penalty: tune k (higher k => stronger penalty)
  const k = 2.0;
  const blastPenalty = 1 / (1 + k * blastForceNorm);

  const score = Math.min(1, Math.max(0, raw * blastPenalty));
  return score;
}
