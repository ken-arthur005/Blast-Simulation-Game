import { Engine, Render, World, Bodies, Body, Events } from "matter-js";
import OreColorMapper from "./oreColorMapper.js";

// Helper utils for safe scaling
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mapRange = (v, inMin, inMax, outMin, outMax) => {
  const t = (clamp(v, inMin, inMax) - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
};

// Centralize material-to-physics mapping
// Assumptions:
// - density in CSV ~ 1.0..8.0 (g/cm^3) typical rock/ore range
// - hardness in CSV ~ 0.0..1.0 (soft..hard)
// - fragmentation_index in CSV ~ 0.0..1.0 (cohesive..fragile)
const computeMaterialScales = (cellData) => {
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
  const densityForceScale = mapRange(rawDensity, 1.0, 8.0, 1.2, 0.6);
  const hardnessForceScale = mapRange(rawHardness, 0.0, 1.0, 1.25, 0.85);
  const fragmentationForceScale = mapRange(frag, 0.0, 1.0, 0.95, 1.15);
  const displacementScale =
    densityForceScale * hardnessForceScale * fragmentationForceScale;

  // Matter body properties tuned for stability
  const restitution = mapRange(rawHardness, 0.0, 1.0, 0.25, 0.55);
  const frictionAir = mapRange(rawDensity, 1.0, 8.0, 0.035, 0.02); // heavier -> less drag
  const matterDensity = mapRange(rawDensity, 1.0, 8.0, 0.0007, 0.0012); // keep near Matter default range

  // Visual size: fragile breaks smaller but still “a little bigger” than before
  const sizeScale = mapRange(frag, 0.0, 1.0, 0.92, 0.65);

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
 * Create boundary walls (floor and sides) to contain debris
 * @param {Object} canvasSize
 * @param {number} wallThickness
 * @returns {Array}
 */
export const createBoundaryWalls = (canvasSize, wallThickness = 50) => {
  const { width, height } = canvasSize;

  const walls = [
    // Floor - at bottom of canvas
    Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width,
      wallThickness,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.3,
        render: {
          fillStyle: "#333333",
          visible: true,
        },
        label: "floor",
      }
    ),
    // Left wall
    Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.3,
        render: {
          fillStyle: "#333333",
          visible: false,
        },
        label: "leftWall",
      }
    ),
    // Right wall
    Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.3,
        render: {
          fillStyle: "#333333",
          visible: false,
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
 * @returns {Array}
 */
export const createBlastBodies = (
  affectedCells,
  blockSize,
  gridOffset = { x: 0, y: 0 },
  gridData
) => {
  if (!Array.isArray(affectedCells)) return [];

  return affectedCells.map((cell) => {
    // Convert grid coordinates to pixel coordinates (center of block)
    const pixelX = cell.x * blockSize + gridOffset.x + blockSize / 2;
    const pixelY = cell.y * blockSize + gridOffset.y + blockSize / 2;

    // Get the actual cell data from the grid if available
    const cellData = gridData?.grid?.[cell.y]?.[cell.x];
    const oreType = cellData?.oreType || cell.oreType || "unknown";

    // Normalize material props → physics scales
    const scales = computeMaterialScales(cellData);

    // Adjust body size based on fragmentation (slightly bigger than before)
    const adjustBlockSize = blockSize * scales.sizeScale;

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
        render: {
          fillStyle: OreColorMapper.colorMap[oreType?.toLowerCase()],
        },
      }
    );

    return body;
  });
};

/**
 * Apply blast force to bodies based on distance from epicenter
 * @param {Array} bodies
 * @param {Array} blastCenters
 * @param {number} blastForce
 */
export const applyBlastForce = (bodies, blastCenters, blastForce = 0.08) => {
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

  // Calmer biasing
  const biasMultiplier = 1.2;
  const impulseMultiplier = 0.25;
  const maxForcePerCall = 0.004; // clamp to avoid explosive impulses

  const clampVec = (vx, vy, maxMag) => {
    const mag = Math.hypot(vx, vy);
    if (mag <= maxMag || mag === 0) return { x: vx, y: vy };
    const s = maxMag / mag;
    return { x: vx * s, y: vy * s };
  };

  bodies.forEach((body) => {
    blastCenters.forEach((blastCenter) => {
      // Calculate direction from blast center to body
      const dx = body.position.x - blastCenter.x;
      const dy = body.position.y - blastCenter.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) return;

      const ux = dx / distance;
      const uy = dy / distance;

      // Material scaling
      const scales = computeMaterialScales(body.cellData);

      // Distance falloff: use both grid blastDistance and pixel distance (gentle)
      const gridFalloff = 1 / (1 + (body.blastDistance ?? 0) * 0.45);
      const radialFalloff = 1 / (1 + distance * 0.002);

      let forceMagnitude =
        blastForce * gridFalloff * radialFalloff * scales.displacementScale;

      // Radial force component
      let forceX = ux * forceMagnitude;
      let forceY = uy * forceMagnitude;

      // Optional directional bias
      if (blastCenter.dirKey) {
        const bias = dirMap[blastCenter.dirKey] || { x: 0, y: 0 };
        const biasScale = forceMagnitude * biasMultiplier; // no double material scaling
        forceX += bias.x * biasScale;
        forceY += bias.y * biasScale;

        // Small extra "kick" as force (not velocity) so mass matters
        const impulseScale = forceMagnitude * impulseMultiplier;
        Body.applyForce(body, body.position, {
          x: bias.x * impulseScale,
          y: bias.y * impulseScale,
        });
      }

      // Clamp total force for stability
      const clamped = clampVec(forceX, forceY, maxForcePerCall);
      Body.applyForce(body, body.position, clamped);
    });

    // Mild random rotation
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
  });
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
