import React, { useState, useEffect } from "react";
import { X, HardDrive, Clock, FileUp, Play, Trash2 } from "lucide-react";
import {
  getAutoSimulations,
  getManualSimulations,
  clearAutoSimulations,
  clearManualSimulations,
} from "../utils/simulationManager";
// import { loadSimulation } from "../utils/loadSimulation"; // Re-use the existing parser logic - unused

const LoadGameModal = ({
  show,
  onClose,
  onLoadGame,
  loadFileInputKey,
  onFileSelect,
}) => {
  const [activeTab, setActiveTab] = useState("auto"); // 'auto' | 'manual'
  const [saves, setSaves] = useState([]);
  // Only hide load buttons on large desktop screens (>= 1400px), always show for tablets
  const isDesktop = window.innerWidth >= 1400;

  // Track current screen category
  const [isCurrentScreenSmall, setIsCurrentScreenSmall] = useState(
    window.innerWidth < 600
  );

  const [showConfirmClear, setShowConfirmClear] = useState(false); // state for clearing save confirmation

  // Update screen state on resize to ensure filtering is dynamic if user rotates device
  useEffect(() => {
    const handleResize = () => {
      setIsCurrentScreenSmall(window.innerWidth < 600);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (show) {
      const rawData =
        activeTab === "auto" ? getAutoSimulations() : getManualSimulations();

      // Filter logic
      const filteredData = (rawData || []).filter((save) => {
        // If save.isSmallScreen is undefined (old save), assume it's Large Screen (false)
        const saveWasSmall = !!save.isSmallScreen;
        return saveWasSmall === isCurrentScreenSmall;
      });

      setSaves(filteredData);
    }
  }, [show, activeTab, isCurrentScreenSmall]);

  const handleLoadLocal = (saveData) => {
    if (onLoadGame) {
      onLoadGame(saveData);
      onClose();
    }
  };

  const handleClearHistory = () => {
    let success = false;

    if (activeTab === "auto") {
      success = clearAutoSimulations();
    } else {
      success = clearManualSimulations();
    }

    if (success) {
      setSaves([]); // Clear the list visually immediately
      setShowConfirmClear(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-white/20 text-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Load Simulation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("auto")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "auto"
                ? "bg-white/10 text-blue-400 border-b-2 border-blue-400"
                : "text-white/60 hover:bg-white/5"
            }`}
          >
            Auto Saves
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-white/10 text-green-400 border-b-2 border-green-400"
                : "text-white/60 hover:bg-white/5"
            }`}
          >
            Manual Saves
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] p-0 divide-y divide-white/5">
          {saves.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No saved games found in this category.
            </div>
          ) : (
            saves.map((save) => (
              <div
                key={save.id}
                className="p-4 hover:bg-white/5 active:bg-white/10 transition-colors flex justify-between items-center group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-white/90 text-sm mb-1">
                    {save.tag || "Untitled Save"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    {new Date(save.timestamp || save.savedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleLoadLocal(save)}
                  className={`bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-opacity ${
                    isDesktop
                      ? "opacity-0 group-hover:opacity-100"
                      : "opacity-100"
                  }`}
                >
                  <Play className="w-3 h-3" /> Load
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Area: Clear History & Import */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex flex-col gap-3">
          {/* NEW: Clear History Section (Only shows if saves exist) */}
          {saves.length > 0 && (
            <div className="flex justify-end items-center border-b border-white/5 pb-3">
              {!showConfirmClear ? (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <span className="text-xs text-red-400 mr-1">Delete all?</span>
                  <button
                    onClick={handleClearHistory}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          <label className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg cursor-pointer transition-colors border border-white/10 border-dashed">
            <FileUp className="w-4 h-4" />
            <span className="text-sm font-medium">Import from JSON File</span>
            <input
              key={loadFileInputKey}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                onFileSelect(e);
                onClose();
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;
