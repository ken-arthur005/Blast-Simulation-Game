import React, { useState, useEffect } from "react";
import { X, Trophy, Trash2, Calendar, User, Target } from "lucide-react";
import { getLeaderboardScores, clearLeaderboard } from "../utils/simulationManager";

const LeaderboardModal = ({ show, onClose }) => {
  const [scores, setScores] = useState([]);

  // Load scores whenever the modal opens
  useEffect(() => {
    if (show) {
      setScores(getLeaderboardScores());
    }
  }, [show]);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the leaderboard? This cannot be undone.")) {
      clearLeaderboard();
      setScores([]);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
              <Trophy className="text-yellow-400 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          {scores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Trophy className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">No records yet.</p>
              <p className="text-sm">Start a blast to set a high score!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-white/50 w-16 text-center">#</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-white/50">Player</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-white/50 text-right">Score</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-white/50 text-right hidden sm:table-cell">Efficiency</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-white/50 text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scores.map((entry, index) => {
                  const isTop3 = index < 3;
                  const rankColor = index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-300" : index === 2 ? "text-amber-600" : "text-white/50";
                  
                  return (
                    <tr key={index} className="hover:bg-white/5 transition-colors group">
                      <td className={`p-4 text-center font-bold ${rankColor} text-lg`}>
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                          <span className="font-medium text-white/90">{entry.playerName || "Anonymous"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-lg font-bold text-green-400">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-1 text-white/70">
                          <Target className="w-3 h-3" />
                          {entry.efficiency}%
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm text-white/40 hidden sm:table-cell font-mono">
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
        {scores.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Reset History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardModal;