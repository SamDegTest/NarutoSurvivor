// ============================================================
//  NarutoSurvivor — Icon Manager
//  Provides authentic Naruto anime image assets in place of emoticons
// ============================================================

import { Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';

export const ICON_PATHS: Record<string, string> = {
  // Main Menu Sections
  play: '/icons/menu_multiplayer.jpg',
  pokemon: '/icons/menu_team.jpg',
  shinobi: '/icons/menu_team.jpg',
  upgrades: '/icons/menu_upgrades.jpg',
  shop: '/icons/menu_shop.jpg',
  bag: '/icons/menu_bag.jpg',
  gacha: '/icons/menu_gacha.jpg',
  missions: '/icons/menu_missions.jpg',
  friends: '/icons/menu_team.jpg',
  team: '/icons/menu_team.jpg',
  multiplayer: '/icons/menu_multiplayer.jpg',
  codex: '/icons/menu_codex.jpg',
  leaderboard: '/icons/menu_leaderboard.jpg',
  settings: '/icons/menu_settings.jpg',

  // Currencies, Collectibles & In-Game Items
  ryo: '/icons/currency_ryo.jpg',
  ryo_coin: '/icons/currency_ryo.jpg',
  ramen: '/icons/item_ramen.svg',
  bomb: '/icons/item_bomb.svg',
  magnet: '/icons/item_magnet.svg',
  chakra_orb: '/icons/chakra_orb.svg',
  scroll: '/icons/menu_gacha.jpg',

  // Stats & Level Up Talents
  hp_up: '/icons/stat_hp.svg',
  dmg_up: '/icons/stat_dmg.svg',
  speed_up: '/icons/stat_speed.svg',
  crit_up: '/icons/stat_crit.svg',
  crit_dmg_up: '/icons/stat_crit.svg',
  defense_up: '/icons/stat_defense.svg',
  collect_up: '/icons/item_magnet.svg',
  cooldown_down: '/icons/chakra_orb.svg',
  ryo_up: '/icons/currency_ryo.jpg',
  orb_up: '/icons/chakra_orb.svg',
  heal: '/icons/stat_hp.svg',
  dmg_crit_combo: '/icons/stat_crit.svg',

  // Permanent Upgrades Keys (UpgradesModal)
  hpLevel: '/icons/stat_hp.svg',
  dmgLevel: '/icons/stat_dmg.svg',
  speedLevel: '/icons/stat_speed.svg',
  ryoLevel: '/icons/currency_ryo.jpg',

  // Shop Items Keys (ShopModal)
  scroll_1: '/icons/menu_gacha.jpg',
  scroll_5: '/icons/menu_gacha.jpg',
  frag_naruto: '/icons/item_ramen.svg',
  frag_sasuke: '/icons/stat_dmg.svg',
  ramen_special: '/icons/item_ramen.svg',
  chakra_tonic: '/icons/chakra_orb.svg',
  military_pill: '/icons/stat_hp.svg',
  magnet_charm: '/icons/item_magnet.svg',

  // Bag Items Keys (BagModal)
  kunai_minato: '/icons/jutsu/jutsu_hiraishin.svg',
  shuriken_fuma: '/icons/jutsu/jutsu_shuriken_kage_bunshin.svg',
  explosive_tags: '/icons/jutsu/tool_fire_seal.svg',
  smoke_bombs: '/icons/item_bomb.svg',
  leaf_headband: '/icons/jutsu/jutsu_konoha_senpuu.svg',
  ramen_buff: '/icons/item_ramen.svg',
  magnet_amulet: '/icons/item_magnet.svg',
  summon_scrolls: '/icons/menu_gacha.jpg',
  ninja_seals: '/icons/jutsu/tool_fire_seal.svg',

  // Stages (StageSelectModal)
  stage_konoha: '/icons/stat_speed.svg',
  stage_forest: '/icons/stat_defense.svg',
  stage_valley: '/icons/stat_dmg.svg',
  stage_random: '/icons/chakra_orb.svg',
  stage_war: '/icons/menu_multiplayer.jpg',

  // Synergies & Team Affinities (TeamModal)
  team_7: '/icons/stat_speed.svg',
  uchiha: '/icons/stat_crit.svg',
  sannin: '/icons/stat_dmg.svg',
  kage: '/icons/chakra_orb.svg',
  leaf: '/icons/menu_team.jpg',

  // ── Canonical Anime Jutsu Techniques ──────────────────────────
  jutsu_rasengan: '/icons/jutsu/jutsu_rasengan.svg',
  jutsu_kage_bunshin: '/icons/jutsu/jutsu_kage_bunshin.svg',
  jutsu_rasenshuriken: '/icons/jutsu/jutsu_rasenshuriken.svg',
  jutsu_oodama_rasengan: '/icons/jutsu/jutsu_oodama_rasengan.svg',
  jutsu_chidori: '/icons/jutsu/jutsu_chidori.svg',
  jutsu_goukakyuu: '/icons/jutsu/jutsu_goukakyuu.svg',
  jutsu_chidori_nagashi: '/icons/jutsu/jutsu_chidori_nagashi.svg',
  jutsu_kirin: '/icons/jutsu/jutsu_kirin.svg',
  jutsu_amaterasu: '/icons/jutsu/jutsu_amaterasu.svg',
  jutsu_raikiri: '/icons/jutsu/jutsu_raikiri.svg',
  jutsu_doryuuheki: '/icons/jutsu/jutsu_doryuuheki.svg',
  jutsu_suiryuudan: '/icons/jutsu/jutsu_suiryuudan.svg',
  jutsu_kamui: '/icons/jutsu/jutsu_kamui.svg',
  jutsu_shanaro: '/icons/jutsu/jutsu_shanaro.svg',
  jutsu_byakugou_pulse: '/icons/jutsu/jutsu_byakugou_pulse.svg',
  jutsu_sabaku_kyuu: '/icons/jutsu/jutsu_sabaku_kyuu.svg',
  jutsu_ryusa_bakuryu: '/icons/jutsu/jutsu_ryusa_bakuryu.svg',
  jutsu_hiraishin: '/icons/jutsu/jutsu_hiraishin.svg',
  jutsu_gamayu_endan: '/icons/jutsu/jutsu_gamayu_endan.svg',
  jutsu_kebari_senbon: '/icons/jutsu/jutsu_kebari_senbon.svg',
  jutsu_kage_mane: '/icons/jutsu/jutsu_kage_mane.svg',
  jutsu_kaiten: '/icons/jutsu/jutsu_kaiten.svg',
  jutsu_jyuuhou_soushiken: '/icons/jutsu/jutsu_jyuuhou_soushiken.svg',
  jutsu_konoha_senpuu: '/icons/jutsu/jutsu_konoha_senpuu.svg',
  jutsu_asa_kujaku: '/icons/jutsu/jutsu_asa_kujaku.svg',
  jutsu_shuriken_kage_bunshin: '/icons/jutsu/jutsu_shuriken_kage_bunshin.svg',
  jutsu_fuuton_daitoppa: '/icons/jutsu/jutsu_fuuton_daitoppa.svg',
  jutsu_raiton_gian: '/icons/jutsu/jutsu_raiton_gian.svg',
  jutsu_suiton_teppoudama: '/icons/jutsu/jutsu_suiton_teppoudama.svg',
  jutsu_doton_doryuudan: '/icons/jutsu/jutsu_doton_doryuudan.svg',
  jutsu_mastery: '/icons/chakra_orb.svg',
  jutsu_synergy: '/icons/jutsu/jutsu_synergy.svg',

  // ── Ninja Tools ──────────────────────────────────────────────
  tool_wind_scroll: '/icons/jutsu/tool_wind_scroll.svg',
  tool_lightning_blade: '/icons/jutsu/tool_lightning_blade.svg',
  tool_fire_seal: '/icons/jutsu/tool_fire_seal.svg',
  tool_water_pouch: '/icons/jutsu/tool_water_pendant.svg',
  tool_earth_plate: '/icons/jutsu/tool_earth_armor.svg',
  tool_sharingan_eye: '/icons/jutsu/jutsu_amaterasu.svg',
  tool_toad_oil: '/icons/jutsu/tool_sage_chakra.svg',
  tool_sand_urn: '/icons/jutsu/jutsu_sabaku_kyuu.svg',
  tool_yellow_kunai: '/icons/jutsu/jutsu_hiraishin.svg',
  tool_hashirama_cells: '/icons/stat_hp.svg',
  tool_earth_armor: '/icons/jutsu/tool_earth_armor.svg',
  tool_water_pendant: '/icons/jutsu/tool_water_pendant.svg',
  tool_sage_chakra: '/icons/jutsu/tool_sage_chakra.svg',
};

// Fallback emoji to authentic icon key mapping
const EMOJI_TO_KEY: Record<string, string> = {
  '🌀': 'jutsu_rasengan',
  '👥': 'jutsu_kage_bunshin',
  '🌪️': 'jutsu_rasenshuriken',
  '🔵': 'jutsu_oodama_rasengan',
  '⚡': 'jutsu_chidori',
  '🔥': 'jutsu_goukakyuu',
  '🌩️': 'jutsu_kirin',
  '🖤': 'jutsu_amaterasu',
  '🪨': 'jutsu_doryuuheki',
  '🐉': 'jutsu_suiryuudan',
  '🌸': 'jutsu_shanaro',
  '💎': 'jutsu_byakugou_pulse',
  '🏜️': 'jutsu_sabaku_kyuu',
  '🌊': 'jutsu_ryusa_bakuryu',
  '🐸': 'jutsu_gamayu_endan',
  '🦔': 'jutsu_kebari_senbon',
  '👤': 'jutsu_kage_mane',
  '🛡️': 'jutsu_kaiten',
  '🦁': 'jutsu_jyuuhou_soushiken',
  '🦚': 'jutsu_asa_kujaku',
  '🗡️': 'jutsu_shuriken_kage_bunshin',
  '🍃': 'jutsu_konoha_senpuu',
  '💧': 'jutsu_suiton_teppoudama',
  '🌟': 'jutsu_synergy',
  '❤️': 'hp_up',
  '💨': 'speed_up',
  '💥': 'dmg_up',
  '◉': 'chakra_orb',
  '¥': 'ryo',
  '✨': 'chakra_orb',
  '💚': 'hp_up',
  '📜': 'scroll',
  '🍜': 'ramen',
  '💣': 'bomb',
  '🧲': 'magnet',
  '👁️': 'tool_sharingan_eye',
  '🏺': 'tool_sand_urn',
  '🌳': 'tool_hashirama_cells',
};

/**
 * Resolves any key, id, prefix, or emoji to its authentic image asset path.
 */
export function resolveIconPath(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('/') || key.startsWith('http')) return key;
  if (ICON_PATHS[key]) return ICON_PATHS[key];

  // Strip prefixes such as new_jutsu_, jutsu_lvl_, plus_evolve_, synergy_
  const stripped = key.replace(/^(new_jutsu_|jutsu_lvl_|plus_evolve_|synergy_)/, '');
  if (ICON_PATHS[stripped]) return ICON_PATHS[stripped];

  // Strip trailing _plus if present
  if (stripped.endsWith('_plus')) {
    const base = stripped.slice(0, -5);
    if (ICON_PATHS[base]) return ICON_PATHS[base];
  }

  // Check emoji mapping directly
  if (EMOJI_TO_KEY[key]) {
    const mapped = EMOJI_TO_KEY[key];
    if (ICON_PATHS[mapped]) return ICON_PATHS[mapped];
  }

  // Check emoji mapping stripping '+' (e.g. '🌀+')
  if (key.endsWith('+')) {
    const baseEmoji = key.slice(0, -1).trim();
    if (EMOJI_TO_KEY[baseEmoji] && ICON_PATHS[EMOJI_TO_KEY[baseEmoji]]) {
      return ICON_PATHS[EMOJI_TO_KEY[baseEmoji]];
    }
  }

  return undefined;
}

