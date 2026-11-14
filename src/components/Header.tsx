import React, { useState, useEffect } from 'react';
import { GameState } from '../simulator/types';
import { audioSystem } from '../utils/audioSystem';
import { 
  Play, 
  Pause, 
  ChevronRight, 
  RotateCcw, 
  Sun, 
  Moon, 
  BookOpen, 
  Compass, 
  Award,
  Volume2,
  VolumeX
} from 'lucide-react';

interface HeaderProps {
  gameState: GameState;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAdvanceDay: () => void;
  onReset: () => void;
  onOpenCampaignModal: () => void;
  onOpenResearchModal: () => void;
  onOpenDebriefModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameState,
  isPlaying,
  onTogglePlay,
  onAdvanceDay,
  onReset,
  onOpenCampaignModal,
  onOpenResearchModal,
  onOpenDebriefModal,
}) => {
  const { day, totalDays, isDaylight, campaign, isMissionOver } = gameState;
  const [isMuted, setIsMuted] = useState<boolean>(audioSystem.getMuted());

  useEffect(() => {
    setIsMuted(audioSystem.getMuted());
  }, []);

  const handleToggleMute = () => {
    const nextMuted = audioSystem.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      audioSystem.playTelemetryClick();
    }
  };

  // Calculate daylight countdown
  let daylightStatusText = '';
  if (campaign === 'moon') {
    if (day <= 14) {
      daylightStatusText = `Daylight: ${15 - day} days until Lunar Sunset`;
    } else if (day <= 28) {
      daylightStatusText = `Lunar Night: ${29 - day} days until Lunar Sunrise`;
    } else {
      daylightStatusText = 'Dawn: Sunlight returning';
    }
  } else {
    daylightStatusText = 'Martian Sol: Diurnal cycle nominal';
  }

  const uncompletedObjectives = gameState.objectives.filter(o => !o.achieved).length;

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Project Branding & Campaign Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-glow-cyan text-sm">
              ▲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  NEOREX ASTRA
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {campaign === 'moon' ? 'Artemis Base Alpha' : 'Ares Prime'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>NASA Space Apps 2026</span>
                <span className="text-slate-600">•</span>
                <span className="capitalize text-slate-300 font-medium">{gameState.difficulty} Mode</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenCampaignModal}
            className="md:hidden p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map</span>
          </button>
        </div>

        {/* Center: Mission Day & Daylight Cycle Telemetry */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 w-full md:w-auto justify-around md:justify-center">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Mission Clock</div>
            <div className="text-lg font-black text-white tracking-wide font-mono">
              Day {day} <span className="text-xs text-slate-500 font-normal">/ {totalDays}</span>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800 mx-1" />

          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDaylight ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
              {isDaylight ? <Sun className="w-4 h-4 animate-spin-slow" /> : <Moon className="w-4 h-4" />}
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span>{isDaylight ? 'Solar Daylight' : 'Lunar Darkness'}</span>
              </div>
              <div className="text-xs font-medium text-slate-200">
                {daylightStatusText}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls & Navigation */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Mission Debrief button (if completed) */}
          {isMissionOver && (
            <button
              onClick={onOpenDebriefModal}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-amber animate-bounce"
            >
              <Award className="w-4 h-4" />
              <span>Debrief</span>
            </button>
          )}

          {/* Campaign Selector Modal button */}
          <button
            onClick={onOpenCampaignModal}
            title="Campaign Selector & Objectives"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Campaign</span>
            {uncompletedObjectives > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                {uncompletedObjectives}
              </span>
            )}
          </button>

          {/* Scientific Research Modal */}
          <button
            onClick={onOpenResearchModal}
            title="NASA Scientific References & Research"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Science Citations</span>
          </button>

          {/* Audio Synthesizer Control */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Web Audio Ambience & Telemetry' : 'Mute Web Audio'}
            className={`p-1.5 rounded-lg border text-xs font-medium transition ${
              isMuted
                ? 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Reset Mission */}
          <button
            onClick={onReset}
            title="Restart Mission"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Auto Play / Pause */}
          <button
            onClick={onTogglePlay}
            disabled={isMissionOver}
            className={`p-1.5 rounded-lg border text-xs font-medium transition ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 disabled:opacity-50'
            }`}
            title={isPlaying ? 'Pause Auto-Advance' : 'Auto-Advance Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Manual Step Day Button */}
          <button
            onClick={onAdvanceDay}
            disabled={isMissionOver || isPlaying}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next Day</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>

        </div>

      </div>
    </header>
  );
};
