import React, { useState, createContext } from "react";

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    playerName: "",
    score: 0,
    currentScenario: null,
    grid: null,
    blasts: [],
  });

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

  return (
    <GameContext.Provider value={{ gameState, setGameState, setPlayerName, updateGrid, clearBlasts }}>
      {children}
    </GameContext.Provider>
  );
};
