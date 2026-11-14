import React, { useState, useEffect } from 'react';
import { Rocket, FastForward, Globe, Moon, Sparkles, Shield, Compass } from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  // Steps: 0 (Void), 1 (Stars drift), 2 (Earth rises), 3 (Moon approach), 4 (Lunar surface), 5 (Title assembly), 6 (Ready)
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600),   // Starfield awakens
      setTimeout(() => setStep(2), 2200),  // Earth rises
      setTimeout(() => setStep(3), 4200),  // Moon approaches
      setTimeout(() => setStep(4), 6200),  // Lunar surface visible
      setTimeout(() => setStep(5), 8000),  // Logo assembly & title
      setTimeout(() => setStep(6), 9600),  // Ready button appears
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleStart = () => {
    audioSystem.playUpgradeChime();
    audioSystem.startAmbient();
    onComplete();
  };

  const handleSkip = () => {
    audioSystem.playClick();
    audioSystem.startAmbient();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      
      {/* 1. Deep Space Dynamic Starfield Canvas Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated stars */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-black" />
        
        {/* Procedural star particles */}
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `radial-gradient(1.5px 1.5px at 20px 30px, #ffffff, rgba(0,0,0,0)),
                              radial-gradient(1px 1px at 40px 70px, #00f2fe, rgba(0,0,0,0)),
                              radial-gradient(2px 2px at 90px 40px, #93c5fd, rgba(0,0,0,0)),
                              radial-gradient(1.5px 1.5px at 160px 120px, #ffffff, rgba(0,0,0,0)),
                              radial-gradient(1.5px 1.5px at 240px 210px, #38bdf8, rgba(0,0,0,0))`,
            backgroundSize: '320px 320px',
            animation: 'pulse-subtle 4s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* 2. Skip Intro Button (Top Right) */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-cyan-400 transition backdrop-blur-md"
      >
        <span>SKIP SEQUENCE</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>

      {/* 3. Celestial Spheres (Earth & Moon Trajectory) */}
      <div className="relative w-full max-w-2xl h-64 flex items-center justify-center my-6">
        
        {/* Earth with atmospheric glow */}
        <div className={`absolute transition-all duration-1000 ease-out flex flex-col items-center ${
          step >= 2 
            ? step >= 4 
              ? 'scale-50 -translate-x-48 -translate-y-20 opacity-40' 
              : 'scale-100 translate-x-0 translate-y-0 opacity-100'
            : 'scale-0 opacity-0'
        }`}>
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-blue-900 via-sky-600 to-cyan-400 shadow-[0_0_60px_10px_rgba(56,189,248,0.35)] flex items-center justify-center">
            {/* Cloud swirls */}
            <div className="absolute inset-2 rounded-full border border-white/20 border-dashed animate-spin-slow opacity-60" />
            <Globe className="w-20 h-20 text-white/30" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-cyan-400/80 mt-2">EARTH • 384,400 KM</span>
        </div>

        {/* Moon Approach */}
        <div className={`absolute transition-all duration-1000 ease-out flex flex-col items-center ${
          step >= 3
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-50 opacity-0 translate-y-24'
        }`}>
          <div className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-400 shadow-[0_0_50px_5px_rgba(203,213,225,0.2)] flex items-center justify-center overflow-hidden border border-slate-600/40">
            {/* Crater shadows */}
            <div className="absolute w-12 h-12 rounded-full bg-slate-900/60 top-6 left-8 blur-[1px]" />
            <div className="absolute w-16 h-16 rounded-full bg-slate-900/70 bottom-6 right-10 blur-[1px]" />
            <div className="absolute w-8 h-8 rounded-full bg-slate-900/80 top-16 right-8" />
            <Moon className="w-24 h-24 text-slate-900/30" />
            
            {/* Landing site beacon crosshair */}
            {step >= 4 && (
              <div className="absolute bottom-8 left-16 flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow-cyan" />
                <span className="text-[9px] font-mono font-bold text-cyan-300 bg-slate-950/80 px-1 rounded border border-cyan-500/50">
                  SHACKLETON BASE
                </span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 mt-2">
            TARGET DESTINATION: LUNAR SOUTH POLE
          </span>
        </div>

      </div>

      {/* 4. Cinematic Title & Typography Assembly */}
      <div className="text-center z-10 px-4 max-w-xl">
        
        {/* Mission Badge Tag */}
        <div className={`transition-all duration-700 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NASA SPACE APPS CHALLENGE 2026</span>
          </div>
        </div>

        {/* Main Title Assembly */}
        <div className={`transition-all duration-1000 ${step >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.6)]">
            ASTRA OUTPOST
          </h1>
          <p className="text-xs sm:text-sm font-mono tracking-widest text-slate-400 uppercase mt-2">
            Humanity's Next Frontier • Junior Astronaut Mission Trainer
          </p>
        </div>

        {/* Mission Narrative Teaser */}
        <div className={`mt-4 text-xs text-slate-300 leading-relaxed transition-all duration-700 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>
          Command humanity's first lunar surface settlement. Balance life support, closed-loop water recovery, solar power grids, and survive the punishing 14-day continuous lunar night.
        </div>

        {/* 5. Start Mission Action Button */}
        <div className={`mt-8 transition-all duration-700 ${step >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <button
            onClick={handleStart}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wider text-sm transition-all duration-200 shadow-glow-cyan hover:scale-105 active:scale-95"
          >
            <Rocket className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span>AUTHORIZE MISSION LAUNCH</span>
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono mt-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400" /> Artemis Base Alpha
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" /> 30-Day Expedition
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
