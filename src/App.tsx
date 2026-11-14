import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bell,
  Compass,
  Droplets,
  Gauge,
  HeartPulse,
  Home,
  Layers,
  Lock,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import "./App.css";

import {
  INITIAL_SIMULATION,
  advanceSimulation,
  switchCampaign,
  unlockMarsCampaign,
  setEvaState,
  restCrewCommand,
  treatCrewCommand,
  resupplyResourcesCommand,
  isMarsEligibleForUnlock,
  type SimulationState,
  type CampaignType,
} from "./engine/SimulationEngine.ts";

import { getResourceStatus } from "./engine/ResourceSystem.ts";
import { SolarSystemHero } from "./components/SolarSystemHero.tsx";
import { StarfieldBackground } from "./components/StarfieldBackground.tsx";
import { CadetProgression } from "./components/CadetProgression.tsx";
import { LunarBaseOutpost } from "./components/LunarBaseOutpost.tsx";

type NavigationTab = "overview" | "solar" | "base" | "resources" | "crew" | "logs";

function App() {
  const [simState, setSimState] = useState<SimulationState>(INITIAL_SIMULATION);
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showMarsModal, setShowMarsModal] = useState<boolean>(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Cadet Progression XP & Badges
  const [cadetXp, setCadetXp] = useState<number>(120);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(["lunar_pioneer"]);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>([]);
  const [xpToast, setXpToast] = useState<{ message: string; amount: number } | null>(null);

  // Sound effects via Web Audio API (Synthesizer, zero assets required)
  const playSciFiChime = useCallback((type: "click" | "beep" | "success" | "warning") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === "warning") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(280, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  }, [soundEnabled]);

  const addXP = useCallback((amount: number, reason: string) => {
    setCadetXp((prev) => prev + amount);
    setXpToast({ amount, message: reason });
    playSciFiChime("success");
    setTimeout(() => setXpToast(null), 3000);
  }, [playSciFiChime]);

  const unlockBadge = useCallback((badgeId: string) => {
    setUnlockedBadgeIds((prev) => {
      if (prev.includes(badgeId)) return prev;
      addXP(50, `Badge Unlocked: ${badgeId.toUpperCase()}`);
      return [...prev, badgeId];
    });
  }, [addXP]);

  const completeChallenge = useCallback((challengeId: string, xpReward: number) => {
    setCompletedChallengeIds((prev) => {
      if (prev.includes(challengeId)) return prev;
      addXP(xpReward, "Mission Directive Completed!");
      return [...prev, challengeId];
    });
  }, [addXP]);

  // Real-time automated simulation loop when "Play" is active
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimState((prev) => advanceSimulation(prev, 1));
    }, 1500); // 1 hour per 1.5 seconds
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Check achievements on state change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (simState.elapsedHours >= 1) {
        if (!unlockedBadgeIds.includes("first_hour")) {
          unlockBadge("first_hour");
        }
        if (!completedChallengeIds.includes("step_sim")) {
          completeChallenge("step_sim", 30);
        }
      }
      if (simState.isEvaActive) {
        if (!unlockedBadgeIds.includes("eva_spacewalker")) {
          unlockBadge("eva_spacewalker");
        }
        if (!completedChallengeIds.includes("trigger_eva")) {
          completeChallenge("trigger_eva", 50);
        }
      }
      if (simState.marsUnlocked) {
        if (!unlockedBadgeIds.includes("mars_pathfinder")) {
          unlockBadge("mars_pathfinder");
        }
      }
      if (
        simState.resources.oxygen > 50 &&
        simState.resources.water > 50 &&
        simState.resources.energy > 50 &&
        simState.resources.battery > 50
      ) {
        if (!unlockedBadgeIds.includes("eclss_guardian")) {
          unlockBadge("eclss_guardian");
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [simState, unlockedBadgeIds, completedChallengeIds, unlockBadge, completeChallenge]);

  // Simulation advance helper
  const handleAdvance = (hours: number) => {
    playSciFiChime("click");
    try {
      setSimState((prev) => advanceSimulation(prev, hours));
      addXP(10 * hours, `Simulation advanced +${hours}H`);
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const handleReset = () => {
    playSciFiChime("click");
    setIsPlaying(false);
    setSimState(INITIAL_SIMULATION);
  };

  const handleToggleEva = () => {
    const nextState = !simState.isEvaActive;
    playSciFiChime(nextState ? "warning" : "success");
    setSimState((prev) => setEvaState(prev, nextState));
    if (nextState) {
      addXP(40, "EVA Spacewalk Initiated");
      unlockBadge("eva_spacewalker");
      completeChallenge("trigger_eva", 50);
    }
  };

  const handleRestCrew = (hours: number = 8) => {
    playSciFiChime("success");
    setSimState((prev) => restCrewCommand(prev, hours));
    addXP(35, `Crew Rest Cycle (${hours}h)`);
    unlockBadge("medic_aid");
  };

  const handleTreatCrew = (crewId: number) => {
    playSciFiChime("success");
    setSimState((prev) => treatCrewCommand(prev, crewId));
    addXP(30, "Medical Treatment Administered");
    unlockBadge("medic_aid");
  };

  const handleResupply = () => {
    playSciFiChime("success");
    setSimState((prev) =>
      resupplyResourcesCommand(prev, {
        oxygen: 25,
        water: 25,
        energy: 30,
        battery: 30,
      })
    );
    addXP(45, "Resupply Pod Docked");
    unlockBadge("power_master");
    completeChallenge("dock_resupply", 40);
  };

  const handleCampaignClick = (target: CampaignType) => {
    playSciFiChime("click");
    if (target === "Mars" && !simState.marsUnlocked) {
      setShowMarsModal(true);
      return;
    }
    try {
      setSimState((prev) => switchCampaign(prev, target));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlockMars = () => {
    playSciFiChime("success");
    setSimState((prev) => {
      const unlocked = unlockMarsCampaign(prev);
      return switchCampaign(unlocked, "Mars");
    });
    addXP(150, "Mars Ares Campaign Authorized!");
    unlockBadge("mars_pathfinder");
    setShowMarsModal(false);
  };

  // Resource card data dynamically driven by simulation state
  const resourceCards = [
    {
      name: "Oxygen",
      value: Math.round(simState.resources.oxygen * 10) / 10,
      amount: `${simState.resources.oxygen.toFixed(1)}%`,
      icon: Wind,
      color: "cyan",
      status: getResourceStatus(simState.resources.oxygen),
      detail:
        simState.resources.oxygen <= 20
          ? "CRITICAL: Severe Hypoxia Hazard"
          : simState.resources.oxygen <= 40
          ? "WARNING: ECLSS Buffer Low"
          : "Nominal Supply · 0.35%/hr draw",
    },
    {
      name: "Water",
      value: Math.round(simState.resources.water * 10) / 10,
      amount: `${simState.resources.water.toFixed(1)}%`,
      icon: Droplets,
      color: "blue",
      status: getResourceStatus(simState.resources.water),
      detail:
        simState.resources.water <= 20
          ? "CRITICAL: Rationing Enforced"
          : simState.resources.water <= 40
          ? "WARNING: Graywater Stress"
          : "Recycling Loop Active · 0.25%/hr",
    },
    {
      name: "Energy",
      value: Math.round(simState.resources.energy * 10) / 10,
      amount: `${simState.resources.energy.toFixed(1)}%`,
      icon: Zap,
      color: "yellow",
      status: getResourceStatus(simState.resources.energy),
      detail:
        simState.resources.energy <= 20
          ? "CRITICAL: Habitation Brownout"
          : simState.resources.energy <= 40
          ? "WARNING: Peak Grid Demand"
          : "Solar Arrays Generating · 0.50%/hr",
    },
    {
      name: "Battery",
      value: Math.round(simState.resources.battery * 10) / 10,
      amount: `${simState.resources.battery.toFixed(1)}%`,
      icon: BatteryCharging,
      color: "green",
      status: getResourceStatus(simState.resources.battery),
      detail:
        simState.resources.battery <= 20
          ? "CRITICAL: Storage Depleted"
          : simState.resources.battery <= 40
          ? "WARNING: Discharging Cells"
          : "Backup Storage Balanced · 0.15%/hr",
    },
  ];

  // Dynamic system alerts calculated from live simulation
  const alerts = [];
  if (simState.resources.oxygen <= 20 || simState.resources.water <= 20) {
    alerts.push({
      type: "critical-alert",
      icon: AlertTriangle,
      title: "Life Support Emergency",
      desc: `Critical resource shortage: O2 at ${simState.resources.oxygen.toFixed(1)}%, H2O at ${simState.resources.water.toFixed(1)}%`,
    });
  } else if (simState.resources.oxygen <= 40 || simState.resources.water <= 40) {
    alerts.push({
      type: "warning-alert",
      icon: AlertTriangle,
      title: "Consumables Reserve Warning",
      desc: "Resource levels below 40%. Request replenishment or initiate conservation.",
    });
  } else {
    alerts.push({
      type: "success-alert",
      icon: Shield,
      title: "Life Support Nominal",
      desc: "All ECLSS loops reporting closed-cycle stability.",
    });
  }

  if (simState.physics.radiationDose >= 1.0) {
    alerts.push({
      type: "critical-alert",
      icon: AlertTriangle,
      title: "Acute Radiation Exposure",
      desc: `Accumulated dose: ${simState.physics.radiationDose.toFixed(2)} Sv. Exceeds safe human threshold.`,
    });
  } else if (simState.physics.radiationDose >= 0.5) {
    alerts.push({
      type: "warning-alert",
      icon: AlertTriangle,
      title: "Elevated Radiation Detected",
      desc: `Dose: ${simState.physics.radiationDose.toFixed(2)} Sv. Cosmic ray flux active.`,
    });
  } else {
    alerts.push({
      type: "info-alert",
      icon: Gauge,
      title: `${simState.campaign === "Moon" ? "Lunar" : "Martian"} Surface Telemetry`,
      desc: `Gravity ${simState.physics.gravity} m/s² · Temp ${simState.physics.temperature}°C · Rad ${simState.physics.radiationDose.toFixed(2)} Sv`,
    });
  }

  if (simState.isEvaActive) {
    const isOvertime = simState.physics.evaDuration > 8;
    alerts.push({
      type: isOvertime ? "warning-alert" : "info-alert",
      icon: Activity,
      title: isOvertime ? "EVA Sortie Overtime Warning" : "EVA Sortie In Progress",
      desc: `Duration: ${simState.physics.evaDuration.toFixed(1)} hours ${isOvertime ? "(PLSS limits exceeded)" : "(Nominal sortie)"}`,
    });
  } else {
    const criticalCrew = simState.crew.find((c) => c.status === "Critical");
    const warningCrew = simState.crew.find((c) => c.status === "Warning");
    if (criticalCrew) {
      alerts.push({
        type: "critical-alert",
        icon: AlertTriangle,
        title: "Crew Medical Emergency",
        desc: `${criticalCrew.name} reports critical stress/exhaustion. Administer aid immediately.`,
      });
    } else if (warningCrew) {
      alerts.push({
        type: "warning-alert",
        icon: AlertTriangle,
        title: "Crew Fatigue Alert",
        desc: `${warningCrew.name} indicates high fatigue/stress. Schedule rest cycle.`,
      });
    } else {
      alerts.push({
        type: "success-alert",
        icon: Shield,
        title: "Crew Physiology Nominal",
        desc: "All crew members synchronized in nominal circadian cycle.",
      });
    }
  }

  // Filtered logs
  const filteredLogs = simState.logs.filter((log) => {
    if (logFilter === "ALL") return true;
    if (logFilter === "ALERT") return log.type === "warning" || log.type === "critical";
    return log.source === logFilter;
  });

  return (
    <div className="app-shell">
      {/* BACKGROUND DEEP SPACE STARFIELD */}
      <StarfieldBackground reducedMotion={reducedMotion} />

      {/* XP TOAST NOTIFICATION */}
      {xpToast && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            right: 30,
            background: "linear-gradient(135deg, rgba(136, 101, 255, 0.95), rgba(41, 217, 242, 0.9))",
            color: "#050B18",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 0 25px rgba(41, 217, 242, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 800,
            fontSize: "13px",
            animation: "floatSlow 2s ease-in-out infinite",
          }}
        >
          <Sparkles size={18} />
          <span>+{xpToast.amount} XP: {xpToast.message}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Orbit size={25} />
          </div>
          <div>
            <h2>
              NEOREX <span>ASTRA</span>
            </h2>
            <small>MISSION SYSTEMS</small>
          </div>
        </div>

        <div className="nav-label">MISSION</div>
        <nav>
          <a
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("overview");
            }}
          >
            <Home size={18} /> <span>Mission Overview</span>
          </a>
          <a
            className={`nav-item ${activeTab === "solar" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("solar");
            }}
          >
            <Compass size={18} /> <span>Solar System</span>
          </a>
          <a
            className={`nav-item ${activeTab === "base" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("base");
            }}
          >
            <Orbit size={18} />{" "}
            <span>{simState.campaign === "Moon" ? "Lunar Base" : "Mars Outpost"}</span>
          </a>
          <a
            className={`nav-item ${activeTab === "resources" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("resources");
            }}
          >
            <Layers size={18} /> <span>Resources</span>
          </a>
          <a
            className={`nav-item ${activeTab === "crew" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("crew");
            }}
          >
            <Users size={18} /> <span>Crew Management</span>
          </a>
          <a
            className={`nav-item ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => {
              playSciFiChime("click");
              setActiveTab("logs");
            }}
          >
            <Activity size={18} /> <span>Mission Logs</span>
          </a>
        </nav>

        {/* CAMPAIGN SELECTION */}
        <div className="nav-label campaign-label">CAMPAIGNS</div>
        <div
          className={`campaign-card ${simState.campaign === "Moon" ? "selected" : ""}`}
          onClick={() => handleCampaignClick("Moon")}
        >
          <Orbit size={18} />
          <div>
            <strong>Moon Campaign</strong>
            <small>
              {simState.campaign === "Moon" ? "Active expedition" : "Artemis Base Camp"}
            </small>
          </div>
        </div>

        <div
          className={`campaign-card ${
            simState.campaign === "Mars"
              ? "selected"
              : simState.marsUnlocked
              ? ""
              : "locked"
          }`}
          onClick={() => handleCampaignClick("Mars")}
        >
          {simState.marsUnlocked ? <Orbit size={17} /> : <Lock size={17} />}
          <div>
            <strong>Mars Campaign</strong>
            <small>
              {simState.campaign === "Mars"
                ? "Active expedition"
                : simState.marsUnlocked
                ? "Unlocked · Ready to Launch"
                : isMarsEligibleForUnlock(simState)
                ? "Eligible · Click to Unlock"
                : "Unlock required (T+24h)"}
            </small>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="cadet-pill-mini">
            <Trophy size={14} color="#8865FF" />
            <span>CADET: {cadetXp} XP</span>
          </div>
          <div className="connection">
            <span /> SYSTEMS ONLINE
          </div>
          <small>NEOREX ASTRA · v2.0</small>
        </div>
      </aside>

      {/* MAIN MISSION INTERFACE */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              NEOREX / <span>MISSION CONTROL</span>
            </div>
            <div className="top-heading">
              {activeTab === "overview" && "Expedition Command Center"}
              {activeTab === "solar" && "Solar Astrometry Observatory"}
              {activeTab === "base" &&
                (simState.campaign === "Moon"
                  ? "Lunar Base Environmental Systems"
                  : "Martian Outpost Environmental Systems")}
              {activeTab === "resources" && "Life Support & Consumables"}
              {activeTab === "crew" && "Personnel & Astronaut Biometrics"}
              {activeTab === "logs" && "Chronological Telemetry Stream"}
            </div>
          </div>

          <div className="top-actions">
            <div
              className={`mission-status-pill ${
                simState.missionStatus === "Critical"
                  ? "critical"
                  : simState.missionStatus === "Warning"
                  ? "warning"
                  : "active"
              }`}
            >
              <span
                style={{
                  background:
                    simState.missionStatus === "Critical"
                      ? "#f87171"
                      : simState.missionStatus === "Warning"
                      ? "#facc15"
                      : "#54dca0",
                }}
              />
              T+{simState.elapsedHours.toFixed(1)}H · {simState.missionStatus.toUpperCase()}
            </div>

            {/* SOUND TOGGLE */}
            <button
              className="icon-button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute Mission SFX" : "Enable Mission SFX"}
              aria-label="Sound Toggle"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* MOTION ACCESSIBILITY TOGGLE */}
            <button
              className="icon-button"
              onClick={() => setReducedMotion(!reducedMotion)}
              title={reducedMotion ? "Enable Ambient Animations" : "Reduce Motion"}
              aria-label="Motion Accessibility Toggle"
            >
              <Compass size={18} />
            </button>

            {/* NOTIFICATIONS ICON */}
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              style={{ position: "relative" }}
            >
              <Bell size={18} />
              {alerts.some((a) => a.type.includes("warning") || a.type.includes("critical")) && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#f87171",
                  }}
                />
              )}
            </button>

            <div className="cadet-avatar" title="Astronaut Cadet EV">
              EV
            </div>
          </div>
        </header>

        {/* SIMULATION CONTROL TOOLBAR */}
        <section className="sim-controls-bar">
          <div className="sim-btn-group">
            <button
              className={`sim-btn ${isPlaying ? "active" : ""}`}
              onClick={() => {
                playSciFiChime("click");
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? "PAUSE SIM" : "RUN SIM"}</span>
            </button>
            <button className="sim-btn" onClick={() => handleAdvance(1)}>
              +1H
            </button>
            <button className="sim-btn" onClick={() => handleAdvance(6)}>
              +6H
            </button>
            <button className="sim-btn" onClick={() => handleAdvance(24)}>
              +24H
            </button>
            <button className="sim-btn" onClick={handleReset} title="Reset Simulation">
              <RotateCcw size={14} /> <span>RESET</span>
            </button>
          </div>

          <div className="sim-btn-group">
            <button
              className={`sim-btn ${simState.isEvaActive ? "sim-btn-danger" : "sim-btn-primary"}`}
              onClick={handleToggleEva}
            >
              <Activity size={14} />
              <span>
                {simState.isEvaActive
                  ? `END EVA (${simState.physics.evaDuration.toFixed(1)}h)`
                  : "START EVA SORTIE"}
              </span>
            </button>
            <button className="sim-btn sim-btn-success" onClick={() => handleRestCrew(8)}>
              <HeartPulse size={14} /> <span>REST CREW (8H)</span>
            </button>
            <button className="sim-btn" onClick={handleResupply}>
              <Sparkles size={14} /> <span>RESUPPLY BUFFERS</span>
            </button>
          </div>
        </section>

        {/* TAB 1: OVERVIEW (HERO SOLAR SYSTEM + RESOURCES + CREW + CADET) */}
        {activeTab === "overview" && (
          <>
            {/* CINEMATIC SOLAR SYSTEM HERO */}
            <SolarSystemHero
              currentCampaign={simState.campaign}
              marsUnlocked={simState.marsUnlocked}
              onSelectCampaign={handleCampaignClick}
              onExploreBase={() => setActiveTab("base")}
              onAddXP={addXP}
              playChime={playSciFiChime}
            />

            {/* RESOURCE OVERVIEW SECTION */}
            <section className="section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">ECLSS TELEMETRY</span>
                  <h2>Life Support & Consumables</h2>
                </div>
                <span className="updated-telemetry-badge">
                  T+{Math.floor(simState.elapsedHours)}H · LIVE ECLSS STREAM
                </span>
              </div>

              <div className="resource-grid">
                {resourceCards.map((item) => {
                  const Icon = item.icon;
                  const isCritical = item.status === "critical";
                  const isWarning = item.status === "warning";

                  return (
                    <article
                      className={`resource-card ${isCritical ? "critical-pulse" : isWarning ? "warning-pulse" : ""}`}
                      key={item.name}
                    >
                      <div className="resource-top">
                        <div className={`resource-icon ${item.color}`}>
                          <Icon size={22} />
                        </div>
                        <span
                          className={`badge-tag ${
                            isCritical ? "red" : isWarning ? "yellow" : "green"
                          }`}
                        >
                          ● {item.status.toUpperCase()}
                        </span>
                      </div>
                      <p>{item.name}</p>
                      <h3>{item.amount}</h3>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${item.color}`}
                          style={{
                            width: `${Math.max(0, Math.min(100, item.value))}%`,
                          }}
                        />
                      </div>
                      <small>{item.detail}</small>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* LOWER GRID: CREW STATUS & SYSTEM ALERTS */}
            <div className="lower-grid">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">ASTRONAUT PERSONNEL</span>
                    <h2>Crew Biometric Status</h2>
                  </div>
                  <Users size={20} className="muted-icon" />
                </div>
                {simState.crew.map((person) => {
                  const initials = person.name.substring(0, 2).toUpperCase();
                  const statusClass =
                    person.status === "Critical"
                      ? "critical-status"
                      : person.status === "Warning"
                      ? "warning-status"
                      : "healthy";

                  return (
                    <div className="crew-row" key={person.id}>
                      <div className="crew-avatar">{initials}</div>
                      <div className="crew-info">
                        <strong>{person.name}</strong>
                        <small>
                          {person.role} · Fatigue: {person.fatigue.toFixed(0)}% · Health:{" "}
                          {person.health.toFixed(0)}%
                        </small>
                      </div>
                      <span className={statusClass}>
                        <span />
                        {person.status}
                      </span>
                    </div>
                  );
                })}
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">MISSION HEALTH</span>
                    <h2>System Telemetry Alerts</h2>
                  </div>
                  <Shield size={20} className="muted-icon" />
                </div>
                {alerts.map((alert, idx) => {
                  const AlertIcon = alert.icon;
                  return (
                    <div className={`alert-item ${alert.type}`} key={idx}>
                      <AlertIcon size={19} />
                      <div>
                        <strong>{alert.title}</strong>
                        <small>{alert.desc}</small>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>

            {/* CADET PROGRESSION & BADGES (FOR AGES 8–16) */}
            <CadetProgression
              xp={cadetXp}
              unlockedBadgeIds={unlockedBadgeIds}
              completedChallengeIds={completedChallengeIds}
              elapsedHours={simState.elapsedHours}
              campaign={simState.campaign}
              onClaimChallenge={completeChallenge}
              playChime={playSciFiChime}
            />
          </>
        )}

        {/* TAB 2: DEDICATED SOLAR SYSTEM OBSERVATORY */}
        {activeTab === "solar" && (
          <div style={{ marginTop: "20px" }}>
            <SolarSystemHero
              currentCampaign={simState.campaign}
              marsUnlocked={simState.marsUnlocked}
              onSelectCampaign={handleCampaignClick}
              onExploreBase={() => setActiveTab("base")}
              onAddXP={addXP}
              playChime={playSciFiChime}
            />
          </div>
        )}

        {/* TAB 3: BASE ENVIRONMENT & INTERACTIVE LUNAR OUTPOST */}
        {activeTab === "base" && (
          <LunarBaseOutpost
            simState={simState}
            onAdvanceHours={handleAdvance}
            onToggleEva={handleToggleEva}
            onRestCrew={handleRestCrew}
            onTreatCrew={handleTreatCrew}
            onResupply={handleResupply}
            onAddXP={addXP}
            onCompleteDirective={completeChallenge}
            playChime={playSciFiChime}
          />
        )}

        {/* TAB 4: DETAILED RESOURCES */}
        {activeTab === "resources" && (
          <section className="detail-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">ECLSS CONSUMABLES</span>
                <h2>Detailed Life Support Reserves</h2>
              </div>
              <button className="sim-btn sim-btn-success" onClick={handleResupply}>
                <Sparkles size={14} /> DOCK RESUPPLY POD
              </button>
            </div>

            <table className="log-table">
              <thead>
                <tr>
                  <th>RESOURCE</th>
                  <th>RESERVE LEVEL</th>
                  <th>CONSUMPTION RATE</th>
                  <th>ESTIMATED ENDURANCE</th>
                  <th>SUBSYSTEM STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Oxygen (O2)</strong>
                  </td>
                  <td>{simState.resources.oxygen.toFixed(1)}%</td>
                  <td>0.35% / hour</td>
                  <td>{(simState.resources.oxygen / 0.35).toFixed(0)} hours remaining</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        getResourceStatus(simState.resources.oxygen) === "normal"
                          ? "green"
                          : "red"
                      }`}
                    >
                      {getResourceStatus(simState.resources.oxygen).toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Water (H2O)</strong>
                  </td>
                  <td>{simState.resources.water.toFixed(1)}%</td>
                  <td>0.25% / hour</td>
                  <td>{(simState.resources.water / 0.25).toFixed(0)} hours remaining</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        getResourceStatus(simState.resources.water) === "normal"
                          ? "green"
                          : "yellow"
                      }`}
                    >
                      {getResourceStatus(simState.resources.water).toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Electrical Energy</strong>
                  </td>
                  <td>{simState.resources.energy.toFixed(1)}%</td>
                  <td>0.50% / hour</td>
                  <td>{(simState.resources.energy / 0.50).toFixed(0)} hours remaining</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        getResourceStatus(simState.resources.energy) === "normal"
                          ? "green"
                          : "yellow"
                      }`}
                    >
                      {getResourceStatus(simState.resources.energy).toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Battery Storage</strong>
                  </td>
                  <td>{simState.resources.battery.toFixed(1)}%</td>
                  <td>0.15% / hour</td>
                  <td>{(simState.resources.battery / 0.15).toFixed(0)} hours remaining</td>
                  <td>
                    <span
                      className={`badge-tag ${
                        getResourceStatus(simState.resources.battery) === "normal"
                          ? "green"
                          : "yellow"
                      }`}
                    >
                      {getResourceStatus(simState.resources.battery).toUpperCase()}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* TAB 5: CREW MANAGEMENT */}
        {activeTab === "crew" && (
          <section className="detail-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">BIOMETRIC MONITORING</span>
                <h2>Crew Roster & Astronaut Vitals</h2>
              </div>
              <button className="sim-btn sim-btn-success" onClick={() => handleRestCrew(8)}>
                <HeartPulse size={14} /> ORDER CREW REST CYCLE (8H)
              </button>
            </div>

            <div className="crew-detail-grid">
              {simState.crew.map((member) => (
                <div className="crew-card" key={member.id}>
                  <div className="crew-card-header">
                    <div>
                      <strong style={{ fontSize: "14px", display: "block" }}>{member.name}</strong>
                      <small style={{ color: "#91A8C5", fontSize: "10px" }}>{member.role}</small>
                    </div>
                    <span
                      className={`badge-tag ${
                        member.status === "Healthy"
                          ? "green"
                          : member.status === "Warning"
                          ? "yellow"
                          : "red"
                      }`}
                    >
                      ● {member.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="crew-vitals-bars">
                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Physical Health</span>
                        <span>{member.health.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.health}%`,
                            background:
                              member.health > 50
                                ? "#54dca0"
                                : member.health > 25
                                ? "#facc15"
                                : "#f87171",
                          }}
                        />
                      </div>
                    </div>

                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Fatigue Level</span>
                        <span>{member.fatigue.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.fatigue}%`,
                            background:
                              member.fatigue > 80
                                ? "#f87171"
                                : member.fatigue > 50
                                ? "#facc15"
                                : "#29D9F2",
                          }}
                        />
                      </div>
                    </div>

                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Stress & Cognitive Load</span>
                        <span>{member.stress.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.stress}%`,
                            background:
                              member.stress > 80
                                ? "#f87171"
                                : member.stress > 50
                                ? "#facc15"
                                : "#398BFF",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    className="sim-btn"
                    style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
                    onClick={() => handleTreatCrew(member.id)}
                  >
                    <HeartPulse size={13} /> ADMINISTER MEDICAL AID
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 6: MISSION LOGS */}
        {activeTab === "logs" && (
          <section className="detail-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CHRONOLOGICAL EVENT STREAM</span>
                <h2>Mission Logs</h2>
              </div>
              <div className="sim-btn-group">
                {["ALL", "ALERT", "ECLSS", "PHYSICS", "CREW", "MISSION"].map((f) => (
                  <button
                    key={f}
                    className={`sim-btn ${logFilter === f ? "active" : ""}`}
                    onClick={() => setLogFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <table className="log-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>TIME</th>
                  <th style={{ width: "90px" }}>SOURCE</th>
                  <th style={{ width: "90px" }}>SEVERITY</th>
                  <th>TELEMETRY MESSAGE</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>T+{log.hour.toFixed(1)}H</strong>
                    </td>
                    <td>
                      <span className="badge-tag cyan">{log.source}</span>
                    </td>
                    <td>
                      <span className={`log-badge ${log.type}`}>{log.type}</span>
                    </td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* MARS CAMPAIGN UNLOCK MODAL */}
        {showMarsModal && (
          <div className="modal-overlay" onClick={() => setShowMarsModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <Orbit size={24} color="#f87171" />
                <h3 style={{ margin: 0 }}>Mars Ares Expedition Authorization</h3>
              </div>
              <p>
                The Mars campaign simulates survival at an advanced Martian habitat. Surface gravity
                is modeled at <strong>3.72 m/s²</strong>, with extreme diurnal thermal swing
                averaging <strong>-60°C</strong> and deep-space cosmic radiation exposure.
              </p>
              <div
                style={{
                  background: "#080e18",
                  padding: "14px",
                  borderRadius: "10px",
                  margin: "16px 0",
                  border: "1px solid rgba(41, 217, 242, 0.2)",
                  fontSize: "11px",
                }}
              >
                <div>
                  <strong>Standard Qualification Directives:</strong>
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    color: isMarsEligibleForUnlock(simState) ? "#54dca0" : "#facc15",
                  }}
                >
                  ● T+24h nominal lunar operation: {Math.floor(simState.elapsedHours)}/24h elapsed
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    color: simState.missionStatus !== "Critical" ? "#54dca0" : "#f87171",
                  }}
                >
                  ● Habitation non-critical status: {simState.missionStatus}
                </div>
              </div>
              <div className="modal-actions">
                <button className="sim-btn" onClick={() => setShowMarsModal(false)}>
                  CANCEL
                </button>
                <button className="sim-btn sim-btn-primary" onClick={handleUnlockMars}>
                  AUTHORIZE & LAUNCH MARS EXPEDITION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION POPUP */}
        {showNotificationPopup && (
          <div
            style={{
              position: "fixed",
              top: 80,
              right: 40,
              width: 340,
              background: "#0f1927",
              border: "1px solid rgba(41, 217, 242, 0.3)",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              zIndex: 999,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <strong style={{ fontSize: "12px" }}>Active Alerts & Telemetry</strong>
              <button
                style={{ background: "none", border: "none", color: "#91A8C5", cursor: "pointer" }}
                onClick={() => setShowNotificationPopup(false)}
              >
                ✕
              </button>
            </div>
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`alert-item ${a.type}`}
                style={{ padding: "8px 10px", marginTop: 6 }}
              >
                <div>
                  <strong style={{ fontSize: "11px" }}>{a.title}</strong>
                  <small style={{ fontSize: "9px" }}>{a.desc}</small>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer>
          <span>NEOREX ASTRA © 2026 · NASA SPACE APPS CHALLENGE</span>
          <span>
            BUILT FOR THE NEXT FRONTIER <Orbit size={13} />
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
