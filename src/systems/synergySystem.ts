// ============================================================
//  NarutoSurvivor — Canonical Ninja Tools & Elemental Synergy System
// ============================================================

import type { ElementalAffinity } from '../types/character';
import type { UpgradeTarget } from '../ui/Panels';

// ── Ninja Tools (Passives obtainable during run) ───────────────

export interface NinjaTool {
  id: string;
  nameIT: string;
  nameJP: string;
  icon: string;
  element: ElementalAffinity;
  color: number;
  description: string;
  statBonusText: string;
  maxLevel: number;
  apply: (stats: UpgradeTarget, level: number) => void;
}

export const NINJA_TOOLS: NinjaTool[] = [
  {
    id: 'tool_wind_scroll',
    nameIT: 'Rotolo del Vento (Fūton)',
    nameJP: '風遁の巻物',
    icon: '🍃',
    element: 'Fuuton',
    color: 0x34D399,
    description: 'Aumenta il flusso di chakra aerodinamico: accelera il recupero dei Jutsu e la corsa.',
    statBonusText: '-15% Cooldown Jutsu, +15% Velocità di movimento',
    maxLevel: 3,
    apply: (t) => {
      t.jutsuCooldownMult = Math.max(0.3, t.jutsuCooldownMult * 0.85);
      t.movespeed *= 1.15;
    },
  },
  {
    id: 'tool_lightning_blade',
    nameIT: 'Lama del Fulmine (Raiton)',
    nameJP: '雷遁の刀',
    icon: '⚡',
    element: 'Raiton',
    color: 0x60A5FA,
    description: 'Imbeve gli attacchi di carica elettrica perforante, incrementando letalità e critici.',
    statBonusText: '+15% Probabilità Critico, +35% Danno Critico',
    maxLevel: 3,
    apply: (t) => {
      t.critchance = Math.min(0.85, t.critchance + 0.15);
      t.critdmg *= 1.35;
    },
  },
  {
    id: 'tool_fire_seal',
    nameIT: 'Sigillo del Fuoco (Katon)',
    nameJP: '火遁の印',
    icon: '🔥',
    element: 'Katon',
    color: 0xF97316,
    description: 'Brucia le riserve di chakra per scatenare colpi ad altissima temperatura.',
    statBonusText: '+30% Danno Jutsu',
    maxLevel: 3,
    apply: (t) => {
      t.jutsudmg *= 1.30;
    },
  },
  {
    id: 'tool_water_pouch',
    nameIT: "Ghianda d'Acqua (Suiton)",
    nameJP: '水遁の瓢箪',
    icon: '💧',
    element: 'Suiton',
    color: 0x38BDF8,
    description: 'Ristora continuamente la vitalità e fluidifica la circolazione sanguigna del ninja.',
    statBonusText: '+35% Max HP e cura immediata del 30%',
    maxLevel: 3,
    apply: (t) => {
      const bonus = t.maxHp * 0.35;
      t.maxHp += bonus;
      t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.30);
    },
  },
  {
    id: 'tool_earth_plate',
    nameIT: 'Corazza di Pietra (Doton)',
    nameJP: '土遁の装甲',
    icon: '🪨',
    element: 'Doton',
    color: 0xD97706,
    description: 'Indurisce la pelle come roccia vulcanica per assorbire i colpi più violenti.',
    statBonusText: '+30 Difesa e +15% HP Massimo',
    maxLevel: 3,
    apply: (t) => {
      t.defense += 30;
      t.maxHp *= 1.15;
      t.hp = Math.min(t.maxHp, t.hp + 50);
    },
  },
  {
    id: 'tool_sharingan_eye',
    nameIT: 'Tomo dello Sharingan',
    nameJP: '写輪眼の巻',
    icon: '👁️',
    element: 'Yin',
    color: 0xEF4444,
    description: 'Percezione millimetrica dei movimenti nemici e individuazione dei punti deboli.',
    statBonusText: '+18% Probabilità Critico, +15% Riduzione Cooldown',
    maxLevel: 3,
    apply: (t) => {
      t.critchance = Math.min(0.85, t.critchance + 0.18);
      t.jutsuCooldownMult = Math.max(0.3, t.jutsuCooldownMult * 0.88);
    },
  },
  {
    id: 'tool_toad_oil',
    nameIT: 'Olio dei Rospi del Monte Myoboku',
    nameJP: '妙木山の蝦蟇油',
    icon: '🐸',
    element: 'SenjutsuNatural',
    color: 0xFBBF24,
    description: 'Catalizzatore di energia naturale: amplifica la portata e la distruttività dei Jutsu.',
    statBonusText: '+25% Danno Jutsu, +60px Raggio di Raccolta',
    maxLevel: 3,
    apply: (t) => {
      t.jutsudmg *= 1.25;
      t.collectradius += 60;
    },
  },
  {
    id: 'tool_sand_urn',
    nameIT: 'Giarra di Sabbia Sigillata',
    nameJP: '砂の瓢箪',
    icon: '🏺',
    element: 'Doton',
    color: 0xCA8A04,
    description: 'La sabbia fluttua autonomamente creando uno scudo magnetico protettivo.',
    statBonusText: '+25 Difesa, +70px Magnetismo Chakra',
    maxLevel: 3,
    apply: (t) => {
      t.defense += 25;
      t.collectradius += 70;
    },
  },
  {
    id: 'tool_yellow_kunai',
    nameIT: 'Kunai a Tre Punte del Lampo Giallo',
    nameJP: '三叉の飛雷神苦無',
    icon: '⚡',
    element: 'Yang',
    color: 0xFACC15,
    description: 'Sigillo spazio-temporale di Minato: aumenta vertiginosamente mobilità e riflessi.',
    statBonusText: '+25% Velocità Corsa, +15% Danno Jutsu',
    maxLevel: 3,
    apply: (t) => {
      t.movespeed *= 1.25;
      t.jutsudmg *= 1.15;
    },
  },
  {
    id: 'tool_hashirama_cells',
    nameIT: 'Cellule di Hashirama',
    nameJP: '柱間細胞',
    icon: '🌳',
    element: 'Mokuton',
    color: 0x10B981,
    description: 'Vitalità leggendaria del Primo Hokage: rigenerazione titanica e potenziamento globale.',
    statBonusText: '+50% HP Max, +15 Difesa, +20% Danno Jutsu',
    maxLevel: 3,
    apply: (t) => {
      t.maxHp *= 1.50;
      t.hp = t.maxHp;
      t.defense += 15;
      t.jutsudmg *= 1.20;
    },
  },
];

