import { useContext, useState } from "react";
import OreColorMapper from "../utils/oreColorMapper";
import { GameContext } from "./GameContext";
import ArrowButton from "./ArrowButton";

/**
 * Legend component showing ore types and their colors
 */
const GridLegend = ({
  oreTypes,
  className = "",
  onTriggerBlast,
  resetCanvas,
  isBlasting,
}) => {
  const { gameState } = useContext(GameContext);
  const [selectedDir, setSelectedDir] = useState(null);

  const handleTriggerBlast = () => {
    // Check if there are any blasts placed
    if (!gameState.blasts || gameState.blasts.length === 0) {
      alert("Please place at least one explosive first!");
      return;
    }

    // Call the parent function to handle the blast
    onTriggerBlast();
  };

  if (!oreTypes || oreTypes.length === 0) {
    return null;
  }

  const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);

  return (
    <div>
      <div className={`mt-4 p-4 bg-gray-100 rounded-lg ${className} mb-3`}>
        <h3 className="text-lg font-semibold mb-3">Ore Types Legend</h3>
        <div className="grid grid-cols-2 gap-3">
          {oreTypes.map((oreType) => (
            <div key={oreType} className="flex items-center space-x-2">
              <div
                className="w-5 h-5 border border-gray-400 rounded flex-shrink-0"
                style={{ backgroundColor: colorMapping[oreType] }}
              />
              <span className="text-sm capitalize truncate">{oreType}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          className="mt-2 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleTriggerBlast}
          disabled={!gameState.blasts || gameState.blasts.length === 0}
        >
          Trigger Blast{" "}
          {gameState.blasts?.length > 0 && `(${gameState.blasts.length})`}
        </button>

        <button
          disabled={isBlasting}
          className="mt-2 ml-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed hover:cursor-pointer"
          onClick={() => resetCanvas()}
        >
          Reset Canvas
        </button>

        <div className="mt-4 flex justify-center flex-col items-start">
          <div className="mb-2 text-center text-sm text-gray-600">
            {selectedDir ? `Direction: ${selectedDir}` : "Select a direction"}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ArrowButton
              dir="left"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="up"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="right"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="down"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="up-left"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="up-right"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="down-right"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
            <ArrowButton
              dir="down-left"
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridLegend;
