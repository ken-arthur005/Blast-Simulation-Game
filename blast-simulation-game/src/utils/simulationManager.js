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

export const clearManualSimulations = () => {
  try {
    localStorage.removeItem(MANUAL_SAVE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear manual saves:", error);
    return false;
  }
};

export const clearAutoSimulations = () => {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear auto saves:", error);
    return false;
  }
};

export const saveManualSimulation = (simulationState) => {
  if (!simulationState) return false;
  try {
    const manualSaves = getManualSimulations();

    // Detect screen size at time of save
    const isSmallScreen = window.innerWidth < 600;

    const newSave = {
      id: `save_manual_${Date.now()}`,
      tag: "Manual Save",
      timestamp: new Date().toISOString(),
      isSmallScreen,
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
    // Get existing saves
    let autoSaves = getAutoSimulations();

    // Detect screen size at time of save
    const isSmallScreen = window.innerWidth < 600;

    // Create the new save object
    const newSave = {
      id: `save_auto_${Date.now()}`,
      tag: `Auto-Save (Round ${roundNumber})`,
      timestamp: new Date().toISOString(),
      isSmallScreen,
      ...simulationState,
    };

    // 2. CHECK FOR DUPLICATE/UPDATE SCENARIO
    if (autoSaves.length > 0) {
      const lastSave = autoSaves[0]; // Get the most recent save

      // Extract Round Number from the tag string "Auto-Save (Round X)"
      const lastRoundMatch = lastSave.tag.match(/Round (\d+)/);
      const lastRoundNumber = lastRoundMatch
        ? parseInt(lastRoundMatch[1], 10)
        : -1;

      // Check Time Difference (seconds)
      const lastSaveTime = new Date(lastSave.timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeDiffInSeconds = (currentTime - lastSaveTime) / 1000;

      // CONDITION:
      // Same Round Number AND saved less than 15 seconds ago?
      // -> It's the same event firing twice. Overwrite the old one.
      if (lastRoundNumber === roundNumber && timeDiffInSeconds < 15) {
        console.log(
          `♻️ Replacing duplicate Auto-Save for Round ${roundNumber}. (Diff: ${timeDiffInSeconds.toFixed(
            2
          )}s)`
        );

        // Replace the first element with the new data
        autoSaves[0] = newSave;

        writeSaves(AUTO_SAVE_KEY, autoSaves);
        return true;
      }
    }

    // 3. NORMAL SCENARIO (New Round or Long Time Gap)
    // Prepend the new save and limit array size
    const updatedSaves = [newSave, ...autoSaves].slice(0, MAX_AUTO_SAVES);

    writeSaves(AUTO_SAVE_KEY, updatedSaves);
    return true;
  } catch (error) {
    console.error("Save failed", error);
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
