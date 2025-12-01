import { Engine, Render, World, Bodies, Body, Events } from "matter-js";
import OreColorMapper from "./oreColorMapper.js";

// Helper utils for safe scaling
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mapRange = (v, inMin, inMax, outMin, outMax) => {
  const t = (clamp(v, inMin, inMax) - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
};

// Compute actual min/max for ore properties from the dataset for normalization
const getMinMax = (gridData) => {
  if (!gridData?.grid)
    return {
      density: { min: 1.0, max: 8.0 },
      hardness: { min: 0.0, max: 1.0 },
      fragmentation_index: { min: 0.0, max: 1.0 },
    };

  let minDensity = Infinity,
    maxDensity = -Infinity;
  let minHardness = Infinity,
    maxHardness = -Infinity;
  let minFrag = Infinity,
    maxFrag = -Infinity;

  for (let row of gridData.grid) {
    for (let cell of row) {
      if (cell?.density !== undefined) {
        minDensity = Math.min(minDensity, cell.density);
        maxDensity = Math.max(maxDensity, cell.density);
      }
      if (cell?.hardness !== undefined) {
        minHardness = Math.min(minHardness, cell.hardness);
        maxHardness = Math.max(maxHardness, cell.hardness);
      }
      if (cell?.fragmentation_index !== undefined) {
        minFrag = Math.min(minFrag, cell.fragmentation_index);
        maxFrag = Math.max(maxFrag, cell.fragmentation_index);
      }
    }
  }

  return {
    density: { min: minDensity, max: maxDensity },
    hardness: { min: minHardness, max: maxHardness },
    fragmentation_index: { min: minFrag, max: maxFrag },
  };
};


// Assumptions: min/max are now computed dynamically from the dataset for proper normalization
const computeMaterialScales = (cellData, minMax) => {
  const rawDensity = Number.isFinite(cellData?.density)
    ? cellData.density
    : 2.5;
  const rawHardness = Number.isFinite(cellData?.hardness)
    ? cellData.hardness
    : 0.5;
  const frag = Number.isFinite(cellData?.fragmentation_index)
    ? cellData.fragmentation_index
    : 0.5;

  // Displacement scale: light and soft → move more; heavy and hard → move less
  const densityForceScale = mapRange(
    rawDensity,
    minMax.density.min,
    minMax.density.max,
    1.6,
    0.4
  ); // light: 1.6x, heavy: 0.4x
  const hardnessForceScale = mapRange(
    rawHardness,
    minMax.hardness.min,
    minMax.hardness.max,
    1.5,
    0.7
  ); // soft: 1.5x, hard: 0.7x
  const fragmentationForceScale = mapRange(
    frag,
    minMax.fragmentation_index.min,
    minMax.fragmentation_index.max,
    0.9,
    1.25
  ); // cohesive: 0.9x, fragile: 1.25x
  const displacementScale =
    densityForceScale * hardnessForceScale * fragmentationForceScale;

  // Matter body properties tuned for stability
  const restitution = mapRange(
    rawHardness,
    minMax.hardness.min,
    minMax.hardness.max,
    0.25,
    0.55
  );
  const frictionAir = mapRange(
    rawDensity,
    minMax.density.min,
    minMax.density.max,
    0.035,
    0.02
  ); // heavier -> less drag
  const matterDensity = mapRange(
    rawDensity,
    minMax.density.min,
    minMax.density.max,
    0.0007,
    0.0012
  ); // keep near Matter default range

  // Visual size: fragile breaks smaller but still “a little bigger” than before
  const sizeScale = mapRange(
    frag,
    minMax.fragmentation_index.min,
    minMax.fragmentation_index.max,
    0.92,
    0.65
  );

  return {
    displacementScale,
    restitution,
    frictionAir,
    matterDensity,
    sizeScale,
    frag,
  };
};

/**
 * Create and initialize a Matter.js physics engine
 * @param {HTMLCanvasElement} canvas
 * @param {Object} canvasSize
 * @returns {Object}
 */
export const createPhysicsEngine = (canvas, canvasSize) => {
  const engine = Engine.create({
    gravity: { x: 0, y: 1 },
  });

  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: canvasSize.width,
      height: canvasSize.height,
      wireframes: false,
      background: "transparent",
    },
  });

  return { engine, render };
};

/**
 * Create boundary walls (floor, ceiling and sides) to contain debris
 * Ensures no blocks can escape the canvas bounds
 * @param {Object} canvasSize
 * @param {number} wallThickness
 * @returns {Array}
 */
