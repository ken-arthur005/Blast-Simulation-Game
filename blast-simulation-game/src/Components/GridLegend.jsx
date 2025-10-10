import {useContext} from "react";
import OreColorMapper from "../utils/oreColorMapper";
import {GameContext} from "./GameContext"

/**
 * Legend component showing ore types and their colors
 */
const GridLegend = ({ oreTypes, className = "", onTriggerBlast }) => {
  const { gameState } = useContext(GameContext);

 const handleTriggerBlast = () => {
    // Check if there are any blasts placed
    if (!gameState.blasts || gameState.blasts.length === 0) {
      alert('Please place at least one explosive first!');
      return;
    }
    
    // Call the parent function to handle the blast
    onTriggerBlast();
  };


  if (!oreTypes || oreTypes.length === 0) {
    return null;
  }

  const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);
  //  md:grid-cols-3 lg:grid-cols-4
  return (
    <div>
      <div className={`mt-4 p-4 bg-gray-100 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold mb-3">Ore Types Legend</h3>
        <div
          className="grid grid-cols-2
     
       gap-3"
        >
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
      <button className="mt-10 bg-red-500 text-white p-3 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed" onClick={handleTriggerBlast} disabled ={!gameState.blasts || gameState.blasts.length === 0}>Trigger Blast {gameState.blasts?.length > 0 && `(${gameState.blasts.length})`}</button>
    </div>
  );
};

export default GridLegend;
