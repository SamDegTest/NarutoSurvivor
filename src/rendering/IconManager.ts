// ============================================================
//  NarutoSurvivor — Icon Manager
//  Provides authentic Naruto anime image assets in place of emoticons
// ============================================================

import { Assets, Container, Graphics, Sprite } from 'pixi.js';

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
};

/**
 * Preloads all Naruto icons into Pixi Assets cache
 */
export async function preloadNarutoIcons(): Promise<void> {
  const uniquePaths = Array.from(new Set(Object.values(ICON_PATHS)));
  await Promise.allSettled(uniquePaths.map((p) => Assets.load(p)));
}

/**
 * Creates a styled Naruto icon container with circular mask and border
 */
export function createNarutoIcon(key: string, size = 28, circular = true): Container {
  const container = new Container();
  const path = ICON_PATHS[key];
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
    border.stroke({ color: 0xfacc15, width: 1.5, alpha: 0.8 });
    container.addChild(sprite, border);
  } else {
    container.addChild(sprite);
  }

  return container;
}
