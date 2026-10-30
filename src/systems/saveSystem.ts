// ============================================================
//  NarutoSurvivor — Save & Progression Profile System
//  Persists player profile in localStorage
// ============================================================

import type { StarRank } from '../types/character';

const SAVE_KEY = 'naruto_survivor_profile_v2';

export const STARTER_CHARACTER_IDS = [
  'naruto_genin',
  'sasuke_genin',
  'sakura_genin',
];

export interface NextRunBuffs {
  ichirakuRamen?: boolean; // +30% HP, +15% Speed
  chakraTonic?: boolean;   // -20% Cooldown
  militaryPill?: boolean;  // +25% Danno Jutsu, +12% Crit
  magnetAmulet?: boolean;  // +90px Magnetismo
}

export interface PlayerProfile {
  playerName: string;
  ninjaRank: string;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  ryo: number;
  scrolls: number;
  ninjaSeals: number;
  fragments: Record<string, number>;
  characterRanks: Record<string, StarRank>;
  totalRuns: number;
  bossesDefeated: number;
  bestTimeSec: number;
  highestLevel: number;
  enemiesDefeated: number;
  upgrades: {
    hpLevel: number;
    dmgLevel: number;
    speedLevel: number;
    ryoLevel: number;
  };
  nextRunBuffs?: NextRunBuffs;
}

const DEFAULT_PROFILE: PlayerProfile = {
  playerName: 'ShisuiUchiha',
  ninjaRank: 'Genin di Konoha',
  selectedCharacterId: 'naruto_genin',
  unlockedCharacterIds: [...STARTER_CHARACTER_IDS],
  ryo: 7975,
  scrolls: 43,
  ninjaSeals: 7,
  fragments: {
    naruto_genin: 10,
    sasuke_genin: 10,
    sakura_genin: 10,
  },
  characterRanks: {
    naruto_genin: 1,
    sasuke_genin: 1,
    sakura_genin: 1,
  },
  totalRuns: 223,
  bossesDefeated: 48,
  bestTimeSec: 2054, // 34:14
  highestLevel: 277,
  enemiesDefeated: 281958,
  upgrades: {
    hpLevel: 2,
    dmgLevel: 2,
    speedLevel: 1,
    ryoLevel: 2,
  },
};

export class SaveSystem {
  private static cachedProfile: PlayerProfile | null = null;

  static getProfile(): PlayerProfile {
    if (this.cachedProfile) return this.cachedProfile;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const unlocked = new Set([
          ...STARTER_CHARACTER_IDS,
          ...(parsed.unlockedCharacterIds || []),
        ]);
        const loaded: PlayerProfile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          unlockedCharacterIds: Array.from(unlocked),
          fragments: { ...DEFAULT_PROFILE.fragments, ...(parsed.fragments || {}) },
          characterRanks: { ...DEFAULT_PROFILE.characterRanks, ...(parsed.characterRanks || {}) },
          upgrades: { ...DEFAULT_PROFILE.upgrades, ...(parsed.upgrades || {}) },
        };
        this.cachedProfile = loaded;
        return loaded;
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage, using default:', e);
    }

    const def: PlayerProfile = { ...DEFAULT_PROFILE };
    this.cachedProfile = def;
    this.saveProfile(def);
    return def;
  }

  static saveProfile(profile: PlayerProfile): void {
    this.cachedProfile = profile;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile to localStorage:', e);
    }
  }

  static getSelectedCharacterId(): string {
    const profile = this.getProfile();
    return profile.selectedCharacterId || 'naruto_genin';
  }

  static setSelectedCharacterId(charId: string): void {
    const profile = this.getProfile();
    profile.selectedCharacterId = charId;
    this.saveProfile(profile);
  }

  static isCharacterUnlocked(charId: string): boolean {
    const profile = this.getProfile();
    return profile.unlockedCharacterIds.includes(charId);
  }

  static unlockCharacter(charId: string): boolean {
    const profile = this.getProfile();
    if (!profile.unlockedCharacterIds.includes(charId)) {
      profile.unlockedCharacterIds.push(charId);
      if (!profile.fragments[charId]) profile.fragments[charId] = 0;
      this.saveProfile(profile);
      return true;
    }
    return false;
  }

  static getFragments(charId: string): number {
    const profile = this.getProfile();
    return profile.fragments[charId] || 0;
  }

  static addFragments(charId: string, amount: number): number {
    const profile = this.getProfile();
    profile.fragments[charId] = (profile.fragments[charId] || 0) + amount;
    this.saveProfile(profile);
    return profile.fragments[charId];
  }

  static getCharacterRank(charId: string, defaultRank: StarRank): StarRank {
    const profile = this.getProfile();
    return profile.characterRanks[charId] || defaultRank;
  }

  static setCharacterRank(charId: string, rank: StarRank): void {
    const profile = this.getProfile();
    profile.characterRanks[charId] = rank;
    this.saveProfile(profile);
  }

  static addRyo(amount: number): number {
    const profile = this.getProfile();
    profile.ryo = Math.max(0, profile.ryo + amount);
    this.saveProfile(profile);
    return profile.ryo;
  }

  static spendRyo(amount: number): boolean {
    const profile = this.getProfile();
    if (profile.ryo >= amount) {
      profile.ryo -= amount;
      this.saveProfile(profile);
      return true;
    }
    return false;
  }

  static addScrolls(amount: number): number {
    const profile = this.getProfile();
    profile.scrolls = Math.max(0, profile.scrolls + amount);
    this.saveProfile(profile);
    return profile.scrolls;
  }

  static spendScrolls(amount: number): boolean {
    const profile = this.getProfile();
    if (profile.scrolls >= amount) {
      profile.scrolls -= amount;
      this.saveProfile(profile);
      return true;
    }
    return false;
  }

  static buyUpgrade(upgradeKey: keyof PlayerProfile['upgrades'], cost: number): boolean {
    if (this.spendRyo(cost)) {
      const profile = this.getProfile();
      profile.upgrades[upgradeKey] = (profile.upgrades[upgradeKey] || 0) + 1;
      this.saveProfile(profile);
      return true;
    }
    return false;
  }

  static recordRunEnd(
    ryoEarned: number,
    elapsedSec: number = 0,
    level: number = 1,
    kills: number = 0,
    bossKilled = false,
  ): void {
    const profile = this.getProfile();
    profile.ryo += ryoEarned;
    profile.totalRuns += 1;
    profile.enemiesDefeated += kills;
    if (elapsedSec > profile.bestTimeSec) profile.bestTimeSec = Math.floor(elapsedSec);
    if (level > profile.highestLevel) profile.highestLevel = level;
    if (bossKilled) {
      profile.bossesDefeated += 1;
      profile.scrolls += 1;
    }
    this.saveProfile(profile);
  }

  static getNextRunBuffs(): NextRunBuffs {
    const profile = this.getProfile();
    return profile.nextRunBuffs || {};
  }

  static setNextRunBuff(buffKey: keyof NextRunBuffs, value: boolean): void {
    const profile = this.getProfile();
    if (!profile.nextRunBuffs) profile.nextRunBuffs = {};
    profile.nextRunBuffs[buffKey] = value;
    this.saveProfile(profile);
  }

  static consumeNextRunBuffs(): NextRunBuffs {
    const profile = this.getProfile();
    const buffs = { ...(profile.nextRunBuffs || {}) };
    profile.nextRunBuffs = {};
    this.saveProfile(profile);
    return buffs;
  }
}
