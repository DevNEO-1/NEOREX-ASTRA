import React from 'react';
import { GameState } from '../simulator/types';
import { Sliders, Wind, Sprout, Power, AlertCircle } from 'lucide-react';

interface LoadSheddingPanelProps {
  gameState: GameState;
  onToggleControl: (control: 'electrolysis' | 'greenhouses' | 'emergencyRationing', value?: boolean) => void;
}

export const LoadSheddingPanel: React.FC<LoadSheddingPanelProps> = ({
  gameState,
  onToggleControl,
}) => {
  const { infrastructure, isMissionOver } = gameState;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">ECLSS Load-Shedding & Grid Controls</h3>
          <span className="text-[11px] text-slate-400">Manage operational power, water and oxygen balancing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* 1. Oxygen Electrolysis Toggle */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200">Water Electrolysis (O₂)</h4>
              </div>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                infrastructure.activeLifeSupportO2
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {infrastructure.activeLifeSupportO2 ? 'Generating' : 'Standby'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Generates 3.2 kg O₂/day. Consumes 3.6 L water and 19.2 kWh electrical energy.
            </p>
          </div>

          <button
            onClick={() => onToggleControl('electrolysis')}
            disabled={isMissionOver}
            className={`w-full py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              infrastructure.activeLifeSupportO2
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{infrastructure.activeLifeSupportO2 ? 'Shed Load (Halt O₂ Gen)' : 'Engage Electrolysis'}</span>
          </button>
        </div>

        {/* 2. Greenhouse Farming Load Shedding */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200">Hydroponic Greenhouses</h4>
              </div>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                infrastructure.activeGreenhouses > 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {infrastructure.activeGreenhouses > 0 ? `${infrastructure.activeGreenhouses} Active` : 'Dormant'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Produces 4 kg food/module/day. Consumes 6 kWh power & 16 L water/module/day.
            </p>
          </div>

          <button
            onClick={() => onToggleControl('greenhouses')}
            disabled={isMissionOver || infrastructure.greenhouses === 0}
            className={`w-full py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              infrastructure.greenhouses === 0
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                : infrastructure.activeGreenhouses > 0
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>
              {infrastructure.greenhouses === 0
                ? 'No Greenhouses Built'
                : infrastructure.activeGreenhouses > 0
                ? 'Pause Farming (Save Water/Power)'
                : 'Activate Greenhouses'}
            </span>
          </button>
        </div>

        {/* 3. Emergency Power Rationing Mode */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200">Power Rationing Protocol</h4>
              </div>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                infrastructure.emergencyPowerRationing
                  ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {infrastructure.emergencyPowerRationing ? 'Engaged (-25%)' : 'Standard'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Reduces base avionics and lighting by 25% (saves 8.8 kWh/day). Critical during 14-day lunar night.
            </p>
          </div>

          <button
            onClick={() => onToggleControl('emergencyRationing')}
            disabled={isMissionOver}
            className={`w-full py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              infrastructure.emergencyPowerRationing
                ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{infrastructure.emergencyPowerRationing ? 'Disengage Power Rationing' : 'Engage Emergency Rationing'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
