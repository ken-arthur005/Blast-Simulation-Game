import React, {useState, createContext} from 'react';

export const GameContext = createContext();

export const GameProvider = ({children}) => {
    const [gameState, setGameState] = useState({
       playerName: '',
       score: 0,
       currentScenario: null,
    });
    return(
        <GameContext.Provider value={{gameState, setGameState}}>
            {children}
        </GameContext.Provider>
    );
}