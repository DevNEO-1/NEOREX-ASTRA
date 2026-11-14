import React, { useState } from 'react';
import { GameState } from '../simulator/types';
import { LearningProfileTier, LEARNING_PROFILES } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Lightbulb
} from 'lucide-react';

interface AstronautCompanionProps {
  gameState: GameState;
  learningProfile: LearningProfileTier;
  onOpenExperiments?: () => void;
  onOpenResearch?: () => void;
  onOpenJuniorAdventure?: () => void;
}

export const AstronautCompanion: React.FC<AstronautCompanionProps> = ({
  gameState,
  learningProfile,
  onOpenExperiments,
  onOpenResearch,
  onOpenJuniorAdventure,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const profile = LEARNING_PROFILES[learningProfile];

  // Dynamic context-sensitive message generation based on profile tier and live gameState
  const getCompanionDialogue = () => {
    const { day, resources, campaign, activeEvents } = gameState;

    // Active Emergency Events
    if (activeEvents.length > 0) {
      if (learningProfile === 'junior') {
        return {
          title: '🚨 Space Alert!',
          message: "Hold on to your helmets! An unexpected space event is happening! Check the alert box and pick the safest choice for our astronauts!",
          hint: 'Look for the glowing red event box on your screen.',
          mood: 'alarm',
        };
      } else if (learningProfile === 'cadet') {
        return {
          title: '⚠️ Operational Hazard',
          message: `Mission alert in progress: ${activeEvents[0].title}. We need to make a fast trade-off to protect life support and equipment.`,
          hint: 'Evaluate the resource costs vs crew health consequences.',
          mood: 'alarm',
        };
      } else {
        return {
          title: '⚡ Critical Contingency',
          message: `Anomalous telemetry detected: ${activeEvents[0].title}. Execute standard NASA risk mitigation protocol.`,
          hint: 'Cross-reference emergency rationing with battery reserve threshold.',
          mood: 'alarm',
        };
      }
    }

    // Lunar Night Entering
    if (campaign === 'moon' && day >= 14 && day <= 28) {
      if (learningProfile === 'junior') {
        return {
          title: '🌙 Night Time on the Moon!',
          message: "The sun has gone down for two whole weeks! Our solar panels can't see the sun, so we're running on giant batteries. Save power!",
          hint: 'Tip: Click the power button on the greenhouse to turn it off and save electricity!',
          mood: 'caution',
        };
      } else if (learningProfile === 'cadet') {
        return {
          title: '🔋 14-Day Lunar Night',
          message: `Day ${day}: Solar generation is zero. Our batteries currently have ${Math.round(resources.batteryKwh)} kWh stored. Conserve power so we don't freeze!`,
          hint: 'Use the Load-Shedding switches to pause non-essential systems.',
          mood: 'caution',
        };
      } else {
        return {
          title: '❄️ Cryogenic Diurnal Dark Period',
          message: `Lunar surface insolation = 0 W/m². Battery reserves at ${(resources.batteryKwh / resources.batteryCapacityKwh * 100).toFixed(1)}% capacity. Monitor discharge rate closely.`,
          hint: 'Thermal and life-support baselines require 35.2 kWh/day minimum.',
          mood: 'caution',
        };
      }
    }

    // Low Resources
    if (resources.waterLitres < 100) {
      if (learningProfile === 'junior') {
        return {
          title: '💧 We Need Water!',
          message: "Our water tank is getting low! Astronauts need water to drink and to make breathing air. Let's upgrade our water recycler!",
          hint: 'Click on the Water Extractor or buy a water upgrade!',
          mood: 'warning',
        };
      } else {
        return {
          title: '⚠️ Hydrology Warning',
          message: `Water reserves at ${Math.round(resources.waterLitres)} L. Electrolysis and greenhouse irrigation will be throttled if reserves hit zero.`,
          hint: 'Upgrade the water recycling processor or adjust greenhouse load.',
          mood: 'warning',
        };
      }
    }

    // Nominal Day 1 Welcome
    if (day === 1) {
      if (learningProfile === 'junior') {
        return {
          title: '👋 Welcome to the Moon, Explorer!',
          message: "I'm Astra, your astronaut friend! We just landed. Look around our 3D moon base! Click on any building or astronaut to see how it works.",
          hint: 'Press the bright blue "Next Day" button at the top to start mission time!',
          mood: 'happy',
        };
      } else if (learningProfile === 'cadet') {
        return {
          title: '🚀 Artemis Base Alpha Operational',
          message: "Welcome Cadet! You are in command of human survival on the Moon. Keep our 4 astronauts healthy and balance Power, Oxygen, Water, and Food.",
          hint: 'Try clicking on the Solar Arrays or Greenhouse in 3D to inspect telemetry.',
          mood: 'happy',
        };
      } else {
        return {
          title: '🎖️ Commander on Deck',
          message: "All life-support telemetry initialized. ECLSS closed-loop targets active. Prepare for the 14-day lunar night and solar flare contingencies.",
          hint: 'Review the Engineering Directives to unlock full Mars mission authorization.',
          mood: 'happy',
        };
      }
    }

    // General Positive Progress
    if (learningProfile === 'junior') {
      return {
        title: '⭐ Great Job, Commander!',
        message: `Day ${day} is going well! Our astronauts are happy and healthy. Did you know the Moon has only 1/6th of Earth's gravity? You can jump super high!`,
        hint: 'Click "Science Experiments" to play fun space games!',
        mood: 'happy',
      };
    } else if (learningProfile === 'cadet') {
      return {
        title: '📊 Mission Status Nominal',
        message: `Day ${day} progress: Crew vitals steady. Keep an eye on battery capacity and consider building a hydroponic greenhouse for fresh food.`,
        hint: 'Greenhouses need water and electricity, but produce 4 kg of food daily!',
        mood: 'happy',
      };
    } else {
      return {
        title: '📡 Outpost Telemetry Online',
        message: `Day ${day}: Systems operating within standard nominal thresholds. ECLSS water recovery is ${(gameState.waterRecyclingEfficiency * 100).toFixed(0)}%.`,
        hint: 'Inspect science citations in the header for exact NASA technical references.',
        mood: 'happy',
      };
    }
  };

  const dialogue = getCompanionDialogue();

  // Simple Speech synthesis simulation / accessibility reading
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(`${dialogue.title}. ${dialogue.message} ${dialogue.hint}`);
        utterance.rate = learningProfile === 'junior' ? 0.9 : 1.0;
        utterance.pitch = learningProfile === 'junior' ? 1.2 : 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      audioSystem.playTelemetryClick();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          audioSystem.playTelemetryClick();
          setIsOpen(true);
        }}
        title="Open Astronaut Guide"
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-glow-cyan hover:scale-105 transition flex items-center gap-2 font-bold text-xs"
      >
        <span className="text-xl animate-bounce">👩‍🚀</span>
        <span className="hidden sm:inline text-white font-mono">Astronaut Guide</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-lg">
            👩‍🚀
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">Astra — Mission Companion</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${profile.colorScheme.badgeBg}`}>
                {profile.badge}
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">{profile.ageRange}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Text-to-speech button */}
          <button
            onClick={handleSpeak}
            title={isSpeaking ? 'Stop Voice' : 'Read Out Loud (Voice Guide)'}
            className={`p-1.5 rounded-lg border text-xs transition ${
              isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => {
              audioSystem.playTelemetryClick();
              if (isSpeaking && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
              }
              setIsOpen(false);
            }}
            title="Minimize Guide"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dialogue Content */}
      <div className="space-y-2">
        <h4 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
          <span>{dialogue.title}</span>
        </h4>

        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {dialogue.message}
        </p>

        {/* Helpful Hint box */}
        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-[11px] flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">Astronaut Tip:</span>
            <p className="text-slate-300">{dialogue.hint}</p>
          </div>
        </div>

        {/* Action quick links */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {onOpenJuniorAdventure && learningProfile === 'junior' && (
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onOpenJuniorAdventure();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-amber transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Junior Adventure</span>
            </button>
          )}

          {onOpenExperiments && (
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onOpenExperiments();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Science Lab</span>
            </button>
          )}

          {onOpenResearch && learningProfile === 'commander' && (
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                onOpenResearch();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span>NASA Citations</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
