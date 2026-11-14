import React, { useEffect } from 'react';
import { GameState } from '../simulator/types';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, RotateCcw, Rocket, Globe } from 'lucide-react';

interface MissionDebriefModalProps {
  gameState: GameState;
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  onLaunchMars: () => void;
}

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  gameState,
  isOpen,
  onClose,
  onRestart,
  onLaunchMars,
}) => {
  const { scoreBreakdown, isVictory, failureReason, campaign } = gameState;

  useEffect(() => {
    if (isOpen && isVictory) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen, isVictory]);

  if (!isOpen || !scoreBreakdown) return null;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S':
        return 'text-amber-400 border-amber-400 bg-amber-400/10 shadow-glow-amber';
      case 'A':
        return 'text-emerald-400 border-emerald-400 bg-emerald-400/10 shadow-glow-emerald';
      case 'B':
        return 'text-cyan-400 border-cyan-400 bg-cyan-400/10 shadow-glow-cyan';
      case 'C':
        return 'text-blue-400 border-blue-400 bg-blue-400/10';
      default:
        return 'text-rose-400 border-rose-400 bg-rose-400/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Outcome Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-full mb-3 bg-slate-800 border border-slate-700">
            {isVictory ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-400" />
            )}
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            {isVictory ? 'Mission Accomplished' : 'Mission Aborted — Casualties Incurred'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {isVictory
              ? `Commander completed the full expedition at ${campaign === 'moon' ? 'Artemis Base Alpha' : 'Ares Prime'}.`
              : failureReason}
          </p>
        </div>

        {/* Score & Grade Display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Score</span>
            <span className="text-2xl font-black text-white font-mono">{scoreBreakdown.totalScore}</span>
            <span className="text-[10px] text-slate-500 font-mono block">/ 100</span>
          </div>

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Grade</span>
            <div className={`w-9 h-9 mx-auto rounded-lg border font-black text-lg flex items-center justify-center ${getGradeColor(scoreBreakdown.grade)}`}>
              {scoreBreakdown.grade}
            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Crew Survival</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{scoreBreakdown.crewSurvivalScore}</span>
            <span className="text-[10px] text-slate-500 font-mono block">/ 40 pts</span>
          </div>

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Logistics</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">{scoreBreakdown.resourceEfficiencyScore}</span>
            <span className="text-[10px] text-slate-500 font-mono block">/ 30 pts</span>
          </div>

        </div>

        {/* Mars Qualification Banner */}
        {scoreBreakdown.isMarsEligible ? (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-950/60 to-amber-950/40 border border-orange-500/50 shadow-glow-amber">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500 text-slate-950">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">
                  Expedition Milestone Unlocked
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  Mars Mission Qualified: Ares Outpost Prime
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Your command demonstrated superior life-support management. You are now authorized to command the Martian surface mission!
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Feedback Summary */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Mission Debriefing & Technical Feedback
          </h4>
          <div className="space-y-2">
            {scoreBreakdown.summaryFeedback.map((feedback, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{feedback}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onRestart}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Mission</span>
          </button>

          {scoreBreakdown.isMarsEligible ? (
            <button
              onClick={() => {
                onClose();
                onLaunchMars();
              }}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-glow-amber"
            >
              <Rocket className="w-4 h-4" />
              <span>Launch Mars Mission →</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <span>Review Mission Data</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
