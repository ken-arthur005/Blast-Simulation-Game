import { Engine, Render, World, Bodies, Body, Events } from "matter-js";
import OreColorMapper from "./oreColorMapper.js";
import gsap from "gsap";

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
  // Increased ranges to make material differences more visually apparent
  const densityForceScale = mapRange(rawDensity, 1.0, 8.0, 1.6, 0.4); // light: 1.6x, heavy: 0.4x
  const hardnessForceScale = mapRange(rawHardness, 0.0, 1.0, 1.5, 0.7); // soft: 1.5x, hard: 0.7x
  const fragmentationForceScale = mapRange(frag, 0.0, 1.0, 0.9, 1.25); // cohesive: 0.9x, fragile: 1.25x
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
    gravity: { x: 0, y: 1, scale: 0.0001 },
    
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
  bodySizeParam,
  gridOffset = { x: 0, y: 0 },
  gridData,
  stride = bodySizeParam // stride is the distance between cell origins (inner size + spacing)
) => {
  if (!Array.isArray(affectedCells)) return [];

  const bodies = affectedCells.map((cell) => {
    // Convert grid coordinates to pixel coordinates (center of cell using stride)
    const pixelX = cell.x * stride + gridOffset.x + stride / 2;
    const pixelY = cell.y * stride + gridOffset.y + stride / 2;

    // Get the actual cell data from the grid if available
    const cellData = gridData?.grid?.[cell.y]?.[cell.x];
    const oreType = cellData?.oreType || cell.oreType || "unknown";

    // Normalize material props → physics scales
    const scales = computeMaterialScales(cellData);

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
        render: {
          // fallback to a neutral gray if the mapper doesn't have the ore
          fillStyle:
            OreColorMapper.colorMap[oreType?.toLowerCase()] || "#999999",
        },
      }
    );

    // Store original position for animation reference
    body.originalPosition = { x: pixelX, y: pixelY };

    return body;
  });

  // Debug: log a small sample of created bodies when running in the browser
  if (typeof window !== "undefined") {
    try {
      console.debug(
        "physicsEngine.createBlastBodies -> created",
        bodies.length,
        "bodies. Sample:",
        bodies.slice(0, 6).map((b) => ({
          gridX: b.gridX,
          gridY: b.gridY,
          x: b.position?.x,
          y: b.position?.y,
          oreType: b.oreType,
        }))
      );
    } catch {
      /* ignore */
    }
  }

  return bodies;
};

/**
 * Apply blast force to bodies based on distance from epicenter
 * Adaptively scales force based on number of affected cells to prevent wildness on large datasets
 * @param {Array} bodies
 * @param {Array} blastCenters
 * @param {number} blastForce
 */
