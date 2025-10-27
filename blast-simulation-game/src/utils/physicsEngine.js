import { Engine, Render, World, Bodies, Body, Events } from "matter-js";
import OreColorMapper from "./oreColorMapper.js";

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

    // Create rectangular body at block position
    const body = Bodies.rectangle(
      pixelX,
      pixelY,
      blockSize * 0.8,
      blockSize * 0.8,
      {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.0005,
        // Store original grid data as metadata for later processing
        gridX: cell.x,
        gridY: cell.y,
        blastDistance: cell.distance ?? null,
        blastX: cell.blastX ?? null,
        blastY: cell.blastY ?? null,
        // direction unit vector (grid-space) - may be undefined if not provided
        blastDirX: typeof cell.dirX === "number" ? cell.dirX : null,
        blastDirY: typeof cell.dirY === "number" ? cell.dirY : null,
        // normalized strength (0..1) where 1 is at center, 0 at radius edge
        forceFactor:
          typeof cell.forceFactor === "number" ? cell.forceFactor : 0,
        oreType: oreType,
        isOreBlock: true,
        render: {
          fillStyle: OreColorMapper.getColor(oreType) || "#999999",
        },
      }
    );

    return body;
  });
};

/**
 * Apply blast force to bodies based on precomputed direction and forceFactor.
 * If per-body direction metadata is missing, falls back to computing direction from nearest blast center.
 * @param {Array} bodies - array of Matter bodies created by createBlastBodies
 * @param {Array} blastCenters - array of pixel coordinates {x, y} for blast epicenters
 * @param {number} baseForce - scalar base force, tuned by caller (typ. small like 0.02 - 0.12)
 */
export const applyBlastForce = (bodies, blastCenters, baseForce = 0.05) => {
  if (!Array.isArray(bodies) || bodies.length === 0) return;

  // Clamp utility
  // Ensure physics stays stable, animation looks smoother or prevent matter.js from crashing
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  bodies.forEach((body) => {
    // Prefer per-body metadata attached earlier
    const dirX_meta = body.blastDirX;
    const dirY_meta = body.blastDirY;
    const forceFactor_meta =
      typeof body.forceFactor === "number" ? body.forceFactor : 0;

    // If metadata present and valid direction, apply using it
    if (
      dirX_meta !== null &&
      dirY_meta !== null &&
      (dirX_meta !== 0 || dirY_meta !== 0)
    ) {
      // Use forceFactor as primary scaler; also slightly attenuate by blastDistance if present
      const distanceFactor =
        typeof body.blastDistance === "number"
          ? 1 + body.blastDistance * 0.5
          : 1;
      const magnitude = (baseForce * forceFactor_meta) / distanceFactor;

      // small upward bias for nicer visuals
      const forceX = dirX_meta * magnitude;
      const forceY = dirY_meta * magnitude - Math.abs(0.01 * forceFactor_meta);

      // clamp forces to reasonable bounds to avoid physics explosions
      const clampedForce = {
        x: clamp(forceX, -0.5, 0.5),
        y: clamp(forceY, -0.5, 0.5),
      };

      Body.applyForce(body, body.position, clampedForce);
    } else {
      // Fallback: apply forces from each blast center (legacy behavior)
      blastCenters.forEach((blastCenter) => {
        const dx = body.position.x - blastCenter.x;
        const dy = body.position.y - blastCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          // Compute normalized direction
          const ndx = dx / distance;
          const ndy = dy / distance;

          // force decays with distance and uses any body.forceFactor if present
          const factor =
            forceFactor_meta > 0 ? forceFactor_meta : 1 / (1 + distance * 0.1);
          const magnitude = baseForce * factor;
          const forceX = ndx * magnitude;
          const forceY = ndy * magnitude - 0.01;

          Body.applyForce(body, body.position, { x: forceX, y: forceY });
        }
      });
    }

    // Add random rotation for visual interest
    // keep angular velocities modest
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
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
