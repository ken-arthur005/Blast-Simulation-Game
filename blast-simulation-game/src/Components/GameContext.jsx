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

  const addRecoveryRecord = (record) => {
    setGameState((prevState) => ({
      ...prevState,
      recoveryHistory: [
        ...prevState.recoveryHistory,
        { ...record, timestamp: new Date() },
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
