import React from 'react';
import { GameState, PlanetType } from '../simulator/types';
import { Compass, Moon, Globe, Lock, CheckCircle2, Shield, Award, X } from 'lucide-react';

interface CampaignSelectorProps {
  gameState: GameState;
  isOpen: boolean;
  onClose: () => void;
  onSelectCampaign: (campaign: PlanetType, difficulty: 'cadet' | 'commander' | 'hardcore') => void;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  gameState,
  isOpen,
  onClose,
  onSelectCampaign,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'cadet' | 'commander' | 'hardcore'>(gameState.difficulty);

  if (!isOpen) return null;

  const isMarsUnlocked = gameState.marsUnlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Mission Campaign Selector</h2>
            <p className="text-xs text-slate-400">Choose surface theater and mission difficulty</p>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Mission Command Difficulty
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['cadet', 'commander', 'hardcore'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition border text-center ${
                  selectedDifficulty === diff
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-glow-cyan'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {diff}
                <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                  {diff === 'cadet' ? '+25% Reserves' : diff === 'commander' ? 'Nominal NASA' : '-20% Reserves'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          {/* Moon Campaign */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition ${
            gameState.campaign === 'moon'
              ? 'bg-slate-950 border-cyan-500/60 shadow-glow-cyan'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Artemis Base Alpha</h3>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">Lunar South Pole • 30 Days</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Available
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Establish humanity's first permanent lunar outpost on the rim of Shackleton Crater. Survive a harrowing 14-day continuous lunar night with zero solar power generation.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>14-day continuous solar darkness cycle</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>High-risk Solar Particle Events (SPEs)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Closed-loop water & O₂ stoichiometry</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onSelectCampaign('moon', selectedDifficulty);
                onClose();
              }}
              className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan"
            >
              Launch Artemis Mission
            </button>
          </div>

          {/* Mars Campaign */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition ${
            !isMarsUnlocked
              ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
              : gameState.campaign === 'mars'
              ? 'bg-slate-950 border-mars-rust shadow-glow-amber'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Ares Outpost Prime</h3>
                    <span className="text-[10px] font-mono text-orange-400 uppercase">Acidalia Planitia • 40 Sols</span>
                  </div>
                </div>

                {isMarsUnlocked ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Take command of humanity's maiden Martian research outpost. Manage reduced solar irradiance (43% of Earth), extreme cryogenic nights (-80°C), and global atmospheric dust opacity.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Attenuated solar power (1.52 AU distance)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Sub-zero thermal atmospheric heating demand</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Global Martian dust storms</span>
                </div>
              </div>
            </div>

            {isMarsUnlocked ? (
              <button
                onClick={() => {
                  onSelectCampaign('mars', selectedDifficulty);
                  onClose();
                }}
                className="w-full py-2 px-4 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition shadow-glow-amber"
              >
                Launch Ares Mission
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Requires surviving 30 lunar days with ≥70% crew health & score.</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