export const createBoundaryWalls = (canvasSize, wallThickness = 70) => {
  const { width, height } = canvasSize;

  const walls = [
    // Floor - at bottom of canvas
    Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width + wallThickness * 2, // Extend width to overlap with side walls
      wallThickness,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.5,
        render: {
          fillStyle: "#333333",
          visible: true,
        },
        label: "floor",
      }
    ),

    // Ceiling - at top of canvas to prevent blocks from escaping upward
    Bodies.rectangle(
      width / 2,
      -wallThickness / 2,
      width + wallThickness * 2, // Extend width to overlap with side walls
      wallThickness,
      {
        isStatic: true,
        friction: 0.3,
        restitution: 0.7, // High bounce to send blocks back down decisively
        render: {
          fillStyle: "#333333",
          visible: true,
        },
        label: "ceiling",
      }
    ),
    // Left wall - full height coverage from ceiling to floor
    Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height + wallThickness * 2, // Extra tall to ensure no gaps
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.5,
        render: {
          fillStyle: "#333333",
          visible: true,
        },
        label: "leftWall",
      }
    ),
    // Right wall - full height coverage from ceiling to floor
    Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height + wallThickness * 2, // Extra tall to ensure no gaps
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.5,
        render: {
          fillStyle: "#333333",
          visible: true,
        },
        label: "rightWall",
      }
    ),
  ];

  return walls;
};

/**
 * Convert affected grid cells to Matter.js bodies
 * Now attaches directional metadata (dirX, dirY, forceFactor) to each body
 * so applyBlastForce can use precomputed radial directions instead of recomputing.
 * @param {Array} affectedCells
 * @param {number} blockSize
 * @param {Object} gridOffset
 * @param {Object} gridData
 * @param {Object} replayData - Optional initial positions for replay
 * @returns {Object} { bodies: Array, initialPositions: Array }
 */
export const createBlastBodies = (
  affectedCells,
  bodySizeParam,
  gridOffset = { x: 0, y: 0 },
  gridData,
  stride = bodySizeParam, // stride is the distance between cell origins (inner size + spacing)
  replayData = null
) => {
  if (!Array.isArray(affectedCells))
    return { bodies: [], initialPositions: [] };

  // Compute min/max for normalization once for the dataset
  const minMax = getMinMax(gridData);

  // Store initial positions for replay
  const initialPositions = [];

  // OPTIMIZED: Pre-calculate shared values outside loop
  const halfStride = stride / 2;
  const offsetXPlusHalf = gridOffset.x + halfStride;
  const offsetYPlusHalf = gridOffset.y + halfStride;
  const isReplay = !!(replayData && replayData.initialPositions);
  
  const bodies = affectedCells.map((cell, index) => {
    // Use replay positions if available, otherwise calculate from grid
    let pixelX, pixelY;
    if (isReplay && replayData.initialPositions[index]) {
      pixelX = replayData.initialPositions[index].x;
      pixelY = replayData.initialPositions[index].y;
    } else {
      // OPTIMIZED: Use pre-calculated offsets to reduce arithmetic operations
      pixelX = cell.x * stride + offsetXPlusHalf;
      pixelY = cell.y * stride + offsetYPlusHalf;
      initialPositions.push({
        x: pixelX,
        y: pixelY,
        gridX: cell.x,
        gridY: cell.y,
        oreType: cell.oreType,
      });
    }

    // Get the actual cell data from the grid if available
    const cellData = gridData?.grid?.[cell.y]?.[cell.x];
    const oreType = cellData?.oreType || cell.oreType || "unknown";

    // Normalize material props → physics scales
    const scales = computeMaterialScales(cellData, minMax);

    // Adjust body size based on fragmentation (scale relative to provided bodySizeParam)
    const adjustBlockSize = bodySizeParam * scales.sizeScale;

    // Create rectangular body at block position
    const body = Bodies.rectangle(
      pixelX,
      pixelY,
      adjustBlockSize,
      adjustBlockSize,
      {
        restitution: scales.restitution,
        friction: 0.1,
        frictionAir: scales.frictionAir,
        density: scales.matterDensity, // normalized for Matter.js stability
        // Store metadata
        gridX: cell.x,
        gridY: cell.y,
        blastDistance: cell.distance,
        oreType: oreType,
        isOreBlock: true,
        cellData: cellData,
        minMax: minMax, // Store minMax for use in applyBlastForce
        render: {
          // fallback to a neutral gray if the mapper doesn't have the ore
          fillStyle:
            OreColorMapper.colorMap[oreType?.toLowerCase()] || "#999999",
        },
      }
    );

    return body;
  });

  // OPTIMIZED: Debug logging disabled for performance - causes significant overhead with 10k+ bodies
  // console.debug calls removed from hot path

  return { bodies, initialPositions };
};

/**
 * Apply blast force to bodies based on distance from epicenter
 * Adaptively scales force based on number of affected cells to prevent wildness on large datasets
 * @param {Array} bodies
 * @param {Array} blastCenters
 * @param {number} blastForce
 * @param {Object} replayData - Optional replay data with pre-recorded random values
 * @returns {Object} physicsState - Contains all random factors for replay
 */
