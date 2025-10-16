# Matter.js Physics Integration Guide

## Overview
Matter.js has been integrated into the Rock Blasterz game to provide realistic physics-based debris animation when blasts occur. Affected cells are converted to physics bodies that simulate falling debris with gravity, rotation, and collision effects.

## Implementation Details

### 1. Physics Engine Setup (`utils/physicsEngine.js`)

#### Key Functions:

**`createPhysicsEngine(canvas, canvasSize)`**
- Creates and initializes a Matter.js engine and renderer
- Sets up gravity (x: 0, y: 1) for realistic falling motion
- Returns `{ engine, render }` objects

**`createBoundaryWalls(canvasSize, wallThickness)`**
- Creates invisible static walls (floor and sides) to contain debris
- Floor: Positioned at bottom of canvas
- Left/Right walls: Positioned at canvas edges
- All walls have friction (0.5) and restitution (0.3) for realistic bouncing
- Walls are invisible but fully functional for collision detection

**`createBlastBodies(affectedCells, blockSize, gridOffset, gridData)`**
- Converts affected grid cells into Matter.js rigid bodies
- Each body has:
  - Position: Calculated from grid coordinates + canvas offset
  - Size: 80% of block size for better visual effect
  - Physics properties: Restitution (0.6), friction (0.1), air friction (0.02)
  - Metadata: Grid coordinates, blast distance, ore type
  - Render color: Based on ore type (gold, silver, copper, etc.)

**`applyBlastForce(bodies, blastCenters, blastForce)`**
- Applies explosive force to all bodies from multiple blast centers
- Force is inversely proportional to distance from blast
- Adds random angular velocity for realistic tumbling effect
- Slight upward bias for dramatic effect

**`cleanupPhysicsEngine(engine, render)`**
- Properly cleans up Matter.js resources
- Prevents memory leaks

### 2. Grid Canvas Integration (`Components/GridCanvas.jsx`)

#### Physics Animation Flow:

1. **Trigger Detection**: When `blastTrigger` prop changes
2. **Setup Phase**:
   - Calculate grid centering offsets
   - Create Matter.js engine with gravity
   - **Create boundary walls** (floor and sides) to contain debris
   - Generate physics bodies for affected cells
   - Calculate blast center positions in pixel coordinates
   - Apply blast forces to bodies

3. **Animation Loop** (2 seconds):
   - Clear canvas and render background
   - Render static grid (unaffected cells)
   - Render physics bodies with:
     - Current position from Matter.js simulation
     - Rotation based on body angle
     - Fading opacity (0-80% over duration)
     - Ore-specific colors

4. **Cleanup Phase**:
   - Stop physics simulation
   - Clean up Matter.js resources
   - Mark cells as destroyed
   - Call `onBlastComplete` callback

### 3. Blast Calculator Updates (`utils/blastCalculator.js`)

**Enhanced `calculateAffectedCells`**:
- Now includes `blastX` and `blastY` in each affected cell
- Includes `oreType` for proper rendering
- These are used to calculate blast center positions for physics

### 4. Ore Grid Visualization Updates (`Components/OreGridVisualization.jsx`)

**`handleTriggerBlast` improvements**:
- Added validation to check if blasts exist
- Enhanced logging for debugging
- Passes blast center information to canvas

## Visual Effects

### Physics Properties:
- **Gravity**: 0.5 (slower fall for better visibility)
- **Restitution**: 0.6 (bouncy debris)
- **Friction**: 0.1 (some sliding)
- **Air Friction**: 0.02 (realistic air resistance)
- **Blast Force**: 0.08 (balanced explosive power)

### Animation Features:
- Debris falls and tumbles realistically
- Fades out over 2 seconds
- Maintains ore-specific colors (gold, silver, copper, etc.)
- Random rotation for each piece
- Force radiates from blast centers
- **Contained within canvas bounds** by invisible floor and side walls
- **Realistic bouncing** off walls and floor

## Usage

### Triggering a Blast:
1. Place explosives by clicking grid cells (up to 5)
2. Click "Trigger Blast" button in GridLegend
3. Physics simulation automatically:
   - Creates bodies for affected cells
   - Applies forces from all blast points
   - Animates debris with gravity
   - Fades out and marks cells as destroyed

### Performance Considerations:
- Physics runs for 2 seconds per blast
- Bodies are cleaned up after animation
- No persistent physics simulation (on-demand only)
- Optimized for typical grid sizes (8x8 to 50x50)

## Customization

### Adjust Physics Parameters:
Edit `utils/physicsEngine.js`:
```javascript
// Gravity strength
engine = Engine.create({
  gravity: { x: 0, y: 0.5 } // Increase y for faster fall
});

// Boundary wall properties
export const createBoundaryWalls = (canvasSize, wallThickness = 50) => {
  // Adjust wallThickness for thicker/thinner walls
  // Adjust friction and restitution in wall bodies:
  {
    friction: 0.5,      // Wall friction (0-1)
    restitution: 0.3    // Bounciness (0-1)
  }
}

// Blast force
export const applyBlastForce = (bodies, blastCenters, blastForce = 0.08)
// Increase for more explosive effect

// Body properties
Bodies.rectangle(pixelX, pixelY, blockSize * 0.8, blockSize * 0.8, {
  restitution: 0.6,  // Bounciness (0-1)
  friction: 0.1,     // Sliding friction
  frictionAir: 0.02, // Air resistance
  density: 0.001     // Mass density
});
```

### Adjust Animation Duration:
Edit `Components/GridCanvas.jsx`:
```javascript
const duration = 2000; // Change to desired milliseconds
```

## Testing

To test the integration:
1. Run `pnpm dev`
2. Upload a CSV file (or use default)
3. Click cells to place explosives
4. Click "Trigger Blast"
5. Observe physics-based debris animation

Expected behavior:
- Debris should fly outward from blast centers
- Pieces should tumble and fall with gravity
- **Debris should bounce off floor and side walls, staying within canvas**
- Colors should match ore types
- Animation should complete in 2 seconds
- Cells should turn gray after animation

## Dependencies

- **matter-js**: ^0.20.0 (already installed)
- No additional packages required

## Future Enhancements

Possible improvements:
- Add particle effects for explosions
- Sound effects synchronized with physics
- Chain reactions between nearby blasts
- Debris collision with static grid cells
- Ore-specific physics properties (heavy iron vs light gold)
