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
    <div className={`mb-4 text-sm text-[#E5E4E2] ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="font-medium">Grid Size:</span>
          <br />
          {dimensions.width} × {dimensions.height}
        </div>
        <div>
          <span className="font-medium">Total Blocks:</span>
          <br />
          {metadata.totalBlocks.toLocaleString()}
        </div>
        <div>
          <span className="font-medium">Ore Types:</span>
          <br />
          {metadata.oreTypes.length}
        </div>
        <div>
          <span className="font-medium ">Block Size:</span>
          <br />
          {blockSize}px
        </div>
      </div>
      <div className="mt-2 ">
        <span className="font-medium ">Canvas Size:</span> {canvasSize.width} ×{" "}
        {canvasSize.height}
      </div>
    </div>
  );
};

export default GridInfo;
