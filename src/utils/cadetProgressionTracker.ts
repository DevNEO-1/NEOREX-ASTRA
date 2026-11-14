/**
 * cadetProgressionTracker.ts
 *
 * Anti-farming gamification engine for NEOREX ASTRA.
 * Enforces strict single-claim semantics for educational activities,
 * planet astrometry discoveries, trivia quizzes, engineering directives,
 * and deliberate turn advancement rewards.
 */

const XP_STORAGE_KEY = 'astra_cadet_xp_v2';
const CLAIMED_ACTIVITIES_KEY = 'astra_claimed_activities_v2';
const COMPLETED_DIRECTIVES_KEY = 'astra_completed_directives_v2';

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

  public load(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const savedXp = localStorage.getItem(XP_STORAGE_KEY);
      if (savedXp) {
        const parsed = parseInt(savedXp, 10);
        if (!isNaN(parsed) && parsed >= 0) this.xp = parsed;
      }

      const savedClaims = localStorage.getItem(CLAIMED_ACTIVITIES_KEY);
      if (savedClaims) {
        const arr = JSON.parse(savedClaims);
        if (Array.isArray(arr)) {
          this.claimedSet = new Set(arr);
        }
      }

      const savedDirs = localStorage.getItem(COMPLETED_DIRECTIVES_KEY);
      if (savedDirs) {
        const arr = JSON.parse(savedDirs);
        if (Array.isArray(arr)) {
          this.directivesSet = new Set(arr);
        }
      }
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
    const key = `day_adv_${campaign}_${day}`;
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
      } catch {}
    }
  }
}

export const cadetTracker = new CadetProgressionTracker();
