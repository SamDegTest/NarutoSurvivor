// ============================================================
//  NarutoSurvivor — Difficulty & Dynamic Scaling System
//  Controls progressive difficulty scaling: easy at start, ramping up over time
// ============================================================

export interface ThreatTier {
  id: string;
  nameIT: string;
  minSec: number;
  maxSec: number;
  badgeText: string;
  color: number;
}

export const THREAT_TIERS: ThreatTier[] = [
  {
    id: 'bassa',
    nameIT: 'Bassa (Apprendista)',
    minSec: 0,
    maxSec: 90,
    badgeText: 'BASSA 🟢',
    color: 0x22C55E, // Green
  },
  {
    id: 'moderata',
    nameIT: 'Moderata (Genin)',
    minSec: 90,
    maxSec: 180,
    badgeText: 'MODERATA 🟡',
    color: 0xEAB308, // Yellow
  },
  {
    id: 'elevata',
    nameIT: 'Elevata (Chūnin)',
    minSec: 180,
    maxSec: 360,
    badgeText: 'ELEVATA 🟠',
    color: 0xF97316, // Orange
  },
  {
    id: 'pericolosa',
    nameIT: 'Pericolosa (Jōnin)',
    minSec: 360,
    maxSec: 600,
    badgeText: 'PERICOLOSA 🔴',
    color: 0xEF4444, // Red
  },
  {
    id: 'estrema',
    nameIT: 'Estrema (Anbu / Sannin)',
    minSec: 600,
    maxSec: 900,
    badgeText: 'ESTREMA 🟣',
    color: 0xA855F7, // Purple
  },
  {
    id: 'apocalisse',
    nameIT: 'Apocalisse (Kage / Shinobi War)',
    minSec: 900,
    maxSec: Infinity,
    badgeText: 'APOCALISSE ☠️',
    color: 0xEC4899, // Magenta/Crimson
  },
];

export interface DifficultySnapshot {
  elapsedSec: number;
  minute: number;
  threatTier: ThreatTier;
  tierChanged: boolean;
  enemyBudget: number;
  spawnIntervalSec: number;
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  eliteChance: number;
  expMultiplier: number;
}

export class DifficultyManager {
  private lastTierId = '';
  private lastSurgeMinute = -1;

  reset(): void {
    this.lastTierId = '';
    this.lastSurgeMinute = -1;
  }

  getCurrentTier(elapsedSec: number): ThreatTier {
    for (let i = THREAT_TIERS.length - 1; i >= 0; i--) {
      if (elapsedSec >= THREAT_TIERS[i].minSec) {
        return THREAT_TIERS[i];
      }
    }
    return THREAT_TIERS[0];
  }

  getSnapshot(elapsedSec: number): DifficultySnapshot {
    const minute = elapsedSec / 60;
    const tier = this.getCurrentTier(elapsedSec);
    const tierChanged = tier.id !== this.lastTierId;
    if (tierChanged) {
      this.lastTierId = tier.id;
    }

    // ── 1. Enemy Budget: starts at 4, scales smoothly up to 150+ ─
    // t=0: 4, t=1m: 12, t=2m: 22, t=3m: 35, t=5m: 58, t=10m: 110, t=15m: 150
    const baseBudget = 4 + 8 * minute;
    const lateSurge = Math.pow(Math.max(0, minute - 1), 1.35) * 3.8;
    const enemyBudget = Math.min(160, Math.floor(baseBudget + lateSurge));

    // ── 2. Spawn Interval: starts at 2.6s, drops to 0.85s ───────
    const spawnIntervalSec = Math.max(0.85, 2.6 - minute * 0.16);

    // ── 3. HP Multiplier: early is 0.50x (dies in 1-2 hits), ramps up ─
    // minute 0: 0.50x | minute 1: 0.80x | minute 3: 1.50x | minute 5: 2.50x | minute 10: 5.50x
    const hpMultiplier = 0.50 + 0.30 * minute + Math.pow(Math.max(0, minute - 1), 1.55) * 0.12;

    // ── 4. Speed Multiplier: early 0.70x (easy kiting), ramps up to 1.40x ─
    const speedMultiplier = Math.min(1.40, 0.70 + 0.08 * minute);

    // ── 5. Damage Multiplier: early 0.50x (forgiving), ramps up to 3.5x ─
    const damageMultiplier = 0.50 + 0.22 * minute + Math.pow(Math.max(0, minute - 2), 1.35) * 0.08;

    // ── 6. Elite Spawn Chance: 0% until 2 min, up to 30% at 10 min ─
    const eliteChance = Math.min(0.30, Math.max(0, (minute - 1.8) * 0.04));

    // ── 7. EXP multiplier: small scale so high level enemies yield more reward ─
    const expMultiplier = 1 + minute * 0.10;

    return {
      elapsedSec,
      minute,
      threatTier: tier,
      tierChanged,
      enemyBudget,
      spawnIntervalSec,
      hpMultiplier,
      speedMultiplier,
      damageMultiplier,
      eliteChance,
      expMultiplier,
    };
  }

  /**
   * Determine enemy type based on current game time
   */
  pickEnemyType(elapsedSec: number): 'zetsu' | 'traitor_ninja' | 'anbu_corrupt' | 'summon' {
    const minute = elapsedSec / 60;
    const r = Math.random();

    // 0:00 - 1:15 -> 100% White Zetsu (very easy)
    if (minute < 1.25) {
      return 'zetsu';
    }

    // 1:15 - 3:00 -> 75% Zetsu, 25% Traitor Ninja
    if (minute < 3.0) {
      return r < 0.25 ? 'traitor_ninja' : 'zetsu';
    }

    // 3:00 - 5:30 -> 45% Zetsu, 35% Traitor Ninja, 20% ANBU Corrupt
    if (minute < 5.5) {
      if (r < 0.20) return 'anbu_corrupt';
      if (r < 0.55) return 'traitor_ninja';
      return 'zetsu';
    }

    // 5:30 - 8:30 -> 30% Zetsu, 35% Traitor Ninja, 22% ANBU Corrupt, 13% Giant Summon
    if (minute < 8.5) {
      if (r < 0.13) return 'summon';
      if (r < 0.35) return 'anbu_corrupt';
      if (r < 0.70) return 'traitor_ninja';
      return 'zetsu';
    }

    // 8:30+ -> Nightmare mix: 15% Zetsu, 35% Traitor Ninja, 30% ANBU Corrupt, 20% Giant Summon
    if (r < 0.20) return 'summon';
    if (r < 0.50) return 'anbu_corrupt';
    if (r < 0.85) return 'traitor_ninja';
    return 'zetsu';
  }

  /**
   * Check for periodic horde rush surges (e.g. at 1:30, 4:30, 8:00, 13:00, 17:00)
   */
  checkSurge(elapsedSec: number): boolean {
    const surgeTimes = [90, 270, 480, 780, 1020];
    for (const t of surgeTimes) {
      if (Math.abs(elapsedSec - t) < 0.8 && this.lastSurgeMinute !== t) {
        this.lastSurgeMinute = t;
        return true;
      }
    }
    return false;
  }
}

export const difficultyManager = new DifficultyManager();
