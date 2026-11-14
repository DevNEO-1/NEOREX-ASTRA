import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  Volume2, 
  VolumeX, 
  Award, 
  FlaskConical 
} from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';

interface JuniorAdventureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvanceDay?: () => void;
  onOpenExperiments?: () => void;
  onOpenBadges?: () => void;
}

export interface JuniorStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  character: string;
  speechBubble: string;
  illustration: string;
  explanation: string;
  kidTakeaway: string;
  actionText: string;
  funFact: string;
}

export const JUNIOR_ADVENTURE_STEPS: JuniorStep[] = [
  {
    id: 1,
    badge: 'Step 1 of 9',
    title: 'Welcome, Junior Astronaut!',
    subtitle: 'Your space training starts now!',
    character: '👩‍🚀 Dr. Astra',
    speechBubble: "Hello! I am Dr. Astra, your astronaut friend! Welcome to the Moon! Are you ready for an awesome space adventure?",
    illustration: '🚀',
    explanation: 'You are now the leader of human exploration. Together with your crew, you will build and protect a real outpost on the Moon!',
    kidTakeaway: 'The Moon is Earth\'s closest space neighbor. It has no air and no water on its surface, so astronauts must bring their own!',
    actionText: 'Meet Dr. Astra',
    funFact: 'Did you know? Footprints made by Apollo astronauts on the Moon will stay there for millions of years because there is no wind to blow them away!',
  },
  {
    id: 2,
    badge: 'Step 2 of 9',
    title: 'Meet Dr. Astra & Your Crew',
    subtitle: 'Meet the 4 astronauts who count on you',
    character: '👩‍🚀 Dr. Astra',
    speechBubble: "Here is our astronaut team! We have Commander Maya, Engineer Leo, Botanist Chen, and Power Specialist Sara. They need you to keep them safe!",
    illustration: '🧑‍🚀',
    explanation: 'Every astronaut has a special job. When they have fresh air, clean water, tasty food, and cozy shelter, they do their best science!',
    kidTakeaway: 'Astronauts float in low gravity! On the Moon, you weigh 6 times less than on Earth. If you weigh 60 pounds on Earth, you only weigh 10 pounds on the Moon!',
    actionText: 'Explore Your Moon Base',
    funFact: 'Moon astronauts can jump higher than basketball stars because lunar gravity is so gentle!',
  },
  {
    id: 3,
    badge: 'Step 3 of 9',
    title: 'Explore Your Moon Base',
    subtitle: 'Discover domes, solar wings, and lunar rovers',
    character: '🌕 Moon Outpost',
    speechBubble: "Look at your 3D Moon base! You have a Command Dome, Solar Wings, Water Recycler, Cryo-Batteries, and our 6-wheel Exploration Rover!",
    illustration: '🏰',
    explanation: 'You can touch or click any building in the 3D world to inspect it. The buildings work together like a friendly space machine!',
    kidTakeaway: 'Every building helps your astronauts live, breathe, research, and drive across lunar craters.',
    actionText: 'Learn About Oxygen',
    funFact: 'The Artemis Base Alpha is built near the South Pole of the Moon, right on the rim of Shackleton Crater where water ice is hidden in deep shadows!',
  },
  {
    id: 4,
    badge: 'Step 4 of 9',
    title: 'Learn About Oxygen (Breathing Air)',
    subtitle: 'Keeping the habitat full of fresh air',
    character: '💨 Fresh Oxygen',
    speechBubble: "Breathe in... breathe out! Astronauts need oxygen to breathe. Your base must always have enough air!",
    illustration: '🌬️',
    explanation: 'There is no air to breathe in space! Our base uses electricity and water to make fresh oxygen every single day.',
    kidTakeaway: 'Always keep your Oxygen gauge high! If oxygen gets too low, astronauts get tired quickly.',
    actionText: 'Learn About Water',
    funFact: 'Plants in our greenhouse breathe in the carbon dioxide astronauts breathe out, and give back fresh, sweet oxygen!',
  },
  {
    id: 5,
    badge: 'Step 5 of 9',
    title: 'Learn About Water (Save Every Drop!)',
    subtitle: 'Clean, recycle, and refresh',
    character: '💧 Sparkling Water',
    speechBubble: "Water keeps astronauts healthy and strong! We must save and recycle every single drop.",
    illustration: '🚰',
    explanation: 'Water is heavy and expensive to rocket from Earth. Our smart machines filter astronaut moisture, showers, and sweat into pure, delicious drinking water!',
    kidTakeaway: 'ECLSS water recycling recovers 80% to 90%+ of our water, making our Moon home self-sufficient!',
    actionText: 'Learn About Solar Energy',
    funFact: 'Water recycled on a space station is even cleaner and purer than regular tap water back on Earth!',
  },
  {
    id: 6,
    badge: 'Step 6 of 9',
    title: 'Learn About Solar Energy',
    subtitle: 'Catching sunlight to power our base',
    character: '⚡ Solar Panels',
    speechBubble: "Solar panels collect bright sunlight and turn it into electricity! Our giant batteries store it for the dark night.",
    illustration: '☀️',
    explanation: 'During the 14-day lunar day, giant blue solar wings face the sun. They power our lights, heaters, and oxygen machines while charging batteries.',
    kidTakeaway: 'Before the long two-week lunar night arrives, we must store extra power in our batteries so we don\'t get cold in the dark!',
    actionText: 'Protect Your Astronauts',
    funFact: 'Real Science Note: In our simulator, day and night are rounded to 14 Earth days each for gameplay simplicity. In real astronomy, a lunar day-night cycle lasts 29.5 Earth days (about 14.75 days of sunlight and 14.75 days of dark)!',
  },
  {
    id: 7,
    badge: 'Step 7 of 9',
    title: 'Protect Your Astronauts (Radiation Shelter)',
    subtitle: 'Shielding against cosmic rays & space storms',
    character: '🛡️ Regolith Vault',
    speechBubble: "Space has invisible rays that can hurt astronauts. Our thick moon-dirt shelter helps protect them!",
    illustration: '🛡️',
    explanation: 'The Earth has an atmosphere and magnetic field that protects us. On the Moon, we use thick sintered lunar dirt (regolith) on our vault roof to block cosmic storms!',
    kidTakeaway: 'When a Solar Particle Storm strikes, astronauts take cover inside the reinforced shelter vault until the storm passes.',
    actionText: 'Complete Your First Mission',
    funFact: 'Real Science Note: Moon dirt is called "regolith". When heated with microwaves or solar concentrators, it bakes into solid bricks that provide passive mass shielding against solar particle storms!',
  },
  {
    id: 8,
    badge: 'Step 8 of 9',
    title: 'Complete Your First Mission!',
    subtitle: 'Survive Day 1 and lead humanity to the stars',
    character: '🎯 Mission Control',
    speechBubble: "You know all the space secrets now! Balance air, water, and power. Click 'Next Day' at the top of your console to advance mission time!",
    illustration: '🌟',
    explanation: 'Watch your resource numbers every day. If you need more power or water, visit the Construction shop to upgrade your base!',
    kidTakeaway: 'A true Junior Astronaut stays curious, checks gauges, and keeps their crew smiling.',
    actionText: 'Earn Your First Reward!',
    funFact: 'Real NASA flight controllers in Houston, Texas train for years to do what you are doing right now in NEOREX ASTRA!',
  },
  {
    id: 9,
    badge: 'Step 9 of 9',
    title: 'Earn Your Reward & Star Badges!',
    subtitle: 'Congratulations, Junior Space Commander!',
    character: '🏆 Dr. Astra',
    speechBubble: "Hooray! You earned the 'First Step on the Moon' Star Badge! Keep exploring to unlock Mars, greenhouses, and science experiments!",
    illustration: '🎖️',
    explanation: 'You completed the Junior Astronaut Space Adventure! You are officially ready to command Artemis Base Alpha and unlock Ares Outpost on Mars!',
    kidTakeaway: 'Collect all 7 Explorer Badges by building solar wings, growing space salad, and surviving the 14-day lunar night!',
    actionText: 'Launch Outpost Mission!',
    funFact: 'When you graduate from Junior Explorer, you can test your skills as a Space Cadet or Mission Commander anytime!',
  },
];

