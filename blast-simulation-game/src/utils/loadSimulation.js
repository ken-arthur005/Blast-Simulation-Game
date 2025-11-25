import GridDataProcessor from "./gridDataProcessor";

export async function loadSimulation(file) {
  return new Promise((resolve, reject) => {
    if (
      file.type !== "application/json" &&
      !file.name.endsWith(".json") &&
      !file.name.endsWith(".csv")
    ) {
      return reject(new Error("Invalid file type. Please select a JSON or CSV file."));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let loadedState;

        if (file.name.endsWith(".json")) {
          // 1. Parse JSON
          loadedState = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          // 2. Handle CSV (e.g., if a previous raw grid was saved as CSV)
          // NOTE: A saved simulation will be JSON. If it's a CSV, treat it as a new grid input.
          // For simplicity in a 'load simulation' feature, we assume JSON is the primary format.
          // If CSV must be supported, a separate logic flow is required.
          return reject(new Error("Only JSON simulation files are supported for full state restoration."));
        } else {
            return reject(new Error("Unsupported file format."));
        }

        // 3. Validation: Check for required top-level keys
        if (
          !loadedState.gameState ||
          !loadedState.originalGrid ||
          !loadedState.currentGrid ||
          !loadedState.gridDimensions ||
          !loadedState.gridMetadata
        ) {
          return reject(new Error("Simulation file is corrupted or incomplete. Missing key state data."));
        }

        // 4. Deeper validation (e.g., check grid dimensions integrity)
        if (
          loadedState.originalGrid.length !== loadedState.gridDimensions.height ||
          loadedState.originalGrid[0].length !== loadedState.gridDimensions.width
        ) {
          return reject(new Error("Grid dimensions in file do not match the stored grid array size."));
        }
        
        // 5. Success
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