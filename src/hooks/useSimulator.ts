import { useState, useEffect, useCallback } from 'react';
import { GameState, PlanetType } from '../simulator/types';
import { createInitialGameState } from '../simulator/campaign';
import { stepSimulationDay } from '../simulator/engine';
import { buildUpgrade, toggleSystemControl, ConstructionUpgradeType } from '../simulator/construction';
import { resolveEventChoice } from '../simulator/events';

const STORAGE_KEY = 'neorex_astra_state_v1';
const MARS_UNLOCK_KEY = 'neorex_astra_mars_unlocked';

export function useSimulator() {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Check saved state in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const marsUnlockedStored = localStorage.getItem(MARS_UNLOCK_KEY) === 'true';
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          marsUnlocked: parsed.marsUnlocked || marsUnlockedStored,
        };
      }
      const initial = createInitialGameState('moon');
      initial.marsUnlocked = marsUnlockedStored;
      return initial;
    } catch {
      return createInitialGameState('moon');
    }
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(1800);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      if (gameState.marsUnlocked) {
        localStorage.setItem(MARS_UNLOCK_KEY, 'true');
      }
    } catch (e) {
      console.warn('Failed to persist mission state to localStorage', e);
    }
  }, [gameState]);

  // Advance 1 day
  const advanceDay = useCallback(() => {
    setGameState(prev => {
      if (prev.isMissionOver) return prev;
      return stepSimulationDay(prev);
    });
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || gameState.isMissionOver) {
      if (isPlaying) setIsPlaying(false);
      return;
    }

    const timer = setInterval(() => {
      advanceDay();
    }, playSpeedMs);

    return () => clearInterval(timer);
  }, [isPlaying, gameState.isMissionOver, advanceDay, playSpeedMs]);

  // Upgrade Purchase
  const purchaseUpgrade = useCallback((upgradeType: ConstructionUpgradeType) => {
    setGameState(prev => {
      const res = buildUpgrade(prev, upgradeType);
      return res.newState;
    });
  }, []);

  // Toggle Load Shedding
  const toggleControl = useCallback((control: 'electrolysis' | 'greenhouses' | 'emergencyRationing', value?: boolean) => {
    setGameState(prev => toggleSystemControl(prev, control, value));
  }, []);

  // Resolve Event
  const chooseEventOption = useCallback((eventId: string, choiceId: string) => {
    setGameState(prev => resolveEventChoice(prev, eventId, choiceId));
  }, []);

  // Reset or Switch Campaign
  const startNewMission = useCallback((campaign: PlanetType, difficulty: 'cadet' | 'commander' | 'hardcore' = 'commander') => {
    const marsUnlockedStored = localStorage.getItem(MARS_UNLOCK_KEY) === 'true';
    const newState = createInitialGameState(campaign, difficulty);
    newState.marsUnlocked = marsUnlockedStored || gameState.marsUnlocked;
    setGameState(newState);
    setIsPlaying(false);
  }, [gameState.marsUnlocked]);

  return {
    gameState,
    isPlaying,
    setIsPlaying,
    playSpeedMs,
    setPlaySpeedMs,
    advanceDay,
    purchaseUpgrade,
    toggleControl,
    chooseEventOption,
    startNewMission,
  };
}
