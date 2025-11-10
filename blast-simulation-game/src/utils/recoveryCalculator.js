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

/**
 * Full pipeline: annotate affectedCells with normalized features and recovery score/status
 * Returns { annotatedCells, metrics, stats }.
 *
 * config:
 * {
 *  thresholds: { recovered: 0.6, diluted: 0.2 },
 *  useLogDensity: boolean,
 *  blastForceNormalized: 0..1,
 *  weights: { materialHardness, materialDensity }
 * }
 */
export function computeRecoveryForAffected({
  affectedCells,
  grid,
  config = {},
  globalStats = null,
}) {
  const thresholds = config.thresholds ?? { recovered: 0.6, diluted: 0.2 };

  const stats =
    config.statsScope === "global" && globalStats
      ? globalStats
      : buildNormalizationStats(affectedCells, grid, {
          useLogDensity: config.useLogDensity,
        });

  const annotated = [];
  let sumScores = 0;

  affectedCells.forEach((c) => {
    const cell = (grid?.[c.y] || [])[c.x] || {};
    const rawDensity = Number(cell.density ?? NaN);
    const rawHardness = Number(cell.hardness ?? NaN);
    const rawFrag = Number(cell.fragmentation_index ?? NaN);
    const rawDist = Number(c.distance ?? NaN);

    const densValue = stats.useLogDensity
      ? logTransform(rawDensity)
      : rawDensity;

    const densNorm = safeMinMaxNormalize(
      densValue,
      stats.densityStats.min,
      stats.densityStats.max
    );
    const hardNorm = safeMinMaxNormalize(
      rawHardness,
      stats.hardnessStats.min,
      stats.hardnessStats.max
    );
    const fragNorm = safeMinMaxNormalize(
      rawFrag,
      stats.fragmentationStats.min,
      stats.fragmentationStats.max
    );
    const distNorm = safeMinMaxNormalize(
      rawDist,
      stats.distanceStats.min,
      stats.distanceStats.max
    );

    const blastForceNorm = Number(config.blastForceNormalized ?? 0.5);

    const score = computeRecoveryScoreFromNorms({
      densNorm,
      hardNorm,
      fragNorm,
      distNorm,
      blastForceNorm,
      weights: config.weights,
    });

    let status = "diluted";
    if (score >= thresholds.recovered) status = "recovered";
    else if (score < thresholds.diluted) status = "lost";

    const annotatedCell = {
      ...c,
      gridX: c.x,
      gridY: c.y,
      raw: {
        density: rawDensity,
        hardness: rawHardness,
        fragmentation_index: rawFrag,
        distance: rawDist,
      },
      norm: { densNorm, hardNorm, fragNorm, distNorm },
      recoveryScore: score,
      recoveryStatus: status,
    };

    annotated.push(annotatedCell);
    sumScores += score;
  });

  const total = annotated.length || 1;
  const recoveredCount = annotated.filter(
    (a) => a.recoveryStatus === "recovered"
  ).length;
  const dilutedCount = annotated.filter(
    (a) => a.recoveryStatus === "diluted"
  ).length;
  const lostCount = annotated.filter((a) => a.recoveryStatus === "lost").length;

  const metrics = {
    totalAffected: annotated.length,
    recoveredCount,
    dilutedCount,
    lostCount,
    efficiencyPct: (sumScores / total) * 100,
    avgScore: sumScores / total,
  };

  return { annotatedCells: annotated, metrics, stats };
}
