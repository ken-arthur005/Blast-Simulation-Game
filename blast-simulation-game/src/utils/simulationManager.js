const SAVE_SLOT_KEY = "rockBlasterzSaves";
const MAX_SAVES = 5; // The ticket suggests 5-10, let's start with 5.

/**
 * Retrieves all saved simulations from localStorage.
 * @returns {Array} An array of saved simulation states.
 */
export const getSavedSimulations = () => {
  try {
    const savedData = localStorage.getItem(SAVE_SLOT_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error("Failed to retrieve saved simulations:", error);
    return [];
  }
};

/**
 * Saves the current simulation state.
 * @param {Object} simulationState - The complete state object to save.
 * @returns {boolean} - True if save was successful, false otherwise.
 */
export const saveSimulation = (simulationState) => {
  if (!simulationState) {
    console.error("Save failed: No simulation state provided.");
    return false;
  }

  try {
    const allSaves = getSavedSimulations();

    // Add new save to the beginning of the array
    const newSave = {
      id: `save_${Date.now()}`,
      timestamp: simulationState.savedAt || new Date().toISOString(),
      ...simulationState,
    };
    const updatedSaves = [newSave, ...allSaves];

    // Ensure only the 5 most recent saves are retained
    if (updatedSaves.length > MAX_SAVES) {
      updatedSaves.splice(MAX_SAVES); // Remove the oldest saves
    }

    localStorage.setItem(SAVE_SLOT_KEY, JSON.stringify(updatedSaves));
    console.log(`Simulation saved successfully with ID: ${newSave.id}`);
    return true;
  } catch (error) {
    console.error("Failed to save simulation:", error);
    // This can happen if localStorage is full.
    alert("Could not save simulation. Storage might be full.");
    return false;
  }
};

// We would also add load and delete functions here later.
/*
export const loadSimulation = (saveId) => {
  const allSaves = getSavedSimulations();
  return allSaves.find(save => save.id === saveId);
};
*/
