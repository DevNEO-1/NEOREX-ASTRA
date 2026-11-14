import React, { useState, useEffect } from 'react';
import { useSimulator } from './hooks/useSimulator';
import { checkResourceWarnings } from './simulator/resources';
import { Header } from './components/Header';
import { ResourceCard } from './components/ResourceCard';
import { CrewPanel } from './components/CrewPanel';
import { OutpostScene3D } from './components/OutpostScene3D';
import { ConstructionPanel } from './components/ConstructionPanel';
import { LoadSheddingPanel } from './components/LoadSheddingPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { InstructorPanel } from './components/InstructorPanel';
import { EventModal } from './components/EventModal';
import { CampaignSelector } from './components/CampaignSelector';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { MissionReviewModal } from './components/MissionReviewModal';
import { ScientificResearchModal } from './components/ScientificResearchModal';
import { CinematicIntro } from './components/CinematicIntro';
import { BuildingInspectorModal, InspectableBuildingType } from './components/BuildingInspectorModal';
import { AstronautInspectorModal } from './components/AstronautInspectorModal';
import { AstronautCompanion } from './components/AstronautCompanion';
import { ScienceExperimentsModal } from './components/ScienceExperimentsModal';
import { BadgesModal } from './components/BadgesModal';
import { LearningProfileModal } from './components/LearningProfileModal';
import { LearningProfileTier, INITIAL_BADGES, ExplorerBadge } from './simulator/learningProfiles';
import { audioSystem } from './utils/audioSystem';
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

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return sessionStorage.getItem('astra_intro_seen') !== 'true';
  });
  const [selectedBuilding, setSelectedBuilding] = useState<InspectableBuildingType | null>(null);
  const [selectedAstronautId, setSelectedAstronautId] = useState<string | null>(null);

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [hasDismissedEndOverlay, setHasDismissedEndOverlay] = useState(false);
  const [isExperimentsModalOpen, setIsExperimentsModalOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [learningProfile, setLearningProfile] = useState<LearningProfileTier>(() => {
    return (localStorage.getItem('astra_learning_profile') as LearningProfileTier) || 'junior';
  });

  const [badges, setBadges] = useState<ExplorerBadge[]>(() => {
    try {
      const saved = localStorage.getItem('astra_badges');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_BADGES;
  });

  const handleSelectProfile = (profile: LearningProfileTier) => {
    setLearningProfile(profile);
    localStorage.setItem('astra_learning_profile', profile);
  };

  // Check current resource warnings
  const warnings = checkResourceWarnings(gameState);

  // Sound effect triggers on mission events
  useEffect(() => {
    if (gameState.activeEvents.length > 0) {
      audioSystem.playAlarm();
    }
  }, [gameState.activeEvents.length]);

  const handleStartNewMission = (campaign: any, difficulty?: any) => {
    setHasDismissedEndOverlay(false);
    setIsDebriefModalOpen(false);
    setIsReviewModalOpen(false);
    startNewMission(campaign, difficulty);
  };

  const handleAdvanceDay = () => {
    audioSystem.playTelemetryClick();
    advanceDay();

    // Check badge unlocks
    setBadges(prev => {
      const updated = prev.map(badge => {
        if (badge.id === 'badge-first-step' && gameState.day >= 1) return { ...badge, unlocked: true };
        if (badge.id === 'badge-sun-catcher' && gameState.infrastructure.solarArrays > 1) return { ...badge, unlocked: true };
        if (badge.id === 'badge-green-thumb' && gameState.infrastructure.greenhouses > 0) return { ...badge, unlocked: true };
        if (badge.id === 'badge-water-hero' && gameState.waterRecyclingEfficiency >= 0.85) return { ...badge, unlocked: true };
        if (badge.id === 'badge-storm-shield' && gameState.shieldingPercentage >= 0.50) return { ...badge, unlocked: true };
        if (badge.id === 'badge-night-survivor' && gameState.day >= 28 && gameState.resources.batteryKwh > 0) return { ...badge, unlocked: true };
        if (badge.id === 'badge-mars-pioneer' && gameState.campaign === 'mars') return { ...badge, unlocked: true };
        return badge;
      });
      try {
        localStorage.setItem('astra_badges', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handlePurchaseUpgrade = (upgradeId: any) => {
    purchaseUpgrade(upgradeId);
    audioSystem.playObjectiveSuccess();
    return true;
  };

  const handleToggleControl = (subsystemId: 'electrolysis' | 'greenhouses' | 'emergencyRationing') => {
    audioSystem.playTelemetryClick();
    toggleControl(subsystemId);
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem('astra_intro_seen', 'true');
    setShowIntro(false);
    audioSystem.initAudio();
  };

  // Get latest daily balance metrics (if any)
  const latestDaily = gameState.dailyHistory[gameState.dailyHistory.length - 1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Cinematic Opening Overlay */}
      {showIntro && (
        <CinematicIntro onComplete={handleIntroComplete} />
      )}

      {/* 1. Top Mission Control Header */}
      <Header
        gameState={gameState}
        isPlaying={isPlaying}
        learningProfile={learningProfile}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onAdvanceDay={handleAdvanceDay}
        onReset={() => handleStartNewMission(gameState.campaign, gameState.difficulty)}
        onOpenCampaignModal={() => setIsCampaignModalOpen(true)}
        onOpenResearchModal={() => setIsResearchModalOpen(true)}
        onOpenDebriefModal={() => {
          setHasDismissedEndOverlay(false);
          setIsDebriefModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenExperimentsModal={() => setIsExperimentsModalOpen(true)}
        onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
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
            juniorLabel={learningProfile === 'junior' ? '🔋 Space Battery' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'Powers our lights & air!' : undefined}
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
            juniorLabel={learningProfile === 'junior' ? '💨 Breathing Air' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'Keeps astronauts breathing!' : undefined}
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
            juniorLabel={learningProfile === 'junior' ? '💧 Clean Water' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'To drink & grow crops!' : undefined}
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
            juniorLabel={learningProfile === 'junior' ? '🍎 Space Food' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'Feeds the hungry crew!' : undefined}
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
            juniorLabel={learningProfile === 'junior' ? '🛡️ Cosmic Shield' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'Blocks dangerous space rays!' : undefined}
            value={Math.round(gameState.shieldingPercentage * 100)}
            unit="%"
            icon={Shield}
            colorScheme="purple"
            subtext={latestDaily ? `${latestDaily.radiationDoseMsv.toFixed(2)} mSv absorbed` : 'GCR baseline'}
          />

          {/* Construction Credits */}
          <ResourceCard
            title="Mission Credits"
            juniorLabel={learningProfile === 'junior' ? '🪙 Build Points' : undefined}
            juniorExplanation={learningProfile === 'junior' ? 'Points to build cool machines!' : undefined}
            value={gameState.resources.credits}
            unit="Credits"
            icon={Coins}
            colorScheme="gold"
            subtext="Procurement budget"
          />

        </section>

        {/* 3D Immersive Outpost Visualizer Layer */}
        <section className="relative">
          <OutpostScene3D 
            gameState={gameState} 
            onSelectBuilding={(type) => {
              audioSystem.playTelemetryClick();
              setSelectedBuilding(type);
            }}
            onSelectAstronaut={(id) => {
              audioSystem.playTelemetryClick();
              setSelectedAstronautId(id);
            }}
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
            onPurchaseUpgrade={handlePurchaseUpgrade}
          />

          <LoadSheddingPanel
            gameState={gameState}
            onToggleControl={handleToggleControl}
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
      {/* 3D Building Inspector Holographic Modal */}
      <BuildingInspectorModal
        buildingType={selectedBuilding}
        gameState={gameState}
        onClose={() => setSelectedBuilding(null)}
        onPurchaseUpgrade={handlePurchaseUpgrade}
        onToggleControl={handleToggleControl}
      />

      {/* 3D Astronaut Inspector Holographic Modal */}
      <AstronautInspectorModal
        astronautId={selectedAstronautId}
        gameState={gameState}
        onClose={() => setSelectedAstronautId(null)}
      />

      {/* Interactive Science Experiments Laboratory Modal */}
      <ScienceExperimentsModal
        isOpen={isExperimentsModalOpen}
        onClose={() => setIsExperimentsModalOpen(false)}
        gameState={gameState}
        learningProfile={learningProfile}
      />

      {/* Explorer Badges & Achievement System Modal */}
      <BadgesModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        badges={badges}
      />

      {/* Learning Profile Selector Modal */}
      <LearningProfileModal
        isOpen={isProfileModalOpen}
        currentProfile={learningProfile}
        onSelectProfile={handleSelectProfile}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Animated Astronaut Learning Companion (Dr. Astra) */}
      <AstronautCompanion
        gameState={gameState}
        learningProfile={learningProfile}
        onOpenExperiments={() => setIsExperimentsModalOpen(true)}
        onOpenResearch={() => setIsResearchModalOpen(true)}
      />

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
        onSelectCampaign={handleStartNewMission}
      />

      {/* Mission Debrief Modal */}
      <MissionDebriefModal
        gameState={gameState}
        isOpen={(isDebriefModalOpen || gameState.isMissionOver) && !hasDismissedEndOverlay && !isReviewModalOpen}
        onClose={() => {
          setHasDismissedEndOverlay(true);
          setIsDebriefModalOpen(false);
        }}
        onRestart={() => handleStartNewMission(gameState.campaign, gameState.difficulty)}
        onLaunchMars={() => handleStartNewMission('mars', gameState.difficulty)}
        onOpenReviewData={() => {
          setIsDebriefModalOpen(false);
          setIsReviewModalOpen(true);
        }}
      />

      {/* Complete Mission Review & Analytics Modal */}
      <MissionReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setHasDismissedEndOverlay(true);
          setIsReviewModalOpen(false);
        }}
        onBackToDebrief={() => {
          setIsReviewModalOpen(false);
          setHasDismissedEndOverlay(false);
          setIsDebriefModalOpen(true);
        }}
        onRestart={() => {
          handleStartNewMission(gameState.campaign, gameState.difficulty);
        }}
        onLaunchMars={() => {
          handleStartNewMission('mars', gameState.difficulty);
        }}
        gameState={gameState}
        learningProfile={learningProfile}
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
