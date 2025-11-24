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
  const finalScore = recoveryWeight * (recoveryRate - dilutionRate);

  // Round values for cleaner output
  const result = {
    totalOres,
    recoveredOres,
    dilutedOres,
    recoveryRate: Math.round(recoveryRate * 100) / 100,  
    dilutionRate: Math.round(dilutionRate * 100) / 100,
    finalScore: Math.round(finalScore)
  };
  
  return result;
}