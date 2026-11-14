import React from 'react';
import { CrewMember, GameState } from '../simulator/types';
import { X, HeartPulse, Wind, Activity, User, ShieldCheck, AlertCircle } from 'lucide-react';

interface AstronautInspectorModalProps {
  astronautId: string | null;
  gameState: GameState;
  onClose: () => void;
}

export const AstronautInspectorModal: React.FC<AstronautInspectorModalProps> = ({
  astronautId,
  gameState,
  onClose,
}) => {
  if (!astronautId) return null;

  const astronaut = gameState.crew.find(c => c.id === astronautId) || gameState.crew[0];
  if (!astronaut) return null;

  const isNight = !gameState.isDaylight;
  const isSolarStorm = gameState.activeEvents.some(e => e.type === 'solar_storm' && !e.resolved);

  // Derive dynamic contextual task based on astronaut role & game state
  const getContextualTask = (role: CrewMember['role'], health: number) => {
    if (health <= 0) return 'Incapacitated • Resting in MedBay Quarters';
    if (isSolarStorm) return 'SEQUESTERED: Taking cover in Sintered Regolith Storm Shelter';
    if (isNight) return 'LUNAR NIGHT: Managing secondary thermal circuits & life support';

    switch (role) {
      case 'Commander':
        return 'SURFACE EVA: Surveying Shackleton Crater perimeter & avionics';
      case 'Life Support Engineer':
        return 'ECLSS MAINTENANCE: Calibrating catalytic water distillation loop';
      case 'Botanist':
        return 'AGRONOMY: Monitoring hydroponic LED wavelengths & nutrient solution';
      case 'Power Systems Specialist':
        return 'GRID REGULATION: Synchronizing photovoltaic solar gimbals';
      default:
        return 'SURFACE OPERATIONS: Routine habitat telemetry inspection';
    }
  };

  const currentTask = getContextualTask(astronaut.role, astronaut.health);

  const getOxygenStatus = () => {
    if (gameState.resources.oxygenKg <= 10) return { label: 'CRITICAL HYPOXIA', color: 'text-rose-400 bg-rose-950/60 border-rose-800' };
    if (gameState.resources.oxygenKg <= 30) return { label: 'LOW RESERVES', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    return { label: 'NOMINAL (101.3 kPa)', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' };
  };

  const o2Status = getOxygenStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Holographic Header Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Astronaut Profile Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-3xl shadow-glow-cyan">
            {astronaut.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">{astronaut.name}</h2>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                astronaut.health > 70 
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' 
                  : astronaut.health > 30 
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800' 
                  : 'bg-rose-950/80 text-rose-400 border-rose-800 animate-pulse'
              }`}>
                {astronaut.status}
              </span>
            </div>
            <span className="text-xs text-cyan-400 font-mono font-medium">{astronaut.role}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">{astronaut.specialty}</p>
          </div>
        </div>

        {/* Real-time Physiological Vitals Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          
          {/* Health Gauge */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                <span>Physiological Health</span>
              </span>
              <span className="font-mono font-bold text-white">{astronaut.health}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  astronaut.health > 70 ? 'bg-emerald-500' : astronaut.health > 30 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${astronaut.health}%` }}
              />
            </div>
          </div>

          {/* Oxygen Status */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>EVA Oxygen Supply</span>
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-block ${o2Status.color}`}>
              {o2Status.label}
            </span>
          </div>

          {/* Stress & Morale */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Psychological Stress</span>
              </span>
              <span className="font-mono font-bold text-slate-300">
                {astronaut.health < 40 ? 'Severe' : astronaut.health < 70 ? 'Elevated' : 'Nominal'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Subject to environmental telemetry</span>
          </div>

          {/* EVA Suit Integrity */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>EVA Space Suit</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">100% Sealed</span>
            </div>
            <span className="text-[10px] text-slate-500">Multi-layer Micrometeorite Garment</span>
          </div>

        </div>

        {/* Current Active Mission Task */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
            <User className="w-3.5 h-3.5" />
            <span>Active Operational Assignment:</span>
          </div>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {currentTask}
          </p>
        </div>

        {/* Footer Notes */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Vitals update deterministically with daily ECLSS balances and radiation levels.</span>
        </div>

      </div>
    </div>
  );
};
