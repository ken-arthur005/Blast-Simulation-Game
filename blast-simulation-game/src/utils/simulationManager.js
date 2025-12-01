// utils/simulationManager.js

const MANUAL_SAVE_KEY = "rockBlasterzSaves";
const AUTO_SAVE_KEY = "rockBlasterzAutoSaves";
const LEADERBOARD_KEY = "rockBlasterzLeaderboard";

const MAX_MANUAL_SAVES = 5;
const MAX_AUTO_SAVES = 5; // Increased to 5 based on requirements
const MAX_LEADERBOARD_ENTRIES = 100;

// Helper to safe-read storage
const getSaves = (key) => {
  try {
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error(`Failed to retrieve saves from ${key}:`, error);
    return [];
  }
};

const writeSaves = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage full or disabled", e);
  }
};

// --- EXPORTS ---

export const getManualSimulations = () => getSaves(MANUAL_SAVE_KEY);
export const getAutoSimulations = () => getSaves(AUTO_SAVE_KEY);
export const getLeaderboardScores = () => getSaves(LEADERBOARD_KEY);

export const saveManualSimulation = (simulationState) => {
  if (!simulationState) return false;
  try {
    const manualSaves = getManualSimulations();
    const newSave = {
      id: `save_manual_${Date.now()}`,
      tag: "Manual Save",
      timestamp: new Date().toISOString(),
      ...simulationState,
    };
    const updatedSaves = [newSave, ...manualSaves].slice(0, MAX_MANUAL_SAVES);
    writeSaves(MANUAL_SAVE_KEY, updatedSaves);
    return true;
  } catch (error) {
    return false;
  }
};

export const saveAutoSimulation = (simulationState, roundNumber) => {
  if (!simulationState) return false;
  try {
    const autoSaves = getAutoSimulations();
    const newSave = {
      id: `save_auto_${Date.now()}`,
      tag: `Auto-Save (Round ${roundNumber})`,
      timestamp: new Date().toISOString(),
      ...simulationState,
    };
    const updatedSaves = [newSave, ...autoSaves].slice(0, MAX_AUTO_SAVES);
    writeSaves(AUTO_SAVE_KEY, updatedSaves);
    return true;
  } catch (error) {
    return false;
  }
};

export const saveHighscore = (scoreEntry) => {
  try {
    const currentScores = getLeaderboardScores();
    const newEntry = {
      id: `score_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...scoreEntry,
    };
    
    // Sort descending by score
    const updatedScores = [...currentScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADERBOARD_ENTRIES);

    writeSaves(LEADERBOARD_KEY, updatedScores);
    return true;
  } catch (error) {
    return false;
  }
};

export const clearLeaderboard = () => {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    return true;
  } catch (error) {
    return false;
  }
};