const MANUAL_SAVE_KEY = "rockBlasterzSaves";
const AUTO_SAVE_KEY = "rockBlasterzAutoSaves";
// NEW: Key for lightweight leaderboard data
const LEADERBOARD_KEY = "rockBlasterzLeaderboard";

const MAX_MANUAL_SAVES = 5;
const MAX_AUTO_SAVES = 3;
const MAX_LEADERBOARD_ENTRIES = 50; // Keep top 50

/**
 * Generic function to get saves from a specific localStorage key.
 * @param {string} key - The localStorage key to read from.
 * @returns {Array} An array of saved states.
 */
const getSaves = (key) => {
  try {
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error(`Failed to retrieve saves from ${key}:`, error);
    return [];
  }
};

/**
 * Generic function to write saves to a specific localStorage key.
 * @param {string} key - The localStorage key to write to.
 * @param {Array} data - The array of saves to store.
 */
const writeSaves = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getManualSimulations = () => getSaves(MANUAL_SAVE_KEY);
export const getAutoSimulations = () => getSaves(AUTO_SAVE_KEY);
// NEW: Export leaderboard getter
export const getLeaderboardScores = () => getSaves(LEADERBOARD_KEY);

/**
 * Saves a manual simulation state.
 * @param {Object} simulationState - The complete state object to save.
 * @returns {boolean} - True if save was successful.
 */
export const saveManualSimulation = (simulationState) => {
  if (!simulationState) {
    console.error("Manual save failed: No simulation state provided.");
    return false;
  }
  try {
    const manualSaves = getManualSimulations();
    const newSave = {
      id: `save_manual_${Date.now()}`,
      tag: "Manual Save", // Tag for UI distinction
      ...simulationState,
    };
    const updatedSaves = [newSave, ...manualSaves].slice(0, MAX_MANUAL_SAVES);

    writeSaves(MANUAL_SAVE_KEY, updatedSaves);
    console.log("✅ Manual simulation saved.");
    return true;
  } catch (error) {
    console.error("Failed to save manual simulation:", error);
    return false;
  }
};

/**
 * Saves an automatic simulation state after a blast.
 * @param {Object} simulationState - The complete state object to save.
 * @param {number} roundNumber - The round number of the blast.
 * @returns {boolean} - True if save was successful.
 */
export const saveAutoSimulation = (simulationState, roundNumber) => {
  if (!simulationState) {
    console.error("Auto-save failed: No simulation state provided.");
    return false;
  }
  try {
    const autoSaves = getAutoSimulations();
    const newSave = {
      id: `save_auto_${Date.now()}`,
      tag: `Auto-Save (After Round ${roundNumber})`, // Dynamic tag
      ...simulationState,
    };
    const updatedSaves = [newSave, ...autoSaves].slice(0, MAX_AUTO_SAVES);

    writeSaves(AUTO_SAVE_KEY, updatedSaves);
    console.log(`🤖 Auto-save triggered after round ${roundNumber}.`);
    return true;
  } catch (error) {
    console.error("Failed to auto-save simulation:", error);
    return false;
  }
};

/**
 * Saves a high score entry to the leaderboard.
 * @param {Object} scoreEntry - { playerName, score, efficiency, date, recoveryRate }
 */
export const saveHighscore = (scoreEntry) => {
  try {
    const currentScores = getLeaderboardScores();
    const newEntry = {
      id: `score_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...scoreEntry,
    };
    
    // Add new score, sort by score descending, then limit list size
    const updatedScores = [...currentScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADERBOARD_ENTRIES);

    writeSaves(LEADERBOARD_KEY, updatedScores);
    console.log("🏆 High score saved:", newEntry);
    return true;
  } catch (error) {
    console.error("Failed to save high score:", error);
    return false;
  }
};

/**
 * Clears the leaderboard.
 */
export const clearLeaderboard = () => {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    return true;
  } catch (error) {
    return false;
  }
};