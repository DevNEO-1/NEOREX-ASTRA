import React, { useState } from 'react';
import { useSimulator } from './hooks/useSimulator';
import { checkResourceWarnings } from './simulator/resources';
import { Header } from './components/Header';
import { ResourceCard } from './components/ResourceCard';
import { CrewPanel } from './components/CrewPanel';
import { ConstructionPanel } from './components/ConstructionPanel';
import { LoadSheddingPanel } from './components/LoadSheddingPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { InstructorPanel } from './components/InstructorPanel';
import { EventModal } from './components/EventModal';
import { CampaignSelector } from './components/CampaignSelector';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { ScientificResearchModal } from './components/ScientificResearchModal';
import { 
  Zap, 
  Wind, 
  Droplets, 
  Sprout, 
  Shield, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  Target
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    gameState,
    isPlaying,
    setIsPlaying,
    advanceDay,
    purchaseUpgrade,
    toggleControl,
    chooseEventOption,
    startNewMission,
  } = useSimulator();

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);

  // Check current resource warnings
  const warnings = checkResourceWarnings(gameState);

  // Get latest daily balance metrics (if any)
  const latestDaily = gameState.dailyHistory[gameState.dailyHistory.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Top Mission Control Header */}
      <Header
        gameState={gameState}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onAdvanceDay={advanceDay}
        onReset={() => startNewMission(gameState.campaign, gameState.difficulty)}
        onOpenCampaignModal={() => setIsCampaignModalOpen(true)}
        onOpenResearchModal={() => setIsResearchModalOpen(true)}
        onOpenDebriefModal={() => setIsDebriefModalOpen(true)}
      />

      {/* Main Mission Control Console */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">

        {/* Urgent Warnings Ticker (if any) */}
        {warnings.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2 overflow-hidden">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-[11px] text-rose-400 shrink-0">ECLSS Alert:</span>
              <span className="truncate">{warnings.warnings[0]}</span>
            </div>
            {warnings.warnings.length > 1 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 shrink-0">
                +{warnings.warnings.length - 1} more
              </span>
            )}
          </div>
        )}

        {/* 2. Primary Resource Telemetry Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Battery / Power */}
          <ResourceCard
            title="Battery Reserve"
            value={gameState.resources.batteryKwh}
            maxCapacity={gameState.resources.batteryCapacityKwh}
            unit="kWh"
            dailyNetChange={latestDaily ? latestDaily.netPowerKwh : undefined}
            dailyProduced={latestDaily ? latestDaily.powerGeneratedKwh : undefined}
            dailyConsumed={latestDaily ? latestDaily.powerConsumedKwh : undefined}
            icon={Zap}
            colorScheme="amber"
            warningMessage={gameState.resources.batteryKwh <= 100 ? 'Low Battery' : undefined}
          />

          {/* Oxygen */}
          <ResourceCard
            title="Habitat O₂"
            value={gameState.resources.oxygenKg}
            unit="kg"
            dailyNetChange={latestDaily ? latestDaily.netOxygenKg : undefined}
            dailyProduced={latestDaily ? latestDaily.oxygenGeneratedKg : undefined}
            dailyConsumed={latestDaily ? latestDaily.oxygenConsumedKg : undefined}
            icon={Wind}
            colorScheme="cyan"
            warningMessage={gameState.resources.oxygenKg <= 20 ? 'Critical O₂' : undefined}
          />

          {/* Water */}
          <ResourceCard
            title="Hydrology (H₂O)"
            value={gameState.resources.waterLitres}
            unit="L"
            dailyNetChange={latestDaily ? latestDaily.netWaterLitres : undefined}
            dailyProduced={latestDaily ? latestDaily.waterRecoveredLitres : undefined}
            dailyConsumed={latestDaily ? latestDaily.waterUsedLitres + latestDaily.waterConsumedO2GenLitres + latestDaily.waterConsumedGreenhouseLitres : undefined}
            icon={Droplets}
            colorScheme="blue"
            warningMessage={gameState.resources.waterLitres <= 50 ? 'Low Water' : undefined}
          />

          {/* Food */}
          <ResourceCard
            title="Food Rations"
            value={gameState.resources.foodKg}
            unit="kg"
            dailyNetChange={latestDaily ? latestDaily.netFoodKg : undefined}
            dailyProduced={latestDaily ? latestDaily.foodProducedKg : undefined}
            dailyConsumed={latestDaily ? latestDaily.foodConsumedKg : undefined}
            icon={Sprout}
            colorScheme="emerald"
            warningMessage={gameState.resources.foodKg <= 20 ? 'Low Food' : undefined}
          />

          {/* Radiation Shielding */}
          <ResourceCard
            title="Hull Shielding"
            value={Math.round(gameState.shieldingPercentage * 100)}
            unit="%"
            icon={Shield}
            colorScheme="purple"
            subtext={latestDaily ? `${latestDaily.radiationDoseMsv.toFixed(2)} mSv absorbed` : 'GCR baseline'}
          />

          {/* Construction Credits */}
          <ResourceCard
            title="Mission Credits"
            value={gameState.resources.credits}
            unit="Credits"
            icon={Coins}
            colorScheme="gold"
            subtext="Procurement budget"
          />

        </section>

        {/* 3. Engineering Directives Progress Bar */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Engineering Directives:</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {gameState.objectives.filter(o => o.achieved).length} / {gameState.objectives.length} Complete
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {gameState.objectives.map(obj => (
              <div
                key={obj.id}
                title={obj.description}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                  obj.achieved
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 shadow-glow-emerald'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}
              >
                {obj.achieved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                )}
                <span>{obj.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Astronaut Crew Vitals */}
        <CrewPanel crew={gameState.crew} />

        {/* 5. Construction & Load-Shedding Dual Module */}
        <div className="space-y-4">
          <ConstructionPanel
            gameState={gameState}
            onPurchaseUpgrade={purchaseUpgrade}
          />

          <LoadSheddingPanel
            gameState={gameState}
            onToggleControl={toggleControl}
          />
        </div>

        {/* 6. Telemetry Trends Charts & Mission Instructor AI Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TelemetryCharts history={gameState.dailyHistory} />
          
          <InstructorPanel
            logs={gameState.instructorLogs}
            onOpenResearchModal={() => setIsResearchModalOpen(true)}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-900 bg-slate-950/90 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-400 tracking-wider">NEOREX ASTRA</span>
            <span>•</span>
            <span>NASA Space Apps Challenge 2026 Junior Astronaut Mission Trainer</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Team NEOREX: Adithyan • CTO • Sreya • Evan • Nivisha</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* Emergent Event Modal */}
      <EventModal
        events={gameState.activeEvents}
        onChooseOption={chooseEventOption}
      />

      {/* Campaign Selector Modal */}
      <CampaignSelector
        gameState={gameState}
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSelectCampaign={startNewMission}
      />

      {/* Mission Debrief Modal */}
      <MissionDebriefModal
        gameState={gameState}
        isOpen={isDebriefModalOpen || gameState.isMissionOver}
        onClose={() => setIsDebriefModalOpen(false)}
        onRestart={() => startNewMission(gameState.campaign, gameState.difficulty)}
        onLaunchMars={() => startNewMission('mars', gameState.difficulty)}
      />

      {/* NASA Scientific Research & Citations Modal */}
      <ScientificResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />

    </div>
  );
};
export default App;
