import React from 'react';
import { CelestialBodyInfo } from '../data/celestialBodies';
import { 
  X, 
  Globe2, 
  Compass, 
  Thermometer, 
  Clock, 
  Orbit, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  BookOpen
} from 'lucide-react';

interface PlanetInspectorModalProps {
  planet: CelestialBodyInfo | null;
  onClose: () => void;
  onFocusPlanet?: (planetId: string) => void;
}

export const PlanetInspectorModal: React.FC<PlanetInspectorModalProps> = ({
  planet,
  onClose,
}) => {
  if (!planet) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Planet Accent */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg shrink-0"
              style={{ 
                backgroundColor: `${planet.colorAccent}15`, 
                borderColor: `${planet.colorAccent}40`,
                color: planet.colorAccent 
              }}
            >
              <Globe2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {planet.category}
                </span>
                <span 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    planet.campaignAvailability === 'active'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                      : planet.campaignAvailability === 'unlockable'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {planet.campaignStatusText}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {planet.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Planet Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-slate-300 italic border-l-2 pl-3" style={{ borderColor: planet.colorAccent }}>
          "{planet.tagline}"
        </p>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Compass className="w-3 h-3 text-slate-400" />
              <span>Diameter</span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{planet.diameterKm}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Orbit className="w-3 h-3 text-slate-400" />
              <span>Surface Gravity</span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{planet.gravityMps2}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Day Length</span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{planet.dayLength}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Orbit className="w-3 h-3 text-sky-400" />
              <span>Orbital Period</span>
            </div>
            <div className="text-xs font-bold text-sky-300 mt-0.5 truncate" title={planet.orbitalPeriod}>
              {planet.orbitalPeriod}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-slate-400" />
              <span>Temperature</span>
            </div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={planet.temperatureRange}>
              {planet.temperatureRange}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-slate-400" />
              <span>Solar Distance</span>
            </div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={planet.distanceFromSun}>
              {planet.distanceFromSun}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-slate-400" />
              <span>Moons / Satellites</span>
            </div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={planet.moonsCount}>
              {planet.moonsCount}
            </div>
          </div>
        </div>

        {/* Atmosphere Spec */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs">
          <span className="font-mono text-slate-400 uppercase font-bold text-[10px]">Atmospheric Composition:</span>
          <div className="text-slate-200 mt-1 font-mono text-[11px]">{planet.atmosphere}</div>
        </div>

        {/* NASA Educational Facts */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>NASA Planetary Science Insights</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {planet.nasaFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{fact}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {planet.campaignAvailability === 'active' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <span>{planet.campaignStatusText}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Return to Outpost
          </button>
        </div>
      </div>
    </div>
  );
};
