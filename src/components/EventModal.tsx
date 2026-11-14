import React from 'react';
import { OutpostEvent } from '../simulator/types';
import { AlertTriangle, ShieldAlert, Info, HelpCircle, ArrowRight } from 'lucide-react';

interface EventModalProps {
  events: OutpostEvent[];
  onChooseOption: (eventId: string, choiceId: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ events, onChooseOption }) => {
  const unresolvedEvents = events.filter(e => !e.resolved);

  if (unresolvedEvents.length === 0) return null;

  const currentEvent = unresolvedEvents[0];

  const getSeverityHeader = () => {
    switch (currentEvent.severity) {
      case 'critical':
        return {
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          badge: 'CRITICAL MISSION ALERT',
          icon: ShieldAlert,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
          badge: 'ENGINEERING WARNING',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400',
          badge: 'OPERATIONAL TELEMETRY',
          icon: Info,
        };
    }
  };

  const headerConfig = getSeverityHeader();
  const HeaderIcon = headerConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg border ${headerConfig.bg}`}>
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {headerConfig.badge} • DAY {currentEvent.day}
              </span>
              <h2 className="text-base font-extrabold text-white">
                {currentEvent.title}
              </h2>
            </div>
          </div>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {unresolvedEvents.length} Pending
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {currentEvent.description}
          </p>
        </div>

        {/* Scientific Context Box */}
        <div className="mb-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
            <Info className="w-3.5 h-3.5" />
            <span>NASA Scientific Context</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentEvent.scientificExplanation}
          </p>
        </div>

        {/* Educational Question */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Commander Directive Required:</span>
          </div>
          <p className="text-xs font-medium text-slate-200 italic">
            "{currentEvent.educationalQuestion}"
          </p>
        </div>

        {/* Choices */}
        <div className="space-y-2.5">
          {currentEvent.choices.map(choice => (
            <button
              key={choice.id}
              onClick={() => onChooseOption(currentEvent.id, choice.id)}
              className="w-full text-left p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 transition group flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                    {choice.label}
                  </h4>
                  {choice.creditCost && (
                    <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800 px-1.5 py-0.5 rounded">
                      -{choice.creditCost} Credits
                    </span>
                  )}
                  {choice.powerCostKwh && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800 px-1.5 py-0.5 rounded">
                      -{choice.powerCostKwh} kWh
                    </span>
                  )}
                  {choice.waterCostLitres && (
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/40 border border-blue-800 px-1.5 py-0.5 rounded">
                      -{choice.waterCostLitres} L Water
                    </span>
                  )}
                  {choice.oxygenCostKg && (
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800 px-1.5 py-0.5 rounded">
                      -{choice.oxygenCostKg} kg O₂
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-1">{choice.description}</p>
                <p className="text-[11px] text-emerald-400 font-medium">Outcome: {choice.effectDescription}</p>
              </div>

              <div className="mt-1 p-1 rounded-lg bg-slate-700/50 group-hover:bg-cyan-500 group-hover:text-slate-950 transition text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
