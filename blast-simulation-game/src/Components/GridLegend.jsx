import React from "react";
import OreColorMapper from "../utils/oreColorMapper";

/**
 * Legend component showing ore types and their colors
 */
const GridLegend = ({ oreTypes, className = "" }) => {
  if (!oreTypes || oreTypes.length === 0) {
    return null;
  }

  const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);
  //  md:grid-cols-3 lg:grid-cols-4
  return (
    <div>
      <div className={`mt-4 p-4 bg-gray-100 rounded-lg ${className} border`}>
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
      <button className="mt-10 bg-red-500 text-white p-3 rounded">
        Trigger Blast
      </button>
    </div>
  );
};

export default GridLegend;
