class OreValueMapper {
  // Predefined value mapping for common ore types (arbitrary economic values per unit, e.g., in game currency or market equivalent)
  static valueMap = {
    // Precious metals (high value)
    gold: 100,
    platinum: 90,
    silver: 80,
    palladium: 70,

    // Base metals
    copper: 50,
    zinc: 40,
    tin: 35,
    aluminum: 30,
    lead: 25,
    iron: 20,

    // Fuels and carbon
    diamond: 200, // Rare gem with high value
    coal: 10,
    graphite: 15,

    // Minerals and stones
    quartz: 5,
    limestone: 3,
    granite: 4,
    sandstone: 4,
    marble: 8,
    slate: 6,

    // Gemstones
    ruby: 150,
    sapphire: 140,
    emerald: 160,
    topaz: 120,

    // Other
    rock: 2,
    stone: 2,
    ore: 1,
    mineral: 1,
    clay: 5,

    // Defaults
    empty: 0,
    void: 0,
  };

  // Cache for assigned fallback values (if needed for dynamic ores)
  static assignedValues = new Map();

  // Gets the value for a specific ore type
  static getValue(oreType) {
    if (!oreType || typeof oreType !== "string") {
      console.warn("Invalid ore type provided:", oreType);
      return this.valueMap.void;
    }

    // Normalize ore type (lowercase, trimmed)
    const normalizedOreType = oreType.toLowerCase().trim();

    // Check if we have a predefined value
    if (this.valueMap.hasOwnProperty(normalizedOreType)) {
      return this.valueMap[normalizedOreType];
    }

    // If no predefined value, assign a default (e.g., 1) and cache it
    if (!this.assignedValues.has(normalizedOreType)) {
      console.warn(
        `Unknown ore type "${oreType}", assigning default value of 1.`
      );
      this.assignedValues.set(normalizedOreType, 1);
    }
    return this.assignedValues.get(normalizedOreType);
  }

  /**
   * Gets values for multiple ore types
   * @param {string[]} oreTypes - Array of ore types
   * @returns {Object} - Object mapping ore types to values
   */
  static getValuesForOreTypes(oreTypes) {
    if (!Array.isArray(oreTypes)) {
      console.error("oreTypes must be an array");
      return {};
    }

    const valueMapping = {};
    oreTypes.forEach((oreType) => {
      valueMapping[oreType] = this.getValue(oreType);
    });

    return valueMapping;
  }

  /**
   * Calculates total value for a list of ores
   * @param {Array} ores - Array of objects with oreType and quantity (optional, defaults to 1)
   * @returns {number} - Total value
   */
  static calculateTotalValue(ores) {
    if (!Array.isArray(ores)) {
      console.error("Ores must be an array");
      return 0;
    }

    return ores.reduce((total, ore) => {
      const value = this.getValue(ore.oreType);
      const quantity = ore.quantity || 1;
      return total + value * quantity;
    }, 0);
  }
}

export default OreValueMapper;
