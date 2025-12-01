import React, { useState, useEffect, useMemo } from "react";
import { X, Trophy, Trash2, User, Target, Filter, ChevronDown } from "lucide-react";
import { getLeaderboardScores, clearLeaderboard } from "../utils/simulationManager";

const LeaderboardModal = ({ show, onClose }) => {
  const [allScores, setAllScores] = useState([]);
  const [filterTime, setFilterTime] = useState("all"); // 'all', 'today', 'week'
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Load scores
  useEffect(() => {
    if (show) {
      setAllScores(getLeaderboardScores());
      setShowConfirmReset(false);
    }
  }, [show]);

  // Extract unique players for the Dropdown
  const uniquePlayers = useMemo(() => {
    const names = allScores.map(s => s.playerName || "Anonymous").filter(Boolean);
    return [...new Set(names)].sort();
  }, [allScores]);

  // Filter Logic
  const filteredScores = useMemo(() => {
    let result = [...allScores];

    // 1. Time Filter
    const now = new Date();
    if (filterTime === "today") {
      result = result.filter(s => new Date(s.timestamp).toDateString() === now.toDateString());
    } else if (filterTime === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(s => new Date(s.timestamp) >= weekAgo);
    }

    // 2. Name Dropdown Filter
    if (selectedPlayer !== "all") {
      result = result.filter(s => (s.playerName || "Anonymous") === selectedPlayer);
    }

    // 3. Sort by Score
    return result.sort((a, b) => b.score - a.score);
  }, [allScores, filterTime, selectedPlayer]);

  const handleReset = () => {
    clearLeaderboard();
    setAllScores([]);
    setShowConfirmReset(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-white/20 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg border border-yellow-500/30">
              <Trophy className="text-yellow-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Top Blasters</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-3 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row gap-3">
          {/* Dropdown for Player Name */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-white/40" />
            </div>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-yellow-500/50 appearance-none cursor-pointer"
            >
              <option value="all">All Players</option>
              {uniquePlayers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-white/40" />
            </div>
          </div>
          
          {/* Time Buttons */}
          <div className="flex bg-black/30 rounded-lg p-1 border border-white/10">
            {['all', 'week', 'today'].map((period) => (
              <button 
                key={period}
                onClick={() => setFilterTime(period)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  filterTime === period ? "bg-blue-600 text-white shadow-lg" : "text-white/60 hover:text-white"
                }`}
              >
                {period === 'all' ? 'All Time' : period === 'week' ? 'This Week' : 'Today'}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-white/20">
          {filteredScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Filter className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-base">No records found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="p-3 text-xs font-bold uppercase text-white/50 w-14 text-center">#</th>
                  <th className="p-3 text-xs font-bold uppercase text-white/50">Player</th>
                  <th className="p-3 text-xs font-bold uppercase text-white/50 text-right">Score</th>
                  <th className="p-3 text-xs font-bold uppercase text-white/50 text-right hidden sm:table-cell">Efficiency</th>
                  <th className="p-3 text-xs font-bold uppercase text-white/50 text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredScores.map((entry, index) => {
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;
                  
                  let rankClass = "text-white/50 font-medium";
                  let rowClass = "hover:bg-white/5";
                  let icon = null;

                  if (isGold) {
                    rankClass = "text-yellow-400 font-black text-lg drop-shadow-sm";
                    rowClass = "bg-yellow-500/5 hover:bg-yellow-500/10";
                    icon = <Trophy className="w-3 h-3 text-yellow-500 ml-1 inline" />;
                  } else if (isSilver) {
                    rankClass = "text-gray-300 font-bold text-lg";
                    rowClass = "bg-gray-500/5 hover:bg-gray-500/10";
                  } else if (isBronze) {
                    rankClass = "text-amber-600 font-bold text-lg";
                    rowClass = "bg-orange-500/5 hover:bg-orange-500/10";
                  }

                  return (
                    <tr key={index} className={`${rowClass} transition-colors group`}>
                      <td className={`p-3 text-center ${rankClass}`}>
                        {index + 1}
                        {icon}
                      </td>
                      <td className="p-3">
                         <span className={`font-medium ${isGold ? 'text-yellow-100' : 'text-white/90'}`}>
                              {entry.playerName || "Anonymous"}
                         </span>
                      </td>
                      <td className={`p-3 text-right font-mono text-base font-bold ${isGold ? 'text-yellow-400' : 'text-green-400'}`}>
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="p-3 text-right hidden sm:table-cell text-sm">
                        <span className="text-white/70">{entry.efficiency}%</span>
                      </td>
                      <td className="p-3 text-right text-xs text-white/40 hidden sm:table-cell font-mono">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-black/20 flex justify-between items-center">
            <div className="text-xs text-white/30">Top {filteredScores.length} results</div>
            {!showConfirmReset ? (
                <button onClick={() => setShowConfirmReset(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all text-xs font-medium">
                  <Trash2 className="w-3.5 h-3.5" /> Reset History
                </button>
            ) : (
                <div className="flex items-center gap-2 animate-fadeIn">
                    <span className="text-xs text-red-400 mr-1">Confirm?</span>
                    <button onClick={handleReset} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">Yes</button>
                    <button onClick={() => setShowConfirmReset(false)} className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs">No</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;