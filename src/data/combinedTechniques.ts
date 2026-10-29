// ============================================================
//  NarutoSurvivor — Combined Techniques (Sinergie Elementali)
// ============================================================

export type CombinedTechniqueId =
  | 'gofu_rasendan'
  | 'chidori_esplosiva'
  | 'ryuga_fubuki'
  | 'jukai_doryu_kabe'
  | 'rasen_tarengan'
  | 'kaze_no_hoono'
  | 'jinrai_senpuu_yari'
  | 'rinne_juuryoku_dan';

export type SynergyBehavior =
  | 'ProjectileTrail'    // Projectile leaving persistent ground effect
  | 'BeamExploding'      // Beam that causes chain micro-explosions
  | 'DragonFreeze'       // Projectile with freeze zone on hit
  | 'WallRoot'           // Summon wall + root zone
  | 'OrbitalRasengan'    // Orbitals gain rasengan burst
  | 'BeamPenetrating'    // Ground-burning penetrating beam
  | 'SplitParalyzing'    // Projectile splits into paralysing blades
  | 'GravityPulse'      // Gravity pull + nullify explosion
  | 'ProjectileOmni';   // 360 burst

export interface CombinedTechnique {
  id: CombinedTechniqueId;
  nameJP: string;
  nameIT: string;
  jutsuTrigger: string;         // jutsu id that triggers this
  passiveRequired: string;      // passive id that must be equipped
  elementResult: string;
  behavior: SynergyBehavior;
  dmgMultiplier: number;        // vs base jutsu
  cooldownMultiplier: number;   // CD multiplier (usually 1.2)
  specialParam: Record<string, number>; // behaviour-specific params
  vfxColor: number;
  vfxSecondaryColor: number;
  description: string;
}

export const COMBINED_TECHNIQUES: CombinedTechnique[] = [
  {
    id: 'gofu_rasendan',
    nameJP: '炎弾・強風螺旋弾',
    nameIT: 'Endan: Gōfū Rasendan',
    jutsuTrigger: 'kage_bunshin_basic',   // replaced in demo; canonical trigger: Katon Gōkakyū
    passiveRequired: 'kyuubi_wellspring', // stand-in; canonical: Fuuton Daitoppa passive
    elementResult: 'Katon+Fuuton',
    behavior: 'ProjectileTrail',
    dmgMultiplier: 1.35,
    cooldownMultiplier: 1.20,
    specialParam: { trailDurationSec: 3, trailDmgPerSec: 0.4, rangeBonus: 0.40 },
    vfxColor: 0xFF6B00,
    vfxSecondaryColor: 0xFDE68A,
    description: 'Sfera incandescente con spirale di fiamma; scia ember al suolo per 3s.',
  },
  {
    id: 'chidori_esplosiva',
    nameJP: '千鳥流し・爆裂',
    nameIT: 'Raiton: Chidori Nagare Esplosiva',
    jutsuTrigger: 'raikiri',
    passiveRequired: 'sharingan_read',
    elementResult: 'Raiton',
    behavior: 'BeamExploding',
    dmgMultiplier: 1.55,
    cooldownMultiplier: 1.20,
    specialParam: { chainTargets: 5, explosionRadius: 80, explosionDmgFactor: 0.5 },
    vfxColor: 0x60A5FA,
    vfxSecondaryColor: 0xffffff,
    description: 'Beam elettrico che detonates su ogni nemico in AoE 80px; catena fino a 5 bersagli.',
  },
  {
    id: 'rasen_tarengan',
    nameJP: '螺旋多連丸',
    nameIT: 'Rasen-Tarengan',
    jutsuTrigger: 'kage_bunshin_basic',
    passiveRequired: 'sage_mode_partial',
    elementResult: 'Yang',
    behavior: 'OrbitalRasengan',
    dmgMultiplier: 1.70,
    cooldownMultiplier: 1.30,
    specialParam: { orbitalCount: 3, burstRadius: 120, orbitalRegenSec: 8 },
    vfxColor: 0xFBBF24,
    vfxSecondaryColor: 0xE0F2FE,
    description: 'Clone orbitali con Rasengan; al contatto esplodono in burst chakra dorato.',
  },
  {
    id: 'rinne_juuryoku_dan',
    nameJP: '輪廻転生・重力弾',
    nameIT: 'Rinne-Tensei Jūryoku Dan',
    jutsuTrigger: 'rasenshuriken_six_paths',
    passiveRequired: 'truth_seeking_orbit',
    elementResult: 'YinYang+SixPaths',
    behavior: 'GravityPulse',
    dmgMultiplier: 4.0,
    cooldownMultiplier: 3.0,
    specialParam: { pullRadius: 300, pullDurationSec: 3, nullifyDefense: 1 },
    vfxColor: 0xE879F9,
    vfxSecondaryColor: 0xFBBF24,
    description: 'Sfera gravitazionale attira nemici, poi implode ignorando totalmente la difesa.',
  },
  {
    id: 'kaze_no_hoono',
    nameJP: '炎遁・加具土命',
    nameIT: 'Kagutsuchi: Fiamme Nere Taglienti',
    jutsuTrigger: 'amaterasu',
    passiveRequired: 'tsukuyomi_daze',
    elementResult: 'Katon+Yin',
    behavior: 'BeamExploding',
    dmgMultiplier: 1.85,
    cooldownMultiplier: 1.25,
    specialParam: { chainTargets: 6, explosionRadius: 90 },
    vfxColor: 0x9333EA,
    vfxSecondaryColor: 0xDC2626,
    description: 'Raggio continuo di fiamme nere che incenerisce e deflagra a catena.',
  },
  {
    id: 'jinrai_senpuu_yari',
    nameJP: '飛雷神・時空間螺旋陣',
    nameIT: 'Hiraishin: Tempesta del Lampo Giallo',
    jutsuTrigger: 'hiraishin_kunai',
    passiveRequired: 'yellow_flash',
    elementResult: 'Jinton+Yang',
    behavior: 'ProjectileOmni',
    dmgMultiplier: 2.20,
    cooldownMultiplier: 1.15,
    specialParam: { count: 16 },
    vfxColor: 0xFACC15,
    vfxSecondaryColor: 0x38BDF8,
    description: 'Eruzione di kunai e rasengan in 360° a velocità istantanea.',
  },
  {
    id: 'jukai_doryu_kabe',
    nameJP: '砂漠層大葬',
    nameIT: 'Sabaku Sōtaisō — Piramide di Sabbia',
    jutsuTrigger: 'sabaku_kyu',
    passiveRequired: 'sand_shield',
    elementResult: 'Doton+Fuuton',
    behavior: 'GravityPulse',
    dmgMultiplier: 2.0,
    cooldownMultiplier: 1.4,
    specialParam: { pullRadius: 220, pullDurationSec: 2 },
    vfxColor: 0xD97706,
    vfxSecondaryColor: 0xFEF08A,
    description: 'Vortice di sabbia titanico che attira e comprime i bersagli.',
  },
];

export function findCombinedTechnique(
  jutsuId: string,
  passiveId: string,
): CombinedTechnique | null {
  return COMBINED_TECHNIQUES.find(
    t => t.jutsuTrigger === jutsuId && t.passiveRequired === passiveId,
  ) ?? null;
}
