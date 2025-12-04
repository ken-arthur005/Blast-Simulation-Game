import React, { useState, createContext, useCallback, useMemo } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    playerName: "",
    score: 0,
    currentScenario: null,
    grid: null,
    blasts: [],
    canPlaceExplosives: true,
    numberOfMaterialsDestroyed: 0,
    materialsRemainedAfterDestroy: 0,
    blastRadius: 3,
    recoveryHistory: [],
    blastHistory: [],
  });
  // pendingDirection stores the currently selected direction for the next blast placement
  // If null, no default direction is applied; players must choose a direction explicitly or edit per-blast
  const [pendingDirection, setPendingDirection] = useState(null);

  const setPlayerName = useCallback((name) => {
    setGameState((prevState) => ({
      ...prevState,
      playerName: name,
    }));
  }, []);

  const updateGrid = useCallback((newGrid) => {
    setGameState((prevState) => ({ ...prevState, grid: newGrid }));
  }, []);

  const clearBlasts = useCallback(() => {
    setGameState((prevState) => ({ ...prevState, blasts: [] }));
  }, []);

  const addRecoveryRecord = useCallback((record) => {
    setGameState((prevState) => {
      const now = new Date();
      const history = prevState.blastHistory || [];
      const lastEntry = history[history.length - 1];

      // Calculate time difference if a previous entry exists
      let isDuplicate = false;
      if (lastEntry) {
        const lastTime = new Date(lastEntry.timestamp).getTime();
        const currentTime = now.getTime();
        const diffInSeconds = (currentTime - lastTime) / 1000;

        // If the last entry was added less than 15 seconds ago, treat this as an update
        // to the same round (fixing the Double Save/Double State bug)
        if (diffInSeconds < 15) {
          isDuplicate = true;
        }
      }

      // Create the new entry object
      const newEntry = {
        round: isDuplicate ? lastEntry.round : history.length + 1, // Keep same round if duplicate
        recovery: record.recoveryRate,
        dilution: record.dilutionRate,
        score: record.finalScore,
        timestamp: now,
      };

      let newBlastHistory;

      if (isDuplicate) {
        // REPLACE the last entry with the updated data
        newBlastHistory = [...history];
        newBlastHistory[newBlastHistory.length - 1] = newEntry;
        console.log(
          `♻️ GameContext: Updating existing Round ${newEntry.round} (Duplicate prevented)`
        );
      } else {
        // ADD a new entry
        newBlastHistory = [...history, newEntry];
        console.log(`✅ GameContext: Added new Round ${newEntry.round}`);
      }

      return {
        ...prevState,
        recoveryHistory: [
          ...(prevState.recoveryHistory || []),
          {
            totalOres: record.totalOres,
            recoveredCount: record.recoveredCount,
            dilutedCount: record.dilutedCount,
            efficiency: record.efficiency,
            timestamp: now,
          },
        ],
        blastHistory: newBlastHistory,
      };
    });
  }, []);

  const updateScore = useCallback((newScore) => {
    setGameState((prevState) => ({
      ...prevState,
      score: newScore,
    }));
  }, []);

  // FIX: Memoize the entire context value object.
  // It will only be recreated if `gameState` or `pendingDirection` changes.
  // All consumer components will now receive a stable context value.
  const contextValue = useMemo(
    () => ({
      gameState,
      setGameState,
      pendingDirection,
      setPendingDirection,
      setPlayerName,
      updateGrid,
      clearBlasts,
      addRecoveryRecord,
      updateScore,
    }),
    [
      gameState,
      pendingDirection,
      setPlayerName,
      updateGrid,
      clearBlasts,
      addRecoveryRecord,
      updateScore,
    ]
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};
