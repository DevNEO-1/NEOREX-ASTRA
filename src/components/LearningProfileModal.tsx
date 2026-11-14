import React from 'react';
import { LearningProfileTier, LEARNING_PROFILES } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { Check, Sparkles } from 'lucide-react';

interface LearningProfileModalProps {
  isOpen: boolean;
  currentProfile: LearningProfileTier;
  onSelectProfile: (profile: LearningProfileTier) => void;
  onClose: () => void;
}

export const LearningProfileModal: React.FC<LearningProfileModalProps> = ({
  isOpen,
  currentProfile,
  onSelectProfile,
  onClose,
}) => {
  if (!isOpen) return null;

  const tiers: LearningProfileTier[] = ['junior', 'cadet', 'commander'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NASA Adaptive Learning Architecture</span>
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-wide">
            Choose Your Astronaut Training Track
          </h3>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            NEOREX ASTRA dynamically scales vocabulary, guided hints, and telemetry depth to suit your experience level. You can switch anytime!
          </p>
        </div>

        {/* 3 Profile Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40">
          {tiers.map(tier => {
            const config = LEARNING_PROFILES[tier];
            const isSelected = currentProfile === tier;

            return (
              <div
                key={tier}
                onClick={() => {
                  audioSystem.playTelemetryClick();
                  onSelectProfile(tier);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? `${config.colorScheme.border} bg-slate-800/80 ${config.colorScheme.glow} scale-[1.02]`
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">
                      {tier === 'junior' && '🌟'}
                      {tier === 'cadet' && '🚀'}
                      {tier === 'commander' && '🎖️'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${config.colorScheme.badgeBg}`}>
                      {config.ageRange}
                    </span>
                  </div>

                  <div>
                    <h4 className={`font-extrabold text-base ${config.colorScheme.primary}`}>
                      {config.label}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-snug">
                      {config.tagline}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
                    {config.description}
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioSystem.playTelemetryClick();
                      onSelectProfile(tier);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Active Profile</span>
                      </>
                    ) : (
                      <span>Select Track</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-400">
            All three tracks run on the exact same verified NASA simulation engine.
          </span>
          <button
            onClick={() => {
              audioSystem.playTelemetryClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Confirm & Enter Outpost
          </button>
        </div>

      </div>
    </div>
  );
};
