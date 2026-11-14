import React, { useState } from 'react';
import { GameState } from '../simulator/types';
import { LearningProfileTier, LEARNING_PROFILES } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { 
  X, 
  RotateCcw, 
  Rocket, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Users, 
  Droplets, 
  Zap, 
  Wind, 
  Shield, 
  Clock, 
  AlertTriangle, 
  Lightbulb, 
  Lock, 
  ArrowLeft
} from 'lucide-react';

interface MissionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToDebrief: () => void;
  onRestart: () => void;
  onLaunchMars: () => void;
  gameState: GameState;
  learningProfile: LearningProfileTier;
}

export const MissionReviewModal: React.FC<MissionReviewModalProps> = ({
  isOpen,
  onClose,
  onBackToDebrief,
  onRestart,
  onLaunchMars,
  gameState,
  learningProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'crew' | 'timeline' | 'learning'>('overview');

  if (!isOpen) return null;

  const { scoreBreakdown, campaign, dailyHistory, crew, objectives, instructorLogs, eventHistory } = gameState;
  const profile = LEARNING_PROFILES[learningProfile];

  // Combine instructorLogs and resolved eventHistory into a unified, non-duplicated timeline
  interface UnifiedTimelineEntry {
    id: string;
    day: number;
    title: string;
    message: string;
    category: 'warning' | 'kudos' | 'critical' | 'event' | 'info';
    detail?: string;
  }

  const unifiedTimeline: UnifiedTimelineEntry[] = [];

  // Add instructor logs
  instructorLogs.forEach((log, idx) => {
    unifiedTimeline.push({
      id: `log-${log.day}-${idx}`,
      day: log.day,
      title: log.title,
      message: log.message,
      category: log.category === 'warning' ? 'warning' : log.category === 'kudos' ? 'kudos' : 'info',
      detail: log.recommendation ? `Directive: ${log.recommendation}` : undefined,
    });
  });

  // Add events from eventHistory that aren't already represented identically
  eventHistory?.forEach(evt => {
    const isDuplicate = unifiedTimeline.some(
      entry => entry.day === evt.day && entry.title.toLowerCase().includes(evt.title.toLowerCase().slice(0, 15))
    );
    if (!isDuplicate) {
      const chosenChoice = evt.choices.find(c => c.id === evt.chosenOptionId);
      unifiedTimeline.push({
        id: `evt-${evt.id}`,
        day: evt.day,
        title: evt.title,
        message: evt.description,
        category: evt.severity === 'critical' ? 'critical' : 'event',
        detail: chosenChoice ? `Commander Decision: ${chosenChoice.label} — ${chosenChoice.effectDescription}` : evt.scientificExplanation,
      });
    }
  });

  // Sort timeline descending by day (latest first)
  unifiedTimeline.sort((a, b) => b.day - a.day);

  // Calculate high-level statistics from dailyHistory
  const totalDaysSimulated = dailyHistory.length;
  const avgCrewHealth = crew.length > 0
    ? Math.round(crew.reduce((sum, c) => sum + c.health, 0) / crew.length)
    : 0;

  const totalO2Consumed = dailyHistory.reduce((sum, d) => sum + d.oxygenConsumedKg, 0);
  const totalO2Generated = dailyHistory.reduce((sum, d) => sum + d.oxygenGeneratedKg, 0);
  const totalWaterUsed = dailyHistory.reduce((sum, d) => sum + d.waterUsedLitres + d.waterConsumedO2GenLitres + d.waterConsumedGreenhouseLitres, 0);
  const totalWaterRecovered = dailyHistory.reduce((sum, d) => sum + d.waterRecoveredLitres, 0);
  const totalPowerGenerated = dailyHistory.reduce((sum, d) => sum + d.powerGeneratedKwh, 0);
  const totalPowerConsumed = dailyHistory.reduce((sum, d) => sum + d.powerConsumedKwh, 0);
  const totalRadiationDose = dailyHistory.reduce((sum, d) => sum + d.radiationDoseMsv, 0);

  // Unpack Mars unlock prerequisites
  const isMarsEligible = scoreBreakdown?.isMarsEligible ?? false;
  const survived30Days = gameState.day >= gameState.totalDays && crew.filter(c => c.health > 0).length > 0;
  const healthRequirementMet = avgCrewHealth >= 70;
  const completedObjectivesCount = objectives.filter(o => o.achieved).length;
  const objectivesRequirementMet = completedObjectivesCount >= 3;
  const scoreRequirementMet = (scoreBreakdown?.totalScore ?? 0) >= 70;

  // Grade color helper
  const getGradeBadge = (grade?: string) => {
    switch (grade) {
      case 'S': return 'text-amber-400 border-amber-400 bg-amber-400/10 shadow-glow-amber';
      case 'A': return 'text-emerald-400 border-emerald-400 bg-emerald-400/10 shadow-glow-emerald';
      case 'B': return 'text-cyan-400 border-cyan-400 bg-cyan-400/10 shadow-glow-cyan';
      case 'C': return 'text-blue-400 border-blue-400 bg-blue-400/10';
      default: return 'text-rose-400 border-rose-400 bg-rose-400/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onBackToDebrief();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Debrief Overview"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Back to Summary</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-wide">
                  Complete Mission Analytics & Technical Review
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${profile.colorScheme.badgeBg}`}>
                  {profile.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {campaign === 'moon' ? 'Artemis Base Alpha (Moon)' : 'Ares Prime (Mars)'} • {totalDaysSimulated} Days Logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onClose();
              }}
              title="Return to Outpost"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
            >
              Return to Outpost
            </button>
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
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 overflow-x-auto gap-1">
          {[
            { id: 'overview', label: 'Mission Performance', icon: BarChart3 },
            { id: 'telemetry', label: 'Resource Analysis', icon: Zap },
            { id: 'crew', label: 'Astronaut Health', icon: Users },
            { id: 'timeline', label: 'Mission Timeline', icon: Clock },
            { id: 'learning', label: 'Educational Feedback', icon: Lightbulb },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  audioSystem.playTelemetryClick();
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* TAB 1: OVERVIEW & PERFORMANCE */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Scorecard Hero */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Final Score</span>
                  <span className="text-3xl font-black text-white font-mono">{scoreBreakdown?.totalScore ?? 0}</span>
                  <span className="text-[10px] text-slate-500 block">out of 100</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Grade</span>
                  <div className={`w-11 h-11 mx-auto rounded-xl border font-black text-xl flex items-center justify-center ${getGradeBadge(scoreBreakdown?.grade)}`}>
                    {scoreBreakdown?.grade || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Crew Survival</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{scoreBreakdown?.crewSurvivalScore ?? 0}</span>
                  <span className="text-[10px] text-slate-500 block">/ 40 pts</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Logistics</span>
                  <span className="text-xl font-bold text-cyan-400 font-mono">{scoreBreakdown?.resourceEfficiencyScore ?? 0}</span>
                  <span className="text-[10px] text-slate-500 block">/ 30 pts</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Engineering</span>
                  <span className="text-xl font-bold text-amber-400 font-mono">{scoreBreakdown?.engineeringObjectivesScore ?? 0}</span>
                  <span className="text-[10px] text-slate-500 block">/ 30 pts</span>
                </div>
              </div>

              {/* Mars Unlock Requirement Comprehensive Breakdown */}
              <div className={`p-4 rounded-xl border ${
                isMarsEligible 
                  ? 'bg-orange-950/30 border-orange-500/50 shadow-glow-amber' 
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Rocket className={`w-5 h-5 ${isMarsEligible ? 'text-orange-400' : 'text-slate-500'}`} />
                    <h4 className="font-extrabold text-sm text-white">
                      Mars Campaign Authorization Status: {isMarsEligible ? 'QUALIFIED' : 'LOCKED'}
                    </h4>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    isMarsEligible 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {isMarsEligible ? 'Authorization Granted' : 'Pending Directives'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                  {/* Criteria 1: 30 Days */}
                  <div className={`p-3 rounded-lg border ${
                    survived30Days ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span>1. Mission Duration:</span>
                      {survived30Days ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <span className="font-bold">{gameState.day} / {gameState.totalDays} Days</span>
                    <span className="text-[10px] block opacity-80">{survived30Days ? 'Requirement Met' : 'Must complete full 30 days'}</span>
                  </div>

                  {/* Criteria 2: Crew Health >= 70% */}
                  <div className={`p-3 rounded-lg border ${
                    healthRequirementMet ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300' : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span>2. Avg Crew Health:</span>
                      {healthRequirementMet ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    <span className="font-bold">{avgCrewHealth}% (Need ≥ 70%)</span>
                    <span className="text-[10px] block opacity-80">
                      {healthRequirementMet ? 'Requirement Met' : `Deficit: ${70 - avgCrewHealth}% health below standard`}
                    </span>
                  </div>

                  {/* Criteria 3: Engineering Objectives >= 3 */}
                  <div className={`p-3 rounded-lg border ${
                    objectivesRequirementMet ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span>3. Directives Done:</span>
                      {objectivesRequirementMet ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <span className="font-bold">{completedObjectivesCount} / 5 (Need ≥ 3)</span>
                    <span className="text-[10px] block opacity-80">{objectivesRequirementMet ? 'Requirement Met' : 'Complete at least 3 objectives'}</span>
                  </div>

                  {/* Criteria 4: Total Score >= 70 */}
                  <div className={`p-3 rounded-lg border ${
                    scoreRequirementMet ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span>4. Overall Score:</span>
                      {scoreRequirementMet ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <span className="font-bold">{scoreBreakdown?.totalScore ?? 0} / 100 (Need ≥ 70)</span>
                    <span className="text-[10px] block opacity-80">{scoreRequirementMet ? 'Requirement Met' : 'Improve logistics & survival'}</span>
                  </div>
                </div>

                {!isMarsEligible && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Commander's Guide to Unlocking Mars:</span>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        NASA requires high physical condition for deep-space missions. To keep average crew health above 70%, ensure the water recycler and greenhouse are upgraded early, maintain hull shielding to reduce cosmic radiation, and avoid running out of oxygen or water.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Engineering Directives Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Primary Engineering Directives Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {objectives.map(obj => (
                    <div
                      key={obj.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        obj.achieved
                          ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      {obj.achieved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-xs text-white">{obj.title}</div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{obj.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED RESOURCE ANALYSIS */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Oxygen */}
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 font-mono space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                    <Wind className="w-4 h-4" />
                    <span>Oxygen (O₂) Balances</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Consumed:</span>
                      <span className="text-slate-200">{totalO2Consumed.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Electrolyzed:</span>
                      <span className="text-cyan-300">+{totalO2Generated.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                      <span>Final Tank Level:</span>
                      <span className="text-white font-bold">{gameState.resources.oxygenKg.toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>

                {/* Water */}
                <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 font-mono space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <Droplets className="w-4 h-4" />
                    <span>Hydrology (H₂O) Cycle</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Consumed:</span>
                      <span className="text-slate-200">{totalWaterUsed.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Wastewater Recycled:</span>
                      <span className="text-blue-300">+{totalWaterRecovered.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                      <span>Current Recovery:</span>
                      <span className="text-white font-bold">{(gameState.waterRecyclingEfficiency * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Power Grid */}
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 font-mono space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Power Grid Generation</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Solar Generated:</span>
                      <span className="text-amber-300">+{totalPowerGenerated.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Consumed:</span>
                      <span className="text-slate-200">{totalPowerConsumed.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                      <span>Battery Capacity:</span>
                      <span className="text-white font-bold">{gameState.resources.batteryCapacityKwh} kWh</span>
                    </div>
                  </div>
                </div>

                {/* Radiation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 font-mono space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                    <Shield className="w-4 h-4" />
                    <span>Radiation & Shielding</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Absorbed Dose:</span>
                      <span className="text-purple-300">{totalRadiationDose.toFixed(2)} mSv</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Hull Shielding:</span>
                      <span className="text-slate-200">{(gameState.shieldingPercentage * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                      <span>NASA Career Limit:</span>
                      <span className="text-white font-bold">600 mSv max</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Historical Telemetry Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Historical Daily Log Summary ({dailyHistory.length} Days Recorded)
                </span>
                <div className="rounded-xl border border-slate-800 overflow-x-auto max-h-64">
                  <table className="w-full text-[11px] font-mono text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5">Day</th>
                        <th className="p-2.5">Insolation</th>
                        <th className="p-2.5">Power (Net)</th>
                        <th className="p-2.5">Battery</th>
                        <th className="p-2.5">O₂ End</th>
                        <th className="p-2.5">H₂O End</th>
                        <th className="p-2.5">Food End</th>
                        <th className="p-2.5">Dose (mSv)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {dailyHistory.map(day => (
                        <tr key={day.day} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-bold text-cyan-400">Day {day.day}</td>
                          <td className="p-2.5">{day.isDaylight ? '☀️ Sunlit' : '🌙 Night'}</td>
                          <td className={`p-2.5 ${day.netPowerKwh >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {day.netPowerKwh > 0 ? `+${day.netPowerKwh.toFixed(1)}` : day.netPowerKwh.toFixed(1)} kWh
                          </td>
                          <td className="p-2.5">{Math.round(day.batteryEndKwh)} kWh</td>
                          <td className="p-2.5">{day.oxygenEndKg.toFixed(1)} kg</td>
                          <td className="p-2.5">{Math.round(day.waterEndLitres)} L</td>
                          <td className="p-2.5">{Math.round(day.foodEndKg)} kg</td>
                          <td className="p-2.5 text-purple-300">{day.radiationDoseMsv.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CREW HEALTH AUDIT */}
          {activeTab === 'crew' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Individual Astronaut Vitals & Career Dossier
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  Average Squad Condition: {avgCrewHealth}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {crew.map(astronaut => (
                  <div
                    key={astronaut.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                      {astronaut.avatar}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-white">{astronaut.name}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">{astronaut.role}</div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                          astronaut.status === 'nominal' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          astronaut.status === 'stressed' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}>
                          {astronaut.status}
                        </span>
                      </div>

                      {/* Health Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Vital Health:</span>
                          <span className={`font-bold ${astronaut.health >= 70 ? 'text-emerald-400' : astronaut.health >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {astronaut.health}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${astronaut.health >= 70 ? 'bg-emerald-500' : astronaut.health >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${astronaut.health}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                        Specialty: <span className="text-slate-300">{astronaut.specialty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MISSION TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-3 animate-fadeIn">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Recorded Mission Events & Instructor Logs ({unifiedTimeline.length} Entries)
              </span>

              <div className="space-y-2">
                {unifiedTimeline.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition ${
                      item.category === 'critical'
                        ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                        : item.category === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                        : item.category === 'kudos'
                        ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                        : item.category === 'event'
                        ? 'bg-cyan-950/30 border-cyan-800/80 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                      <span className="font-bold text-cyan-400">MISSION DAY {item.day}</span>
                      <span className="uppercase text-slate-400 font-bold">{item.category}</span>
                    </div>
                    <div className="font-bold text-white text-xs mb-0.5">{item.title}</div>
                    <p className="leading-relaxed font-sans">{item.message}</p>
                    {item.detail && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-cyan-300 font-sans">
                        💡 {item.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EDUCATIONAL LEARNING FEEDBACK */}
          {activeTab === 'learning' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-4 rounded-xl border ${profile.colorScheme.badgeBg} space-y-2`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👩‍🚀</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      Astronaut Mentor Debriefing ({profile.label})
                    </h4>
                    <span className="text-[10px] text-cyan-300 font-mono">Personalized Post-Flight Analysis</span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {learningProfile === 'junior' && (
                    "You did an amazing job flying our space outpost! Even when it was freezing cold and dark during the lunar night, you worked hard to protect our astronauts. To unlock Mars next time, remember to keep everyone's health high with plenty of clean water, fresh food salads, and thick moon dirt shields!"
                  )}
                  {learningProfile === 'cadet' && (
                    `Great operational discipline! You completed ${completedObjectivesCount} primary engineering directives. Your average crew health finished at ${avgCrewHealth}%. Keep in mind that deep space to Mars takes 9 months of transit; maintaining closed-loop water distillation and early greenhouse agriculture will ensure your crew arrives fully prepared.`
                  )}
                  {learningProfile === 'commander' && (
                    `Post-flight engineering review: The simulation demonstrated the non-linear coupling between solar insolation and life support stoichiometry. Total radiation exposure was capped at ${totalRadiationDose.toFixed(2)} mSv. Review the NASA ECLSS citations in the header to optimize future mission power load-shedding configurations.`
                  )}
                </p>
              </div>

              {/* Technical feedback points */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Key Engineering Lessons & Opportunities
                </span>

                {scoreBreakdown?.summaryFeedback.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onBackToDebrief();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Debrief</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onRestart();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay Mission</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isMarsEligible ? (
              <button
                onClick={() => {
                  audioSystem.playUpgradeChime();
                  onLaunchMars();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-glow-amber"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch Mars Mission →</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  audioSystem.playTelemetryClick();
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan"
              >
                <span>Return to Outpost</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
