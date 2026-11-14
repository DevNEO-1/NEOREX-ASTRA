import React, { useState, useRef, useEffect } from 'react';
import { GameState } from '../simulator/types';
import { LearningProfileTier, LEARNING_PROFILES } from '../simulator/learningProfiles';
import { audioSystem } from '../utils/audioSystem';
import { sendDrAstraMessage } from '../services/drAstraClient';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Lightbulb,
  Send,
  Loader2,
  Bot,
  User,
  WifiOff,
  RotateCcw
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isFallback?: boolean;
}

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
  const [chatInput, setChatInput] = useState('');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const profile = LEARNING_PROFILES[learningProfile];

  // Auto-scroll chat transcript to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation, isLoadingAi]);

  const handleAskDrAstra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoadingAi) return;

    const questionText = chatInput.trim();
    // Rule 8: Do not clear user input until it has been safely added to transcript
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toISOString(),
    };

    setConversation(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoadingAi(true);
    audioSystem.playTelemetryClick();

    try {
      const result = await sendDrAstraMessage(questionText, gameState, learningProfile);
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: 'assistant',
        text: result.response,
        timestamp: result.timestamp || new Date().toISOString(),
        isFallback: result.isFallback,
      };
      setConversation(prev => [...prev, assistantMsg]);
      audioSystem.playUpgradeChime();
    } catch {
      // In case of unexpected rejection, add a safe offline assistant message
      const fallbackMsg: ChatMessage = {
        id: `ast_err_${Date.now()}`,
        sender: 'assistant',
        text: `Dr. Astra is operating in local safe mode on Day ${gameState.day}. Life support and solar power buffers remain stable. Ask about oxygen, water recycling, batteries, or space!`,
        timestamp: new Date().toISOString(),
        isFallback: true,
      };
      setConversation(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoadingAi(false);
    }
  };

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

  // Voice guidance TTS using Web Speech API
  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const latestText = conversation.length > 0
      ? conversation[conversation.length - 1].text
      : dialogue.message;

    const utterance = new SpeechSynthesisUtterance(latestText);
    utterance.rate = learningProfile === 'junior' ? 0.9 : 1.0;
    utterance.pitch = 1.05;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          audioSystem.playTelemetryClick();
          setIsOpen(true);
        }}
        title="Open Dr. Astra Assistant"
        className="fixed bottom-4 right-4 z-40 p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-cyan-300/40"
      >
        <span className="text-xl">👩‍🚀</span>
        <span className="text-xs font-bold font-sans tracking-wide pr-1 hidden sm:inline">Dr. Astra</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-2xl text-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 font-sans">
      
      {/* Top Header Card */}
      <div className="p-3 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg shadow-inner">
            👩‍🚀
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-xs text-white">Dr. Astra</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {profile.label}
              </span>
            </div>
            <p className="text-[10px] text-cyan-200/80">Astronaut Mentor & Science Teacher</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {'speechSynthesis' in window && (
            <button
              onClick={handleToggleVoice}
              title={isSpeaking ? "Mute Voice" : "Read Aloud"}
              className={`p-1.5 rounded-lg border transition ${
                isSpeaking 
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}

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

      {/* Main Dialogue & Conversation Transcript */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
            <span>{dialogue.title}</span>
          </h4>
          {conversation.length > 0 && (
            <button
              onClick={() => {
                setConversation([]);
                audioSystem.playTelemetryClick();
              }}
              className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
              title="Reset Chat Transcript"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Chat</span>
            </button>
          )}
        </div>

        {/* Conversation Transcript Window */}
        <div 
          ref={chatScrollRef}
          className="max-h-56 min-h-[5.5rem] overflow-y-auto space-y-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs custom-scrollbar"
        >
          {/* Mission Guidance Starter */}
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              <Bot className="w-3 h-3 text-cyan-400" />
              <span>Dr. Astra Mission Telemetry</span>
            </div>
            <p className="text-[11.5px] leading-relaxed font-sans">{dialogue.message}</p>
          </div>

          {/* User & Assistant Conversation Messages */}
          {conversation.map(msg => (
            <div 
              key={msg.id}
              className={`p-2 rounded-lg animate-in fade-in space-y-1 ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/50 border border-cyan-700/60 text-cyan-100 ml-4'
                  : 'bg-slate-900/90 border border-slate-700/80 text-slate-200 mr-2 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold flex items-center gap-1">
                  {msg.sender === 'user' ? (
                    <>
                      <User className="w-3 h-3 text-cyan-300" />
                      <span className="text-cyan-300">You</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300">Dr. Astra</span>
                      {msg.isFallback ? (
                        <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5" title="Local deterministic educational guidance engaged">
                          <WifiOff className="w-2.5 h-2.5" />
                          <span>Local Guidance</span>
                        </span>
                      ) : (
                        <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ● Live Gemini
                        </span>
                      )}
                    </>
                  )}
                </span>
                <span className="text-slate-500 text-[9px] font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed font-sans select-text whitespace-pre-wrap">
                {msg.text}
              </p>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoadingAi && (
            <div className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/30 text-cyan-300 flex items-center gap-2 animate-pulse text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Dr. Astra is analyzing mission telemetry...</span>
            </div>
          )}
        </div>

        {/* Ask Dr. Astra AI Input Bar */}
        <form onSubmit={handleAskDrAstra} className="flex items-center gap-1.5 pt-0.5">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              learningProfile === 'junior'
                ? "Ask Dr. Astra a space question..."
                : learningProfile === 'cadet'
                ? "Ask about water, power, oxygen, or crops..."
                : "Query ECLSS telemetry, radiation, or systems..."
            }
            maxLength={300}
            disabled={isLoadingAi}
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-cyan-500 text-xs text-white placeholder-slate-500 outline-none transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoadingAi || !chatInput.trim()}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 transition flex items-center justify-center shrink-0 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            title="Send Question"
          >
            {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Helpful Hint box */}
        <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-[11px] flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">Astronaut Tip:</span>
            <p className="text-slate-300 text-[10.5px] leading-tight">{dialogue.hint}</p>
          </div>
        </div>

        {/* Action quick links */}
        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
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
