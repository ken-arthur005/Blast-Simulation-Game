import GridDataProcessor from "./gridDataProcessor";

export async function loadSimulation(file) {
  return new Promise((resolve, reject) => {
    if (
      file.type !== "application/json" &&
      !file.name.endsWith(".json")
    ) {
      return reject(new Error("Invalid file type. Please select a JSON file."));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const loadedState = JSON.parse(content);

        // --- VALIDATION LOGIC UPDATED ---
        
        // 1. Check for NEW structure (Nested)
        const isNewFormat = 
          loadedState.initialGridState && 
          loadedState.simulationSnapshot && 
          loadedState.gameState;

        // 2. Check for OLD structure (Flat)
        const isOldFormat = 
          loadedState.gameState &&
          loadedState.originalGrid &&
          loadedState.currentGrid &&
          loadedState.gridDimensions;

        if (!isNewFormat && !isOldFormat) {
          return reject(new Error("File is missing critical game data (Grid State or Game State)."));
        }

        // 3. Normalize Data if needed (Optional, but good for validation)
        // If new format, check inner dimensions
        if (isNewFormat) {
           const { grid, dimensions } = loadedState.initialGridState;
           if (!grid || !dimensions) {
               return reject(new Error("Corrupted Save: Missing grid dimensions in initial state."));
           }
        }

        resolve(loadedState);

      } catch (error) {
        console.error("File processing error:", error);
        reject(new Error("Error parsing file: " + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading the file."));
    };

    reader.readAsText(file);
  });
}