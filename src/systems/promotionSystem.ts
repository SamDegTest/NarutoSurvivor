import type { Character, CharacterStats, StarRank } from '../types/character';
import { GAME_CONFIG } from '../config/gameConfig';

// ============================================================
//  NarutoSurvivor — Fragment Promotion System
// ============================================================

/**
 * Calculates the total fragment cost to promote from baseRank to targetRank.
 */
export function getFragmentCostToRank(
  character: Character,
  targetRank: StarRank,
): number {
  return character.promotionPath
    .filter(tier => tier.toRank <= targetRank)
    .reduce((sum, tier) => sum + tier.fragmentCost, 0);
}

/**
 * Returns the next promotion tier for a character at currentRank.
 * Returns null if already at max rank or no promotion path.
 */
export function getNextPromotionTier(character: Character, currentRank: StarRank) {
  return character.promotionPath.find(t => t.toRank === (currentRank + 1) as StarRank) ?? null;
}

/**
 * Core stat scaling formula — see GDD Part 2.
 *
 * Stat_final(rank) = Stat_base × Φ_rank^exp × (1 + Σ Δ_promo) × Ψ_role
 *
 * For HP:      exp = HP_SCALE_EXP   (1.10 — slightly convex, rewards survival)
 * For DMG:     exp = DMG_SCALE_EXP  (0.92 — soft cap, promoted ≈ 78% native)
 * For Utility: flat +UTILITY_FLAT_BONUS_PER_TIER per completed tier
 */
export function computeScaledStats(
  character: Character,
  targetRank: StarRank,
): CharacterStats {
  // If target rank is the base rank, return base stats (with passives applied)
  if (targetRank <= character.baseRank) {
    return applyPassiveModifiers(character.baseStats, character);
  }

  const tiersCompleted = targetRank - character.baseRank;

  // PHI multipliers (index = rank - 1)
  const phiCombat  = GAME_CONFIG.PHI_COMBAT[targetRank - 1];
  const phiUtility = GAME_CONFIG.PHI_UTILITY[targetRank - 1];

  // Base-rank phi (to normalize relative to base, not to 1★)
  const phiBaseCombat  = GAME_CONFIG.PHI_COMBAT[character.baseRank - 1];
  const phiBaseUtility = GAME_CONFIG.PHI_UTILITY[character.baseRank - 1];

  const relCombat  = phiCombat  / phiBaseCombat;
  const relUtility = phiUtility / phiBaseUtility;

  const base = character.baseStats;
  const utilityBonus = 1 + GAME_CONFIG.UTILITY_FLAT_BONUS_PER_TIER * tiersCompleted;

  const scaled: CharacterStats = {
    hp:                  base.hp        * Math.pow(relCombat,  GAME_CONFIG.HP_SCALE_EXP),
    jutsudmg:            base.jutsudmg  * Math.pow(relCombat,  GAME_CONFIG.DMG_SCALE_EXP),
    movespeed:           base.movespeed * (1 + (relCombat - 1) * 0.30), // speed scales gently
    collectradius:       base.collectradius       * relUtility * utilityBonus,
    critchance:          Math.min(0.80, base.critchance + (targetRank - character.baseRank) * 0.04),
    critdmg:             base.critdmg   * (1 + (relCombat - 1) * 0.50),
    defense:             base.defense   * Math.pow(relCombat,  GAME_CONFIG.HP_SCALE_EXP),
    ryomultiplier:       base.ryomultiplier       * relUtility * utilityBonus,
    chakraorbmultiplier: base.chakraorbmultiplier * relUtility * utilityBonus,
  };

  // Override with explicit promo tier data if provided (for fine-tuning)
  const targetTier = character.promotionPath.find(t => t.toRank === targetRank);
  if (targetTier) {
    return applyPassiveModifiers(targetTier.statMultipliers, character);
  }

  return applyPassiveModifiers(scaled, character);
}

/**
 * Applies a character's passive ability stat modifiers on top of base stats.
 */
function applyPassiveModifiers(stats: CharacterStats, character: Character): CharacterStats {
  const result = { ...stats };
  for (const mod of character.passiveAbility.modifiers) {
    const key = mod.stat as keyof CharacterStats;
    if (mod.type === 'flat') {
      (result[key] as number) += mod.value;
    } else {
      (result[key] as number) *= (1 + mod.value);
    }
  }
  return result;
}

/**
 * Attempts to promote a character. Returns new rank or null if insufficient fragments.
 */
export function tryPromote(
  character: Character,
  currentRank: StarRank,
  fragmentsOwned: number,
): { newRank: StarRank; fragmentsLeft: number } | null {
  const tier = getNextPromotionTier(character, currentRank);
  if (!tier || fragmentsOwned < tier.fragmentCost) return null;
  return {
    newRank: tier.toRank,
    fragmentsLeft: fragmentsOwned - tier.fragmentCost,
  };
}

/**
 * Human-readable star string: ★★☆☆☆ for rank 2 out of 5.
 */
export function renderStars(rank: StarRank, max = 5): string {
  return '★'.repeat(rank) + '☆'.repeat(max - rank);
}
