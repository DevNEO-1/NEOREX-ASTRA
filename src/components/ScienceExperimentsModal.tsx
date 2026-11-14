import React, { useState } from 'react';
import { GameState } from '../simulator/types';
import { LearningProfileTier, LEARNING_PROFILES, SCIENCE_EXPERIMENTS, ScienceExperiment } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { 
  X, 
  CheckCircle2, 
  Info, 
  BookOpen,
  Award
} from 'lucide-react';

interface ScienceExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  learningProfile: LearningProfileTier;
  onRunAction?: (actionType: string) => void;
}

export const ScienceExperimentsModal: React.FC<ScienceExperimentsModalProps> = ({
  isOpen,
  onClose,
  gameState,
  learningProfile,
}) => {
  const [selectedExperiment, setSelectedExperiment] = useState<ScienceExperiment>(SCIENCE_EXPERIMENTS[0]);
  const [interactiveState, setInteractiveState] = useState<{
    sunAngle: number;
    solarPowerGenerated: number;
    waterRecycleRatio: number;
    waterRecoveredAmount: number;
    co2Absorption: number;
    plantsHealthy: boolean;
    regolithThicknessMeters: number;
    radiationBlockedPercent: number;
    batteryDaysRemaining: number;
  }>({
    sunAngle: 45,
    solarPowerGenerated: 45,
    waterRecycleRatio: 80,
    waterRecoveredAmount: 9.6,
    co2Absorption: 3.2,
    plantsHealthy: true,
    regolithThicknessMeters: 1.5,
    radiationBlockedPercent: 50,
    batteryDaysRemaining: 15,
  });

  const [experimentSuccess, setExperimentSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const profile = LEARNING_PROFILES[learningProfile];

  // Interactive experiment controls
  const handleSolarAngleChange = (angle: number) => {
    // P = Pmax * sin(theta)
    const rad = (angle * Math.PI) / 180;
    const power = Math.max(0, Math.round(50 * Math.sin(rad)));
    setInteractiveState(prev => ({
      ...prev,
      sunAngle: angle,
      solarPowerGenerated: power,
    }));
    audioSystem.playTelemetryClick();
    if (power >= 40) {
      setExperimentSuccess(true);
    }
  };

  const handleWaterRecyclerAdjust = (ratio: number) => {
    const recovered = (12 * (ratio / 100)).toFixed(1);
    setInteractiveState(prev => ({
      ...prev,
      waterRecycleRatio: ratio,
      waterRecoveredAmount: parseFloat(recovered),
    }));
    audioSystem.playTelemetryClick();
    if (ratio >= 90) {
      setExperimentSuccess(true);
    }
  };

  const handleRegolithThicknessChange = (meters: number) => {
    // Exponential attenuation: I = I0 * e^(-mu * x)
    const blocked = Math.min(95, Math.round(30 + meters * 25));
    setInteractiveState(prev => ({
      ...prev,
      regolithThicknessMeters: meters,
      radiationBlockedPercent: blocked,
    }));
    audioSystem.playTelemetryClick();
    if (blocked >= 75) {
      setExperimentSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-glow-amber">
              🔬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100 tracking-wide">
                  ASTRA Space Science Laboratory
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${profile.colorScheme.badgeBg}`}>
                  {profile.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hands-on interactive physics, hydrology, botany & engineering experiments
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

        {/* Body content */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* Left Column: Experiment Selector */}
          <div className="md:col-span-4 p-4 space-y-2 bg-slate-950/30">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
              Select Mission Experiment:
            </span>

            <div className="space-y-1.5">
              {SCIENCE_EXPERIMENTS.map(exp => {
                const isSelected = selectedExperiment.id === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => {
                      audioSystem.playTelemetryClick();
                      setSelectedExperiment(exp);
                      setExperimentSuccess(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-glow-cyan'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="text-xl shrink-0">{exp.icon}</span>
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs truncate">{exp.title}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{exp.category} science</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Live Outpost Telemetry Snippet */}
            <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono">
              <span className="text-slate-400 text-[10px] uppercase block mb-1">Live Outpost Status:</span>
              <div className="flex justify-between text-slate-300">
                <span>Mission Day:</span>
                <span className="text-cyan-400 font-bold">Day {gameState.day} / {gameState.totalDays}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Power Grid:</span>
                <span className="text-amber-400 font-bold">{Math.round(gameState.resources.batteryKwh)} kWh</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Water Storage:</span>
                <span className="text-blue-400 font-bold">{Math.round(gameState.resources.waterLitres)} L</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Experiment Lab Bench */}
          <div className="md:col-span-8 p-6 space-y-5 bg-slate-900/40">
            
            {/* Experiment Title & Age-Adapted Prompt */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedExperiment.icon}</span>
                <h4 className="font-extrabold text-lg text-white">
                  {selectedExperiment.title}
                </h4>
              </div>

              {/* Age-adaptive explanation card */}
              <div className={`p-4 rounded-xl border ${profile.colorScheme.badgeBg} space-y-1`}>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Mission Directive ({profile.ageRange}):</span>
                </span>
                <p className="text-xs text-slate-100 leading-relaxed font-sans">
                  {learningProfile === 'junior' && selectedExperiment.juniorPrompt}
                  {learningProfile === 'cadet' && selectedExperiment.cadetPrompt}
                  {learningProfile === 'commander' && selectedExperiment.commanderPrompt}
                </p>
              </div>
            </div>

            {/* Interactive Sandbox Slider / Controls for the experiment */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">
                  Interactive Experiment Controls:
                </span>
                {experimentSuccess && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Experiment Goal Achieved!</span>
                  </span>
                )}
              </div>

              {/* Experiment 1: Solar Angle */}
              {selectedExperiment.id === 'exp-solar-power' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Solar Panel Sun-Tracking Angle:</span>
                    <span className="text-amber-400 font-bold">{interactiveState.sunAngle}° ({interactiveState.sunAngle === 90 ? 'Direct Overhead' : 'Tilted'})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={interactiveState.sunAngle}
                    onChange={(e) => handleSolarAngleChange(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Generated Electricity:</span>
                      <span className="text-base font-bold text-amber-300">+{interactiveState.solarPowerGenerated} kWh/day</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cosine Efficiency:</span>
                      <span className="text-base font-bold text-cyan-300">{(Math.sin((interactiveState.sunAngle * Math.PI) / 180) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Experiment 2: Water Recycler */}
              {selectedExperiment.id === 'exp-water-recycler' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Recycler Distillation Efficiency:</span>
                    <span className="text-blue-400 font-bold">{interactiveState.waterRecycleRatio}% (NASA Benchmark: 90% - 98%)</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="98"
                    value={interactiveState.waterRecycleRatio}
                    onChange={(e) => handleWaterRecyclerAdjust(Number(e.target.value))}
                    className="w-full accent-blue-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Water Recovered from Crew:</span>
                      <span className="text-base font-bold text-blue-300">+{interactiveState.waterRecoveredAmount} Litres/day</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Loss to System:</span>
                      <span className="text-base font-bold text-rose-400">{(12 - interactiveState.waterRecoveredAmount).toFixed(1)} Litres/day</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Experiment 3: Greenhouse */}
              {selectedExperiment.id === 'exp-greenhouse-biology' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 text-xs text-emerald-300 space-y-1">
                    <span className="font-bold block">Photosynthesis Reaction in Closed Life Support:</span>
                    <p className="font-mono text-[11px] text-emerald-400">
                      6 CO₂ (Astronaut Breath) + 6 H₂O (Recycled Water) + LED Photons ➔ C₆H₁₂O₆ (Food) + 6 O₂ (Oxygen)
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Daily Food:</span>
                      <span className="text-sm font-bold text-emerald-300">+4.0 kg/day</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Water Consumed:</span>
                      <span className="text-sm font-bold text-blue-300">16.0 L/day</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Electricity:</span>
                      <span className="text-sm font-bold text-amber-300">6.0 kWh/day</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Experiment 4: Radiation Shielding */}
              {selectedExperiment.id === 'exp-radiation-vault' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Lunar Regolith Shielding Thickness:</span>
                    <span className="text-purple-400 font-bold">{interactiveState.regolithThicknessMeters.toFixed(1)} meters</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.25"
                    value={interactiveState.regolithThicknessMeters}
                    onChange={(e) => handleRegolithThicknessChange(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cosmic Rays Blocked:</span>
                      <span className="text-base font-bold text-purple-300">{interactiveState.radiationBlockedPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Daily Crew Dose:</span>
                      <span className="text-base font-bold text-emerald-400">
                        {(1.0 * (1 - interactiveState.radiationBlockedPercent / 100)).toFixed(2)} mSv/day
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Experiment 5: Lunar Night */}
              {selectedExperiment.id === 'exp-lunar-night' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Lunar Night Duration:</span>
                      <span className="text-cyan-400 font-bold">14 Earth Days (336 hours)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Base Life-Support Power:</span>
                      <span className="text-rose-400 font-bold">-35.2 kWh / day</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Full 14-Night Energy Required:</span>
                      <span className="text-amber-400 font-bold">492.8 kWh total</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    💡 If your battery holds 600 kWh, you can survive the night with nominal power. But if you keep the greenhouse running (additional 6 kWh/day), you need 576.8 kWh total!
                  </p>
                </div>
              )}

            </div>

            {/* NASA Science & Real Engineering Fact Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Real NASA Science Fact:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedExperiment.nasaFact}
              </p>
              {profile.showFormulas && (
                <div className="pt-1 text-[10px] font-mono text-cyan-400">
                  Concept: {selectedExperiment.scientificConcept}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Interactive Space Training Sandbox — Complete all 5 experiments to earn the Master Scientist badge!</span>
          </div>

          <button
            onClick={() => {
              audioSystem.playTelemetryClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan"
          >
            Return to Mission Control
          </button>
        </div>

      </div>
    </div>
  );
};
