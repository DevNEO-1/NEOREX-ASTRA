import React, { useState } from 'react';
import { DailyResourceBalance } from '../simulator/types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { LineChart as ChartIcon, Zap, Droplets, HeartPulse } from 'lucide-react';

interface TelemetryChartsProps {
  history: DailyResourceBalance[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  const [activeTab, setActiveTab] = useState<'power' | 'lifeSupport' | 'health'>('power');

  if (history.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
        Advance to Day 2 to visualize telemetry trends.
      </div>
    );
  }

  const formattedData = history.map(item => ({
    day: `D${item.day}`,
    dayNum: item.day,
    generation: item.powerGeneratedKwh,
    consumption: item.powerConsumedKwh,
    battery: item.batteryEndKwh,
    water: item.waterEndLitres,
    oxygen: item.oxygenEndKg,
    food: item.foodEndKg,
    health: item.averageCrewHealth,
    radiation: item.radiationDoseMsv,
  }));

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Mission Telemetry & Historical Trends</h3>
            <span className="text-[11px] text-slate-400">Deterministic sensor logs across expedition days</span>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('power')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              activeTab === 'power'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power & Battery</span>
          </button>

          <button
            onClick={() => setActiveTab('lifeSupport')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              activeTab === 'lifeSupport'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>O₂ & Water Mass</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              activeTab === 'health'
                ? 'bg-rose-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Crew Health & Vitals</span>
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'power' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              
              <Line type="monotone" dataKey="battery" stroke="#f59e0b" name="Battery (kWh)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="generation" stroke="#10b981" name="Solar Gen (kWh)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="consumption" stroke="#ef4444" name="Load Demand (kWh)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          ) : activeTab === 'lifeSupport' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              <Line type="monotone" dataKey="water" stroke="#3b82f6" name="Water (L)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="oxygen" stroke="#06b6d4" name="Oxygen (kg)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="food" stroke="#10b981" name="Food (kg)" strokeWidth={1.5} dot={false} />
            </LineChart>
          ) : (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              <Line type="monotone" dataKey="health" stroke="#ec4899" name="Crew Health (%)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="radiation" stroke="#a855f7" name="Absorbed Radiation (mSv)" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
