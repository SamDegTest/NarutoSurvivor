// ============================================================
//  NarutoSurvivor — Character Data Schema (TypeScript)
// ============================================================

// Allow any integer 1-5 for promotion arithmetic without breaking `as` casts
export type StarRank = 1 | 2 | 3 | 4 | 5;

export type ElementalAffinity =
  | 'Katon' | 'Fuuton' | 'Raiton' | 'Doton' | 'Suiton'
  | 'Hyoton' | 'Mokuton' | 'Jinton' | 'Shakuton' | 'Yoton' | 'Bakuton' | 'Ranton'
  | 'Yin' | 'Yang' | 'YinYang' | 'SixPaths'
  | 'SenjutsuNatural' | 'SenjutsuTailed'
  | 'None';

export type JutsuCategory =
  | 'Ninjutsu' | 'Taijutsu' | 'Genjutsu' | 'Fuuinjutsu'
  | 'Kenjutsu' | 'SenjutsuNatural' | 'SenjutsuTailed' | 'SixPaths';

export type JutsuBehavior =
  | 'Projectile' | 'ProjectileSpread' | 'ProjectileOmni'
  | 'Orbital' | 'AreaPersistent' | 'Beam'
  | 'Explosion' | 'Aura' | 'Chain' | 'Mark';

export type PassiveCategory =
  | 'Farming' | 'Support' | 'Defense' | 'Mobility' | 'Combat';

// ── Stats ─────────────────────────────────────────────────────

export interface CharacterStats {
  hp: number;
  jutsudmg: number;
  movespeed: number;
  collectradius: number;
  critchance: number;
  critdmg: number;
  defense: number;
  ryomultiplier: number;
  chakraorbmultiplier: number;
}

// ── Jutsu ─────────────────────────────────────────────────────

export interface Jutsu {
  id: string;
  nameJP: string;
  nameIT: string;
  element: ElementalAffinity;
  category: JutsuCategory;
  behavior: JutsuBehavior;
  baseDmgCoeff: number;
  cooldownSec: number;
  cooldownPerLevel: number;
  maxLevel: number;
  isCombinationTrigger: boolean;
}

// ── Passive ───────────────────────────────────────────────────

export interface StatModifier {
  stat: keyof CharacterStats;
  type: 'flat' | 'percent';
  value: number;
}

export interface PassiveAbility {
  id: string;
  nameJP: string;
  nameIT: string;
  category: PassiveCategory;
  element: ElementalAffinity;
  modifiers: StatModifier[];
  isCombinationComponent: boolean;
}

// ── Promotion ─────────────────────────────────────────────────

export interface PromotionTier {
  toRank: StarRank;
  fragmentCost: number;
  statMultipliers: CharacterStats;
  unlockedPassive?: PassiveAbility;
}

// ── Character (main entity) ───────────────────────────────────

export interface Character {
  id: string;
  nameJP: string;
  nameIT: string;
  form: string;
  arc: string;
  baseRank: StarRank;
  unlockedByDefault?: boolean;
  element: ElementalAffinity[];
  jutsuSlot: Jutsu;
  passiveAbility: PassiveAbility;
  baseStats: CharacterStats;
  promotionPath: PromotionTier[];
  loreDescription: string;
  assets: {
    spriteSheet: string;
    portrait: string;
    jutsuVFX: string;
    color: number; // hex color for placeholder rendering
  };
}

// ── Runtime state ─────────────────────────────────────────────

export interface CharacterRuntimeState {
  characterId: string;
  currentRank: StarRank;
  fragments: number;
  currentStats: CharacterStats;
  jutsuLevel: number;
  jutsuCooldownRemaining: number;
  activePassives: PassiveAbility[];
}
