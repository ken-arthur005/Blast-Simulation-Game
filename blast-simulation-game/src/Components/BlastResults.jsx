const BlastResult = ({
  show,
  onClose,
  score,
  materialsDestroyed,
  blastRadiusUsed,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 w-full h-full bg-black/50 flex justify-center items-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-[8px] shadow-[0_4px_8px_rgba(0,0,0,0.2)] relative max-w-[500px]"
        onClick={(e) => e.stopPropagation}
      >
        <h2>Blast Results</h2>
        <div>
          <ul>
            <li>Blast score: {score}</li>
            <li>Number of materials destroyed: {materialsDestroyed}</li>
            <li>Blast Radius used: {blastRadiusUsed}</li>
          </ul>
        </div>
        <div>
          <h3>ACHIEVEMENTS UNLOCKED</h3>
          <button
            onClick={onClose}
            className="absolute top-[10px] right-[10px] bg-transparent border-0 text-[1.5rem] cursor-pointer"
          >
            <Trophy />
            Close
          </button>
        </div>
        <div>
          <h3>PERFORMANCE TIPS</h3>
          <ul>
            <li>
              Excellent mining technique! Try targeting different ore
              combinations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const Trophy = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      className="bi bi-trophy"
      viewBox="0 0 16 16"
    >
      <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935M3.504 1q.01.775.056 1.469c.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.5.5 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667q.045-.694.056-1.469z" />
    </svg>
  );
};

export default BlastResult;
