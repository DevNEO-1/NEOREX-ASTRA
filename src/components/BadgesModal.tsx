import React from 'react';
import { ExplorerBadge } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { X, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: ExplorerBadge[];
}

export const BadgesModal: React.FC<BadgesModalProps> = ({
  isOpen,
  onClose,
  badges,
}) => {
  if (!isOpen) return null;

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-glow-amber">
              🏆
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <span>Astronaut Achievements & Badges</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unlockedCount} / {badges.length} Unlocked
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Reward your engineering curiosity, scientific discoveries, and survival leadership
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioSystem.playTelemetryClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges Grid */}
        <div className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-900/40">
          {badges.map(badge => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                badge.unlocked
                  ? 'bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/40 shadow-glow-amber'
                  : 'bg-slate-950/40 border-slate-800 opacity-60'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                badge.unlocked
                  ? 'bg-amber-500/20 border-amber-500/40'
                  : 'bg-slate-800/40 border-slate-800'
              }`}>
                {badge.icon}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${badge.unlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                    {badge.title}
                  </span>
                  {badge.unlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {badge.description}
                </p>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">
                  Category: {badge.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-cyan-300 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Keep playing campaigns and experiments to collect all mission medals!
          </span>
          <button
            onClick={() => {
              audioSystem.playTelemetryClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
