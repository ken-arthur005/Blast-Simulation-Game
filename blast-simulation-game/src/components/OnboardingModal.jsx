import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Target,
  Trophy,
  MousePointerClick,
  ChevronRight,
  Check,
  Move3d,
} from "lucide-react";

const OnboardingModal = ({ show, onClose }) => {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps = [
    {
      title: "Welcome to Rock Blasterz",
      icon: <Zap className="w-12 h-12 text-yellow-400" />,
      content: (
        <div className="space-y-3">
          <p>
            You are the lead mining engineer. Your goal is to extract high-value
            ore from the rock face using precision blasting.
          </p>
          <p className="text-white/70 text-sm">
            This is a physics-based simulation. Every block has density, mass,
            and friction.
          </p>
        </div>
      ),
    },
    {
      title: "Place Your Charges",
      icon: <MousePointerClick className="w-12 h-12 text-blue-400" />,
      content: (
        <div className="space-y-3">
          <p>
            <strong>Click anywhere</strong> on the grid to place an explosive
            charge. You can place up to <strong>5 charges</strong> per round.
          </p>
          <div className="bg-white/10 p-3 rounded-lg text-sm border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Move3d className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-400">Pro Tip:</span>
            </div>
            Use the Legend panel to set a <strong>Directional Bias</strong> (Up,
            Down, Left, Right) to steer the debris where you want it.
          </div>
        </div>
      ),
    },
    {
      title: "Recovery & Dilution",
      icon: <Target className="w-12 h-12 text-red-400" />,
      content: (
        <div className="space-y-3">
          <p>
            After the blast, ore that falls into the <strong>Drop Zone</strong>{" "}
            (bottom of screen) is collected.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2 text-green-300">
              <Check className="w-4 h-4" />
              <strong>Recovery:</strong> High-value ore (Gold/Green) counts towards your score.
            </li>
            <li className="flex items-center gap-2 text-red-300">
              <X className="w-4 h-4" />
              <strong>Dilution:</strong> Waste rock (Grey/Red) reduces your
              score significantly. Keep it clean!
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Review & Improve",
      icon: <Trophy className="w-12 h-12 text-purple-400" />,
      content: (
        <div className="space-y-3">
          <p>
            Check the <strong>Results Dashboard</strong> after every blast. You
            can:
          </p>
          <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
            <li>Replay the physics animation to analyze movement.</li>
            <li>Save your simulation to share with others.</li>
            <li>Compete on the Leaderboard.</li>
          </ul>
          <p className="mt-4 font-bold text-center text-amber-400">
            Good luck, Engineer!
          </p>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("rockBlasterz_onboarding_seen", "true");
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col relative animate-fadeIn">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-800">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header Image/Icon Area */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 flex justify-center items-center border-b border-white/5">
          <div className="bg-white/5 p-4 rounded-full border border-white/10 shadow-inner">
            {steps[step].icon}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 text-white">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {steps[step].title}
          </h2>
          <div className="text-gray-300 leading-relaxed">
            {steps[step].content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 border-t border-white/10">
          <div className="flex justify-between items-center mb-4 px-2">
            {/* Dots Indicator */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? "bg-yellow-500" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Checkbox */}
            {step === steps.length - 1 && (
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                Don't show this again
              </label>
            )}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-yellow-500 hover:bg-yellow-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
          >
            {step === steps.length - 1 ? (
              <>
                Start Blasting <Zap className="w-4 h-4" />
              </>
            ) : (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Close X (Top Right) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;