// ── Canonical Elemental Synergy Recipes ───────────────────────

export type SynergyType =
  | 'rasenshuriken'
  | 'gofu_rasendan'
  | 'chidori_nagashi'
  | 'kagutsuchi'
  | 'sabaku_sotaiso'
  | 'hiraishin_omni'
  | 'rinne_juuryoku'
  | 'gamayu_endan'
  | 'raiju_tsuiga'
  | 'byakugou_impact';

export interface SynergyRecipe {
  id: SynergyType;
  nameJP: string;
  nameIT: string;
  jutsuKeyword: string;         // matches jutsu id or name (case-insensitive substring)
  requiredToolId: string;       // Ninja tool needed to trigger evolution
  elementResult: string;
  behavior: 'ProjectileSpread' | 'ProjectileOmni' | 'Beam' | 'AreaPersistent' | 'Orbital' | 'Explosion';
  dmgMultiplier: number;
  cooldownMultiplier: number;
  vfxColor: number;
  vfxSecondaryColor: number;
  description: string;
  announcement: string;
}

export const SYNERGY_RECIPES: SynergyRecipe[] = [
  {
    id: 'rasenshuriken',
    nameJP: '風遁・螺旋手裏剣',
    nameIT: 'Fūton: Rasenshuriken',
    jutsuKeyword: 'rasen', // Naruto / Konohamaru / Minato rasengan
    requiredToolId: 'tool_wind_scroll',
    elementResult: 'Fūton + Forma Suprema',
    behavior: 'ProjectileSpread',
    dmgMultiplier: 2.50,
    cooldownMultiplier: 0.85,
    vfxColor: 0x38BDF8,
    vfxSecondaryColor: 0xffffff,
    description: 'Il Rasengan acquisisce 4 lame di vento microscopiche: infligge danni devastanti in espansione.',
    announcement: '🌀 SINERGIA SUPREMA: Fūton Rasenshuriken risuona sul campo di battaglia!',
  },
  {
    id: 'gofu_rasendan',
    nameJP: '炎弾・強風螺旋弾',
    nameIT: 'Endan: Gōfū Rasendan',
    jutsuKeyword: 'bunshin', // Kage bunshin o jutsu combinati
    requiredToolId: 'tool_fire_seal',
    elementResult: 'Katon + Fūton',
    behavior: 'ProjectileSpread',
    dmgMultiplier: 2.20,
    cooldownMultiplier: 0.90,
    vfxColor: 0xFF6B00,
    vfxSecondaryColor: 0xFDE68A,
    description: 'I cloni d’ombra combinano sfere di vento e getti di fiamme incandescenti che creano scie infuocate.',
    announcement: '🔥 SINERGIA ELEMENTALE: Gōfū Rasendan incenerisce le orde!',
  },
  {
    id: 'chidori_nagashi',
    nameJP: '千鳥流し・全方位放電',
    nameIT: 'Raiton: Chidori Nagashi',
    jutsuKeyword: 'chidori', // Sasuke / Kakashi chidori
    requiredToolId: 'tool_lightning_blade',
    elementResult: 'Raiton + Kenjutsu',
    behavior: 'ProjectileOmni',
    dmgMultiplier: 2.40,
    cooldownMultiplier: 0.80,
    vfxColor: 0x60A5FA,
    vfxSecondaryColor: 0x93C5FD,
    description: 'Scarica elettrica a 360° che fulmina all’istante tutti i nemici nel raggio d’azione.',
    announcement: '⚡ SINERGIA RAITON: Chidori Nagashi rilascia una tempesta fulminea!',
  },
  {
    id: 'raiju_tsuiga',
    nameJP: '雷遁・雷獣追牙の術',
    nameIT: 'Raiton: Raijū Tsuiga',
    jutsuKeyword: 'raikiri', // Kakashi
    requiredToolId: 'tool_lightning_blade',
    elementResult: 'Raiton + Manipolazione Forma',
    behavior: 'ProjectileSpread',
    dmgMultiplier: 2.60,
    cooldownMultiplier: 0.85,
    vfxColor: 0x38BDF8,
    vfxSecondaryColor: 0xffffff,
    description: 'Il fulmine prende la forma di lupi famelici che braccano i bersagli a velocità supersonica.',
    announcement: '🐺 SINERGIA RAITON: La Bestia del Fulmine Raijū scatta sui nemici!',
  },
  {
    id: 'kagutsuchi',
    nameJP: '炎遁・加具土命',
    nameIT: 'Enton: Kagutsuchi (Fiamme Nere)',
    jutsuKeyword: 'katon', // Katon jutsu, Obito, Madara, Sasuke, Itachi
    requiredToolId: 'tool_sharingan_eye',
    elementResult: 'Katon + Yin (Amaterasu)',
    behavior: 'ProjectileSpread',
    dmgMultiplier: 2.80,
    cooldownMultiplier: 0.90,
    vfxColor: 0x9333EA,
    vfxSecondaryColor: 0xDC2626,
    description: 'Fiamme nere inestinguibili modellate con lo Sharingan in dardi taglienti che perforano ogni difesa.',
    announcement: '👁️ SINERGIA ENTON: Kagutsuchi divora le forze nemiche nelle Fiamme Nere!',
  },
  {
    id: 'sabaku_sotaiso',
    nameJP: '砂漠層大葬',
    nameIT: 'Sabaku Sōtaisō — Piramide di Sabbia',
    jutsuKeyword: 'sabaku', // Gaara
    requiredToolId: 'tool_sand_urn',
    elementResult: 'Doton + Magnetismo Fuuton',
    behavior: 'AreaPersistent',
    dmgMultiplier: 2.30,
    cooldownMultiplier: 0.85,
    vfxColor: 0xCA8A04,
    vfxSecondaryColor: 0xFEF08A,
    description: 'Un enorme tsunami di sabbia forma piramidi di sigillamento comprimendo e stritolando le orde.',
    announcement: '🏺 SINERGIA DELLA SABBIA: Sabaku Sōtaisō imprigiona il campo di battaglia!',
  },
  {
    id: 'gamayu_endan',
    nameJP: '火遁・蝦蟇油炎弾',
    nameIT: 'Katon: Gamayu Endan',
    jutsuKeyword: 'oil', // Jiraiya o Katon con Rospo
    requiredToolId: 'tool_toad_oil',
    elementResult: 'Katon + Senjutsu',
    behavior: 'ProjectileSpread',
    dmgMultiplier: 2.45,
    cooldownMultiplier: 0.85,
    vfxColor: 0xEA580C,
    vfxSecondaryColor: 0xFDE047,
    description: 'Olio combustibile del Monte Myoboku incendiato da una fiammata continua ad altissimo raggio.',
    announcement: '🐸 SINERGIA DEI ROSPI: Gamayu Endan trasforma il campo in un inferno di fiamme!',
  },
  {
    id: 'hiraishin_omni',
    nameJP: '飛雷神・時空間螺旋陣',
    nameIT: 'Hiraishin: Tempesta del Lampo Giallo',
    jutsuKeyword: 'hiraishin', // Minato
    requiredToolId: 'tool_yellow_kunai',
    elementResult: 'Jinton + Spazio-Tempo',
    behavior: 'ProjectileOmni',
    dmgMultiplier: 3.00,
    cooldownMultiplier: 0.75,
    vfxColor: 0xFACC15,
    vfxSecondaryColor: 0x38BDF8,
    description: 'Teletrasporto istantaneo tra innumerevoli kunai con raffica omnidirezionale a 360°.',
    announcement: '⚡ SINERGIA LEGGENDARIA: Il Lampo Giallo di Konoha squarcia lo spazio-tempo!',
  },
  {
    id: 'rinne_juuryoku',
    nameJP: '輪廻転生・天道重力弾',
    nameIT: 'Tendō: Chibaku Tensei Gravitazionale',
    jutsuKeyword: 'six_paths', // Pain / Madara / Sasuke Rinnegan / Naruto Rikudo
    requiredToolId: 'tool_sharingan_eye',
    elementResult: 'YinYang + Sei Vie',
    behavior: 'AreaPersistent',
    dmgMultiplier: 3.20,
    cooldownMultiplier: 1.10,
    vfxColor: 0xC026D3,
    vfxSecondaryColor: 0xFDE047,
    description: 'Singolarità gravitazionale che attira verso il centro e schiaccia qualsiasi nemico ignorando la difesa.',
    announcement: '🌌 SINERGIA DIVINA: Il Potere delle Sei Vie distorce la gravità terrestre!',
  },
  {
    id: 'byakugou_impact',
    nameJP: '百豪の術・桜花衝',
    nameIT: 'Byakugō: Distruzione del Terreno',
    jutsuKeyword: 'impact', // Tsunade, Sakura
    requiredToolId: 'tool_hashirama_cells',
    elementResult: 'Controllo Chakra + Sigillo Byakugō',
    behavior: 'Explosion',
    dmgMultiplier: 2.75,
    cooldownMultiplier: 0.80,
    vfxColor: 0xEC4899,
    vfxSecondaryColor: 0x86EFAC,
    description: 'Rilascio istantaneo del chakra conservato con onde sismiche rigeneranti per il ninja.',
    announcement: '🌸 SINERGIA BYAKUGŌ: Il terreno implode sotto la potenza titanica del Byakugō!',
  },
];