export const applyBlastForce = (
  bodies,
  blastCenters,
  blastForce = 0.08,
  replayData = null
) => {
  // OPTIMIZED: Debug logging disabled for performance with 10k+ bodies

  // Store random factors for replay
  const physicsState = {
    angularVelocities: [],
    randomFactors: [],
    timestamp: Date.now(),
    blastForce,
    blastCenters: JSON.parse(JSON.stringify(blastCenters)), // Deep copy
  };

  // direction map for biasing debris movement
  const dirMap = {
    right: { x: 1, y: 0 },
    left: { x: -1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    "up-right": { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    "up-left": { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-right": { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    "down-left": { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  };

  const biasMultiplier = 15.0; 
  const impulseMultiplier = 2.5; 
  const maxForcePerCall = 0.25; 

  // Large datasets (many affected bodies) need gentler forces to prevent explosion
  const bodyCount = bodies ? bodies.length : 1;
  const adaptiveScale = Math.max(
    0.5,
    Math.min(1.0, 100 / Math.max(bodyCount, 1))
  );
  const scaledBlastForce = blastForce * adaptiveScale;

  const clampVec = (vx, vy, maxMag) => {
    const mag = Math.hypot(vx, vy);
    if (mag <= maxMag || mag === 0) return { x: vx, y: vy };
    const s = maxMag / mag;
    return { x: vx * s, y: vy * s };
  };

  bodies.forEach((body, bodyIndex) => {
    // OPTIMIZED: Debug logging removed from per-body loop for 10k+ block performance

    // Get or generate random angular velocity
    let angularVelocity;
    if (
      replayData &&
      replayData.angularVelocities &&
      replayData.angularVelocities[bodyIndex] !== undefined
    ) {
      angularVelocity = replayData.angularVelocities[bodyIndex];
    } else {
      angularVelocity = (Math.random() - 0.5) * 0.12;
      physicsState.angularVelocities.push(angularVelocity);
    }

    blastCenters.forEach((blastCenter) => {
      // Calculate direction from blast center to body
      const dx = body.position.x - blastCenter.x;
      const dy = body.position.y - blastCenter.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) return;

      const ux = dx / distance;
      const uy = dy / distance;

      // Material scaling
      const scales = computeMaterialScales(body.cellData, body.minMax);

      const gridDistanceFalloff = Math.max(
        0.1,
        Math.min(0.3, adaptiveScale * 0.15)
      );
      const gridFalloff =
        1 / (1 + (body.blastDistance ?? 0) * gridDistanceFalloff);

      // Radial (pixel) distance falloff - more aggressive to show nearby blocks moving much more
      // Special case: if very close to epicenter (within ~1.5 block sizes), give bonus
      const radialFalloff =
        distance < 40
          ? 1.0 // Full force for blocks at/very near blast epicenter
          : 1 / (1 + distance * 0.008); // Increased from 0.002 for steeper drop-off

      let forceMagnitude =
        scaledBlastForce *
        gridFalloff *
        radialFalloff *
        scales.displacementScale;

      // Force calculation: if direction is specified, use primarily directional force
      // Otherwise use radial explosion force
      let forceX, forceY;

      if (blastCenter.dirKey) {
        // DIRECTIONAL MODE: Force pushes primarily in the chosen direction
        const bias = dirMap[blastCenter.dirKey] || { x: 0, y: 0 };

        // Use 98% directional, 2% radial for very strong directional effect
        const directionalWeight = 0.98;
        const radialWeight = 0.02;

        const directionalForce = forceMagnitude * biasMultiplier;
        const radialForceX = ux * forceMagnitude * radialWeight;
        const radialForceY = uy * forceMagnitude * radialWeight;

        forceX = bias.x * directionalForce * directionalWeight + radialForceX;
        forceY = bias.y * directionalForce * directionalWeight + radialForceY;

        // Additional strong impulse in the chosen direction to overcome gravity
        const impulseScale = forceMagnitude * impulseMultiplier;
        Body.applyForce(body, body.position, {
          x: bias.x * impulseScale,
          y: bias.y * impulseScale,
        });

        // Apply initial velocity directly in the direction to ensure immediate visible movement
        const velocityBoost = 3.5; // Boost factor to make direction visible before gravity takes over
        Body.setVelocity(body, {
          x: body.velocity.x + bias.x * velocityBoost,
          y: body.velocity.y + bias.y * velocityBoost,
        });

        // OPTIMIZED: Logging removed from per-body loop for 10k+ block performance
      } else {
        // RADIAL MODE: Standard explosion in all directions
        forceX = ux * forceMagnitude;
        forceY = uy * forceMagnitude;

        // OPTIMIZED: Logging removed from per-body loop
      }

      // Clamp total force for stability

      const clamped = clampVec(forceX, forceY, maxForcePerCall);
      Body.applyForce(body, body.position, clamped);
    });

    // Apply recorded or generated angular velocity
    Body.setAngularVelocity(body, angularVelocity);
  });

  // Return physics state for replay
  return physicsState;
};

/**
 * Clean up physics engine and renderer
 * @param {Object} engine
 * @param {Object} render
 */
export const cleanupPhysicsEngine = (engine, render) => {
  if (render) {
    Render.stop(render);
    render.canvas = null;
    render.context = null;
    render.textures = {};
  }

  if (engine) {
    World.clear(engine.world);
    Engine.clear(engine);
  }
};
