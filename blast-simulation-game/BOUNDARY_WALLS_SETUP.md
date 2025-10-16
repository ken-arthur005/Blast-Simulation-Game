# Boundary Walls Setup Guide

## Visual Layout

```
┌─────────────────────────────────────┐
│          CANVAS (600x400)           │
│                                     │
│  LEFT  ┌─────────────────┐  RIGHT  │
│  WALL  │                 │  WALL   │
│   │    │   GRID AREA     │    │    │
│   │    │                 │    │    │
│   │    │   ○ ○ ○ ○ ○     │    │    │
│   │    │   ○ ○ ○ ○ ○     │    │    │
│   │    │   ○ ○ ○ ○ ○     │    │    │
│   │    │   ○ ○ ○ ○ ○     │    │    │
│   │    │                 │    │    │
│   │    └─────────────────┘    │    │
│   │    ═══════════════════    │    │
│   │         FLOOR             │    │
└───┴───────────────────────────┴────┘
```

## Wall Specifications

### Floor
- **Position**: Bottom of canvas
- **Dimensions**: Full canvas width × 50px height
- **Y-Position**: `canvasHeight + 25` (half thickness below canvas)
- **Function**: Catches falling debris, prevents objects from falling off screen
- **Physics**: 
  - Friction: 0.5 (moderate sliding)
  - Restitution: 0.3 (some bounce)

### Left Wall
- **Position**: Left edge of canvas
- **Dimensions**: 50px width × double canvas height
- **X-Position**: `-25` (half thickness off canvas)
- **Function**: Prevents debris from exiting left side
- **Physics**: Same as floor

### Right Wall
- **Position**: Right edge of canvas
- **Dimensions**: 50px width × double canvas height
- **X-Position**: `canvasWidth + 25` (half thickness off canvas)
- **Function**: Prevents debris from exiting right side
- **Physics**: Same as floor

## Physics Properties

All walls are **static bodies** (don't move):

```javascript
{
  isStatic: true,        // Walls don't move
  friction: 0.5,         // Medium friction for realistic sliding
  restitution: 0.3,      // Low bounce (30% energy retained)
  render: {
    fillStyle: '#333333',
    visible: false       // Invisible but functional
  }
}
```

## Debris Interaction

When debris (affected cells) collide with walls:

1. **Floor Collision**:
   - Debris bounces back up with 30% of impact velocity
   - Friction slows horizontal movement
   - Eventually settles at bottom

2. **Side Wall Collision**:
   - Debris bounces back into canvas area
   - Horizontal velocity reversed and reduced
   - Continues falling with gravity

3. **Multiple Collisions**:
   - Debris can bounce between walls
   - Energy dissipates with each collision
   - Eventually comes to rest at floor

## Customization

### Adjust Wall Thickness
```javascript
const walls = createBoundaryWalls(canvasSize, 100); // Thicker walls
```

### Adjust Bounce
```javascript
// In createBoundaryWalls function
restitution: 0.7  // Bouncier (70% energy retained)
restitution: 0.1  // Less bouncy (10% energy retained)
```

### Adjust Friction
```javascript
// In createBoundaryWalls function
friction: 0.8  // More friction (slower sliding)
friction: 0.1  // Less friction (more sliding)
```

## Why Walls Are Invisible

The walls have `visible: false` in their render properties because:
- They serve a purely functional purpose
- Visible walls would clutter the UI
- The canvas already has a visual border
- Players don't need to see the physics boundaries

However, if you want to visualize them for debugging:
```javascript
render: {
  fillStyle: '#FF0000',  // Red walls
  visible: true          // Make visible
}
```

## Performance Notes

- Walls are static bodies (no CPU cost for movement)
- Only 3 wall bodies added to physics world
- Collision detection is efficient (AABB bounding boxes)
- No impact on frame rate even with many debris pieces

## Troubleshooting

### Debris Still Escaping?
1. Increase wall thickness: `createBoundaryWalls(canvasSize, 100)`
2. Check canvas size matches actual rendering area
3. Verify walls are added before running simulation

### Debris Not Bouncing?
1. Increase restitution value (0.5-0.8 for noticeable bounce)
2. Check that debris bodies have restitution > 0
3. Verify walls are marked as `isStatic: true`

### Debris Sticking to Walls?
1. Decrease friction value (0.1-0.3 for smoother sliding)
2. Increase air friction on debris bodies
3. Check for physics engine timestep issues