/**
 * Gets the authentic URL/path for a Jutsu (defaults to chakra orb if unknown)
 */
export function getJutsuIconPath(key: string): string {
  return resolveIconPath(key) || '/icons/chakra_orb.svg';
}

/**
 * Preloads all Naruto icons into Pixi Assets cache
 */
export async function preloadNarutoIcons(): Promise<void> {
  const uniquePaths = Array.from(new Set(Object.values(ICON_PATHS)));
  await Promise.allSettled(uniquePaths.map((p) => Assets.load(p)));
}

/**
 * Creates a styled Naruto icon container with circular mask, metallic border,
 * and optional golden Plus (+) badge.
 */
export function createNarutoIcon(key: string, size = 28, circular = true, isPlus = false): Container {
  const container = new Container();
  const path = resolveIconPath(key);
  if (!path) return container;

  const sprite = Sprite.from(path);
  sprite.anchor.set(0.5);

  const applySize = () => {
    if (sprite.texture?.source && sprite.texture.source.width > 0) {
      sprite.width = size;
      sprite.height = size;
    }
  };

  if (sprite.texture?.source && sprite.texture.source.width > 0) {
    applySize();
  } else {
    // Wait until texture is ready before resizing
    if (sprite.texture?.source) {
      sprite.texture.source.once('update', applySize);
    }
    Assets.load(path).then((tex) => {
      sprite.texture = tex;
      applySize();
    }).catch(() => {});
  }

  if (circular) {
    const radius = size / 2;
    const mask = new Graphics();
    mask.circle(0, 0, radius);
    mask.fill({ color: 0xffffff });
    sprite.mask = mask;
    container.addChild(mask);

    // Golden ninja rim
    const border = new Graphics();
    border.circle(0, 0, radius);
    const borderColor = isPlus ? 0xf59e0b : 0xfacc15;
    const borderWidth = isPlus ? 2.2 : 1.5;
    border.stroke({ color: borderColor, width: borderWidth, alpha: isPlus ? 1.0 : 0.85 });
    container.addChild(sprite, border);

    // If it's a Plus (+) Evolution, attach a stylish golden plus emblem
    if (isPlus) {
      const plusBadge = new Graphics();
      const badgeR = Math.max(5, size * 0.22);
      const bx = radius * 0.55;
      const by = radius * 0.55;
      plusBadge.circle(bx, by, badgeR);
      plusBadge.fill({ color: 0xb45309 });
      plusBadge.stroke({ color: 0xfde047, width: 1.2 });
      container.addChild(plusBadge);

      const plusTxt = new Text({
        text: '+',
        style: new TextStyle({
          fontFamily: 'Outfit, Inter, sans-serif',
          fontSize: Math.max(7, size * 0.32),
          fill: 0xffffff,
          fontWeight: '900',
        }),
      });
      plusTxt.anchor.set(0.5);
      plusTxt.x = bx;
      plusTxt.y = by;
      container.addChild(plusTxt);
    }
  } else {
    container.addChild(sprite);
  }

  return container;
}
