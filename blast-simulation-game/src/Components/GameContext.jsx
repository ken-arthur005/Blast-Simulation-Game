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
  });

  // store the original grid as loaded from CSV so we can reset to it
  const [initialGrid, setInitialGrid] = useState(null);

  const setPlayerName = (name) => {
    setGameState((prevState) => ({
      ...prevState,
      playerName: name,
    }));
  };
  const updateGrid = (newGrid) => {
    setGameState((prevState) => ({ ...prevState, grid: newGrid }));
  };

  const setInitialGridFromCSV = (grid) => {
    const clone = structuredClone
      ? structuredClone(grid)
      : JSON.parse(JSON.stringify(grid));

    setInitialGrid(clone);
    setGameState((prev) => ({
      ...prev,
      grid: structuredClone
        ? structuredClone(grid)
        : JSON.parse(JSON.stringify(grid)),
    }));
  };

  const resetSimulation = () => {
    if (!initialGrid) return;

    const clone = structuredClone
      ? structuredClone(initialGrid)
      : JSON.parse(JSON.stringify(initialGrid));

    setGameState((prev) => ({
      ...prev,
      blasts: [],
      grid: clone,
    }));
  };

  const clearBlasts = () => {
    setGameState((prevState) => ({ ...prevState, blasts: [] }));
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        setPlayerName,
        updateGrid,
        clearBlasts,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