export const applyBlastForce = (bodies, blastCenters, blastForce = 0.08) => {
  if (typeof window !== "undefined") {
    try {
      console.debug(
        "physicsEngine.applyBlastForce -> bodies:",
        (bodies || []).length,
        "blastCenters:",
        blastCenters
      );
    } catch {
      /* ignore */
    }
  }
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
  const maxForcePerCall = 0.012;

  // Adaptive normalization: smaller datasets can have stronger forces
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

  bodies.forEach((body) => {
    // debug: log initial body position for the first body sometimes
    // (kept minimal to avoid overwhelming console)
    if (typeof window !== "undefined" && bodies.indexOf(body) === 0) {
      try {
        console.debug("applyBlastForce: sample body", {
          gridX: body.gridX,
          gridY: body.gridY,
          x: body.position?.x,
          y: body.position?.y,
        });
      } catch {
        /* ignore */
      }
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
      const scales = computeMaterialScales(body.cellData);

      // Enhanced distance falloff: creates much stronger effect closer to blast
      // Grid distance uses stronger falloff to prioritize blast epicenter blocks
      // Adaptive: limit grid distance impact on large datasets to prevent peripheral chaos
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


//capture physics simulation for animation

export const capturePhysicsTrajectories = (bodies, engine, steps = 120) => {
  const trajectories = new Map();

  //initialize trajects storage
 bodies.forEach(body => {
    trajectories.set(body.id, {
      body: body,
      keyframes: [{
        x: body.originalPosition.x,
        y: body.originalPosition.y,
        angle: 0,
        time: 0
      }]
    });
  });

  const sampleInterval = 4; // Capture every 4th frame
  
  for (let i = 0; i < steps; i++) {
    Engine.update(engine, 1000 / 60); // 60fps simulation
    
    if (i % sampleInterval === 0 || i === steps - 1) {
      bodies.forEach(body => {
        const trajectory = trajectories.get(body.id);
        trajectory.keyframes.push({
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          time: (i / steps)
        });
      });
    }
  }

  return Array.from(trajectories.values());
}


export const animateBlastWithGSAP = (
  trajectories,
  onUpdate,
  onComplete,
  duration = 2.5
) => {
  const timeline = gsap.timeline({
    onComplete: () => {
      console.debug("Blast animation complete");
      onComplete?.();
    }
  });

  // Create animation state objects for each body
  const animStates = trajectories.map(traj => {
    const body = traj.body;
    const finalFrame = traj.keyframes[traj.keyframes.length - 1];
    
    return {
      body: body,
      animX: body.originalPosition.x,
      animY: body.originalPosition.y,
      animAngle: 0,
      targetX: finalFrame.x,
      targetY: finalFrame.y,
      targetAngle: finalFrame.angle,
      keyframes: traj.keyframes
    };
  });

  // Animate each body
  animStates.forEach((state, index) => {
    // Add slight stagger based on blast distance for wave effect
    const delay = (state.body.blastDistance || 0) * 0.008;
    
    // Use bezier path for more realistic physics-like motion
    const controlPoints = state.keyframes.map(kf => ({
      x: kf.x,
      y: kf.y
    }));

    timeline.to(state, {
      animX: state.targetX,
      animY: state.targetY,
      animAngle: state.targetAngle,
      duration: duration,
      delay: delay,
      ease: "power2.out", // Natural deceleration
      onUpdate: () => {
        // Update the actual body position for rendering
        state.body.animatedPosition = {
          x: state.animX,
          y: state.animY,
          angle: state.animAngle
        };
        
        // Trigger render update
        onUpdate?.(state.body);
      }
    }, 0); // Start all animations at timeline time 0 (delay handles stagger)
  });

  return timeline;
};

export const animateBlastWithCanvas = (
  trajectories,
  onUpdate,
  onComplete,
  duration = 2500
) => {
  const startTime = performance.now();
  const animStates = trajectories.map(traj => {
    const body = traj.body;
    const finalFrame = traj.keyframes[traj.keyframes.length - 1];
    const delay = (body.blastDistance || 0) * 8; // milliseconds
    
    return {
      body: body,
      startX: body.originalPosition.x,
      startY: body.originalPosition.y,
      targetX: finalFrame.x,
      targetY: finalFrame.y,
      targetAngle: finalFrame.angle,
      delay: delay,
      keyframes: traj.keyframes
    };
  });

  let animationId;
  
  const easeOutQuad = (t) => t * (2 - t); // Smooth deceleration
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    let allComplete = true;

    animStates.forEach(state => {
      const adjustedElapsed = Math.max(0, elapsed - state.delay);
      const progress = Math.min(1, adjustedElapsed / duration);
      
      if (progress < 1) {
        allComplete = false;
      }

      // Apply easing
      const easedProgress = easeOutQuad(progress);

      // Interpolate position with physics-based curve
      // Use keyframes for more accurate path
      const keyframeIndex = Math.floor(easedProgress * (state.keyframes.length - 1));
      const nextIndex = Math.min(keyframeIndex + 1, state.keyframes.length - 1);
      const kf1 = state.keyframes[keyframeIndex];
      const kf2 = state.keyframes[nextIndex];
      const localProgress = (easedProgress * (state.keyframes.length - 1)) - keyframeIndex;

      const x = kf1.x + (kf2.x - kf1.x) * localProgress;
      const y = kf1.y + (kf2.y - kf1.y) * localProgress;
      const angle = kf1.angle + (kf2.angle - kf1.angle) * localProgress;

      // Update body with animated position
      state.body.animatedPosition = { x, y, angle };
      
      onUpdate?.(state.body);
    });

    if (!allComplete) {
      animationId = requestAnimationFrame(animate);
    } else {
      console.debug("Canvas blast animation complete");
      onComplete?.();
    }
  };

  animationId = requestAnimationFrame(animate);
  
  // Return cancellation function
  return () => cancelAnimationFrame(animationId);
};

export const runAnimatedBlast = async (
  bodies,
  blastCenters,
  engine,
  options = {}
) => {
  const {
    blastForce = 0.08,
    duration = 2.5,
    useGSAP = true,
    onUpdate = null,
    simulationSteps = 120
  } = options;

  console.debug("Starting animated blast simulation...");

  // Step 1: Apply blast forces
  applyBlastForce(bodies, blastCenters, blastForce);

  // Step 2: Run physics simulation and capture trajectories
  console.debug("Capturing physics trajectories...");
  const trajectories = capturePhysicsTrajectories(bodies, engine, simulationSteps);

  // Step 3: Reset bodies to original positions for animation
  bodies.forEach(body => {
    Body.setPosition(body, body.originalPosition);
    Body.setAngle(body, 0);
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  });

  // Step 4: Animate based on captured trajectories
  return new Promise((resolve) => {
    const handleComplete = () => {
      console.debug("Blast animation sequence complete");
      resolve();
    };

    if (useGSAP) {
      console.debug("Using GSAP animation");
      animateBlastWithGSAP(trajectories, onUpdate, handleComplete, duration);
    } else {
      console.debug("Using Canvas animation");
      animateBlastWithCanvas(trajectories, onUpdate, handleComplete, duration * 1000);
    }
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
