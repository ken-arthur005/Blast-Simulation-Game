import { Engine } from "matter-js";
import { gsap } from "gsap";

export const capturePhysicsTrajectories = (bodies, engine, steps = 120) => {
  // OPTIMIZED: Use Map for O(1) lookups, pre-allocate capacity hint
  const trajectories = new Map();
  const expectedKeyframes = Math.ceil(steps / 5) + 2; // Pre-calculate keyframe count

  // Initialize trajectory storage with original positions
  bodies.forEach((body) => {
    // OPTIMIZED: Pre-allocate array with expected size to reduce reallocations
    const keyframes = new Array(expectedKeyframes);
    keyframes[0] = {
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      time: 0,
    };
    trajectories.set(body.id, {
      body: body,
      keyframes: keyframes,
      keyframeIndex: 1, // Track current write position
    });
  });

  // Run physics simulation and capture keyframes
  // OPTIMIZED: Capture every 5th frame instead of 4th for better performance
  const sampleInterval = 5; // Reduced sampling for 10k+ blocks

  for (let i = 0; i < steps; i++) {
    // OPTIMIZED: Use larger timestep (30fps equivalent) during capture for 2x speedup
    Engine.update(engine, 1000 / 30); // 30fps simulation for faster capture

    if (i % sampleInterval === 0 || i === steps - 1) {
      // OPTIMIZED: Direct array write instead of push for better performance
      const timeNormalized = i / steps;
      bodies.forEach((body) => {
        const trajectory = trajectories.get(body.id);
        const idx = trajectory.keyframeIndex++;
        trajectory.keyframes[idx] = {
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          velocityX: body.velocity.x,
          velocityY: body.velocity.y,
          time: timeNormalized,
        };
      });
    }
  }
  
  // OPTIMIZED: Trim unused array slots
  trajectories.forEach((traj) => {
    traj.keyframes.length = traj.keyframeIndex;
    delete traj.keyframeIndex; // Clean up temporary index
  });

  // OPTIMIZED: Convert Map values to array more efficiently
  const result = [];
  trajectories.forEach((value) => result.push(value));
  return result;
};

export const animateBlastWithGSAP = (trajectories, duration = 2.5) => {
  const timeline = gsap.timeline();

  // Create animation state objects for each body
  const animStates = trajectories.map((traj) => {
    const body = traj.body;
    const startFrame = traj.keyframes[0];
    const finalFrame = traj.keyframes[traj.keyframes.length - 1];

    return {
      body: body,
      animX: startFrame.x,
      animY: startFrame.y,
      animAngle: startFrame.angle,
      animVelocityX: 0,
      animVelocityY: 0,
      targetX: finalFrame.x,
      targetY: finalFrame.y,
      targetAngle: finalFrame.angle,
      keyframes: traj.keyframes,
    };
  });

  // Animate each body with stagger effect
  animStates.forEach((state) => {
    const delay = (state.body.blastDistance || 0) * 0.008;

    timeline.to(
      state,
      {
        animX: state.targetX,
        animY: state.targetY,
        animAngle: state.targetAngle,
        duration: duration,
        delay: delay,
        ease: "power2.out",
        onUpdate: function () {
          // Calculate current keyframe for velocity (for motion trails)
          const progress = this.progress();
          const kfIndex = Math.floor(progress * (state.keyframes.length - 1));
          const kf =
            state.keyframes[Math.min(kfIndex, state.keyframes.length - 1)];

          state.animVelocityX = kf.velocityX || 0;
          state.animVelocityY = kf.velocityY || 0;

          // Update body's animated position for rendering
          state.body.animatedPosition = {
            x: state.animX,
            y: state.animY,
            angle: state.animAngle,
            velocityX: state.animVelocityX,
            velocityY: state.animVelocityY,
          };
        },
      },
      0
    );
  });

  return { timeline, animStates };
};
