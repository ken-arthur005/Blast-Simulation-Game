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
    <div className="bg3 text-center fixed inset-0 flex flex-col justify-center h-screen w-full p-4 sm:p-6 md:p-8 overflow-hidden">
      {/* Title Section */}
      <div className="ui-font text-center flex-shrink-0 mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-white text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight">
          Welcome to <br />
          <span className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl block mt-2">
            Rock Blasterz
          </span>
        </h1>
        <h2 className="text-white text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl mt-3 sm:mt-4">
          Enter your name ☺️
        </h2>
      </div>

      {/* Form Section */}
      <div className="flex flex-col items-center w-full max-w-[872px] mx-auto px-4 sm:px-6">
        <div className="w-full max-w-[600px]">
          <input
            type="text"
            onChange={(e) => {
              setGameState({ ...gameState, playerName: e.target.value });
            }}
            value={gameState.playerName}
            className="rounded-[10px] backdrop-blur-[12px] bg-[rgba(255,255,255,0.15)] border-2 border-[rgba(255,255,255,0.3)] shadow-[0_4px_30px_rgba(0,0,0,0.1)] h-12 sm:h-16 md:h-20 w-full mb-4 sm:mb-6 md:mb-7 text-center text-white text-base sm:text-lg md:text-xl placeholder:text-white/70 outline-none focus:border-white/50 focus:ring-0 transition-all"
            placeholder="name"
          />
          {error && (
            <p className="text-[#FF6B6B] text-sm sm:text-base mt-2 font-semibold">
              {error}
            </p>
          )}
        </div>

        <div className=" flex justify-center">
          {gameState.playerName && gameState.playerName.trim() ? (
            <button
              onClick={handleStartGame}
              className="rounded-[10px] backdrop-blur-[12px] bg-[rgb(112,171,117)] border-2 border-[rgba(255,255,255,0.3)] shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-white text-base sm:text-lg md:text-xl font-semibold px-6 py-3 sm:px-8 sm:py-4 hover:bg-[rgba(112,171,117,0.8)] hover:scale-105 transition-all duration-300 w-full max-w-xs sm:max-w-sm"
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
