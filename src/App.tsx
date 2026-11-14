import React, { useState, useEffect, useCallback } from 'react';
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
import { JuniorAdventureModal } from './components/JuniorAdventureModal';
import { LearningProfileTier, INITIAL_BADGES, ExplorerBadge } from './simulator/learningProfiles';
import { audioSystem } from './utils/audioSystem';

// Evan's High-Fidelity Frontend Visual Components
import { SolarSystemHero } from './components/SolarSystemHero';
import { CadetProgression } from './components/CadetProgression';
import { LunarBaseOutpost } from './components/LunarBaseOutpost';
import { StarfieldBackground } from './components/StarfieldBackground';
import { adaptGameStateToEvanView } from './utils/evanSimulatorAdapter';
import { cadetTracker } from './utils/cadetProgressionTracker';

import { 
  Zap, 
  Wind, 
  Droplets, 
  Sprout, 
  Shield, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  Target,
  Box,
  Orbit,
  Sliders,
  Award,
  Activity,
  Sparkles
} from 'lucide-react';

export type MissionNavTab = 'outpost-3d' | 'solar-system' | 'surface-ops' | 'cadet-academy' | 'telemetry';

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

  const [activeTab, setActiveTab] = useState<MissionNavTab>('outpost-3d');

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
  const [isJuniorAdventureOpen, setIsJuniorAdventureOpen] = useState(false);

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

  // Cadet XP & Directive Progression (Integrated from Evan's Gamification Model with anti-farming)
  const [cadetXp, setCadetXp] = useState<number>(() => cadetTracker.getXp());
  const [isEvaDrillActive, setIsEvaDrillActive] = useState<boolean>(false);

  const [completedDirectives, setCompletedDirectives] = useState<string[]>(() => {
    const list = cadetTracker.getCompletedDirectives();
    return list.length > 0 ? list : ['step_sim'];
  });

  const [xpToast, setXpToast] = useState<{ message: string; amount: number } | null>(null);

  const handleAddCadetXP = useCallback((amount: number, reason: string, customKey?: string) => {
    const claimKey = customKey || reason;
    const result = cadetTracker.claimReward(claimKey, amount, reason);
    if (result.awarded) {
      setCadetXp(result.newXp);
      setXpToast({ amount: result.amount, message: result.reason });
      audioSystem.playUpgradeChime();
      setTimeout(() => setXpToast(null), 3500);
    }
  }, []);

  const handleClaimDirective = useCallback((directiveId: string, xpReward: number = 40) => {
    const result = cadetTracker.claimDirective(directiveId, xpReward);
    if (result.awarded) {
      setCadetXp(result.newXp);
      setCompletedDirectives(cadetTracker.getCompletedDirectives());
      setXpToast({ amount: result.amount, message: `Directive Completed: ${directiveId.toUpperCase()}` });
      audioSystem.playUpgradeChime();
      setTimeout(() => setXpToast(null), 3500);
    }
  }, []);

  const handlePlayChime = useCallback((type: 'click' | 'beep' | 'success' | 'warning') => {
    if (type === 'click' || type === 'beep') audioSystem.playTelemetryClick();
    else if (type === 'success') audioSystem.playUpgradeChime();
    else if (type === 'warning') audioSystem.playAlarm();
  }, []);

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
    const result = cadetTracker.recordDayAdvancement(gameState.campaign, gameState.day + 1);
    if (result.awarded) {
      setCadetXp(result.newXp);
      setXpToast({ amount: result.amount, message: result.reason });
      audioSystem.playUpgradeChime();
      setTimeout(() => setXpToast(null), 3500);
    }

    // Check badge unlocks
    setBadges(prev => {
      const updated = prev.map(badge => {
        if (badge.id === 'badge-first-step' && gameState.day >= 1) return { ...badge, unlocked: true };
        if (badge.id === 'badge-sun-catcher' && gameState.infrastructure.solarArrays > 1) return { ...badge, unlocked: true };
        if (badge.id === 'badge-green-thumb' && gameState.infrastructure.greenhouses > 0) return { ...badge, unlocked: true };
        if (badge.id === 'badge-water-hero' && gameState.waterRecyclingEfficiency >= 0.85) return { ...badge, unlocked: true };
        if (badge.id === 'badge-storm-shield' && gameState.shieldingPercentage >= 0.6) return { ...badge, unlocked: true };
        if (badge.id === 'badge-lunar-veteran' && gameState.day >= 28) return { ...badge, unlocked: true };
        if (badge.id === 'badge-mars-colonist' && gameState.campaign === 'mars') return { ...badge, unlocked: true };
        return badge;
      });
      localStorage.setItem('astra_badges', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePurchaseUpgrade = (id: any) => {
    audioSystem.playUpgradeChime();
    purchaseUpgrade(id);
    handleAddCadetXP(50, 'Outpost Infrastructure Upgraded');
  };

  const handleToggleControl = (id: any, active?: boolean) => {
    audioSystem.playTelemetryClick();
    toggleControl(id, active);
  };

  const latestDaily = gameState.dailyHistory.length > 0
    ? gameState.dailyHistory[gameState.dailyHistory.length - 1]
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative">
      
      {/* 2D Canvas Starfield Ambiance */}
      <StarfieldBackground />

      {/* Cinematic Intro Modal for first-time recruits */}
      {showIntro && (
        <CinematicIntro
          onComplete={() => {
            setShowIntro(false);
            sessionStorage.setItem('astra_intro_seen', 'true');
          }}
        />
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
        onOpenJuniorAdventure={() => setIsJuniorAdventureOpen(true)}
      />

      {/* Main Mission Control Console */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-4 relative z-10">

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
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          
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

        {/* 3. Mission Control View Selector Navigation Bar */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex items-center justify-between gap-1 shadow-xl backdrop-blur-md overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                setActiveTab('outpost-3d');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'outpost-3d'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/50 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Outpost Camp</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                setActiveTab('solar-system');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'solar-system'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/50 shadow-glow-amber'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-amber-400" />
              <span>Solar System Astrodynamics</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                setActiveTab('surface-ops');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'surface-ops'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/50 shadow-glow-emerald'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Surface Drills & Physics</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                setActiveTab('cadet-academy');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'cadet-academy'
                  ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/50 shadow-glow-purple'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>Cadet Academy & Certificate</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                setActiveTab('telemetry');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'telemetry'
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-300 border border-sky-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Consoles & Grids</span>
            </button>
          </div>

          {/* Cadet XP Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-amber-500/30 rounded-xl shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-amber-300">{cadetXp} XP</span>
          </div>
        </section>

        {/* XP Reward Toast */}
        {xpToast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>+{xpToast.amount} XP: {xpToast.message}</span>
          </div>
        )}

        {/* TAB 1: 3D OUTPOST CAMP (PRIMARY VIEWPORT) */}
        {activeTab === 'outpost-3d' && (
          <div className="space-y-4">
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

            {/* Engineering Directives Progress Bar */}
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

            {/* Astronaut Crew Vitals */}
            <CrewPanel crew={gameState.crew} />

            {/* Construction & Load-Shedding Dual Module */}
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

            {/* Telemetry Trends Charts & Mission Instructor AI Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TelemetryCharts history={gameState.dailyHistory} />
              
              <InstructorPanel
                logs={gameState.instructorLogs}
                onOpenResearchModal={() => setIsResearchModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SOLAR SYSTEM ASTRODYNAMICS (EVAN'S COMPONENT) */}
        {activeTab === 'solar-system' && (
          <div className="space-y-4 animate-in fade-in">
            <SolarSystemHero
              currentCampaign={gameState.campaign === 'mars' ? 'Mars' : 'Moon'}
              marsUnlocked={gameState.marsUnlocked}
              onSelectCampaign={(c) => {
                if (c === 'Mars') {
                  if (gameState.marsUnlocked) {
                    handleStartNewMission('mars', gameState.difficulty);
                    setActiveTab('outpost-3d');
                  } else {
                    audioSystem.playAlarm();
                    alert('Mars Ares Outpost is locked! Survive 30 days on the Moon with >=70% score to unlock.');
                  }
                } else {
                  if (gameState.campaign !== 'moon') {
                    handleStartNewMission('moon', gameState.difficulty);
                  }
                  setActiveTab('outpost-3d');
                }
              }}
              onExploreBase={() => setActiveTab('outpost-3d')}
              onAddXP={handleAddCadetXP}
              playChime={handlePlayChime}
            />
          </div>
        )}

        {/* TAB 3: SURFACE OPERATIONS & INTERACTIVE DRILLS (EVAN'S COMPONENT) */}
        {activeTab === 'surface-ops' && (
          <div className="space-y-4 animate-in fade-in">
            <LunarBaseOutpost
              simState={adaptGameStateToEvanView(gameState, isEvaDrillActive)}
              onAdvanceHours={handleAdvanceDay}
              onToggleEva={() => {
                audioSystem.playTelemetryClick();
                setIsEvaDrillActive((prev) => {
                  const nextState = !prev;
                  if (nextState) {
                    handleAddCadetXP(25, 'Surface EVA Sortie Protocol Inspected', `eva_drill_inspection_${gameState.campaign.toLowerCase()}`);
                  }
                  return nextState;
                });
              }}
              onRestCrew={(_h) => {
                audioSystem.playTelemetryClick();
                handleAddCadetXP(20, 'Crew Rest Circadian Drill Completed (Simulated training schedule; physical crew vitals unaffected)', `crew_rest_drill_${gameState.campaign.toLowerCase()}`);
              }}
              onTreatCrew={(id) => {
                audioSystem.playTelemetryClick();
                handleAddCadetXP(30, `Crew First-Aid Protocol Serviced on Crew Member #${id} (Simulated medical drill; actual physical health unchanged)`, `crew_med_drill_${gameState.campaign.toLowerCase()}_${id}`);
              }}
              onResupply={() => {
                audioSystem.playUpgradeChime();
                handleAddCadetXP(35, 'Consumables Resupply Logistics Docked (Simulated supply drill; deterministic ECLSS balances maintained)', `resupply_drill_${gameState.campaign.toLowerCase()}`);
              }}
              onAddXP={handleAddCadetXP}
              onCompleteDirective={handleClaimDirective}
              playChime={handlePlayChime}
            />
          </div>
        )}

        {/* TAB 4: CADET ACADEMY & CERTIFICATE (EVAN'S COMPONENT) */}
        {activeTab === 'cadet-academy' && (
          <div className="space-y-4 animate-in fade-in">
            <CadetProgression
              xp={cadetXp}
              unlockedBadgeIds={badges
                .filter(b => b.unlocked)
                .map(b => b.id)
                .concat(cadetXp >= 150 ? ['lunar_pioneer'] : [])
                .concat(gameState.day > 1 ? ['first_hour'] : [])
                .concat(gameState.marsUnlocked ? ['mars_pathfinder'] : [])}
              completedChallengeIds={completedDirectives}
              elapsedHours={gameState.day * 24}
              campaign={gameState.campaign === 'mars' ? 'Mars' : 'Moon'}
              onClaimChallenge={handleClaimDirective}
              playChime={handlePlayChime}
            />
          </div>
        )}

        {/* TAB 5: TELEMETRY & CONSOLES */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TelemetryCharts history={gameState.dailyHistory} />
              <InstructorPanel
                logs={gameState.instructorLogs}
                onOpenResearchModal={() => setIsResearchModalOpen(true)}
              />
            </div>

            <ConstructionPanel
              gameState={gameState}
              onPurchaseUpgrade={handlePurchaseUpgrade}
            />

            <LoadSheddingPanel
              gameState={gameState}
              onToggleControl={handleToggleControl}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-900 bg-slate-950/90 py-4 px-4 text-center text-xs text-slate-500 relative z-10">
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

      {/* Junior Explorer Guided Adventure Modal */}
      <JuniorAdventureModal
        isOpen={isJuniorAdventureOpen}
        onClose={() => setIsJuniorAdventureOpen(false)}
        onAdvanceDay={handleAdvanceDay}
        onOpenExperiments={() => {
          setIsJuniorAdventureOpen(false);
          setIsExperimentsModalOpen(true);
        }}
        onOpenBadges={() => {
          setIsJuniorAdventureOpen(false);
          setIsBadgesModalOpen(true);
        }}
      />

      {/* Animated Astronaut Learning Companion (Dr. Astra) */}
      <AstronautCompanion
        gameState={gameState}
        learningProfile={learningProfile}
        onOpenExperiments={() => setIsExperimentsModalOpen(true)}
        onOpenResearch={() => setIsResearchModalOpen(true)}
        onOpenJuniorAdventure={() => setIsJuniorAdventureOpen(true)}
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
