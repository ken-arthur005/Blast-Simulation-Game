class OreColorMapper {
  // Predefined color mapping for common ore types
  static colorMap = {
    // Metals
    iron: "#8B4513",
    gold: "#FFD700",
    silver: "#c0c0c0",
    copper: "#B87333",
    aluminum: "#A0A0A0",
    lead: "#2F4F4F",
    zinc: "#7F7F7F",
    tin: "#D3D3D3",

    // Precious metals
    platinum: "#E5E4E2",
    palladium: "#CED0DD",
    // Coal and carbon
    coal: "#2C2C2C",
    graphite: "#1C1C1C",
    diamond: "#B9F2FF",

    // Other minerals
    quartz: "#FFFFFF",
    limestone: "#F5F5DC",
    granite: "#808080",
    sandstone: "#F4A460",
    marble: "#F8F8FF",
    slate: "#2F4F4F",
    // Gemstones
    ruby: "#E0115F",
    sapphire: "#0F52BA",
    emerald: "#50C878",
    topaz: "#FFCC00",

    // Default categories
    rock: "#A0522D",
    stone: "#778899",
    ore: "#8B7D6B",
    mineral: "#DDA0DD",
    empty: "#F5F5F5",
    void: "#000000",

    clay: "#8F00FF"
  };

  // Cache for assigned fallback colors
  static assignedColors = new Map();

  // Gets the color for a specific ore type
  static getColor(oreType) {
    if (!oreType || typeof oreType !== "string") {
      console.warn("Invalid ore type provided:", oreType);
      return this.colorMap.void;
    }

    // Normalize ore type (lowercase, trimmed)
    const normalizedOreType = oreType.toLowerCase().trim();

    // Check if we have a predefined color
    if (this.colorMap.hasOwnProperty(normalizedOreType)) {
      return this.colorMap[normalizedOreType];
    }
  }

  /**
   * Gets colors for multiple ore types
   * @param {string[]} oreTypes - Array of ore types
   * @returns {Object} - Object mapping ore types to colors
   */
  static getColorsForOreTypes(oreTypes) {
    if (!Array.isArray(oreTypes)) {
      console.error("oreTypes must be an array");
      return {};
    }

    const colorMapping = {};
    oreTypes.forEach((oreType) => {
      colorMapping[oreType] = this.getColor(oreType);
    });

    return colorMapping;
  }
}

export default OreColorMapper;
