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

    // Extract material properties (use defaults if missing for safety)
    const density = cellData?.density ?? 0.001;   // Fallback to original default
    const hardness = cellData?.hardness ?? 0.5;  // Fallback for hardness
    const fragmentationIndex = cellData?.fragmentation_index ?? 0.5;  // Fallback for fragmentation

    // Adjust body size based on fragmentation_index (higher = smaller pieces)
    const adjustBlockSize = blockSize * 0.8 * (1 - fragmentationIndex * 0.3);   // Scale down for breakage

    // Create rectangular body at block position
    const body = Bodies.rectangle(
      pixelX,
      pixelY,
      adjustBlockSize,
      adjustBlockSize,
      {
        restitution: 0.3 + hardness * 0.4,  // Harder materials bounce more (up to 0.7)
        friction: 0.1,
        frictionAir: 0.02,
        density: density,   // Direct from material
        // Store original grid data as metadata
        gridX: cell.x,
        gridY: cell.y,
        blastDistance: cell.distance,
        oreType: oreType,
        isOreBlock: true,
        render: {
          fillStyle: getOreColor(oreType),
        },
      }
    );

    return body;
  });
};

//Get ore color based on type

const getOreColor = (oreType) => {
  const colorMap = {
    gold: "#FFD700",
    silver: "#C0C0C0",
    copper: "#B87333",
    iron: "#8B4513",
    coal: "#2C2C2C",
    destroyed: "#808080",
    unknown: "#999999",
  };
  return colorMap[oreType?.toLowerCase()] || "#999999";
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
    "up-right": { x: 0.7071, y: -0.7071 },
    "up-left": { x: -0.7071, y: -0.7071 },
    "down-right": { x: 0.7071, y: 0.7071 },
    "down-left": { x: -0.7071, y: 0.7071 },
  };

  // Increase bias so directionality is more visible. Tune this number as needed.
  const biasMultiplier = 1.8; // how strong the directional bias is relative to radial force

  // Additional impulse factor — apply a small velocity bump along the chosen direction to make movement more immediately visible
  const impulseMultiplier = 0.6;

  bodies.forEach((body) => {
    // Apply force from each blast center
    blastCenters.forEach((blastCenter) => {
      // Calculate direction from blast center to body
      const dx = body.position.x - blastCenter.x;
      const dy = body.position.y - blastCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normalize direction and apply force inversely proportional to distance
      if (distance > 0) {
        const forceMagnitude = blastForce / (1 + body.blastDistance * 0.5);

        // Radial force
        let forceX = (dx / distance) * forceMagnitude;
        let forceY = (dy / distance) * forceMagnitude - 0.01;

        // If this blast center has a direction key, bias the force and add a small velocity impulse
        if (blastCenter.dirKey) {
          const bias = dirMap[blastCenter.dirKey] || { x: 0, y: 0 };
          // scale bias by the same falloff factor so closer debris get stronger bias
          const biasScale = forceMagnitude * biasMultiplier;
          forceX += bias.x * biasScale;
          forceY += bias.y * biasScale;

          // Small instantaneous velocity bump to visually emphasize direction
          try {
            // current velocity
            const vx = body.velocity?.x || 0;
            const vy = body.velocity?.y || 0;
            const impulseScale = forceMagnitude * impulseMultiplier;
            const newVx = vx + bias.x * impulseScale;
            const newVy = vy + bias.y * impulseScale;
            Body.setVelocity(body, { x: newVx, y: newVy });
          } catch {
            // setVelocity may fail in some runtimes; ignore and continue
          }
        }

        Body.applyForce(body, body.position, { x: forceX, y: forceY });
      }
    });

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
