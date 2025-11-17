import React, { useState, createContext } from "react";

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

  const setPlayerName = (name) => {
    setGameState((prevState) => ({
      ...prevState,
      playerName: name,
    }));
  };
  const updateGrid = (newGrid) => {
    setGameState((prevState) => ({ ...prevState, grid: newGrid }));
  };

  const clearBlasts = () => {
    setGameState((prevState) => ({ ...prevState, blasts: [] }));
  };

  // Help me with this issue:
  // For some reason, this function is not able to add the recoveredCount and the efficiency to the recoveryHistory.
  // Sometimes it's able to do it and I wonder why.
  // Another wonderful thing is that, the window.alert is able to alert a new value for recoveryCount but in OreGridVisualization.jsx and BlastResults.jsx the values that get there are completely different 
  const addRecoveryRecord = (record) => {
    window.alert(`record.recoveredCount: ${record.recoveredCount}`);
    setGameState((prevState) => ({
      ...prevState,
      recoveryHistory: [
        ...prevState.recoveryHistory,
        {
          recoveredCount: record.recoveredCount,
          efficiency: record.efficiency,
          timestamp: new Date(),
        },
      ],
    }));
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        pendingDirection,
        setPendingDirection,
        setPlayerName,
        updateGrid,
        clearBlasts,
        addRecoveryRecord,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
