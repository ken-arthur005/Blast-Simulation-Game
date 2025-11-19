import React, { useContext } from "react";
import OreColorMapper from "../utils/oreColorMapper";
import { GameContext } from "./GameContext";
import ArrowButton from "./ArrowButton";

/**
 * Legend component showing ore types and their colors and controls
 */
const GridLegend = ({
  oreTypes,
  className = "",
  onTriggerBlast,
  resetCanvas,
  isBlasting,
  selectedBlast = null,
  onSelectDirection = null,
}) => {
  const { gameState, pendingDirection, setPendingDirection } =
    useContext(GameContext);

  const selectedDir = selectedBlast
    ? gameState.blasts?.find(
        (b) => b.x === selectedBlast.x && b.y === selectedBlast.y
      )?.dirKey || "(none)"
    : pendingDirection;

  const [applyToNext, setApplyToNext] = React.useState(false);

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
      {/* <div
        className={`mt-4 p-4 backdrop-blur-[20px] bg-[rgba(255,255,255,0.2)] rounded-lg ${className}`}
      >
        <h3 className="text-lg font-semibold mb-3">Ore Types Legend</h3>
        <div className="grid grid-cols-2 gap-3">
          {oreTypes.map((oreType) => (
            <div key={oreType} className="flex items-center space-x-2">
              <div
                className="w-5 h-5 border border-gray-400 rounded shrink-0"
                style={{ backgroundColor: colorMapping[oreType] }}
              />
              <span className="text-sm capitalize truncate ui-font">
                {oreType}
              </span>
            </div>
          ))}
        </div>
      </div> */}

      <div className="mt-3 flex items-center gap-3">
        <button
          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleTriggerBlast}
          disabled={
            isBlasting || !gameState.blasts || gameState.blasts.length === 0
          }
        >
          Trigger Blast{" "}
          {gameState.blasts?.length > 0 ? `(${gameState.blasts.length})` : ""}
        </button>

        <button
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500"
          onClick={() => resetCanvas()}
          disabled={isBlasting}
        >
          Reset Canvas
        </button>
      </div>

      <div className="mt-4">
        {gameState.blasts && gameState.blasts.length > 0 ? (
          <>
            <div className="mb-2 text-center text-sm text-black-600">
              {selectedBlast
                ? `Selected blast: (${selectedBlast.x}, ${
                    selectedBlast.y
                  }) — Direction: ${
                    selectedDir === "(none)" ? "(none)" : selectedDir
                  }`
                : "Click a placed explosive to select it and choose a direction for that explosive."}
            </div>

            {selectedBlast && (
              <label className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyToNext}
                  onChange={(e) => setApplyToNext(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-white">
                  Also set this direction as default for next placements
                </span>
              </label>
            )}

            <div className="flex items-center gap-2 flex-wrap">
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
          </>
        ) : (
          <div className="mb-2 text-center text-sm text-white/60">
            Place an explosive first — after the first placement you'll be able
            to select each explosive and choose a direction for it.
          </div>
        )}
      </div>
    </div>
  );
};

export default GridLegend;
