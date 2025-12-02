import React from "react";

/**
 * Component displaying grid statistics and information
 */
const GridInfo = ({ gridData, blockSize, canvasSize, className = "" }) => {
  if (!gridData) {
    return null;
  }

  const { dimensions, metadata } = gridData;

  return (
    <div
      className={`mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm text-[#E5E4E2] ${className}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
        <div>
          <span className="font-medium text-[10px] sm:text-xs md:text-sm">
            Grid Size:
          </span>
          <br />
          <span className="text-[10px] sm:text-xs md:text-sm">
            {dimensions.width} × {dimensions.height}
          </span>
        </div>
        <div>
          <span className="font-medium text-[10px] sm:text-xs md:text-sm">
            Total Blocks:
          </span>
          <br />
          <span className="text-[10px] sm:text-xs md:text-sm">
            {metadata.totalBlocks.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="font-medium text-[10px] sm:text-xs md:text-sm">
            Ore Types:
          </span>
          <br />
          <span className="text-[10px] sm:text-xs md:text-sm">
            {metadata.oreTypes.length}
          </span>
        </div>
        <div>
          <span className="font-medium text-[10px] sm:text-xs md:text-sm">
            Block Size:
          </span>
          <br />
          <span className="text-[10px] sm:text-xs md:text-sm">
            {blockSize}px
          </span>
        </div>
      </div>
      <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs md:text-sm">
        <span className="font-medium">Canvas Size:</span>{" "}
        <span className="text-[10px] sm:text-xs md:text-sm">
          {canvasSize.width} × {canvasSize.height}
        </span>
      </div>
    </div>
  );
};

export default GridInfo;
