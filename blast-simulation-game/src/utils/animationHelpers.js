import { Engine } from "matter-js";
import { gsap } from "gsap";

export const capturePhysicsTrajectories = (bodies, engine, steps = 120) => {
  const trajectories = new Map();

  // Initialize trajectory storage with original positions
  bodies.forEach((body) => {
    trajectories.set(body.id, {
      body: body,
      keyframes: [
        {
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          time: 0,
        },
      ],
    });
  });

  // Run physics simulation and capture keyframes
  const sampleInterval = 4; // Capture every 4th frame for efficiency

  for (let i = 0; i < steps; i++) {
    Engine.update(engine, 1000 / 60); // 60fps simulation

    if (i % sampleInterval === 0 || i === steps - 1) {
      bodies.forEach((body) => {
        const trajectory = trajectories.get(body.id);
        trajectory.keyframes.push({
          x: body.position.x,
          y: body.position.y,
          angle: body.angle,
          velocityX: body.velocity.x,
          velocityY: body.velocity.y,
          time: i / steps,
        });
      });
    }
  }

  return Array.from(trajectories.values());
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
