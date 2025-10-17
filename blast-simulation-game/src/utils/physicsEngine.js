import { Engine, Render, World, Bodies, Body, Events } from 'matter-js';

/**
 * Create and initialize a Matter.js physics engine
 * @param {HTMLCanvasElement} canvas 
 * @param {Object} canvasSize
 * @returns {Object}
 */
export const createPhysicsEngine = (canvas, canvasSize) => {
  const engine = Engine.create({
    gravity: { x: 0, y: 1 } 
  });

  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: canvasSize.width,
      height: canvasSize.height,
      wireframes: false,
      background: 'transparent'
    }
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
          fillStyle: '#333333',
          visible: true 
        },
        label: 'floor'
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
          fillStyle: '#333333',
          visible: false
        },
        label: 'leftWall'
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
          fillStyle: '#333333',
          visible: false
        },
        label: 'rightWall'
      }
    )
  ];
  
  return walls;
};

/**
 * Convert affected grid cells to Matter.js bodies
 * @param {Array} affectedCells 
 * @param {number} blockSize 
 * @param {Object} gridOffset 
 * @param {Object} gridData 
 * @returns {Array}
 */
export const createBlastBodies = (affectedCells, blockSize, gridOffset = { x: 0, y: 0 }, gridData) => {
  return affectedCells.map(cell => {
    // Convert grid coordinates to pixel coordinates
    const pixelX = cell.x * blockSize + gridOffset.x + blockSize / 2;
    const pixelY = cell.y * blockSize + gridOffset.y + blockSize / 2;
    
    // Get the actual cell data from the grid
    const cellData = gridData?.grid?.[cell.y]?.[cell.x];
    const oreType = cellData?.oreType || 'unknown';
    
    // Create rectangular body at block position
    const body = Bodies.rectangle(pixelX, pixelY, blockSize * 0.8, blockSize * 0.8, {
      restitution: 0.6,
      friction: 0.1,
      frictionAir: 0.02,
      density: 0.001,
      // Store original grid data as metadata
      gridX: cell.x,
      gridY: cell.y,
      blastDistance: cell.distance,
      oreType: oreType,
      isOreBlock: true,
      render: {
        fillStyle: getOreColor(oreType)
      }
    });
    
    return body;
  });
};


 //Get ore color based on type
 
const getOreColor = (oreType) => {
  const colorMap = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    copper: '#B87333',
    iron: '#8B4513',
    coal: '#2C2C2C',
    destroyed: '#808080',
    unknown: '#999999'
  };
  return colorMap[oreType?.toLowerCase()] || '#999999';
};

/**
 * Apply blast force to bodies based on distance from epicenter
 * @param {Array} bodies 
 * @param {Array} blastCenters 
 * @param {number} blastForce 
 */
export const applyBlastForce = (bodies, blastCenters, blastForce = 0.05) => {
  bodies.forEach(body => {
    // Apply force from each blast center
    blastCenters.forEach(blastCenter => {
      // Calculate direction from blast center to body
      const dx = body.position.x - blastCenter.x;
      const dy = body.position.y - blastCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize direction and apply force inversely proportional to distance
      if (distance > 0) {
        const forceMagnitude = blastForce / (1 + body.blastDistance * 0.5);
        const forceX = (dx / distance) * forceMagnitude;
        const forceY = (dy / distance) * forceMagnitude - 0.01; 
        
        Body.applyForce(body, body.position, { x: forceX, y: forceY });
      }
    });
    
    // Add random rotation for visual interest
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