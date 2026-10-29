// ============================================================
//  NarutoSurvivor — Game Config Constants
// ============================================================

export const GAME_CONFIG = {
  // Canvas
  WIDTH: 1280,
  HEIGHT: 720,
  TARGET_FPS: 60,

  // World
  WORLD_WIDTH: 4096,
  WORLD_HEIGHT: 4096,

  // Player
  PLAYER_BASE_SPEED: 120,      // px/sec
  PLAYER_HITBOX_RADIUS: 18,    // px

  // Camera
  CAMERA_LERP: 0.10,           // smoothing factor

  // Enemies
  ENEMY_SPAWN_RADIUS_MIN: 600, // px from player center
  ENEMY_SPAWN_RADIUS_MAX: 800,
  ENEMY_INITIAL_COUNT: 8,
  ENEMY_SPAWN_INTERVAL_MS: 2000,
  ENEMY_SPAWN_SCALE: 1.08,     // multiplier per minute

  // Collectibles
  CHAKRA_ORB_BASE_VALUE: 10,
  RYO_DROP_CHANCE: 0.35,
  RYO_BASE_VALUE: 5,

  // Jutsu
  DEFAULT_JUTSU_COOLDOWN: 4.0, // seconds

  // Promotion fragment scaling
  FRAGMENT_BASE_COST: 10,
  FRAGMENT_EXP_FACTOR: 0.65,

  // Stat scaling exponents
  HP_SCALE_EXP: 1.10,
  DMG_SCALE_EXP: 0.92,
  UTILITY_FLAT_BONUS_PER_TIER: 0.08,

  // PHI rank multipliers [index = rank - 1]
  PHI_COMBAT: [1.000, 1.420, 2.100, 3.150, 4.600],
  PHI_UTILITY: [1.000, 1.520, 2.350, 3.700, 5.400],

  // Colors (placeholder palette)
  COLORS: {
    PLAYER:        0xF97316, // orange
    ENEMY_BASIC:   0x4B5563, // gray
    ENEMY_ELITE:   0x7C3AED, // purple
    CHAKRA_ORB:    0x22D3EE, // cyan
    RYO_COIN:      0xFBBF24, // gold
    GROUND:        0x1C2B1A, // dark forest
    GRID:          0x243B1F,
  },

  // UI
  FONT_FAMILY: "'Outfit', sans-serif",
} as const;

export type GameConfig = typeof GAME_CONFIG;
