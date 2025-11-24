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

