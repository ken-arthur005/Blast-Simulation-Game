const printGridDebugInfo = (processedGrid) => {
  const { dimensions, metadata, grid } = processedGrid;

  console.log("=== GRID DEBUG INFORMATION ===");
  console.log("Grid Dimensions:", dimensions);
  console.log("Total Blocks:", metadata.totalBlocks);
  console.log("Ore Types Found:", metadata.oreTypes);

  // NEW: Log the actual grid structure
  console.log("=== GRID STRUCTURE ===");
  console.log("Full Grid Array:", grid);

  // NEW: Log a visual representation of the grid
  console.log("=== VISUAL GRID REPRESENTATION ===");
  grid.forEach((row, rowIndex) => {
    const rowString = row
      .map((cell) => {
        if (cell && cell.oreType) {
          return cell.oreType.charAt(0).toUpperCase(); // First letter of ore type
        }
        return "."; // For empty cell
      })
      .join(" ");
    console.log(`Row ${rowIndex.toString().padStart(2, "0")}: ${rowString}`);
  });


  console.log("=== END GRID DEBUG ===");
};

export default printGridDebugInfo;
