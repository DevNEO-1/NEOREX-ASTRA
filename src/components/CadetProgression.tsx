import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  Circle,
  Compass,
  Footprints,
  HeartPulse,
  Orbit,
  Shield,
  Sparkles,
  Trophy,
  Zap,
  Printer,
  X,
} from "lucide-react";

export interface CadetBadge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  xpValue: number;
}

export interface CadetChallenge {
  id: string;
  title: string;
  target: string;
  completed: boolean;
  xpReward: number;
}

interface CadetProgressionProps {
  xp: number;
  unlockedBadgeIds: string[];
  completedChallengeIds: string[];
  elapsedHours?: number;
  campaign?: "Moon" | "Mars";
  onClaimChallenge?: (id: string, xpReward: number) => void;
  playChime?: (type: "click" | "beep" | "success" | "warning") => void;
}

export const CadetProgression: React.FC<CadetProgressionProps> = ({
  xp,
  unlockedBadgeIds,
  completedChallengeIds,
  elapsedHours = 0,
  campaign = "Moon",
  onClaimChallenge,
  playChime,
}) => {
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [cadetCallsign, setCadetCallsign] = useState<string>("Cadet Astra-01");

  // Rank calculations
  const ranks = [
    { name: "Cadet Trainee", minXp: 0, maxXp: 150, rankLevel: "LEVEL 01" },
    { name: "Flight Specialist", minXp: 150, maxXp: 350, rankLevel: "LEVEL 02" },
    { name: "Astrogation Officer", minXp: 350, maxXp: 650, rankLevel: "LEVEL 03" },
    { name: "Planetary Commander", minXp: 650, maxXp: 1000, rankLevel: "LEVEL 04" },
    { name: "Grand ASTRA Pioneer", minXp: 1000, maxXp: 2000, rankLevel: "LEVEL 05" },
  ];

  const currentRankIndex = ranks.findLastIndex((r) => xp >= r.minXp);
  const currentRank = ranks[Math.max(0, currentRankIndex)];
  const nextRank = ranks[Math.min(ranks.length - 1, currentRankIndex + 1)];

  const xpProgress =
    currentRankIndex === ranks.length - 1
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((xp - currentRank.minXp) / (currentRank.maxXp - currentRank.minXp)) * 100
          )
        );

  const allBadges: CadetBadge[] = [
    {
      id: "first_hour",
      name: "First Steps",
      description: "Successfully advance mission time past T+1H",
      icon: Footprints,
      unlocked: unlockedBadgeIds.includes("first_hour"),
      xpValue: 30,
    },
    {
      id: "lunar_pioneer",
      name: "Lunar Pioneer",
      description: "Establish Artemis Base operational status",
      icon: Orbit,
      unlocked: unlockedBadgeIds.includes("lunar_pioneer"),
      xpValue: 50,
    },
    {
      id: "eva_spacewalker",
      name: "Spacewalker",
      description: "Conduct an extravehicular sortie outside habitat",
      icon: Compass,
      unlocked: unlockedBadgeIds.includes("eva_spacewalker"),
      xpValue: 75,
    },
    {
      id: "eclss_guardian",
      name: "ECLSS Guardian",
      description: "Maintain life support buffers above critical levels",
      icon: Shield,
      unlocked: unlockedBadgeIds.includes("eclss_guardian"),
      xpValue: 60,
    },
    {
      id: "mars_pathfinder",
      name: "Red Planet Pathfinder",
      description: "Unlock the Martian Ares Campaign expedition",
      icon: Trophy,
      unlocked: unlockedBadgeIds.includes("mars_pathfinder"),
      xpValue: 120,
    },
    {
      id: "medic_aid",
      name: "Flight Surgeon",
      description: "Administer medical aid or restorative rest to crew",
      icon: HeartPulse,
      unlocked: unlockedBadgeIds.includes("medic_aid"),
      xpValue: 40,
    },
    {
      id: "power_master",
      name: "Buffer Architect",
      description: "Successfully dock a consumables resupply pod",
      icon: Zap,
      unlocked: unlockedBadgeIds.includes("power_master"),
      xpValue: 45,
    },
    {
      id: "solar_explorer",
      name: "Solar Cartographer",
      description: "Inspect 5 or more planets in the solar system viewer",
      icon: Sparkles,
      unlocked: unlockedBadgeIds.includes("solar_explorer"),
      xpValue: 80,
    },
  ];

  const challenges: CadetChallenge[] = [
    {
      id: "step_sim",
      title: "Initiate Autonomous Clock",
      target: "Advance the mission clock by at least 1 hour",
      completed: completedChallengeIds.includes("step_sim"),
      xpReward: 30,
    },
    {
      id: "inspect_planets",
      title: "Planetary Astrometry",
      target: "Select and read telemetry of at least 3 planets",
      completed: completedChallengeIds.includes("inspect_planets"),
      xpReward: 50,
    },
    {
      id: "trigger_eva",
      title: "Deploy Airlock Sortie",
      target: "Activate an EVA sortie to inspect exterior sensors",
      completed: completedChallengeIds.includes("trigger_eva"),
      xpReward: 50,
    },
    {
      id: "dock_resupply",
      title: "Life Support Logistics",
      target: "Replenish habitability reserves via Logistics Dock",
      completed: completedChallengeIds.includes("dock_resupply"),
      xpReward: 40,
    },
  ];

  return (
    <section className="cadet-progression-panel">
      {/* CADET RANK HEADER */}
      <div className="cadet-rank-header">
        <div className="cadet-badge-shield">
          <Award size={26} className="neon-icon" />
          <span className="rank-level-tag">{currentRank.rankLevel}</span>
        </div>
        <div className="cadet-title-info">
          <div className="cadet-meta">
            <span>NASA CADET PROGRESSION</span>
            <span className="xp-pill">{xp} XP EARNED</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0 }}>{currentRank.name}</h3>
            <button
              className="action-btn secondary-action"
              style={{ padding: "6px 14px", fontSize: "11px" }}
              onClick={() => {
                if (playChime) playChime("click");
                setShowCertificateModal(true);
              }}
            >
              <Award size={13} color="#29D9F2" />
              <span>OFFICIAL FLIGHT CERTIFICATE</span>
            </button>
          </div>
          <div className="xp-bar-container">
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
            <div className="xp-bar-labels">
              <span>{xp} XP</span>
              <span>Next Rank: {nextRank.name} ({nextRank.minXp} XP)</span>
            </div>
          </div>
        </div>
      </div>

      {/* DISCOVERY BADGES */}
      <div className="cadet-section-block">
        <div className="section-subheading">
          <Trophy size={16} className="cyan-icon" />
          <h4>Mission Discovery Badges ({unlockedBadgeIds.length}/{allBadges.length})</h4>
        </div>
        <div className="badge-grid">
          {allBadges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`cadet-badge-card ${badge.unlocked ? "unlocked" : "locked"}`}
                title={badge.unlocked ? `Unlocked! +${badge.xpValue} XP` : badge.description}
                onClick={() => {
                  if (playChime) playChime("click");
                }}
              >
                <div className="badge-icon-wrapper">
                  <BadgeIcon size={20} />
                </div>
                <strong>{badge.name}</strong>
                <small>{badge.description}</small>
                <span className="badge-status-tag">
                  {badge.unlocked ? "✓ UNLOCKED" : `LOCKED · +${badge.xpValue} XP`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MISSION OBJECTIVES CHECKLIST */}
      <div className="cadet-section-block">
        <div className="section-subheading">
          <CheckCircle2 size={16} className="cyan-icon" />
          <h4>Astronaut Cadet Directives</h4>
        </div>
        <div className="challenge-list">
          {challenges.map((c) => (
            <div
              key={c.id}
              className={`challenge-item ${c.completed ? "completed" : ""}`}
              onClick={() => {
                if (!c.completed && onClaimChallenge) {
                  if (playChime) playChime("success");
                  onClaimChallenge(c.id, c.xpReward);
                }
              }}
              style={{ cursor: c.completed ? "default" : "pointer" }}
            >
              <div className="challenge-check">
                {c.completed ? (
                  <CheckCircle2 size={18} color="#54DCA0" />
                ) : (
                  <Circle size={18} color="#455B7A" />
                )}
              </div>
              <div className="challenge-details">
                <strong>{c.title}</strong>
                <small>{c.target}</small>
              </div>
              <div className="challenge-reward">
                {c.completed ? (
                  <span className="reward-tag claimed">CLAIMED +{c.xpReward} XP</span>
                ) : (
                  <span className="reward-tag pending">+{c.xpReward} XP</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NASA CADET FLIGHT CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="cert-modal-backdrop" onClick={() => setShowCertificateModal(false)}>
          <div className="cert-card-shell" onClick={(e) => e.stopPropagation()}>
            <button className="cert-close-btn" onClick={() => setShowCertificateModal(false)}>
              <X size={18} />
            </button>

            <div className="cert-paper">
              <div className="cert-top-branding">
                <div className="cert-logo-seal">
                  <Orbit size={34} color="#29D9F2" />
                </div>
                <div>
                  <span className="cert-super-tag">NASA SPACE APPS CHALLENGE 2026 · REGISTRY ASTRA-77</span>
                  <h2 className="cert-heading">OFFICIAL ASTRONAUT CADET FLIGHT CERTIFICATE</h2>
                </div>
              </div>

              <div className="cert-divider" />

              <p className="cert-decree">
                This official credential certifies that Cadet Astronaut has completed operational training in
                environmental life-support systems (ECLSS), heliocentric orbital mechanics, lunar surface sortie
                operations, and deep-space telemetry management.
              </p>

              <div className="cert-callsign-row">
                <span className="cert-field-label">ASTRONAUT CALLSIGN:</span>
                <input
                  type="text"
                  value={cadetCallsign}
                  onChange={(e) => setCadetCallsign(e.target.value)}
                  className="cert-callsign-input"
                />
              </div>

              <div className="cert-telemetry-grid">
                <div className="cert-metric">
                  <span>OFFICIAL RANK</span>
                  <strong>{currentRank.name} ({currentRank.rankLevel})</strong>
                </div>
                <div className="cert-metric">
                  <span>TOTAL CADET XP</span>
                  <strong style={{ color: "#29D9F2" }}>{xp} XP EARNED</strong>
                </div>
                <div className="cert-metric">
                  <span>SIMULATION FLIGHT TIME</span>
                  <strong>T+{Math.floor(elapsedHours)} HOURS</strong>
                </div>
                <div className="cert-metric">
                  <span>MISSION THEATER</span>
                  <strong>{campaign.toUpperCase()} EXPEDITION</strong>
                </div>
              </div>

              <div className="cert-badges-tray">
                <span className="tray-title">DISCOVERY BADGES ATTAINED ({unlockedBadgeIds.length} BADGES):</span>
                <div className="tray-badges-row">
                  {allBadges
                    .filter((b) => b.unlocked)
                    .map((b) => {
                      const BIcon = b.icon;
                      return (
                        <div key={b.id} className="cert-mini-badge" title={b.description}>
                          <BIcon size={14} color="#FFB020" />
                          <span>{b.name}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="cert-signoff-row">
                <div className="cert-sign-col">
                  <div className="cert-sig-line">Director of Flight Operations</div>
                  <small>Artemis Deep Space Program</small>
                </div>
                <div className="cert-gold-seal">
                  <div className="seal-ring">
                    <Sparkles size={20} color="#FFB020" />
                    <span>VERIFIED</span>
                  </div>
                </div>
                <div className="cert-sign-col">
                  <div className="cert-sig-line">Chief of Autonomous Systems</div>
                  <small>Deep Space Network Command</small>
                </div>
              </div>
            </div>

            <div className="cert-modal-actions">
              <button
                className="sim-btn sim-btn-primary"
                onClick={() => {
                  if (playChime) playChime("success");
                  window.print();
                }}
              >
                <Printer size={15} />
                <span>PRINT / SAVE CADET CERTIFICATE</span>
              </button>
              <button
                className="sim-btn"
                onClick={() => {
                  if (playChime) playChime("click");
                  setShowCertificateModal(false);
                }}
              >
                <span>CLOSE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
