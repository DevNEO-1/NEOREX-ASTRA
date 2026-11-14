/**
 * cadetProgressionTracker.ts
 *
 * Anti-farming gamification engine for NEOREX ASTRA.
 * Enforces strict single-claim semantics for educational activities,
 * planet astrometry discoveries, trivia quizzes, engineering directives,
 * campaign-scoped facility actions, and deliberate turn advancement rewards.
 *
 * Automatically migrates legacy v1 keys ('astra_cadet_xp', 'astra_completed_directives')
 * into secure v2 persistence without double-rewarding or data loss.
 */

export const LEGACY_XP_STORAGE_KEY = 'astra_cadet_xp';
export const LEGACY_DIRECTIVES_STORAGE_KEY = 'astra_completed_directives';

export const XP_STORAGE_KEY = 'astra_cadet_xp_v2';
export const CLAIMED_ACTIVITIES_KEY = 'astra_claimed_activities_v2';
export const COMPLETED_DIRECTIVES_KEY = 'astra_completed_directives_v2';

export interface XPAwardResult {
  awarded: boolean;
  amount: number;
  newXp: number;
  reason: string;
}

export class CadetProgressionTracker {
  private xp: number;
  private claimedSet: Set<string>;
  private directivesSet: Set<string>;

  constructor() {
    this.xp = 120; // Default Cadet Trainee starting baseline
    this.claimedSet = new Set<string>();
    this.directivesSet = new Set<string>();
    this.load();
  }

  /**
   * Safely loads and parses progression data.
   * Handles migration from legacy v1 keys and guards against corrupted JSON or malformed entries.
   */
  public load(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // 1. Check v2 state first
      const savedXp = localStorage.getItem(XP_STORAGE_KEY);
      let loadedXp: number | null = null;
      if (savedXp !== null) {
        const parsed = parseInt(savedXp, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          loadedXp = parsed;
        }
      }

      // Check legacy v1 XP if v2 is not yet initialized
      if (loadedXp === null) {
        const legacyXp = localStorage.getItem(LEGACY_XP_STORAGE_KEY);
        if (legacyXp !== null) {
          const parsedLegacy = parseInt(legacyXp, 10);
          if (!isNaN(parsedLegacy) && parsedLegacy >= 0) {
            loadedXp = Math.max(120, parsedLegacy);
          }
        }
      }
      this.xp = loadedXp !== null ? loadedXp : 120;

      // 2. Hydrate claimed activities
      const savedClaims = localStorage.getItem(CLAIMED_ACTIVITIES_KEY);
      if (savedClaims !== null) {
        try {
          const arr = JSON.parse(savedClaims);
          if (Array.isArray(arr)) {
            this.claimedSet = new Set(arr.filter((item): item is string => typeof item === 'string'));
          }
        } catch {
          console.warn('[CadetTracker] Corrupted claimed activities JSON, resetting claims set.');
          this.claimedSet = new Set<string>();
        }
      }

      // 3. Hydrate directives (with legacy migration)
      let directivesLoaded = false;
      const savedDirs = localStorage.getItem(COMPLETED_DIRECTIVES_KEY);
      if (savedDirs !== null) {
        try {
          const arr = JSON.parse(savedDirs);
          if (Array.isArray(arr)) {
            this.directivesSet = new Set(arr.filter((item): item is string => typeof item === 'string'));
            directivesLoaded = true;
          }
        } catch {
          console.warn('[CadetTracker] Corrupted completed directives JSON.');
        }
      }

      // Migrate legacy directives if v2 directives key was empty or absent
      if (!directivesLoaded) {
        const legacyDirs = localStorage.getItem(LEGACY_DIRECTIVES_STORAGE_KEY);
        if (legacyDirs !== null) {
          try {
            const arr = JSON.parse(legacyDirs);
            if (Array.isArray(arr)) {
              for (const d of arr) {
                if (typeof d === 'string') {
                  this.directivesSet.add(d);
                  this.claimedSet.add(`directive_${d}`);
                }
              }
            }
          } catch {
            console.warn('[CadetTracker] Corrupted legacy directives JSON.');
          }
        }
      }

      // Ensure baseline starting directive exists if empty
      if (this.directivesSet.size === 0) {
        this.directivesSet.add('step_sim');
        this.claimedSet.add('directive_step_sim');
      }

      // Save migrated state to v2 format
      this.save();
    } catch (err) {
      console.warn('[CadetTracker] Error hydrating progression from localStorage', err);
    }
  }

  public save(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(XP_STORAGE_KEY, String(this.xp));
      localStorage.setItem(CLAIMED_ACTIVITIES_KEY, JSON.stringify(Array.from(this.claimedSet)));
      localStorage.setItem(COMPLETED_DIRECTIVES_KEY, JSON.stringify(Array.from(this.directivesSet)));
    } catch (err) {
      console.warn('[CadetTracker] Error saving progression to localStorage', err);
    }
  }

  public getXp(): number {
    return this.xp;
  }

  public getClaimedActivities(): string[] {
    return Array.from(this.claimedSet);
  }

  public getCompletedDirectives(): string[] {
    return Array.from(this.directivesSet);
  }

  public isClaimed(activityId: string): boolean {
    return this.claimedSet.has(activityId);
  }

  /**
   * Attempts to claim an XP reward for a uniquely identified educational task.
   * If already claimed, rejects the claim and returns { awarded: false }.
   */
  public claimReward(activityId: string, amount: number, reason: string): XPAwardResult {
    if (!activityId || typeof activityId !== 'string') {
      return { awarded: false, amount: 0, newXp: this.xp, reason: 'Invalid activity identifier' };
    }
    if (amount <= 0) {
      return { awarded: false, amount: 0, newXp: this.xp, reason: 'Amount must be positive' };
    }

    if (this.claimedSet.has(activityId)) {
      return {
        awarded: false,
        amount: 0,
        newXp: this.xp,
        reason: `Activity already rewarded: ${activityId}`,
      };
    }

    this.claimedSet.add(activityId);
    this.xp += amount;
    this.save();

    return {
      awarded: true,
      amount,
      newXp: this.xp,
      reason,
    };
  }

  /**
   * Completes a formal engineering directive, claiming its XP once.
   */
  public claimDirective(directiveId: string, xpReward: number = 40): XPAwardResult {
    if (this.directivesSet.has(directiveId)) {
      return { awarded: false, amount: 0, newXp: this.xp, reason: 'Directive already claimed' };
    }
    this.directivesSet.add(directiveId);
    return this.claimReward(`directive_${directiveId}`, xpReward, `Directive Completed: ${directiveId.toUpperCase()}`);
  }

  /**
   * Turn advancement XP policy:
   * Players receive +25 XP the first time each mission day is reached in a campaign.
   */
  public recordDayAdvancement(campaign: string, day: number): XPAwardResult {
    const key = `day_adv_${campaign.toLowerCase()}_${day}`;
    return this.claimReward(key, 25, `Day ${day} Mission Telemetry Logged`);
  }

  /**
   * Resets all persistent progression state (for testing or profile wipes).
   */
  public resetAll(): void {
    this.xp = 120;
    this.claimedSet.clear();
    this.directivesSet.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(XP_STORAGE_KEY);
        localStorage.removeItem(CLAIMED_ACTIVITIES_KEY);
        localStorage.removeItem(COMPLETED_DIRECTIVES_KEY);
        localStorage.removeItem(LEGACY_XP_STORAGE_KEY);
        localStorage.removeItem(LEGACY_DIRECTIVES_STORAGE_KEY);
      } catch {}
    }
  }
}

export const cadetTracker = new CadetProgressionTracker();
