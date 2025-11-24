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
    // window.alert(`record.recoveredCount: ${record.recoveredCount}`); // This can be removed now.
    setGameState((prevState) => ({
      ...prevState,
      recoveryHistory: [
        ...prevState.recoveryHistory,
        {
          totalOres: record.totalOres,
          recoveredCount: record.recoveredCount,
          dilutedCount: record.dilutedCount,
          efficiency: record.efficiency,
          timestamp: new Date(),
        },
      ],
    }));

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