export const JuniorAdventureModal: React.FC<JuniorAdventureModalProps> = ({
  isOpen,
  onClose,
  onAdvanceDay,
  onOpenExperiments,
  onOpenBadges,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  if (!isOpen) return null;

  const step = JUNIOR_ADVENTURE_STEPS[currentStepIdx];
  const isFinalStep = currentStepIdx === JUNIOR_ADVENTURE_STEPS.length - 1;

  const handleNext = () => {
    audioSystem.playTelemetryClick();
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (isFinalStep) {
      audioSystem.playUpgradeChime();
      onClose();
      if (onAdvanceDay) onAdvanceDay();
    } else {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    audioSystem.playTelemetryClick();
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const textToRead = `${step.title}. ${step.speechBubble} ${step.explanation} Remember: ${step.kidTakeaway}`;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.92;
        utterance.pitch = 1.25;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      audioSystem.playTelemetryClick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 font-sans">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Rainbow Astronaut Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400" />

        {/* Close & Header Buttons */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🌟</span>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {step.badge}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                Junior Astronaut Adventure
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Read Aloud Voice Button */}
            <button
              onClick={handleSpeak}
              title={isSpeaking ? 'Stop Voice' : 'Dr. Astra Read Aloud Voice'}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isSpeaking
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-glow-amber animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Pause Voice' : 'Read to Me'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                audioSystem.playTelemetryClick();
                if (isSpeaking && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progression Indicators */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-4 overflow-x-auto pb-1">
          {JUNIOR_ADVENTURE_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                audioSystem.playTelemetryClick();
                setCurrentStepIdx(idx);
              }}
              title={s.title}
              className={`h-2 rounded-full transition-all flex-1 min-w-[18px] ${
                idx === currentStepIdx
                  ? 'bg-amber-400 shadow-glow-amber h-2.5'
                  : idx < currentStepIdx
                  ? 'bg-emerald-400'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Main Title & Friendly Subtitle */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{step.illustration}</span>
              <span>{step.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-amber-300 font-medium mt-0.5">
              {step.subtitle}
            </p>
          </div>

          {/* Dr. Astra Speech Bubble */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 relative shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">👩‍🚀</span>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  {step.character} Speaks:
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">
                  "{step.speechBubble}"
                </p>
              </div>
            </div>
          </div>

          {/* Educational Concept Explanation */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
              <Sparkles className="w-4 h-4" />
              <span>Space Science in Plain English:</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {step.explanation}
            </p>
          </div>

          {/* Kid Takeaway Rule */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Junior Astronaut Rule:
              </span>
              <p className="text-xs sm:text-sm text-emerald-200 font-semibold mt-0.5">
                {step.kidTakeaway}
              </p>
            </div>
          </div>

          {/* NASA Fun Fact */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="italic">{step.funFact}</span>
          </div>

          {/* Quick links to Badges and Experiments */}
          {isFinalStep && (
            <div className="flex items-center gap-2 pt-2">
              {onOpenBadges && (
                <button
                  onClick={() => {
                    audioSystem.playUpgradeChime();
                    onOpenBadges();
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Award className="w-4 h-4" />
                  <span>View All 7 Explorer Badges</span>
                </button>
              )}
              {onOpenExperiments && (
                <button
                  onClick={() => {
                    audioSystem.playTelemetryClick();
                    onOpenExperiments();
                  }}
                  className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Try Space Experiments</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Bottom Actions Bar with Big Kid-Friendly Buttons */}
        <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              currentStepIdx === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-glow-amber transition flex items-center gap-2 transform active:scale-95"
            >
              <span>{step.actionText}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
