// ============================================================
//  NarutoSurvivor — Gacha (Rotoli Ninja) System
// ============================================================

import { ROSTER } from '../data/roster';
import { SaveSystem } from './saveSystem';
import type { Character, StarRank } from '../types/character';

export interface GachaPullResult {
  character: Character;
  isNew: boolean;
  fragmentsAwarded: number;
  rank: StarRank;
}

export const GACHA_COSTS = {
  SINGLE_SCROLL: 1,
  SINGLE_RYO: 150,
  MULTI_SCROLL: 10,
  MULTI_RYO: 1350, // 10% discount on 10x pull
};

// Fragment rewards for duplicate pulls
const DUPLICATE_FRAGMENTS: Record<StarRank, number> = {
  1: 15,
  2: 20,
  3: 25,
  4: 35,
  5: 50,
};

export class GachaSystem {
  /**
   * Performs a single summon.
   * Can be paid with either 'scroll' or 'ryo'.
   */
  static pullSingle(paymentType: 'scroll' | 'ryo'): { success: boolean; result?: GachaPullResult; error?: string } {
    if (paymentType === 'scroll') {
      if (!SaveSystem.spendScrolls(GACHA_COSTS.SINGLE_SCROLL)) {
        return { success: false, error: 'Rotoli di Evocazione insufficienti!' };
      }
    } else {
      if (!SaveSystem.spendRyo(GACHA_COSTS.SINGLE_RYO)) {
        return { success: false, error: 'Ryo insufficienti (150 Ryo richiesti)!' };
      }
    }

    const result = this.rollCharacter();
    return { success: true, result };
  }

  /**
   * Performs a 10x multi-summon.
   */
  static pullMulti(paymentType: 'scroll' | 'ryo'): { success: boolean; results?: GachaPullResult[]; error?: string } {
    if (paymentType === 'scroll') {
      if (!SaveSystem.spendScrolls(GACHA_COSTS.MULTI_SCROLL)) {
        return { success: false, error: 'Rotoli di Evocazione insufficienti (10 richiesti)!' };
      }
    } else {
      if (!SaveSystem.spendRyo(GACHA_COSTS.MULTI_RYO)) {
        return { success: false, error: 'Ryo insufficienti (1350 Ryo richiesti)!' };
      }
    }

    const results: GachaPullResult[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(this.rollCharacter());
    }
    return { success: true, results };
  }

  /**
   * Determines which character is pulled based on gacha weights.
   */
  private static rollCharacter(): GachaPullResult {
    const roll = Math.random() * 100;
    let targetRank: StarRank;

    // Rarity distribution:
    // 5★: 2%
    // 4★: 6%
    // 3★: 16%
    // 2★: 31%
    // 1★: 45%
    if (roll < 2) {
      targetRank = 5;
    } else if (roll < 8) {
      targetRank = 4;
    } else if (roll < 24) {
      targetRank = 3;
    } else if (roll < 55) {
      targetRank = 2;
    } else {
      targetRank = 1;
    }

    // Filter characters matching target rank
    let candidateChars = ROSTER.filter(c => c.baseRank === targetRank);
    if (candidateChars.length === 0) {
      candidateChars = ROSTER;
    }

    // Pick random character within the rank
    const selectedChar = candidateChars[Math.floor(Math.random() * candidateChars.length)];
    const alreadyUnlocked = SaveSystem.isCharacterUnlocked(selectedChar.id);

    if (!alreadyUnlocked) {
      // New character unlocked!
      SaveSystem.unlockCharacter(selectedChar.id);
      return {
        character: selectedChar,
        isNew: true,
        fragmentsAwarded: 0,
        rank: selectedChar.baseRank,
      };
    } else {
      // Duplicate -> Convert to promotion fragments!
      const frags = DUPLICATE_FRAGMENTS[selectedChar.baseRank] ?? 10;
      SaveSystem.addFragments(selectedChar.id, frags);
      return {
        character: selectedChar,
        isNew: false,
        fragmentsAwarded: frags,
        rank: selectedChar.baseRank,
      };
    }
  }
}
