import { Save, Upload, Download, RefreshCw, Play, X } from "lucide-react";

const BlastResult = ({
  show,
  onClose,
  score,
  materialsDestroyed,
  materialsRemained,
  blastRadiusUsed,
  // resetCanvas,
  recoveredCount,
  efficiency,
}) => {
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
            <li className="md:me-15 mb-1 md:mb-0">Blast score: {score}</li>
            <li className="md:me-15 mb-1 md:mb-0">
              Materials destroyed: {materialsDestroyed}
            </li>
            <li className="md:me-15 mb-1 md:mb-0">
              Materials remained: {materialsRemained}
            </li>
            <li className="md:me-15 mb-1 md:mb-0">Blast Radius: {blastRadiusUsed}</li>
            <li className="md:me-15 mb-1 md:mb-0">
              Ores recovered: {recoveredCount || 0}
            </li>{" "}
            <li>Efficiency: {efficiency || 0}%</li>
          </ul>
        </div>

        <div className="pb-3">
          <h3 className="text-sm md:text-l font-black mt-3">PERFORMANCE TIPS</h3>
          <ul className="list-disc px-4 md:px-5 text-xs md:text-base">
            <li>
              Excellent mining technique! Try targeting different ore
              combinations
            </li>
          </ul>
        </div>
        <div>
          {/* <h3 className="text-l font-black mt-3">ACHIEVEMENTS UNLOCKED</h3> */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-0 md:pr-10">
            <div className="relative group w-full md:w-auto">
              <button
                // onClick={() => resetCanvas()}
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

// const Trophy = () => {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       fill="currentColor"
//       className="me-2 w-5 h-5"
//       viewBox="0 0 16 16"
//     >
//       <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935M3.504 1q.01.775.056 1.469c.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.5.5 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667q.045-.694.056-1.469z" />
//     </svg>
//   );
// };

export default BlastResult;
