import React from "react";
import OreColorMapper from "../utils/oreColorMapper";
import OreValueMapper from "../utils/oreValueMapper";
import { calculateTooltipPosition } from "../utils/tooltipPositioning";
import RockTexture from "./RockTexture";

const GridTooltip = ({ cell, gridX, gridY, mouseX, mouseY, visible }) => {
  if (!visible || !cell) return null;

  const oreType = (cell?.oreType || cell?.type || "unknown").toString();
  const color = OreColorMapper.getColor(oreType);
  const value = OreValueMapper.getValue(oreType);

  // Calculate tooltip position using the utility function
  const tooltipWidth = 200;
  const tooltipHeight = 120;
  const { left, top } = calculateTooltipPosition(
    mouseX,
    mouseY,
    tooltipWidth,
    tooltipHeight
  );

  const tooltipStyle = {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    zIndex: 9999,
    pointerEvents: "none",
  };

  return (
    <div
      style={tooltipStyle}
      className="backdrop-blur-md bg-[rgba(255,255,255,0.2)] rounded-lg shadow-lg p-3 border border-gray-200"
    >
      <div className="space-y-2">
        {/* Ore Type with rock texture indicator */}
        <div className="flex items-center gap-2">
          <RockTexture
            color={color}
            gridX={gridX}
            gridY={gridY}
            size={32}
            className="rounded border border-gray-300 shrink-0"
          />
          <span className="font-semibold text-gray-800 capitalize text-sm">
            {oreType}
          </span>
        </div>

        {/* Value */}
        <div className="text-xs text-gray-600">
          <span className="font-medium">Value:</span>{" "}
          <span className="text-gray-800">${value.toFixed(2)}</span>
        </div>

        {/* Coordinates */}
        {/* <div className="text-xs text-gray-600">
          <span className="font-medium">Position:</span>{" "}
          <span className="text-gray-800">
            ({gridX}, {gridY})
          </span>
        </div> */}

        {/* Color hex code */}
        {/* <div className="text-xs text-gray-500 font-mono">{color}</div> */}
      </div>
    </div>
  );
};

export default GridTooltip;
