/**
 * Replay Engine - Deterministic replay of saved blast simulations
 *
 * This module provides functionality to replay saved simulations with exact precision,
 * ensuring that physics, animations, and scores match the original session.
 */

import { Engine, World, Bodies, Body, Events } from "matter-js";
import {
  createBlastBodies,
  applyBlastForce,
  createBoundaryWalls,
} from "./physicsEngine";
import { animateBlastWithGSAP } from "./animationHelpers";

/**
 * Replay state manager
 */
class ReplayManager {
  constructor() {
    this.isReplaying = false;
    this.isPaused = false;
    this.currentFrame = 0;
    this.totalFrames = 0;
    this.replayData = null;
    this.timeline = null;
    this.onProgressCallbacks = [];
    this.onCompleteCallbacks = [];
    this.onPauseCallbacks = [];
    this.onResumeCallbacks = [];
  }

  /**
   * Load replay data from a saved simulation
   * @param {Object} savedSimulation - The saved simulation state
   * @returns {boolean} - Success status
   */
  loadReplayData(savedSimulation) {
    try {
      if (!savedSimulation.physicsReplayData) {
        console.error("No physics replay data found in saved simulation");
        return false;
      }

      this.replayData = {
        initialPositions: savedSimulation.physicsReplayData.initialPositions,
        physicsState: savedSimulation.physicsReplayData.physicsState,
        trajectories: savedSimulation.physicsReplayData.trajectories,
        affectedCells: savedSimulation.physicsReplayData.affectedCells,
        blastCenters: savedSimulation.physicsReplayData.blastCenters,
        gridData: savedSimulation.initialGridState,
        gameState: savedSimulation.gameState,
      };

      this.totalFrames =
        this.replayData.trajectories[0]?.keyframes?.length || 0;
      this.currentFrame = 0;

      console.log("✅ Replay data loaded successfully", {
        totalFrames: this.totalFrames,
        bodies: this.replayData.trajectories.length,
        blastCenters: this.replayData.blastCenters.length,
      });

      return true;
    } catch (error) {
      console.error("Failed to load replay data:", error);
      return false;
    }
  }

  /**
   * Start replaying the simulation
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {Object} canvasSize - Canvas dimensions
   * @param {number} blockSize - Size of each block
   * @param {Object} gridOffset - Grid offset for positioning
   * @param {number} cellSpacing - Spacing between cells
   * @returns {Promise} - Resolves when replay completes
   */
  async startReplay(canvas, canvasSize, blockSize, gridOffset, cellSpacing) {
    if (!this.replayData) {
      console.error("No replay data loaded");
      return Promise.reject(new Error("No replay data loaded"));
    }

    this.isReplaying = true;
    this.isPaused = false;
    this.currentFrame = 0;

    console.log("🎬 Starting replay...");

    return new Promise((resolve) => {
      try {
        // Use the stored trajectories to animate
        const trajectories = this.replayData.trajectories;

        // Animate using GSAP with the exact trajectories
        animateBlastWithGSAP(
          trajectories,
          canvas,
          canvasSize,
          blockSize,
          gridOffset,
          cellSpacing,
          (frame) => {
            this.currentFrame = frame;
            this._notifyProgress(frame, this.totalFrames);
          },
          () => {
            this.isReplaying = false;
            this._notifyComplete();
            resolve();
          }
        );
      } catch (error) {
        console.error("Replay failed:", error);
        this.isReplaying = false;
        resolve();
      }
    });
  }

  /**
   * Pause the replay
   */
  pause() {
    if (!this.isReplaying || this.isPaused) return;

    this.isPaused = true;
    if (this.timeline) {
      this.timeline.pause();
    }
    this._notifyPause();
    console.log("⏸️ Replay paused at frame", this.currentFrame);
  }

  /**
   * Resume the replay
   */
  resume() {
    if (!this.isReplaying || !this.isPaused) return;

    this.isPaused = false;
    if (this.timeline) {
      this.timeline.resume();
    }
    this._notifyResume();
    console.log("▶️ Replay resumed from frame", this.currentFrame);
  }

  /**
   * Step forward one frame
   */
  stepForward() {
    if (!this.isReplaying) return;

    if (!this.isPaused) {
      this.pause();
    }

    if (this.currentFrame < this.totalFrames - 1) {
      this.currentFrame++;
      // Seek timeline to next frame
      if (this.timeline) {
        const progress = this.currentFrame / this.totalFrames;
        this.timeline.progress(progress);
      }
      this._notifyProgress(this.currentFrame, this.totalFrames);
    }

    console.log(`⏭️ Stepped to frame ${this.currentFrame}/${this.totalFrames}`);
  }

  /**
   * Step backward one frame
   */
  stepBackward() {
    if (!this.isReplaying) return;

    if (!this.isPaused) {
      this.pause();
    }

    if (this.currentFrame > 0) {
      this.currentFrame--;
      // Seek timeline to previous frame
      if (this.timeline) {
        const progress = this.currentFrame / this.totalFrames;
        this.timeline.progress(progress);
      }
      this._notifyProgress(this.currentFrame, this.totalFrames);
    }

    console.log(
      `⏮️ Stepped back to frame ${this.currentFrame}/${this.totalFrames}`
    );
  }

  /**
   * Stop the replay
   */
  stop() {
    if (!this.isReplaying) return;

    this.isReplaying = false;
    this.isPaused = false;
    this.currentFrame = 0;

    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }

    console.log("⏹️ Replay stopped");
  }

  /**
   * Seek to a specific frame
   * @param {number} frame - Frame number to seek to
   */
  seekToFrame(frame) {
    if (!this.isReplaying || frame < 0 || frame >= this.totalFrames) return;

    this.currentFrame = frame;

    if (this.timeline) {
      const progress = frame / this.totalFrames;
      this.timeline.progress(progress);
    }

    this._notifyProgress(this.currentFrame, this.totalFrames);
    console.log(`⏩ Seeked to frame ${frame}/${this.totalFrames}`);
  }

  /**
   * Get current replay state
   */
  getState() {
    return {
      isReplaying: this.isReplaying,
      isPaused: this.isPaused,
      currentFrame: this.currentFrame,
      totalFrames: this.totalFrames,
      progress: this.totalFrames > 0 ? this.currentFrame / this.totalFrames : 0,
    };
  }

  /**
   * Register callback for progress updates
   */
  onProgress(callback) {
    this.onProgressCallbacks.push(callback);
  }

  /**
   * Register callback for replay completion
   */
  onComplete(callback) {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Register callback for pause event
   */
  onPause(callback) {
    this.onPauseCallbacks.push(callback);
  }

  /**
   * Register callback for resume event
   */
  onResume(callback) {
    this.onResumeCallbacks.push(callback);
  }

  // Private methods
  _notifyProgress(frame, total) {
    this.onProgressCallbacks.forEach((cb) => {
      try {
        cb(frame, total);
      } catch (error) {
        console.error("Progress callback error:", error);
      }
    });
  }

  _notifyComplete() {
    this.onCompleteCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error("Complete callback error:", error);
      }
    });
  }

  _notifyPause() {
    this.onPauseCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error("Pause callback error:", error);
      }
    });
  }

  _notifyResume() {
    this.onResumeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error("Resume callback error:", error);
      }
    });
  }
}

// Create singleton instance
const replayManager = new ReplayManager();

// Export functions
export const loadReplayData = (savedSimulation) =>
  replayManager.loadReplayData(savedSimulation);
export const startReplay = (
  canvas,
  canvasSize,
  blockSize,
  gridOffset,
  cellSpacing
) =>
  replayManager.startReplay(
    canvas,
    canvasSize,
    blockSize,
    gridOffset,
    cellSpacing
  );
export const pauseReplay = () => replayManager.pause();
export const resumeReplay = () => replayManager.resume();
export const stepForward = () => replayManager.stepForward();
export const stepBackward = () => replayManager.stepBackward();
export const stopReplay = () => replayManager.stop();
export const seekToFrame = (frame) => replayManager.seekToFrame(frame);
export const getReplayState = () => replayManager.getState();
export const onReplayProgress = (callback) =>
  replayManager.onProgress(callback);
export const onReplayComplete = (callback) =>
  replayManager.onComplete(callback);
export const onReplayPause = (callback) => replayManager.onPause(callback);
export const onReplayResume = (callback) => replayManager.onResume(callback);

export default replayManager;
