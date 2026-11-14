import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  value: number;
  unit: string;
  maxCapacity?: number;
  dailyNetChange?: number;
  dailyProduced?: number;
  dailyConsumed?: number;
  icon: LucideIcon;
  colorScheme: 'cyan' | 'blue' | 'emerald' | 'amber' | 'purple' | 'gold';
  warningMessage?: string;
  subtext?: string;
  juniorLabel?: string;
  juniorExplanation?: string;
}

const colorStyles = {
  cyan: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    bar: 'bg-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  },
  blue: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    bar: 'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  emerald: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  amber: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  purple: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    bar: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  gold: {
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-400',
    bar: 'bg-yellow-500',
    badge: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  },
};

export const ResourceCard: React.FC<ResourceCardProps> = ({
  title,
  value,
  unit,
  maxCapacity,
  dailyNetChange,
  dailyProduced,
  dailyConsumed,
  icon: Icon,
  colorScheme,
  warningMessage,
  subtext,
  juniorLabel,
  juniorExplanation,
}) => {
  const styles = colorStyles[colorScheme];
  const percentage = maxCapacity ? Math.min(100, Math.max(0, (value / maxCapacity) * 100)) : undefined;

  return (
    <div className={`p-4 rounded-xl border ${styles.border} ${styles.bg} bg-slate-900/60 backdrop-blur-sm relative overflow-hidden transition-all hover:border-opacity-60`}>
      {/* Top row: Icon and Title */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 ${styles.text}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase block">
              {juniorLabel ? juniorLabel : title}
            </span>
            {juniorExplanation && (
              <span className="text-[10px] text-slate-400 font-sans block">{juniorExplanation}</span>
            )}
          </div>
        </div>

        {/* Warning Badge if any */}
        {warningMessage && (
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{warningMessage}</span>
          </div>
        )}
      </div>

      {/* Main Value and Capacity */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
          </span>
          <span className="text-xs text-slate-400 font-medium">{unit}</span>
        </div>

        {maxCapacity !== undefined && (
          <span className="text-[11px] text-slate-500 font-mono">
            / {maxCapacity} {unit}
          </span>
        )}
      </div>

      {/* Progress Bar (if capacity is defined) */}
      {percentage !== undefined && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full ${styles.bar} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Daily Flow Dynamics */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        {dailyNetChange !== undefined ? (
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Net:</span>
            <div className={`flex items-center font-mono font-medium ${
              dailyNetChange > 0 ? 'text-emerald-400' : dailyNetChange < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {dailyNetChange > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                  +{dailyNetChange.toFixed(1)}
                </>
              ) : dailyNetChange < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                  {dailyNetChange.toFixed(1)}
                </>
              ) : (
                <>
                  <Minus className="w-3 h-3 mr-0.5 inline" />
                  0.0
                </>
              )}
              <span className="text-[10px] ml-0.5 text-slate-500">/day</span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 font-mono text-[11px]">{subtext || 'Monitored'}</span>
        )}

        {/* Breakdown of production vs consumption */}
        {dailyProduced !== undefined && dailyConsumed !== undefined && (
          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <span className="text-emerald-400/90">+{dailyProduced.toFixed(1)}</span>
            <span>/</span>
            <span className="text-rose-400/90">-{dailyConsumed.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
