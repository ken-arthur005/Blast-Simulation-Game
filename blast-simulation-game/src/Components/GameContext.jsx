import React, { useState, createContext } from "react";

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    playerName: "",
    score: 0,
    currentScenario: null,
  });

  const setPlayerName = (name) => {
    setGameState((prevState) => ({
      ...prevState,
      playerName: name,
    }));
  };

  return (
    <GameContext.Provider value={{ gameState, setGameState, setPlayerName }}>
      {children}
    </GameContext.Provider>
  );
};
