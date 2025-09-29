import React from 'react';
import OreColorMapper from '../utils/oreColorMapper';

/**
 * Legend component showing ore types and their colors
 */
const GridLegend = ({ oreTypes, className = "" }) => {
  if (!oreTypes || oreTypes.length === 0) {
    return null;
  }

  const colorMapping = OreColorMapper.getColorsForOreTypes(oreTypes);

  return (
    <div className={`mt-4 p-4 bg-gray-100 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-2">Ore Types Legend</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {oreTypes.map(oreType => (
          <div key={oreType} className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 border border-gray-400 rounded flex-shrink-0"
              style={{ backgroundColor: colorMapping[oreType] }}
            />
            <span className="text-sm capitalize truncate">{oreType}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridLegend;