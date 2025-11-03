import { FaTrophy } from "react-icons/fa";
import { GameContext } from "../Components/GameContext";
import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";

function HomePage() {
  const [clicked, setClicked] = useState(false);
  const [error, setError] = useState("");
  const { gameState, setGameState } = useContext(GameContext);

  const handleStartGame = () => {
    // Validate name before allowing navigation
    if (!gameState.playerName || !gameState.playerName.trim()) {
      setError("Please enter your name to start the game");
      return false;
    }
    setError("");

    setTimeout(() => setClicked(false), 300);
    return true;
  };

  return (
    <div className="bg3 text-center fixed inset-0 flex flex-col justify-center h-screen w-full p-3 sm:p-4 lg:p-4 overflow-hidden">
      {/* Title Section */}
      <div className="ui-font text-center flex-shrink-0 pt-1 sm:pt-12 lg:pt-24 ">
        <h1 className="text-white text-[32px]">
          Welcome to <br /> <span className="text-[64px]">Rock Blasterz</span>
        </h1>
        <h2 className="text-white text-[32px]">Enter your name ☺️</h2>
      </div>

      {/* Form Section */}
      <div className="flex flex-col items-center w-full max-w-[872px] mx-auto sm:mt-2">
        <div>
          <input
            type="text"
            onChange={(e) => {
              setGameState({ ...gameState, playerName: e.target.value });
            }}
            value={gameState.playerName}
            className="rounded-[10px] backdrop-blur-[12px] bg-[rgba(255,255,255,0.15)] border-2 border-[rgba(255,255,255,0.3)] shadow-[0_4px_30px_rgba(0,0,0,0.1)] h-[80px] w-[600px] mb-7 text-center text-white placeholder:text-white/70 outline-none focus:border-white/50 focus:ring-0"
            placeholder="name"
          />
          {error && (
            <p className="text-[#FF6B6B] text-m mt-2 font-semibold">{error}</p>
          )}
        </div>

        <div>
          {gameState.playerName && gameState.playerName.trim() ? (
            <button
              onClick={handleStartGame}
              className="rounded-[10px] backdrop-blur-[12px] bg-[rgb(112,171,117)] border-2 border-[rgba(255,255,255,0.3)] shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-white text-xl font-semibold px-8 py-4 hover:bg-[rgba(112,171,117,0.8)] hover:scale-105 transition-all duration-300"
            >
              <Link to="/simulation">Start Game</Link>
            </button>
          ) : (
            <button onClick={handleStartGame}></button>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
