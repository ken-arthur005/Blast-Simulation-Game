import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
} from "lucide-react";

// Reusable arrow button component for GridLegend
export default function ArrowButton({ dir, selectedDir, setSelectedDir, disabled = false }) {
  const icons = {
    left: ArrowLeft,
    right: ArrowRight,
    up: ArrowUp,
    down: ArrowDown,
    "up-left": ArrowUpLeft,
    "up-right": ArrowUpRight,
    "down-right": ArrowDownRight,
    "down-left": ArrowDownLeft,
  };

  const Icon = icons[dir] || ArrowUp;

  const isSelected = selectedDir === dir;

  const baseClass = "w-10 h-10 rounded flex items-center justify-center";
  const selectedClass =
    "bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-300";
  const defaultClass = "bg-gray-200 text-gray-800 hover:bg-gray-300";

  const disabledClass = "opacity-50 cursor-not-allowed";

  return (
    <button
      onClick={() => {
        if (disabled) return;
        setSelectedDir(dir);
      }}
      title={dir}
      aria-label={dir}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      disabled={disabled}
      className={`${baseClass} ${isSelected ? selectedClass : defaultClass} ${disabled ? disabledClass : ""}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
