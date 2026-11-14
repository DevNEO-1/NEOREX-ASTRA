import React from 'react';
import { CrewMember } from '../simulator/types';
import { Users, HeartPulse, Activity } from 'lucide-react';

interface CrewPanelProps {
  crew: CrewMember[];
}

export const CrewPanel: React.FC<CrewPanelProps> = ({ crew }) => {
  const activeCount = crew.filter(c => c.health > 0).length;
  const avgHealth = crew.length > 0
    ? Math.round(crew.reduce((acc, c) => acc + c.health, 0) / crew.length)
    : 0;

  const getStatusBadge = (status: CrewMember['status'], health: number) => {
    if (health <= 0) {
      return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">Incapacitated</span>;
    }
    switch (status) {
      case 'nominal':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">Nominal</span>;
      case 'stressed':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">Stressed</span>;
      case 'injured':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 animate-pulse">Injured</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Astronaut Crew Roster</h3>
            <span className="text-[11px] text-slate-400">Artemis Surface Team • 4 Members</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-300 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeCount}/4 Active</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            <span className={avgHealth < 70 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{avgHealth}% Avg</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {crew.map(member => {
          const isAlive = member.health > 0;
          return (
            <div
              key={member.id}
              className={`p-3 rounded-lg border transition ${
                isAlive
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-900/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label="avatar">{member.avatar}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[110px]">{member.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{member.role}</p>
                  </div>
                </div>
                {getStatusBadge(member.status, member.health)}
              </div>

              {/* Health progress bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-400">Vitals</span>
                  <span className={member.health < 40 ? 'text-rose-400 font-bold' : member.health < 70 ? 'text-amber-400' : 'text-emerald-400'}>
                    {member.health}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      member.health > 70
                        ? 'bg-emerald-500'
                        : member.health > 30
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${member.health}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
