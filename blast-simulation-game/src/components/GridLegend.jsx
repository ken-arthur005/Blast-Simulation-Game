import React, { useContext } from "react";
import OreColorMapper from "../utils/oreColorMapper";
import { GameContext } from "./GameContext";
import ArrowButton from "./ArrowButton";
import RockTexture from "./RockTexture";
import {
  RotateCcw,
  Zap,
  Palette,
  Move3d,
  Save,
  Upload,
  Trophy,
  FolderOpen,
} from "lucide-react";

/**
 * Legend component showing ore types and their colors and controls
 */
const GridLegend = ({
  oreTypes,
  onTriggerBlast,
  resetCanvas,
  isBlasting,
  selectedBlast = null,
  onSelectDirection = null,
  onSaveSimulation,
  onOpenLeaderboard,
  onOpenLoadModal,
}) => {
  const { gameState, pendingDirection, setPendingDirection } =
    useContext(GameContext);

  const selectedDir = selectedBlast
    ? gameState.blasts?.find(
        (b) => b.x === selectedBlast.x && b.y === selectedBlast.y
      )?.dirKey || "(none)"
    : pendingDirection;

  const [applyToNext, setApplyToNext] = React.useState(false);
  const [showColorLegend, setShowColorLegend] = React.useState(false);
  const [showDirections, setShowDirections] = React.useState(false);

  const handleTriggerBlast = () => {
    if (!gameState.blasts || gameState.blasts.length === 0) {
      alert("Please place at least one explosive first!");
      return;
    }
    onTriggerBlast();
  };

  if (!oreTypes || oreTypes.length === 0) return null;

  // const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);

  return (
    <div>
      {/* Mobile & Tablet: Rock Color Guide and Choose Direction in same row */}
      <div className="lg:hidden mb-2 sm:mb-3">
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowColorLegend(!showColorLegend)}
            className="flex-1 bg-purple-600 text-white px-1.5 sm:px-2 py-1.5 sm:py-2 rounded hover:bg-purple-700 flex items-center justify-between text-[10px] sm:text-xs font-semibold"
          >
            <span>
              <Palette className="inline-block w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
              Colors
            </span>
            <Move3d className="inline-block w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
          </button>

          <button
            onClick={() => setShowDirections(!showDirections)}
            className={`flex-1 text-white px-1.5 sm:px-2 py-1.5 sm:py-2 rounded flex items-center justify-between text-[10px] sm:text-xs font-semibold ${
              !gameState.blasts || gameState.blasts.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
            disabled={!gameState.blasts || gameState.blasts.length === 0}
          >
            <span>Direction</span>
            <Move3d className="inline-block w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
          </button>
        </div>

        {/* Expandable Color Legend */}
        {showColorLegend && (
          <div className="mt-1.5 sm:mt-2 p-2 sm:p-3 backdrop-blur-md bg-[rgba(255,255,255,0.2)] rounded-lg shadow-lg">
            <h4 className="text-xs sm:text-sm font-bold mb-1.5 sm:mb-2 text-gray-800">
              What Each Color Represents:
            </h4>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {oreTypes.map((oreType, index) => {
                const colorMapping = OreColorMapper.getColor(oreType);
                return (
                  <div key={oreType} className="flex items-center space-x-2">
                    <RockTexture
                      color={colorMapping}
                      gridX={index}
                      gridY={0}
                      size={20}
                      className="shrink-0"
                    />
                    <span className="text-xs capitalize truncate text-gray-700">
                      {oreType}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable Direction Selector */}
        {showDirections && gameState.blasts && gameState.blasts.length > 0 && (
          <div className="mt-1.5 sm:mt-2 p-2 sm:p-3 bg-white/10 rounded-lg shadow-lg">
            <div className="mb-1.5 sm:mb-2">
              <div className="text-[10px] sm:text-xs text-white font-semibold mb-1">
                {selectedBlast
                  ? `📍 Selected: (${selectedBlast.x}, ${selectedBlast.y})`
                  : "💡 Tap an explosive first"}
              </div>
              <div className="text-[10px] sm:text-xs text-white/70">
                {selectedBlast
                  ? `Current: ${
                      selectedDir === "(none)" ? "None" : selectedDir
                    }`
                  : "Select an explosive to set its direction"}
              </div>
            </div>

            {selectedBlast && (
              <label className="text-[10px] sm:text-xs mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1.5 sm:p-2 bg-white/5 rounded">
                <input
                  type="checkbox"
                  checked={applyToNext}
                  onChange={(e) => setApplyToNext(e.target.checked)}
                  className="form-checkbox w-3 h-3 sm:w-4 sm:h-4"
                />
                <span className="text-white text-[10px] sm:text-xs">
                  Set as default for next
                </span>
              </label>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              <ArrowButton
                dir="left"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="up"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="right"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="down"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="up-left"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="up-right"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="down-right"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
              <ArrowButton
                dir="down-left"
                selectedDir={selectedDir}
                setSelectedDir={(dir) =>
                  onSelectDirection
                    ? onSelectDirection(dir, { applyToNext })
                    : setPendingDirection(dir)
                }
                disabled={isBlasting || !gameState.canPlaceExplosives}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile & Tablet: Action buttons after expandable sections */}
      <div className="lg:hidden mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
        <button
          className="bg-red-500 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-[10px] sm:text-sm md:text-base font-semibold w-full h-full flex items-center justify-center whitespace-nowrap"
          onClick={handleTriggerBlast}
          disabled={
            isBlasting || !gameState.blasts || gameState.blasts.length === 0
          }
        >
          <Zap className="inline-block w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-0.5 sm:mr-1 flex-shrink-0" />
          <span className="truncate">
            Trigger Blast{" "}
            {gameState.blasts?.length > 0 ? `(${gameState.blasts.length})` : ""}
          </span>
        </button>

        <button
          className="bg-blue-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded hover:bg-blue-500 text-[10px] sm:text-sm md:text-base font-semibold w-full h-full flex items-center justify-center whitespace-nowrap"
          onClick={() => resetCanvas()}
          disabled={isBlasting}
        >
          <RotateCcw className="inline-block w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-0.5 sm:mr-1 flex-shrink-0" />
          <span>Reset Canvas</span>
        </button>

        <button
          className="bg-[rgb(112,171,117)] text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded hover:bg-[rgba(112,171,117,0.5)] text-[10px] sm:text-sm md:text-base font-semibold w-full flex items-center justify-center"
          onClick={onSaveSimulation}
          disabled={isBlasting}
        >
          <Save className="inline-block w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-0.5 sm:mr-1" />
          Save
        </button>

        {/* Mobile & Tablet Leaderboard Button */}
        <button
          className="bg-yellow-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded hover:bg-yellow-500 text-[10px] sm:text-sm md:text-base font-semibold w-full flex items-center justify-center"
          onClick={onOpenLeaderboard}
          disabled={isBlasting}
        >
          <Trophy className="inline-block w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-0.5 sm:mr-1" />
          Leaderboard
        </button>
      </div>

      {/* Desktop: Action buttons and direction selector */}
      <div className="hidden lg:block">
        <div className="mt-3 flex flex-row items-center gap-3">
          <button
            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-base font-semibold"
            onClick={handleTriggerBlast}
            disabled={
              isBlasting || !gameState.blasts || gameState.blasts.length === 0
            }
          >
            <Zap className="inline-block w-4 h-4 mr-1" />
            Trigger Blast{" "}
            {gameState.blasts?.length > 0 ? `(${gameState.blasts.length})` : ""}
          </button>

          <button
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500 text-base font-semibold"
            onClick={() => resetCanvas()}
            disabled={isBlasting}
          >
            <RotateCcw className="inline-block w-4 h-4 mr-1" />
            Reset Canvas
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            className="bg-[rgb(112,171,117)] text-white px-3 py-2 rounded hover:bg-[rgba(112,171,117,0.8)] text-base font-semibold w-full flex items-center justify-center"
            onClick={onSaveSimulation}
            disabled={isBlasting}
          >
            <Save className="inline-block w-4 h-4 mr-1" />
            Save
          </button>

          <button
            className="bg-yellow-600 text-white px-3 py-2 rounded hover:bg-yellow-500 text-base font-semibold w-full flex items-center justify-center"
            onClick={onOpenLeaderboard}
            disabled={isBlasting}
          >
            <Trophy className="inline-block w-4 h-4 mr-1" />
            Scores
          </button>
        </div>
      </div>
      <button
        onClick={onOpenLoadModal}
        className="hidden lg:flex bg-gray-700 text-white px-3 py-2 rounded hover:bg-gray-600 text-base font-semibold w-full mt-3 items-center justify-center cursor-pointer"
      >
        <FolderOpen className="inline-block w-4 h-4 mr-1" />
        Load Simulation
      </button>

      {/* Desktop: Direction selector always visible */}
      <div className="mt-4 hidden lg:block">
        {gameState.blasts && gameState.blasts.length > 0 ? (
          <>
            <div className="mb-3 p-2 bg-white/10 rounded-lg">
              <div className="text-xs md:text-sm text-white font-semibold mb-1">
                {selectedBlast
                  ? `📍 Selected: (${selectedBlast.x}, ${
                      selectedBlast.y
                    }) — Direction: ${
                      selectedDir === "(none)" ? "None" : selectedDir
                    }`
                  : "💡 Tap an explosive to select it"}
              </div>
              <div className="text-xs text-white/80">
                {selectedBlast
                  ? "Choose a blast direction below:"
                  : "After selecting, you can set its blast direction"}
              </div>
            </div>

            {selectedBlast && (
              <label className="text-xs md:text-sm mb-2 flex items-center gap-2 cursor-pointer p-2 bg-white/5 rounded">
                <input
                  type="checkbox"
                  checked={applyToNext}
                  onChange={(e) => setApplyToNext(e.target.checked)}
                  className="form-checkbox w-4 h-4"
                />
                <span className="text-white">
                  Set as default for next explosives
                </span>
              </label>
            )}

            <div className="mb-2">
              <div className="text-xs md:text-sm text-white/90 mb-2 font-semibold text-center md:text-left">
                🎯 Choose Blast Direction:
              </div>
              <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:gap-2">
                <ArrowButton
                  dir="left"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="up"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="right"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="down"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="up-left"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="up-right"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="down-right"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
                <ArrowButton
                  dir="down-left"
                  selectedDir={selectedDir}
                  setSelectedDir={(dir) =>
                    onSelectDirection
                      ? onSelectDirection(dir, { applyToNext })
                      : setPendingDirection(dir)
                  }
                  disabled={isBlasting || !gameState.canPlaceExplosives}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="mb-2 text-center text-xs md:text-sm text-white/70 p-3 bg-white/5 rounded-lg">
            💣 Tap on the grid to place your first explosive!
            <div className="text-xs mt-1 text-white/50">
              After placing, you can select and set blast directions
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridLegend;
