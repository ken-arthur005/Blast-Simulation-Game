import React, { useState, useEffect } from "react";
import { X, HardDrive, Clock, FileUp, Play, Trash2 } from "lucide-react";
import {
  getAutoSimulations,
  getManualSimulations,
  clearAutoSimulations,
  clearManualSimulations,
} from "../utils/simulationManager";

const LoadGameModal = ({
  show,
  onClose,
  onLoadGame,
  loadFileInputKey,
  onFileSelect,
}) => {
  const [activeTab, setActiveTab] = useState("auto"); // 'auto' | 'manual'
  const [saves, setSaves] = useState([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // State to track if the current viewport is small (< 600px)
  const [isCurrentScreenSmall, setIsCurrentScreenSmall] = useState(
    window.innerWidth < 600
  );

  // State to track if device is large desktop (for hover effects)
  const [isLargeDesktop, setIsLargeDesktop] = useState(
    window.innerWidth >= 1400
  );

  // 1. Monitor Screen Resize in real-time
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsCurrentScreenSmall(width < 600);
      setIsLargeDesktop(width >= 1400);
    };

    // Initialize
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Load and Filter Saves based on strict Screen Size rules
  useEffect(() => {
    if (show) {
      const rawData =
        activeTab === "auto" ? getAutoSimulations() : getManualSimulations();

      const filteredData = (rawData || []).filter((save) => {
        // Safe check: treat undefined/null as false (for old saves made on desktop)
        const saveWasMadeOnSmallScreen = !!save.isSmallScreen;

        // STRICT MATCHING RULE:
        // 1. If I am currently on Small Screen (<600), ONLY show saves made on Small Screen.
        // 2. If I am currently on Desktop (>=600), ONLY show saves made on Desktop.
        return saveWasMadeOnSmallScreen === isCurrentScreenSmall;
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
      setSaves([]); // Visually clear the list
      setShowConfirmClear(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-white/20 text-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Load Simulation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab("auto");
              setShowConfirmClear(false);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "auto"
                ? "bg-white/10 text-blue-400 border-b-2 border-blue-400"
                : "text-white/60 hover:bg-white/5"
            }`}
          >
            Auto Saves
          </button>
          <button
            onClick={() => {
              setActiveTab("manual");
              setShowConfirmClear(false);
            }}
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
        <div className="flex-1 overflow-y-auto p-0 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/20">
          {saves.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm flex flex-col items-center justify-center h-full">
              <Clock className="w-8 h-8 mb-2 opacity-20" />
              <p>No saved games found for this screen size.</p>
              <p className="text-xs mt-1 opacity-50">
                (Switch devices or rotate screen to see other saves)
              </p>
            </div>
          ) : (
            saves.map((save) => (
              <div
                key={save.id}
                className="p-4 hover:bg-white/5 active:bg-white/10 transition-colors flex justify-between items-center group cursor-pointer border-l-4 border-transparent hover:border-white/20"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="font-bold text-white/90 text-sm mb-1 truncate">
                    {save.tag || "Untitled Save"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(
                        save.timestamp || save.savedAt
                      ).toLocaleString()}
                    </span>

                    {/* Visual Badge */}
                    {save.isSmallScreen ? (
                      <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-300 border border-gray-600 flex-shrink-0">
                        Mobile
                      </span>
                    ) : (
                      <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700 flex-shrink-0">
                        Desktop
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent parent div click
                    handleLoadLocal(save);
                  }}
                  className={`bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all shadow-lg ${
                    isLargeDesktop
                      ? "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                      : "opacity-100"
                  }`}
                >
                  <Play className="w-3 h-3" /> Load
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center gap-3 flex-shrink-0">
          {/* Import Button (Grows to fill space) */}
          <label className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg cursor-pointer transition-colors border border-white/10 border-dashed group">
            <FileUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Import JSON</span>
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

          {/* Clear History Button (Fixed size on right) */}
          {saves.length > 0 && (
            <div className="flex-shrink-0">
              {!showConfirmClear ? (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-all border border-white/5 hover:border-red-500"
                  title="Clear all saves in this category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-red-500/30 animate-slideInRight">
                  <span className="text-[10px] text-red-400 px-1 font-medium">
                    All?
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;
