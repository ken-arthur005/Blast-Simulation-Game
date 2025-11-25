import { useContext } from "react";
import { GameContext } from "./GameContext";

import { Save, Upload, Download, RefreshCw, Play, X } from "lucide-react";

const BlastResult = ({
  show,
  onClose,
  onSave,
  score,
  recoveryRate, 
  dilutionRate, 
  materialsDestroyed,
  materialsRemained,
  blastRadiusUsed,
  // resetCanvas,
  recoveredCount,
  efficiency,
}) => {
  const { gameState } = useContext(GameContext);

  const isOptimal = recoveryRate >= 70 && dilutionRate <= 10;
  const tipMessage = isOptimal
    ? "Excellent mining technique! Targeting different ore combinations may increase your total yield."
    : `Try to increase recovery (currently ${recoveryRate}%) and reduce dilution (currently ${dilutionRate}%) by adjusting the blast direction.`;
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 h-full bg-black/50 flex justify-center items-center z-[1000] p-3 md:p-0">
      <div className="backdrop-blur-[20px] bg-[rgba(255,255,255,0.2)] text-white px-3 md:px-5 pt-3 pb-5 rounded-[8px] shadow-[0_4px_8px_rgba(0,0,0,0.2)] relative w-full md:w-[60%] max-w-[95%] md:max-w-none max-h-[90vh] overflow-y-auto">
        <div className="width-[100%] flex flex-row justify-end pr-1 md:pr-3">
          <button
            onClick={onClose}
            className="text-[1.2rem] md:text-[1.5rem] cursor-pointer flex justify-between items-center border-0"
          >
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        <h2 className="text-lg md:text-2xl font-bold">Blast Results</h2>
        <div>
          <ul className="list-disc flex flex-col md:flex-row md:flex-wrap px-4 md:px-5 text-xs md:text-base">
            {/* 2. USE NEW PROPS FOR DISPLAY */}
            <li className="md:me-15 mb-1 md:mb-0">Blast Score: {score || 0} units</li>
            <li className="md:me-15 mb-1 md:mb-0">Recovery Rate: {recoveryRate || 0}%</li> 
            <li className="md:me-15 mb-1 md:mb-0">Dilution Rate: {dilutionRate || 0}%</li>
            <li className="md:me-15 mb-1 md:mb-0">
              Materials destroyed: {materialsDestroyed}
            </li>
            <li className="md:me-15 mb-1 md:mb-0">
              Materials remained: {materialsRemained}
            </li>
            <li className="md:me-15 mb-1 md:mb-0">Blast Radius: {blastRadiusUsed}</li>
            <li className="md:me-15 mb-1 md:mb-0">
              Ores recovered (blocks): {recoveredCount || 0}
            </li>{" "}
            <li>Recovery Efficiency (value): {efficiency || 0}%</li>
          </ul>
        </div>

        <div className="pb-3">
          <h3 className="text-sm md:text-l font-black mt-3">PERFORMANCE TIPS</h3>
          <ul className="list-disc px-4 md:px-5 text-xs md:text-base">
            <li>
              {tipMessage}
            </li>
          </ul>
        </div>
        <div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-0 md:pr-10">
            <div className="relative group w-full md:w-auto">
              <button
                onClick={onSave}
                className="cursor-pointer flex gap-2 justify-center md:justify-between items-center px-3 md:px-5 py-2 md:py-1 border-black-500 border-b-2 rounded bg-blue-600 hover:bg-blue-800 w-full md:w-auto text-sm md:text-base"
              >
                {/* <Trophy /> */}
                <Save size={16} className="md:w-5 md:h-5" />
                Save
                <span className="hidden md:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Save your state
                </span>
              </button>
            </div>
            <div className="relative group w-full md:w-auto">
              <button
                // onClick={onClose}
                className="cursor-pointer flex gap-2 justify-center md:justify-between items-center px-3 md:px-5 py-2 md:py-1 border-black-500 border rounded hover:bg-white/20 hover:text-white md:ml-3 w-full md:w-auto text-sm md:text-base"
              >
                {/* <Trophy /> */}
                <Upload size={16} className="md:w-5 md:h-5" />
                Load
                <span className="hidden md:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Load your saved state
                </span>
              </button>
            </div>
            <div className="relative group w-full md:w-auto">
              <button className="cursor-pointer flex gap-2 justify-center md:justify-between items-center px-3 md:px-5 py-2 md:py-1 border-black-500 border-b-2 rounded bg-amber-700 hover:bg-amber-900 hover:text-white md:ml-3 w-full md:w-auto text-sm md:text-base">
                {/* <Trophy /> */}
                <Download size={16} className="md:w-5 md:h-5" />
                Export
                <span className="hidden md:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Export your results
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlastResult;