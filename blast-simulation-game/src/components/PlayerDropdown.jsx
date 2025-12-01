import React, { useState } from "react";
import { User, ChevronDown } from "lucide-react";

const PlayerDropdown = ({ selectedPlayer, setSelectedPlayer, players }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (player) => {
    setSelectedPlayer(player);
    setIsOpen(false);
  };

  return (
    <div className="relative w-auto sm:flex-1">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        <User className="h-4 w-4 text-white/40" />
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-yellow-500/50 cursor-pointer text-left flex items-center justify-between"
      >
        <span className="truncate">
          {selectedPlayer === "all" ? "All Players" : selectedPlayer}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/40 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-2xl z-30 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
            <div
              onClick={() => handleSelect("all")}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                selectedPlayer === "all"
                  ? "bg-blue-600 text-white"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              All Players
            </div>
            {players.map((name) => (
              <div
                key={name}
                onClick={() => handleSelect(name)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  selectedPlayer === name
                    ? "bg-blue-600 text-white"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerDropdown;
