import React from 'react';
import { InstructorLogEntry } from '../simulator/types';
import { Bot, AlertTriangle, Lightbulb, CheckCircle2, Bookmark } from 'lucide-react';

interface InstructorPanelProps {
  logs: InstructorLogEntry[];
  onOpenResearchModal: () => void;
}

export const InstructorPanel: React.FC<InstructorPanelProps> = ({ logs, onOpenResearchModal }) => {
  // Show the most recent 6 logs
  const displayLogs = [...logs].reverse().slice(0, 6);

  const getCategoryConfig = (category: InstructorLogEntry['category']) => {
    switch (category) {
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          badge: 'Alert',
        };
      case 'science':
        return {
          icon: Bookmark,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          badge: 'Science',
        };
      case 'kudos':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          badge: 'Commendation',
        };
      default:
        return {
          icon: Lightbulb,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          badge: 'Engineering',
        };
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Mission Instructor AI</h3>
            <span className="text-[11px] text-slate-400">Deterministic engineering guidance & NASA data</span>
          </div>
        </div>

        <button
          onClick={onOpenResearchModal}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition"
        >
          View Scientific Sources →
        </button>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {displayLogs.map((log, idx) => {
          const config = getCategoryConfig(log.category);
          const Icon = config.icon;

          return (
            <div
              key={`${log.day}-${idx}`}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded border ${config.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-200">{log.title}</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Day {log.day}</span>
              </div>

              <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                {log.message}
              </p>

              {log.recommendation && (
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                  <div>
                    <span className="font-semibold text-amber-200">Recommendation: </span>
                    <span>{log.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
