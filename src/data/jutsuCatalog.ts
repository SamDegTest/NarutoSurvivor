// ============================================================
//  NarutoSurvivor — Canonical Anime Jutsu Catalog
//  Authentic anime techniques with unique mechanics, behaviors and VFX
// ============================================================

import type { ElementalAffinity, JutsuBehavior, Character } from '../types/character';

export interface JutsuDefinition {
  id: string;
  nameIT: string;
  nameJP: string;
  icon: string;
  element: ElementalAffinity;
  behavior: JutsuBehavior;
  baseDmgCoeff: number;
  cooldownSec: number;
  maxLevel: number;
  vfxColor: number;
  description: string;
  characterAffinity?: string[]; // character ID prefixes that have priority
}

export interface ActiveJutsuInstance {
  definition: JutsuDefinition;
  level: number;
  cooldownTimer: number;
}

export const CANONICAL_JUTSU_CATALOG: JutsuDefinition[] = [
  // ── NARUTO TECHNIQUES ─────────────────────────────────────
  {
    id: 'jutsu_rasengan',
    nameIT: 'Rasengan (Sfera Spiraliforme)',
    nameJP: '螺旋丸',
    icon: '🌀',
    element: 'Fuuton',
    behavior: 'Projectile',
    baseDmgCoeff: 2.2,
    cooldownSec: 1.6,
    maxLevel: 5,
    vfxColor: 0x38BDF8,
    description: 'Vortice compresso di puro chakra rotante ad alta densità che trapassa le linee nemiche.',
    characterAffinity: ['naruto', 'minato', 'jiraiya', 'konohamaru', 'boruto'],
  },
  {
    id: 'jutsu_kage_bunshin',
    nameIT: 'Tajuu Kage Bunshin (Moltiplicazione del Corpo)',
    nameJP: '多重影分身の術',
    icon: '👥',
    element: 'Yang',
    behavior: 'ProjectileOmni',
    baseDmgCoeff: 1.5,
    cooldownSec: 3.2,
    maxLevel: 5,
    vfxColor: 0xF59E0B,
    description: 'Evoca decine di cloni d\'ombra che si lanciano a 360° travolgendo ogni nemico circostante.',
    characterAffinity: ['naruto', 'kakashi'],
  },
  {
    id: 'jutsu_rasenshuriken',
    nameIT: 'Fūton: Rasenshuriken',
    nameJP: '風遁・螺旋手裏剣',
    icon: '🌪️',
    element: 'Fuuton',
    behavior: 'Explosion',
    baseDmgCoeff: 3.5,
    cooldownSec: 4.0,
    maxLevel: 5,
    vfxColor: 0x22D3EE,
    description: 'Lancia un enorme shuriken di vento che esplode in miliardi di aghi microscopici di chakra.',
    characterAffinity: ['naruto'],
  },
  {
    id: 'jutsu_oodama_rasengan',
    nameIT: 'Oodama Rasengan (Grande Rasengan)',
    nameJP: '大玉螺旋丸',
    icon: '🔵',
    element: 'Fuuton',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.8,
    cooldownSec: 2.4,
    maxLevel: 5,
    vfxColor: 0x0284C7,
    description: 'Sfera di dimensioni giganti che distrugge interi gruppi compatti con onde di pressione.',
    characterAffinity: ['naruto', 'jiraiya'],
  },

  // ── SASUKE TECHNIQUES ─────────────────────────────────────
  {
    id: 'jutsu_chidori',
    nameIT: 'Chidori (Mille Falchi)',
    nameJP: '千鳥',
    icon: '⚡',
    element: 'Raiton',
    behavior: 'Projectile',
    baseDmgCoeff: 2.6,
    cooldownSec: 1.5,
    maxLevel: 5,
    vfxColor: 0x60A5FA,
    description: 'Scarica elettrica ad altissima concentrazione sonora che trapassa con violenza i bersagli.',
    characterAffinity: ['sasuke', 'kakashi'],
  },
  {
    id: 'jutsu_goukakyuu',
    nameIT: 'Katon: Palla di Fuoco Suprema',
    nameJP: '火遁・豪火球の術',
    icon: '🔥',
    element: 'Katon',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.0,
    cooldownSec: 2.2,
    maxLevel: 5,
    vfxColor: 0xEF4444,
    description: 'Tecnica segreta del clan Uchiha: espelle una violenta coltre di fiamme che incenerisce il campo.',
    characterAffinity: ['sasuke', 'itachi', 'obito', 'madara', 'shisui'],
  },
  {
    id: 'jutsu_chidori_nagashi',
    nameIT: 'Chidori Nagashi (Corrente dei Mille Falchi)',
    nameJP: '千鳥流し',
    icon: '⚡',
    element: 'Raiton',
    behavior: 'AreaPersistent',
    baseDmgCoeff: 2.3,
    cooldownSec: 3.5,
    maxLevel: 5,
    vfxColor: 0x93C5FD,
    description: 'Scarica a 360 gradi che fuoriesce da tutto il corpo, folgorando e paralizzando chiunque si avvicini.',
    characterAffinity: ['sasuke'],
  },
  {
    id: 'jutsu_kirin',
    nameIT: 'Kirin (Bestia del Fulmine)',
    nameJP: '麒麟',
    icon: '🌩️',
    element: 'Raiton',
    behavior: 'Beam',
    baseDmgCoeff: 4.2,
    cooldownSec: 5.0,
    maxLevel: 5,
    vfxColor: 0x38BDF8,
    description: 'Convoglia i fulmini atmosferici in un colpo devastante alla velocità della luce.',
    characterAffinity: ['sasuke'],
  },
  {
    id: 'jutsu_amaterasu',
    nameIT: 'Amaterasu (Fiamme Nere Eterne)',
    nameJP: '天照',
    icon: '🖤',
    element: 'Yin',
    behavior: 'AreaPersistent',
    baseDmgCoeff: 3.8,
    cooldownSec: 4.2,
    maxLevel: 5,
    vfxColor: 0x1E1B4B,
    description: 'Fiamme nere generate dal Mangekyō Sharingan che bruciano inestinguibili sul punto di impatto.',
    characterAffinity: ['sasuke', 'itachi'],
  },

  // ── KAKASHI TECHNIQUES ────────────────────────────────────
  {
    id: 'jutsu_raikiri',
    nameIT: 'Raikiri (Taglio del Fulmine)',
    nameJP: '雷切',
    icon: '⚡',
    element: 'Raiton',
    behavior: 'Beam',
    baseDmgCoeff: 3.4,
    cooldownSec: 2.0,
    maxLevel: 5,
    vfxColor: 0x7DD3FC,
    description: 'Evoluzione perfezionata del Chidori capace di recidere anche i fulmini.',
    characterAffinity: ['kakashi'],
  },
  {
    id: 'jutsu_doryuuheki',
    nameIT: 'Doton: Parete Terrestre (Doryūheki)',
    nameJP: '土遁・土流壁',
    icon: '🪨',
    element: 'Doton',
    behavior: 'AreaPersistent',
    baseDmgCoeff: 2.1,
    cooldownSec: 3.0,
    maxLevel: 5,
    vfxColor: 0xD97706,
    description: 'Erigge zolle e spuntoni di pietra che sbarrano la strada e schiacciano i nemici.',
    characterAffinity: ['kakashi', 'sarutobi', 'yamato'],
  },
  {
    id: 'jutsu_suiryuudan',
    nameIT: 'Suiton: Drago Acquatico',
    nameJP: '水遁・水龍弾の術',
    icon: '🐉',
    element: 'Suiton',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.4,
    cooldownSec: 2.8,
    maxLevel: 5,
    vfxColor: 0x3B82F6,
    description: 'Modella il chakra acquatico in un maestoso drago che travolge le prime linee.',
    characterAffinity: ['kakashi', 'zabuza', 'tobirama', 'kisame', 'mei'],
  },
  {
    id: 'jutsu_kamui',
    nameIT: 'Kamui (Voragine Dimensionale)',
    nameJP: '神威',
    icon: '🌀',
    element: 'YinYang',
    behavior: 'Explosion',
    baseDmgCoeff: 4.5,
    cooldownSec: 5.5,
    maxLevel: 5,
    vfxColor: 0xA855F7,
    description: 'Apre uno squarcio spaziotemporale risucchiando i nemici in un\'altra dimensione.',
    characterAffinity: ['kakashi', 'obito'],
  },

  // ── SAKURA & TSUNADE TECHNIQUES ───────────────────────────
  {
    id: 'jutsu_shanaro',
    nameIT: 'Shanarō! (Impatto del Ciliegio)',
    nameJP: '桜花衝',
    icon: '🌸',
    element: 'Taijutsu' as any,
    behavior: 'Explosion',
    baseDmgCoeff: 3.2,
    cooldownSec: 2.5,
    maxLevel: 5,
    vfxColor: 0xF43F5E,
    description: 'Frantuma il suolo con un pugno caricato di chakra, scatenando terremoti concentrici.',
    characterAffinity: ['sakura', 'tsunade'],
  },
  {
    id: 'jutsu_byakugou_pulse',
    nameIT: 'Aura della Rinascita (Byakugō)',
    nameJP: '百豪の術',
    icon: '💎',
    element: 'Yang',
    behavior: 'Orbital',
    baseDmgCoeff: 1.8,
    cooldownSec: 3.0,
    maxLevel: 5,
    vfxColor: 0x10B981,
    description: 'Rilascia globi di chakra vitale che orbitano attorno al ninja respingendo gli aggressori.',
    characterAffinity: ['sakura', 'tsunade'],
  },

  // ── GAARA TECHNIQUES ──────────────────────────────────────
  {
    id: 'jutsu_sabaku_kyuu',
    nameIT: 'Sabaku Kyū (Sarcofago di Sabbia)',
    nameJP: '砂縛柩',
    icon: '🏜️',
    element: 'Doton',
    behavior: 'AreaPersistent',
    baseDmgCoeff: 2.7,
    cooldownSec: 2.6,
    maxLevel: 5,
    vfxColor: 0xCA8A04,
    description: 'Avvolge e soffoca i nemici in densi strati di sabbia intrisa di chakra.',
    characterAffinity: ['gaara', 'shinki'],
  },
  {
    id: 'jutsu_ryusa_bakuryu',
    nameIT: 'Ryūsa Bakuryū (Tsunami di Sabbia)',
    nameJP: '流砂爆流',
    icon: '🌊',
    element: 'Doton',
    behavior: 'ProjectileOmni',
    baseDmgCoeff: 3.0,
    cooldownSec: 4.5,
    maxLevel: 5,
    vfxColor: 0xB45309,
    description: 'Un\'onda gigantesca di sabbia che copre l\'intero orizzonte e polverizza ogni ostacolo.',
    characterAffinity: ['gaara'],
  },

  // ── MINATO TECHNIQUES ─────────────────────────────────────
  {
    id: 'jutsu_hiraishin',
    nameIT: 'Hiraishin no Jutsu (Dislocazione Istantanea)',
    nameJP: '飛雷神の術',
    icon: '⚡',
    element: 'Raiton',
    behavior: 'ProjectileOmni',
    baseDmgCoeff: 2.8,
    cooldownSec: 2.2,
    maxLevel: 5,
    vfxColor: 0xFBBF24,
    description: 'Il Lampo Giallo si teletrasporta a velocità sovrumana falciando chiunque si trovi nelle vicinanze.',
    characterAffinity: ['minato', 'tobirama'],
  },

  // ── JIRAIYA TECHNIQUES ────────────────────────────────────
  {
    id: 'jutsu_gamayu_endan',
    nameIT: 'Gamayu Endan (Olio di Rospo Infuocato)',
    nameJP: '蝦蟇油炎弾',
    icon: '🐸',
    element: 'Katon',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 3.1,
    cooldownSec: 2.8,
    maxLevel: 5,
    vfxColor: 0xEA580C,
    description: 'Infiamma l\'olio del Monte Myoboku con Katon per generare fiamme continue indomabili.',
    characterAffinity: ['jiraiya'],
  },
  {
    id: 'jutsu_kebari_senbon',
    nameIT: 'Kebari Senbon (Pioggia di Aghi di Zanna)',
    nameJP: '毛針千本',
    icon: '🦔',
    element: 'SenjutsuNatural',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 1.9,
    cooldownSec: 1.8,
    maxLevel: 5,
    vfxColor: 0xE2E8F0,
    description: 'Indurisce la chioma trasformando i capelli in una raffica letale di senbon perforanti.',
    characterAffinity: ['jiraiya'],
  },

  // ── SHIKAMARU TECHNIQUES ──────────────────────────────────
  {
    id: 'jutsu_kage_mane',
    nameIT: 'Kage Mane no Jutsu (Controllo dell\'Ombra)',
    nameJP: '影真似の術',
    icon: '👤',
    element: 'Yin',
    behavior: 'Beam',
    baseDmgCoeff: 2.5,
    cooldownSec: 2.4,
    maxLevel: 5,
    vfxColor: 0x334155,
    description: 'Allunga l\'ombra sul suolo collegandosi a quella nemica e provocando danni da strangolamento.',
    characterAffinity: ['shikamaru', 'shikaku'],
  },

  // ── NEJI & HINATA TECHNIQUES ──────────────────────────────
  {
    id: 'jutsu_kaiten',
    nameIT: 'Hakkeshō Kaiten (Palmo del Vortice)',
    nameJP: '八卦掌回天',
    icon: '🛡️',
    element: 'Taijutsu' as any,
    behavior: 'Orbital',
    baseDmgCoeff: 2.2,
    cooldownSec: 3.2,
    maxLevel: 5,
    vfxColor: 0x67E8F9,
    description: 'Scudo difensivo rotante del clan Hyūga che distrugge e rimbalza via ogni minaccia.',
    characterAffinity: ['neji', 'hinata', 'hiashi'],
  },
  {
    id: 'jutsu_jyuuhou_soushiken',
    nameIT: 'Jūhō Sōshiken (Doppio Pugno dei Leoni)',
    nameJP: '柔歩双獅拳',
    icon: '🦁',
    element: 'Yang',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.7,
    cooldownSec: 2.0,
    maxLevel: 5,
    vfxColor: 0xC084FC,
    description: 'Modella il chakra delle mani in due fauci leonine che recidono i punti di fuga nemici.',
    characterAffinity: ['hinata'],
  },

  // ── ROCK LEE & GUY TECHNIQUES ─────────────────────────────
  {
    id: 'jutsu_konoha_senpuu',
    nameIT: 'Konoha Senpū (Vortice della Foglia)',
    nameJP: '木ノ葉旋風',
    icon: '🌪️',
    element: 'Taijutsu' as any,
    behavior: 'AreaPersistent',
    baseDmgCoeff: 2.4,
    cooldownSec: 1.8,
    maxLevel: 5,
    vfxColor: 0x22C55E,
    description: 'Calcio acrobatico rotante ad alta velocità che spazza via i nemici tutt\'attorno.',
    characterAffinity: ['lee', 'guy'],
  },
  {
    id: 'jutsu_asa_kujaku',
    nameIT: 'Asa Kujaku (Pavone del Mattino)',
    nameJP: '朝孔雀',
    icon: '🦚',
    element: 'Taijutsu' as any,
    behavior: 'ProjectileOmni',
    baseDmgCoeff: 3.6,
    cooldownSec: 4.2,
    maxLevel: 5,
    vfxColor: 0xF97316,
    description: 'Pugni a velocità ultrasonica che incendiano l\'aria scagliando piume di fuoco.',
    characterAffinity: ['guy', 'lee'],
  },

  // ── UNIVERSAL CANONICAL NINJA ARTS ────────────────────────
  {
    id: 'jutsu_shuriken_kage_bunshin',
    nameIT: 'Shuriken Kage Bunshin no Jutsu',
    nameJP: '手裏剣影分身の術',
    icon: '🗡️',
    element: 'None',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 1.9,
    cooldownSec: 1.6,
    maxLevel: 5,
    vfxColor: 0x94A3B8,
    description: 'Moltiplica uno shuriken da lancio in una tempesta di migliaia di lame d\'acciaio.',
  },
  {
    id: 'jutsu_fuuton_daitoppa',
    nameIT: 'Fūton: Daitoppa (Grande Folata di Vento)',
    nameJP: '風遁・大突破',
    icon: '🍃',
    element: 'Fuuton',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.0,
    cooldownSec: 2.0,
    maxLevel: 5,
    vfxColor: 0x10B981,
    description: 'Colpo di vento ciclonico che sbalza via le orde nemiche provocando gravi lacerazioni.',
  },
  {
    id: 'jutsu_raiton_gian',
    nameIT: 'Raiton: Gian (Falso Buio)',
    nameJP: '雷遁・偽暗',
    icon: '⚡',
    element: 'Raiton',
    behavior: 'Beam',
    baseDmgCoeff: 3.0,
    cooldownSec: 2.6,
    maxLevel: 5,
    vfxColor: 0x38BDF8,
    description: 'Raggio di saette ad alta densità che trafigge istantaneamente file nemiche intere.',
  },
  {
    id: 'jutsu_suiton_teppoudama',
    nameIT: 'Suiton: Proiettile d\'Acqua',
    nameJP: '水遁・鉄砲玉',
    icon: '💧',
    element: 'Suiton',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.1,
    cooldownSec: 2.1,
    maxLevel: 5,
    vfxColor: 0x3B82F6,
    description: 'Raffica di sferette pressurizzate ad alto impatto idraulico.',
  },
  {
    id: 'jutsu_doton_doryuudan',
    nameIT: 'Doton: Drago di Fango',
    nameJP: '土遁・土龍弾',
    icon: '🪨',
    element: 'Doton',
    behavior: 'ProjectileSpread',
    baseDmgCoeff: 2.3,
    cooldownSec: 2.5,
    maxLevel: 5,
    vfxColor: 0xD97706,
    description: 'Una testa di fango e rocce spara massi incandescenti verso i nemici più vicini.',
  },
];

/**
 * Get available new jutsu options for the given character, prioritizing their signature anime moves
 * and elemental affinities.
 */
export function getAvailableJutsuForCharacter(
  char: Character,
  currentlyLearnedIds: Set<string>,
): JutsuDefinition[] {
  const charId = char.id.toLowerCase();
  const affinities = char.element;

  const candidatePool = CANONICAL_JUTSU_CATALOG.filter(j => !currentlyLearnedIds.has(j.id));

  // Sort by relevance to this character:
  // 1. Direct character affinity (e.g. naruto, sasuke, etc.)
  // 2. Element match
  // 3. Universal
  return candidatePool.sort((a, b) => {
    const aMatchChar = a.characterAffinity?.some(prefix => charId.includes(prefix)) ? 1 : 0;
    const bMatchChar = b.characterAffinity?.some(prefix => charId.includes(prefix)) ? 1 : 0;
    if (aMatchChar !== bMatchChar) return bMatchChar - aMatchChar;

    const aMatchElem = affinities.includes(a.element) ? 1 : 0;
    const bMatchElem = affinities.includes(b.element) ? 1 : 0;
    if (aMatchElem !== bMatchElem) return bMatchElem - aMatchElem;

    return 0;
  });
}