// ── Matcher Helper ───────────────────────────────────────────

export function findMatchingSynergy(
  jutsuId: string,
  jutsuName: string,
  toolId: string,
): SynergyRecipe | undefined {
  const normJutsu = `${jutsuId} ${jutsuName}`.toLowerCase();
  return SYNERGY_RECIPES.find(
    s => s.requiredToolId === toolId && (normJutsu.includes(s.jutsuKeyword.toLowerCase()) || normJutsu.includes('kage_bunshin') || normJutsu.includes('rasengan')),
  );
}

export function findAvailableSynergyForJutsu(
  jutsuId: string,
  jutsuName: string,
): SynergyRecipe | undefined {
  const normJutsu = `${jutsuId} ${jutsuName}`.toLowerCase();
  // Find primary match or default canonical match for any shinobi
  const match = SYNERGY_RECIPES.find(s => normJutsu.includes(s.jutsuKeyword.toLowerCase()));
  if (match) return match;

  // Fallback canonical combinations for common categories
  if (normJutsu.includes('katon') || normJutsu.includes('fuoco')) {
    return SYNERGY_RECIPES.find(s => s.id === 'kagutsuchi');
  }
  if (normJutsu.includes('raiton') || normJutsu.includes('lampo') || normJutsu.includes('fulmine')) {
    return SYNERGY_RECIPES.find(s => s.id === 'chidori_nagashi');
  }
  if (normJutsu.includes('fuuton') || normJutsu.includes('vento')) {
    return SYNERGY_RECIPES.find(s => s.id === 'rasenshuriken');
  }
  if (normJutsu.includes('doton') || normJutsu.includes('terra')) {
    return SYNERGY_RECIPES.find(s => s.id === 'sabaku_sotaiso');
  }

  // Universal fallback: Rasenshuriken / Gōfū Rasendan
  return SYNERGY_RECIPES[0];
}
