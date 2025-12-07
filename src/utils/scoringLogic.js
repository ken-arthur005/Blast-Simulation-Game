export default function scoringLogic(totalOres, recoveredOres, dilutedOres, recoveryWeight = 10) {  
  // Validate input
  if (!totalOres || totalOres === 0) {
    console.warn(' scoringLogic: Invalid totalOres:', totalOres);
    return {
      totalOres: 0,
      recoveredOres: 0,
      dilutedOres: 0,
      recoveryRate: 0,
      dilutionRate: 0,
      finalScore: 0
    };
  }

  const recoveryRate = totalOres > 0 
    ? (recoveredOres / totalOres) * 100 
    : 0;

  const dilutionRate = totalOres > 0 
    ? (dilutedOres / totalOres) * 100 
    : 0;
  
  // Base score from recovery
  const baseScore = recoveryRate * recoveryWeight;
  
  // Penalty multiplier: 1.0 at 0% dilution, 0.0 at 100% dilution
  const penaltyMultiplier = Math.max(0, 1 - (dilutionRate / 100));
  
  const finalScore = Math.round(baseScore * penaltyMultiplier);

  // Round values for cleaner output
  const result = {
    totalOres,
    recoveredOres,
    dilutedOres,
    recoveryRate: Math.round(recoveryRate * 100) / 100,  
    dilutionRate: Math.round(dilutionRate * 100) / 100,
    penaltyMultiplier: Math.round(penaltyMultiplier * 100) / 100,
    finalScore: finalScore,
  };
  
  return result;
}