import { Application, Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  Player, Enemy, Collectible,
  ENEMY_TEMPLATES,
  type EnemyConfig,
  type EnemyType,
} from '../entities/entities';
import {
  Boss, BOSS_CONFIGS, BOSS_SCHEDULE,
  type BossType,
} from '../entities/bosses';
import {
  ProjectileSystem,
  createProjectile,
  createOrbitalProjectiles,
} from '../systems/projectileSystem';
import { HUD } from '../ui/HUD';
import { LevelUpPanel, PromotionPanel, BossWarningBanner, UPGRADE_POOL, type UpgradeTarget, type UpgradeOption } from '../ui/Panels';
import { computeScaledStats, getNextPromotionTier, tryPromote } from '../systems/promotionSystem';
import { findCombinedTechnique } from '../data/combinedTechniques';
import {
  NINJA_TOOLS,
  findAvailableSynergyForJutsu,
  type SynergyRecipe,
} from '../systems/synergySystem';
import { audioManager } from '../systems/audioManager';
import { SaveSystem } from '../systems/saveSystem';
import { InputHandler } from '../controls/InputHandler';
import { VirtualJoystick } from '../controls/VirtualJoystick';
import { GameOverScene } from './GameOverScene';
import { ParticleSystem } from '../rendering/ParticleSystem';
import { InfiniteTilemap, randomBiome, BIOME_NAMES, type Biome } from '../rendering/TilemapRenderer';
import {
  CANONICAL_JUTSU_CATALOG,
  getAvailableJutsuForCharacter,
  type JutsuDefinition,
  type ActiveJutsuInstance,
} from '../data/jutsuCatalog';
import { JutsuFusionModal, type CombatJutsuSlot } from '../ui/JutsuFusionModal';
import { difficultyManager } from '../systems/difficultyManager';
import { CompanionShinobi } from '../entities/CompanionShinobi';
import { computeTeamSynergy } from '../ui/TeamModal';
import { getCharacterById } from '../data/roster';
import { DestructibleObject, type DestructibleType } from '../entities/DestructibleObject';
import { BossPortal } from '../entities/BossPortal';
import { CoopPlayerShinobi } from '../entities/CoopPlayerShinobi';
import { type MultiplayerMode } from '../network/MultiplayerManager';
import type { Character } from '../types/character';
import type { StarRank } from '../types/character';

// ============================================================
//  NarutoSurvivor — Game Scene (Full Integration)
// ============================================================

export interface PlayerSession {
  character: Character;
  rank: StarRank;
  fragments: number;
  stageBiome?: Biome | 'RANDOM';
  stageName?: string;
  stageId?: string;
  multiplayerMode?: MultiplayerMode;
  coopPartner?: Character;
}

// Handcrafted early XP curve (levels 1-16) for quick initial progression and smooth mid-game
const BASE_XP_TABLE = [0, 25, 65, 130, 220, 340, 500, 720, 1000, 1350, 1800, 2350, 3000, 3800, 4800, 6000, 7500];

/** Calculates XP needed to reach next level with infinite, smooth scaling beyond level 16 */
export function getXpNeededForLevel(level: number): number {
  if (level <= 0) return 25;
  if (level < BASE_XP_TABLE.length) {
    return BASE_XP_TABLE[level];
  }
  // Infinite scaling: starts at 7500 (level 16), smoothly adds +550 base XP + progressive factor per level
  const extraLevels = level - (BASE_XP_TABLE.length - 1);
  const lastBase = BASE_XP_TABLE[BASE_XP_TABLE.length - 1];
  return Math.round(lastBase + extraLevels * 550 + Math.pow(extraLevels, 1.15) * 80);
}

export class GameScene {
  private readonly app: Application;
  private readonly world: Container;
  private readonly groundLayer: Container;
  private readonly entityLayer: Container;
  private readonly uiLayer: Container;

  private input!: InputHandler;
  private virtualJoystick?: VirtualJoystick;
  private particleSystem!: ParticleSystem;
  private currentBiome!: Biome;
  private infiniteTilemap!: InfiniteTilemap;
  private player!: Player;
  private enemies: Enemy[] = [];
  private bosses: Boss[] = [];
  private collectibles: Collectible[] = [];
  private projectileSystem!: ProjectileSystem;
  private hud!: HUD;
  private levelUpPanel!: LevelUpPanel;
  private promotionPanel!: PromotionPanel;
  private bossWarning!: BossWarningBanner;
  private gameOverScene!: GameOverScene;
  private companion?: CompanionShinobi;
  private awakeningMeter = 20;
  private awakeningActive = false;
  private awakeningTimer = 0;
  private destructibles: DestructibleObject[] = [];
  private lastDestructibleSpawnX = 0;
  private lastDestructibleSpawnY = 0;
  private activeBossPortal?: BossPortal;
  private returnPortal?: BossPortal;
  private isInsideBossDimension = false;
  private savedOverworldX = 0;
  private savedOverworldY = 0;
  private savedOverworldBiome: Biome = 'KONOHA_VILLAGE';
  private coopPartnerShinobi?: CoopPlayerShinobi;

  // ── Session state & Metrics ────────────────────────────────
  private elapsedSec = 0;
  private chakraOrbs = 0;
  private ryo = 0;
  private level = 1;
  private xp = 0;
  private totalKills = 0;
  private bossesDefeatedCount = 0;
  private scrollsEarnedInRun = 0;
  private gameOver = false;
  private paused = false;
  private session!: PlayerSession;

  // ── Upgrade target (live mutable stats) ────────────────────
  private upgStats!: UpgradeTarget;

  // ── Jutsu & In-Run Synergies ──────────────────────────────
  private combatSlots: CombatJutsuSlot[] = [];
  private activeSlotIndex: number = 0;
  private jutsuFusionModal!: JutsuFusionModal;
  private combinedActive = false;
  private acquiredTools = new Map<string, number>();
  private activeSynergy: SynergyRecipe | null = null;

  // ── Spawn ─────────────────────────────────────────────────
  private spawnTimer = 0;

  // ── Boss tracking ─────────────────────────────────────────
  private bossMinutesSpawned = new Set<number>();

  // ── Promotion ─────────────────────────────────────────────
  private currentFragments = 0;
  private currentRank!: StarRank;
  private onReturnToMenu?: () => void;

  constructor(app: Application) {
    this.app = app;
    this.world    = new Container();
    this.groundLayer = new Container();
    this.entityLayer = new Container();
    this.uiLayer  = new Container();
    this.world.addChild(this.groundLayer);
    this.world.addChild(this.entityLayer);
    app.stage.addChild(this.world);
    app.stage.addChild(this.uiLayer);
    this.gameOverScene = new GameOverScene(this.app);
  }

  setOnReturnToMenu(cb: () => void): void {
    this.onReturnToMenu = cb;
  }

  private returnToMenu(): void {
    this.paused = false;
    if (this.hud) {
      this.hud.destroy();
    }
    this.stop();
    this.world.visible = false;
    this.uiLayer.visible = false;
    if (this.onReturnToMenu) this.onReturnToMenu();
  }

  async start(session: PlayerSession): Promise<void> {
    this.world.visible = true;
    this.uiLayer.visible = true;
    this.session = session;
    this.currentRank = session.rank;
    this.currentFragments = session.fragments;
    this.gameOver = false;
    this.paused   = false;
    this.elapsedSec = 0;
    this.chakraOrbs = 0;
    this.ryo = 0;
    this.level = 1;
    this.xp = 0;
    this.totalKills = 0;
    this.bossesDefeatedCount = 0;
    this.scrollsEarnedInRun = 0;
    this.awakeningMeter = 20;
    this.awakeningActive = false;
    this.awakeningTimer = 0;
    this.destructibles = [];
    this.activeBossPortal = undefined;
    this.returnPortal = undefined;
    this.isInsideBossDimension = false;
    this.enemies = [];
    this.bosses  = [];
    this.collectibles = [];
    this.bossMinutesSpawned.clear();
    this.entityLayer.removeChildren();
    this.groundLayer.removeChildren();
    this.uiLayer.removeChildren();
    this.gameOverScene.hide();

    // ── Resume audio context on interaction ───────────────────
    audioManager.resume();
    audioManager.startBGM();

    // ── Input (keyboard + gamepad + touch) ─────────────────
    this.input = new InputHandler();

    // Wire pause callback from gamepad Start button
    this.input.onPause = () => {
      if (this.levelUpPanel.isVisible || this.promotionPanel.isVisible) return;
      this.paused = !this.paused;
    };

    // Wire Awakening callback
    this.input.onAwaken = () => this.triggerAwakening();

    // ── Biome & Ground Infinite Tilemap ───────────────────────
    let chosenBiome: Biome;
    if (session.stageBiome && session.stageBiome !== 'RANDOM') {
      chosenBiome = session.stageBiome;
    } else {
      chosenBiome = randomBiome();
    }
    this.currentBiome = chosenBiome;
    this.infiniteTilemap = new InfiniteTilemap(this.currentBiome, this.groundLayer);
    this.infiniteTilemap.update(0, 0, true);
    this.particleSystem = new ParticleSystem(this.entityLayer);

    // ── Player stats ─────────────────────────────────────────
    const baseStats = computeScaledStats(session.character, session.rank);
    this.upgStats = {
      hp:                  baseStats.hp,
      maxHp:               baseStats.hp,
      jutsudmg:            baseStats.jutsudmg,
      movespeed:           baseStats.movespeed,
      collectradius:       baseStats.collectradius,
      critchance:          baseStats.critchance,
      critdmg:             baseStats.critdmg,
      defense:             baseStats.defense,
      ryomultiplier:       baseStats.ryomultiplier,
      chakraorbmultiplier: baseStats.chakraorbmultiplier,
      jutsuCooldownMult:   1.0,
    };

    // Apply permanent talent tree upgrades
    const prof = SaveSystem.getProfile();
    const hpTalentBonus = 1 + (prof.upgrades.hpLevel || 0) * 0.10;
    const dmgTalentBonus = 1 + (prof.upgrades.dmgLevel || 0) * 0.08;
    const speedTalentBonus = 1 + (prof.upgrades.speedLevel || 0) * 0.05;
    const ryoTalentBonus = 1 + (prof.upgrades.ryoLevel || 0) * 0.12;

    this.upgStats.maxHp *= hpTalentBonus;
    this.upgStats.hp = this.upgStats.maxHp;
    this.upgStats.jutsudmg *= dmgTalentBonus;
    this.upgStats.movespeed *= speedTalentBonus;
    this.upgStats.ryomultiplier *= ryoTalentBonus;

    // Apply consumable shop buffs (Ichiraku Ramen & Tenten Charms)
    const runBuffs = SaveSystem.consumeNextRunBuffs();
    let hasRunBuffs = false;
    if (runBuffs.ichirakuRamen) {
      this.upgStats.maxHp *= 1.30;
      this.upgStats.hp = this.upgStats.maxHp;
      this.upgStats.movespeed *= 1.15;
      hasRunBuffs = true;
    }
    if (runBuffs.chakraTonic) {
      this.upgStats.jutsuCooldownMult *= 0.80;
      hasRunBuffs = true;
    }
    if (runBuffs.militaryPill) {
      this.upgStats.jutsudmg *= 1.25;
      this.upgStats.critchance = Math.min(0.85, this.upgStats.critchance + 0.12);
      hasRunBuffs = true;
    }
    if (runBuffs.magnetAmulet) {
      this.upgStats.collectradius += 90;
      hasRunBuffs = true;
    }

    // ── Apply Stage Biome Modifiers ───────────────────────────
    if (this.currentBiome === 'FOREST_OF_DEATH') {
      this.upgStats.chakraorbmultiplier *= 1.25;
      setTimeout(() => {
        this.hud.showToast(`[STAGE] Foresta della Morte: +25% Guadagno Chakra!`);
      }, 1000);
    } else if (this.currentBiome === 'VALLEY_OF_END') {
      this.upgStats.ryomultiplier *= 1.50;
      this.upgStats.chakraorbmultiplier *= 1.50;
      setTimeout(() => {
        this.hud.showToast(`[STAGE] Valle della Fine: Sfida Incubo (+50% Ryo & Chakra)!`);
      }, 1000);
    } else {
      setTimeout(() => {
        this.hud.showToast(`[STAGE] Villaggio della Foglia: Addestramento Standard`);
      }, 1000);
    }

    // ── Player entity ─────────────────────────────────────────
    this.player = new Player({ ...session.character, baseStats } as Character);
    this.player.hp = this.upgStats.hp;
    this.player.maxHp = this.upgStats.maxHp;
    this.entityLayer.addChild(this.player.container);

    // Initial destructibles on terrain
    this.lastDestructibleSpawnX = this.player.x;
    this.lastDestructibleSpawnY = this.player.y;
    this.spawnDestructiblesAround(this.player.x, this.player.y, 8);

    // ── Active Jutsu setup ────────────────────────────────────
    this.acquiredTools.clear();
    this.activeSynergy = null;
    this.projectileSystem = new ProjectileSystem(this.entityLayer);
    this.projectileSystem.setOnPlayerHit(dmg => this.damagePlayer(dmg));

    // ── Companion Shinobi (Support Ninja from Squad) ──────────
    const supportId = SaveSystem.getSupportCharacterId();
    const supportChar = supportId && supportId !== session.character.id ? getCharacterById(supportId) : null;
    if (supportChar && SaveSystem.isCharacterUnlocked(supportChar.id)) {
      this.companion = new CompanionShinobi(supportChar, this.player.x, this.player.y);
      this.entityLayer.addChild(this.companion.container);

      // Apply Team Synergy Bonus
      const syn = computeTeamSynergy(session.character, supportChar);
      if (syn.title.includes('Team 7')) {
        this.upgStats.movespeed *= 1.15;
        this.upgStats.maxHp = Math.round(this.upgStats.maxHp * 1.10);
        this.upgStats.hp = this.upgStats.maxHp;
      } else if (syn.title.includes('Uchiha')) {
        this.upgStats.critdmg *= 1.20;
        this.upgStats.critchance = Math.min(0.9, this.upgStats.critchance + 0.10);
      } else if (syn.title.includes('Kage')) {
        this.upgStats.jutsuCooldownMult *= 0.85;
        this.upgStats.defense += 15;
      } else if (syn.title.includes('Sannin')) {
        this.upgStats.jutsudmg *= 1.25;
      } else {
        this.upgStats.jutsudmg *= 1.10;
      }
      setTimeout(() => {
        this.hud.showToast(`[COMPAGNO] ${supportChar.nameIT}: ${syn.statBonusText}`);
      }, 1800);
    } else {
      this.companion = undefined;
    }

    // ── Multiplayer Co-op Shinobi Partner (Player 2) ─────────
    if (session.multiplayerMode && session.coopPartner) {
      const isLocal = session.multiplayerMode === 'local_coop';
      this.coopPartnerShinobi = new CoopPlayerShinobi(
        session.coopPartner,
        this.player.x - 45,
        this.player.y + 20,
        isLocal,
      );
      this.entityLayer.addChild(this.coopPartnerShinobi.container);
      setTimeout(() => {
        this.hud.showToast(`[CO-OP SHINOBI] ${session.coopPartner?.nameIT} (${isLocal ? 'Locale P2' : 'Online'})`);
      }, 1500);
    } else {
      this.coopPartnerShinobi = undefined;
    }

    // Initial character signature jutsu
    const charJutsuSlot = session.character.jutsuSlot;
    const catalogMatch = CANONICAL_JUTSU_CATALOG.find(
      j => j.id === charJutsuSlot.id || j.nameIT.toLowerCase() === charJutsuSlot.nameIT.toLowerCase(),
    );
    const initialDef: JutsuDefinition = catalogMatch ?? {
      id: charJutsuSlot.id,
      nameIT: charJutsuSlot.nameIT,
      nameJP: charJutsuSlot.nameJP,
      icon: `/icons/jutsu/${charJutsuSlot.id}.svg`,
      element: charJutsuSlot.element,
      behavior: charJutsuSlot.behavior,
      baseDmgCoeff: charJutsuSlot.baseDmgCoeff,
      cooldownSec: charJutsuSlot.cooldownSec,
      maxLevel: 5,
      vfxColor: session.character.assets.color,
      description: `Tecnica caratteristica di ${session.character.nameIT}`,
      evolutionReq: {
        statId: 'dmg_up',
        statName: 'Chakra Concentrato (Danno)',
        statIcon: '/icons/stat_dmg.svg',
        description: 'Richiede 1 potenziamento del Danno per risvegliare la forma Plus.',
      },
      plusEvolution: {
        nameIT: `${charJutsuSlot.nameIT} +`,
        nameJP: `${charJutsuSlot.nameJP}・極`,
        icon: `/icons/jutsu/${charJutsuSlot.id}.svg`,
        description: `Evoluzione Suprema di ${charJutsuSlot.nameIT} con potenza e raggio raddoppiati!`,
        vfxColor: session.character.assets.color,
        dmgMultiplier: 2.0,
        cooldownMultiplier: 0.75,
        bonusPierce: 3,
        bonusRadius: 6,
        specialEffectDescription: 'Raggio e danno raddoppiati.',
      },
    };

    this.combatSlots = [
      {
        id: 'slot_0',
        name: initialDef.nameIT,
        slotCooldownTimer: 0,
        moves: [
          {
            definition: initialDef,
            level: 1,
            cooldownTimer: 0,
            isPlus: false,
            statRequirementMet: false,
          },
        ],
      },
    ];
    this.activeSlotIndex = 0;

    // Check if combined technique is active initially
    const combined = findCombinedTechnique(
      session.character.jutsuSlot.id,
      session.character.passiveAbility.id,
    );
    this.combinedActive = !!combined;
    if (this.combinedActive) audioManager.playSFX('combined_activate');

    if (initialDef.behavior === 'Orbital') {
      const orbDmg = Math.round(this.upgStats.jutsudmg * initialDef.baseDmgCoeff * 10);
      const orbs = createOrbitalProjectiles(
        this.player.x, this.player.y, 3, orbDmg, initialDef.vfxColor,
      );
      this.projectileSystem.setOrbitals(orbs);
    }

    // ── HUD ───────────────────────────────────────────────────
    if (this.hud) {
      this.hud.destroy();
    }
    this.hud = new HUD(this.app, this.uiLayer);
    this.hud.setOnSelectSlot((idx) => this.selectSlot(idx));
    this.hud.setOnAwaken(() => this.triggerAwakening());
    this.hud.setOnResume(() => {
      this.paused = false;
    });
    this.hud.setOnQuit(() => {
      this.paused = false;
      this.returnToMenu();
    });
    this.hud.showToast(`Bioma: ${BIOME_NAMES[this.currentBiome]}`);
    if (hasRunBuffs) {
      setTimeout(() => {
        this.hud.showToast('[ICHIRAKU & TENTEN] Buff attivi per questa run!');
      }, 1800);
    }

    // ── UI Panels ─────────────────────────────────────────────
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    this.levelUpPanel    = new LevelUpPanel(this.uiLayer, W, H);
    this.promotionPanel  = new PromotionPanel(this.uiLayer, W, H);
    this.bossWarning     = new BossWarningBanner(this.uiLayer, W, H);
    this.jutsuFusionModal = new JutsuFusionModal(this.uiLayer, W, H);

    // ── Input Slot Selection Callbacks ───────────────────────
    this.input.onSelectSlot = (idx) => this.selectSlot(idx);
    this.input.onCycleSlot  = (dir) => this.cycleSlot(dir);

    // ── Virtual Joystick (mobile / touch) ────────────────────
    this.setupVirtualJoystick();

    // ── Keybindings ───────────────────────────────────────────
    this.setupKeybindings();

    // ── Initial wave (Easy tutorial start: 3 basic Zetsu) ─────
    difficultyManager.reset();
    this.spawnWave(3, 'zetsu');
    this.spawnDestructiblesAround(this.player.x, this.player.y, 8);

    // ── Game Loop ─────────────────────────────────────────────
    this.app.ticker.add(this.tick, this);
  }

  stop(): void {
    this.paused = false;
    if (this.hud) {
      this.hud.destroy();
    }
    this.app.ticker.remove(this.tick, this);
    audioManager.stopBGM();
    this.infiniteTilemap?.clear();
    this.entityLayer.removeChildren();
    this.groundLayer.removeChildren();
    this.uiLayer.removeChildren();
    this.virtualJoystick?.hide();
    this.coopPartnerShinobi = undefined;
    this.activeBossPortal = undefined;
    this.returnPortal = undefined;
    this.isInsideBossDimension = false;
    this.destructibles = [];
  }

  // ── Virtual Joystick Setup ───────────────────────────────────

  private setupVirtualJoystick(): void {
    // Create joystick (always, shown/hidden based on touch detection)
    this.virtualJoystick = new VirtualJoystick(this.app, this.input);

    // Wire pause button from joystick
    this.virtualJoystick.onPause = () => {
      if (this.levelUpPanel.isVisible || this.promotionPanel.isVisible) return;
      this.paused = !this.paused;
    };

    // Auto-detect touch capability
    const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (isTouchDevice) {
      this.virtualJoystick.show();
    } else {
      this.virtualJoystick.hide();
    }

    // Show joystick when first touch detected even on hybrid devices
    window.addEventListener('touchstart', () => {
      this.virtualJoystick?.show();
    }, { once: true, passive: true });
  }

  // ── Keybindings ─────────────────────────────────────────────

  private _keyHandler?: (e: KeyboardEvent) => void;

  private setupKeybindings(): void {
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.levelUpPanel.isVisible || this.promotionPanel.isVisible) return;
        this.paused = !this.paused;
      }
      if (e.code === 'KeyF' && !this.paused && !this.gameOver) {
        this.openPromotionPanel();
      }
      if (e.code === 'KeyM') {
        const on = audioManager.toggle();
        this.hud.showToast(on ? 'AUDIO: ATTIVO' : 'AUDIO: DISATTIVATO');
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }


  // ── Main Tick ────────────────────────────────────────────────

  private tick = (ticker: { deltaTime: number; deltaMS: number }): void => {
    if (this.gameOver) return;

    // ── Poll gamepad (must run every frame) ───────────────────
    this.input.update();

    // ── Update particles ────────────────────────────────────
    this.particleSystem.update(ticker.deltaMS / 1000);

    // Boss warning and promotion panel use real-time
    const dt = ticker.deltaMS / 1000;
    this.bossWarning.update(dt);

    if (this.paused || this.levelUpPanel.isVisible || this.promotionPanel.isVisible || this.jutsuFusionModal?.container.visible) {
      this.updateHUD(); // keep HUD updating even when paused
      return;
    }

    this.elapsedSec += dt;

    // ── Player ────────────────────────────────────────────────
    this.player.speed = this.upgStats.movespeed;
    this.player.collectRadius = this.upgStats.collectradius;
    this.player.update(dt, this.input);

    // ── Camera ────────────────────────────────────────────────
    const targetX = this.app.screen.width  / 2 - this.player.x;
    const targetY = this.app.screen.height / 2 - this.player.y;
    this.world.x += (targetX - this.world.x) * GAME_CONFIG.CAMERA_LERP;
    this.world.y += (targetY - this.world.y) * GAME_CONFIG.CAMERA_LERP;

    // ── Dynamic Infinite Tilemap Chunks ───────────────────────
    this.infiniteTilemap.update(this.player.x, this.player.y);

    // ── Shinobi Awakening Timer ──────────────────────────────
    if (this.awakeningActive) {
      this.awakeningTimer -= dt;
      if (this.awakeningTimer <= 0) {
        this.awakeningActive = false;
        this.awakeningTimer = 0;
        this.player.isAwakened = false;
        this.hud.showToast('[RISVEGLIO] Terminato. Recupero Chakra...');
      }
    }

    // ── Dynamic Destructible Objects ─────────────────────────
    const dMove = Math.hypot(this.player.x - this.lastDestructibleSpawnX, this.player.y - this.lastDestructibleSpawnY);
    if (dMove > 500) {
      this.lastDestructibleSpawnX = this.player.x;
      this.lastDestructibleSpawnY = this.player.y;
      this.spawnDestructiblesAround(this.player.x, this.player.y, 4);
    }

    this.destructibles = this.destructibles.filter(d => {
      if (d.isBroken) return false;
      const pDist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
      if (pDist < GAME_CONFIG.PLAYER_HITBOX_RADIUS + d.radius) {
        this.breakDestructible(d);
        return false;
      }
      return true;
    });

    // ── Active Slot Jutsu: Simultaneous Cooldown & Fire ───────
    const curSlot = this.combatSlots[this.activeSlotIndex];
    if (curSlot && curSlot.moves.length > 0) {
      if (curSlot.slotCooldownTimer === undefined) {
        curSlot.slotCooldownTimer = 0;
      }
      const effectiveDt = this.awakeningActive ? dt * 2.0 : dt;
      curSlot.slotCooldownTimer -= effectiveDt;
      if (curSlot.slotCooldownTimer <= 0) {
        // Fire ALL merged techniques in this slot simultaneously!
        for (const aj of curSlot.moves) {
          this.fireSpecificJutsu(aj);
        }
        // Slot cooldown determined by minimum cooldown of moves + fusion bonus + plus bonus
        const minCd = Math.min(...curSlot.moves.map(m => {
          const cdRed = Math.pow(0.90, m.level - 1);
          const plusCd = m.isPlus ? m.definition.plusEvolution.cooldownMultiplier : 1.0;
          return m.definition.cooldownSec * cdRed * plusCd;
        }));
        const fusionSpeedMult = Math.pow(0.90, curSlot.moves.length - 1);
        curSlot.slotCooldownTimer = Math.max(
          0.25,
          minCd * fusionSpeedMult * this.upgStats.jutsuCooldownMult,
        );
      }
    }

    // ── Normal Enemies ────────────────────────────────────────
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const { shootProjectile } = enemy.update(dt, this.player.x, this.player.y);
      if (shootProjectile) {
        this.projectileSystem.fireEnemyProjectile(
          enemy.x,
          enemy.y,
          shootProjectile.angle,
          shootProjectile.speed,
          shootProjectile.damage,
          shootProjectile.type,
        );
      }
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < GAME_CONFIG.PLAYER_HITBOX_RADIUS + enemy.config.size * 0.8) {
        this.damagePlayer(enemy.config.damage * dt * 2);
      }
    }

    // ── Bosses ────────────────────────────────────────────────
    for (const boss of this.bosses) {
      if (boss.isDead) continue;
      const { specialAttack, bossRangedProjectiles } = boss.update(dt, this.player.x, this.player.y);

      // Boss signature projectiles
      if (bossRangedProjectiles && bossRangedProjectiles.length > 0) {
        for (const bp of bossRangedProjectiles) {
          this.projectileSystem.fireEnemyProjectile(
            boss.x,
            boss.y,
            bp.angle,
            bp.speed,
            bp.damage,
            bp.type,
          );
        }
      }

      // Boss contact damage
      const bd = Math.hypot(boss.x - this.player.x, boss.y - this.player.y);
      if (bd < GAME_CONFIG.PLAYER_HITBOX_RADIUS + boss.config.size * 0.9) {
        this.damagePlayer(boss.config.damage * dt * 2.5);
      }

      // Boss special attack (AoE pulse)
      if (specialAttack) {
        const sDist = Math.hypot(boss.x - this.player.x, boss.y - this.player.y);
        if (sDist < boss.config.specialAttackRadius) {
          this.damagePlayer(boss.config.specialAttackDamage);
          this.hud.showToast(`[ATTACCO SPECIALE] ${boss.config.nameIT}!`);
          this.spawnBossShockwave(boss);
        }
      }
    }

    // ── Projectile System ─────────────────────────────────────
    const allEnemies = [...this.enemies, ...this.bosses] as Enemy[];

    // ── Companion Shinobi Action ──────────────────────────────
    if (this.companion) {
      this.companion.update(
        dt,
        this.player.x,
        this.player.y,
        allEnemies,
        (proj) => this.projectileSystem.fireProjectile(proj),
        (heal) => {
          this.upgStats.hp = Math.min(this.upgStats.maxHp, this.upgStats.hp + heal);
          this.player.hp = this.upgStats.hp;
          this.hud.showToast(`[CURA MEDICA] +${heal} HP da ${this.companion?.character.nameIT}!`);
        },
      );
    }

    // ── Co-op Player Shinobi Action ──────────────────────────
    if (this.coopPartnerShinobi) {
      this.coopPartnerShinobi.update(
        dt,
        allEnemies,
        (proj) => this.projectileSystem.fireProjectile(proj),
      );
    }

    this.projectileSystem.update(
      dt,
      this.player.x, this.player.y,
      allEnemies,
      (enemy, dmg, isPlus) => this.onEnemyHit(enemy as Enemy | Boss, dmg, isPlus),
      this.destructibles,
      (d, dmg) => {
        d.takeDamage(dmg);
        if (d.isBroken) {
          this.breakDestructible(d);
        }
      },
    );

    // ── Process dead enemies ──────────────────────────────────
    this.enemies = this.enemies.filter(e => {
      if (e.isDead) {
        this.totalKills++;
        this.awakeningMeter = Math.min(100, this.awakeningMeter + 0.8);
        this.particleSystem.emitEnemyDeath(e.x, e.y, e.config.color);
        this.particleSystem.emitNinjaSmoke(e.x, e.y);
        this.spawnDrops(e.x, e.y, e.config);
        this.entityLayer.removeChild(e.container);
        audioManager.playSFX('enemy_die');
        return false;
      }
      return true;
    });

    this.bosses = this.bosses.filter(b => {
      if (b.isDead) {
        this.awakeningMeter = Math.min(100, this.awakeningMeter + 25);
        this.particleSystem.emitBossDeath(b.x, b.y, b.config.color, b.config.accentColor);
        this.onBossDead(b);
        this.entityLayer.removeChild(b.container);
        return false;
      }
      return true;
    });

    // ── Collectibles (Physical Scatter & Magnetic Suction) ────
    this.collectibles = this.collectibles.filter(c => {
      if (c.collected) return false;
      const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
      // Instant physical pickup if player collides with item
      if (dist <= GAME_CONFIG.PLAYER_HITBOX_RADIUS + 16) {
        this.collectItem(c);
        c.collected = true;
        this.entityLayer.removeChild(c.container);
        return false;
      }
      if (dist < this.upgStats.collectradius) {
        c.isMagnetized = true;
      }
      const absorbed = c.update(dt, this.player.x, this.player.y);
      if (absorbed) {
        this.collectItem(c);
        c.collected = true;
        this.entityLayer.removeChild(c.container);
        return false;
      }
      return true;
    });

    // ── Update Spacetime Boss Portals ────────────────────────
    if (this.activeBossPortal) {
      this.activeBossPortal.update(dt);
      if (this.activeBossPortal.isExpired) {
        this.entityLayer.removeChild(this.activeBossPortal.container);
        this.activeBossPortal = undefined;
        this.hud.showToast('[PORTALE] Spazio-temporale collassato!');
      } else {
        const pDist = Math.hypot(this.activeBossPortal.x - this.player.x, this.activeBossPortal.y - this.player.y);
        if (pDist <= this.activeBossPortal.radius + GAME_CONFIG.PLAYER_HITBOX_RADIUS) {
          this.enterBossPortal(this.activeBossPortal);
        }
      }
    }

    if (this.returnPortal) {
      this.returnPortal.update(dt);
      const rDist = Math.hypot(this.returnPortal.x - this.player.x, this.returnPortal.y - this.player.y);
      if (rDist <= this.returnPortal.radius + GAME_CONFIG.PLAYER_HITBOX_RADIUS) {
        this.returnFromBossDimension();
      }
    }

    // ── Dynamic Difficulty & Enemy Spawning ────────────────────
    const diff = difficultyManager.getSnapshot(this.elapsedSec);

    // Announce threat tier changes
    if (diff.tierChanged && this.elapsedSec > 5) {
      this.hud.showToast(`[ALLERTA] ${diff.threatTier.nameIT}!`);
      audioManager.playSFX('promotion');
    }

    // Periodic invasion surge event (only outside boss dimension)
    if (!this.isInsideBossDimension && difficultyManager.checkSurge(this.elapsedSec)) {
      this.triggerSurgeEvent();
    }

    // Regular wave spawn (only outside boss dimension)
    if (!this.isInsideBossDimension) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= diff.spawnIntervalSec) {
        this.spawnTimer = 0;
        const activeCount = this.enemies.filter(e => !e.isDead).length;
        const deficit = diff.enemyBudget - activeCount;
        if (deficit > 0) {
          const batchSize = Math.min(8, Math.max(1, Math.ceil(deficit * 0.40)));
          this.spawnWave(batchSize);
        }
      }
    }

    // ── Boss Portal Scheduling (Portali Spazio-Temporali) ─────
    if (!this.isInsideBossDimension) {
      const currentMinute = Math.floor(this.elapsedSec / 60);
      for (const [minute, bossType] of BOSS_SCHEDULE) {
        if (currentMinute >= minute && !this.bossMinutesSpawned.has(minute)) {
          this.bossMinutesSpawned.add(minute);
          this.spawnBossPortal(bossType);
        }
      }
    }

    // ── Victory Check (18 min survival, disabled in Endless Mode) ──────
    if (this.elapsedSec >= 1080 && !this.gameOver && this.session.stageId !== 'stage_war') {
      this.triggerVictory();
      return;
    }

    // ── Player death ──────────────────────────────────────────
    if (this.player.isDead) {
      this.gameOver = true;
      audioManager.playSFX('game_over');
      audioManager.stopBGM();
      const grade = this.elapsedSec >= 900 ? 'A' : (this.elapsedSec >= 540 ? 'B' : (this.elapsedSec >= 240 ? 'C' : 'D'));
      SaveSystem.recordRunEnd(
        this.ryo,
        this.elapsedSec,
        this.level,
        this.totalKills,
        this.bossesDefeatedCount > 0,
        false,
        {
          characterId: this.session.character.id,
          characterName: this.session.character.nameIT,
          stageName: this.session.stageName || (this.session.stageId === 'stage_war' ? 'Grande Guerra Ninja' : 'Foresta della Morte'),
          grade,
        },
      );
      SaveSystem.addFragments(this.session.character.id, this.currentFragments);
      this.gameOverScene.show(
        {
          character: this.session.character,
          rank: this.currentRank,
          elapsedSec: this.elapsedSec,
          level: this.level,
          kills: this.totalKills,
          bossesDefeated: this.bossesDefeatedCount,
          chakraCollected: this.chakraOrbs,
          ryoEarned: this.ryo,
          fragmentsEarned: Math.max(0, this.currentFragments - this.session.fragments),
          scrollsEarned: this.scrollsEarnedInRun,
          activeSynergyName: this.activeSynergy?.nameIT,
          isVictory: false,
        },
        () => this.restart(),
        () => this.returnToMenu(),
      );
    }

    this.updateHUD();
  };

  private triggerVictory(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    audioManager.playSFX('promotion');
    audioManager.stopBGM();
    this.particleSystem.emitLevelUp(this.player.x, this.player.y);

    const victoryRyoBonus = 3500;
    const victoryFragments = 30;
    const victoryScrolls = 5;

    this.ryo += victoryRyoBonus;
    this.currentFragments += victoryFragments;
    this.scrollsEarnedInRun += victoryScrolls;
    SaveSystem.addScrolls(victoryScrolls);
    SaveSystem.addFragments(this.session.character.id, victoryFragments);

    const grade = (this.elapsedSec >= 1080 || this.bossesDefeatedCount >= 3) ? 'S' : 'A';
    SaveSystem.recordRunEnd(
      this.ryo,
      this.elapsedSec,
      this.level,
      this.totalKills,
      true,
      true, // isVictory
      {
        characterId: this.session.character.id,
        characterName: this.session.character.nameIT,
        stageName: this.session.stageName || (this.session.stageId === 'stage_war' ? 'Grande Guerra Ninja' : 'Foresta della Morte'),
        grade,
      },
    );

    this.hud.showToast('[VITTORIA SHINOBI] Il Villaggio della Foglia è salvo!');

    this.gameOverScene.show(
      {
        character: this.session.character,
        rank: this.currentRank,
        elapsedSec: this.elapsedSec,
        level: this.level,
        kills: this.totalKills,
        bossesDefeated: this.bossesDefeatedCount,
        chakraCollected: this.chakraOrbs,
        ryoEarned: this.ryo,
        fragmentsEarned: Math.max(0, this.currentFragments - this.session.fragments),
        scrollsEarned: this.scrollsEarnedInRun,
        activeSynergyName: this.activeSynergy?.nameIT,
        isVictory: true,
      },
      () => this.restart(),
      () => this.returnToMenu(),
    );
  }

  selectSlot(idx: number): void {
    if (idx >= 0 && idx < this.combatSlots.length && idx !== this.activeSlotIndex) {
      this.activeSlotIndex = idx;
      audioManager.playSFX('button_click');
      const slot = this.combatSlots[idx];
      const names = slot.moves.map(m => m.definition.nameIT).join(' + ');
      this.hud.showToast(`[MOSSA ATTIVA] ${names}`);
    }
  }

  cycleSlot(dir: -1 | 1): void {
    if (this.combatSlots.length <= 1) return;
    const next = (this.activeSlotIndex + dir + this.combatSlots.length) % this.combatSlots.length;
    this.selectSlot(next);
  }

  private mergeSlots(slotAIdx: number, slotBIdx: number): void {
    const slotA = this.combatSlots[slotAIdx];
    const slotB = this.combatSlots[slotBIdx];
    if (!slotA || !slotB || slotAIdx === slotBIdx) return;
    if (slotA.moves.length + slotB.moves.length > 4) return;

    // Merge moves from B into A
    slotA.moves.push(...slotB.moves);
    slotA.name = slotA.moves.map(m => m.definition.nameIT).join(' + ');
    slotA.slotCooldownTimer = 0; // Fire all fused techniques together immediately!

    // Remove slot B
    this.combatSlots.splice(slotBIdx, 1);
    this.activeSlotIndex = Math.min(this.activeSlotIndex, this.combatSlots.length - 1);

    audioManager.playSFX('combined_activate');
    this.particleSystem.emitLevelUp(this.player.x, this.player.y);
    this.hud.showToast('[FUSIONE RIUSCITA] Le tecniche ora sparano contemporaneamente!');
  }

  // ── Jutsu Fire ───────────────────────────────────────────────

  private fireSpecificJutsu(aj: ActiveJutsuInstance): void {
    const jutsu = aj.definition;
    const syn = this.activeSynergy;
    const primarySlot = this.combatSlots[0];
    const isPrimary = primarySlot?.moves.some(m => m.definition.id === jutsu.id) ?? false;
    const combined = (isPrimary && !syn && this.combinedActive)
      ? findCombinedTechnique(jutsu.id, this.session.character.passiveAbility.id)
      : null;

    const isPlus = !!aj.isPlus;
    const synMult = (syn && isPrimary) ? syn.dmgMultiplier : 1.0;
    const combMult = combined ? combined.dmgMultiplier : 1.0;
    const plusMult = isPlus ? aj.definition.plusEvolution.dmgMultiplier : 1.0;
    const lvlMult = 1 + (aj.level - 1) * 0.35;
    const rawDmg = this.upgStats.jutsudmg * jutsu.baseDmgCoeff * lvlMult * synMult * combMult * plusMult * 10;
    const isCrit = Math.random() < this.upgStats.critchance;
    const dmg = Math.round(rawDmg * (isCrit ? this.upgStats.critdmg : 1));

    const nearest = this.findNearest();
    const angle = nearest
      ? Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x)
      : -Math.PI / 2;

    const color = (syn && isPrimary)
      ? syn.vfxColor
      : (isPlus ? aj.definition.plusEvolution.vfxColor : (combined ? combined.vfxColor : jutsu.vfxColor));

    const effectiveBehavior = (syn && isPrimary)
      ? syn.behavior
      : (combined ? combined.behavior : jutsu.behavior);

    const jName = (syn && isPrimary) ? syn.nameIT : (isPlus ? aj.definition.plusEvolution.nameIT : jutsu.nameIT);
    const jElem = jutsu.element;
    const extraRadius = isPlus ? aj.definition.plusEvolution.bonusRadius : 0;
    const extraPierce = isPlus ? aj.definition.plusEvolution.bonusPierce : 0;

    if (effectiveBehavior === 'AreaPersistent' || effectiveBehavior === 'Explosion') {
      const areaRad = 260 + (aj.level - 1) * 20 + (isPlus ? 80 : 0);
      this.fireGravityPulse(dmg * 1.5, areaRad, color, isPlus);
      audioManager.playSFX(isPlus ? 'plus_fire' : 'combined_activate');
    } else if (effectiveBehavior === 'Beam') {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        960,
        dmg * 2,
        color,
        7 + aj.level + extraRadius,
        8 + aj.level * 2 + extraPierce,
        0.8,
        jElem,
        jName,
        'Beam',
        isPlus,
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX(isPlus ? 'plus_fire' : 'jutsu_beam');
    } else if (effectiveBehavior === 'ProjectileOmni') {
      const count = (syn && isPrimary) ? 16 : (8 + aj.level * 2 + (isPlus ? 6 : 0));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const proj = createProjectile(
          this.player.x, this.player.y,
          a,
          560,
          dmg,
          color,
          8 + aj.level + extraRadius,
          2 + Math.floor(aj.level / 2) + extraPierce,
          1.6,
          jElem,
          jName,
          'ProjectileOmni',
          isPlus,
        );
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX(isPlus ? 'plus_fire' : 'jutsu_omni');
    } else if (effectiveBehavior === 'ProjectileSpread') {
      const spreadCount = (syn && isPrimary) ? 8 : (3 + aj.level + (isPlus ? 2 : 0));
      const fan = 0.60;
      for (let i = 0; i < spreadCount; i++) {
        const offset = ((i / Math.max(1, spreadCount - 1)) - 0.5) * fan;
        const proj = createProjectile(
          this.player.x, this.player.y,
          angle + offset,
          620,
          Math.round(dmg * 0.90),
          color,
          8 + aj.level + extraRadius,
          (syn && isPrimary) ? 4 : (1 + Math.floor(aj.level / 2) + extraPierce),
          2.0,
          jElem,
          jName,
          'ProjectileSpread',
          isPlus,
        );
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX(isPlus ? 'plus_fire' : 'jutsu_fire');
    } else if (effectiveBehavior === 'Orbital') {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        540,
        Math.round(dmg * 1.2),
        color,
        9 + extraRadius,
        3 + extraPierce,
        1.8,
        jElem,
        jName,
        'Orbital',
        isPlus,
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX(isPlus ? 'plus_fire' : 'jutsu_fire');
    } else {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        540,
        dmg,
        color,
        8 + aj.level + extraRadius,
        1 + Math.floor(aj.level / 2) + extraPierce,
        2.2,
        jElem,
        jName,
        'Projectile',
        isPlus,
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX(isPlus ? 'plus_fire' : 'jutsu_fire');
    }
  }

  private fireGravityPulse(dmg: number, radius: number, color: number, isPlus = false): void {
    // Visual shockwave
    const ring = new Graphics();
    ring.circle(0, 0, 8);
    ring.fill({ color, alpha: 0.8 });
    ring.x = this.player.x;
    ring.y = this.player.y;
    this.entityLayer.addChild(ring);

    let t = 0;
    const expand = (ticker: { deltaMS: number }) => {
      t += ticker.deltaMS / 1000;
      const r = 8 + t * (radius / 0.6);
      ring.clear();
      ring.circle(0, 0, r);
      ring.fill({ color, alpha: Math.max(0, 0.6 - t) });
      if (t >= 0.6) {
        this.app.ticker.remove(expand);
        this.entityLayer.removeChild(ring);
        // Deal damage to all in radius at pulse end
        for (const e of [...this.enemies, ...this.bosses]) {
          const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
          if (d < radius) this.onEnemyHit(e as Enemy, dmg * (1 - d / radius), isPlus);
        }
        for (const obj of this.destructibles) {
          if (obj.isBroken) continue;
          const d = Math.hypot(obj.x - this.player.x, obj.y - this.player.y);
          if (d < radius) {
            obj.takeDamage(dmg * (1 - d / radius));
            if (obj.isBroken) this.breakDestructible(obj);
          }
        }
      }
    };
    this.app.ticker.add(expand);
  }

  // ── Hit handling ─────────────────────────────────────────────

  private onEnemyHit(enemy: Enemy | Boss, damage: number, isPlus = false): void {
    const isCrit = Math.random() < this.upgStats.critchance;
    const finalDmg = isCrit ? Math.round(damage * this.upgStats.critdmg) : Math.round(damage);
    enemy.takeDamage(finalDmg);
    const screenX = enemy.x + this.world.x;
    const screenY = enemy.y + this.world.y - 20;
    this.hud.showDamageNumber(screenX, screenY, finalDmg, isCrit, isPlus);
    if (isPlus) {
      this.particleSystem.emitLevelUp(enemy.x, enemy.y);
    }
    audioManager.playSFX('enemy_hit');
  }

  private damagePlayer(rawDmg: number): void {
    if (this.awakeningActive) return; // Invulnerable during Awakening!
    const eff = Math.max(1, rawDmg - this.upgStats.defense);
    this.upgStats.hp = Math.max(0, this.upgStats.hp - eff);
    this.player.hp = this.upgStats.hp;
    this.particleSystem.emitPlayerHit(this.player.x, this.player.y);
    audioManager.playSFX('player_hurt');
  }

  // ── Shinobi Awakening (Ougi / Modo Risveglio) ─────────────────

  private triggerAwakening(): void {
    if (this.awakeningActive || this.awakeningMeter < 100 || this.gameOver || this.paused) return;
    this.awakeningMeter = 0;
    this.awakeningActive = true;
    this.awakeningTimer = 8.0;
    this.player.isAwakened = true;
    audioManager.playSFX('awakening');
    this.particleSystem.emitLevelUp(this.player.x, this.player.y);
    this.particleSystem.emitLevelUp(this.player.x, this.player.y);

    // Full screen radiant golden flash
    const flash = new Graphics();
    flash.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    flash.fill({ color: 0xFDE047, alpha: 0.45 });
    this.uiLayer.addChild(flash);
    setTimeout(() => {
      if (flash.parent) flash.parent.removeChild(flash);
    }, 150);

    const quote = `${this.session.character.nameIT}: Risveglio del Chakra!`;
    this.hud.showToast(`[RISVEGLIO SUPREMO] "${quote}"`);
  }

  // ── Destructibles (Oggetti Distruttibili sul Campo) ─────────

  private spawnDestructiblesAround(centerX: number, centerY: number, count = 6): void {
    const types: DestructibleType[] = ['training_log', 'ninja_crate', 'training_log'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 550;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      const t = types[Math.floor(Math.random() * types.length)];
      const obj = new DestructibleObject(x, y, t);
      this.destructibles.push(obj);
      this.entityLayer.addChild(obj.container);
    }
  }

  private breakDestructible(d: DestructibleObject): void {
    d.isBroken = true;
    this.entityLayer.removeChild(d.container);
    this.particleSystem.emitEnemyDeath(d.x, d.y, 0x854D0E);
    this.particleSystem.emitNinjaSmoke(d.x, d.y);
    audioManager.playSFX('enemy_hit');

    // Drops from destructible
    const coin = new Collectible(
      d.x, d.y, 'ryo_coin',
      Math.round(25 * this.upgStats.ryomultiplier),
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 80,
    );
    const orb = new Collectible(
      d.x + 10, d.y + 10, 'chakra_orb',
      Math.round(GAME_CONFIG.CHAKRA_ORB_BASE_VALUE * 2 * this.upgStats.chakraorbmultiplier),
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 80,
    );
    this.collectibles.push(coin, orb);
    this.entityLayer.addChild(coin.container, orb.container);

    // 15% chance to drop Ichiraku Ramen or Bomb
    if (Math.random() < 0.15) {
      const itemType = Math.random() < 0.6 ? 'ramen' : 'bomb';
      const special = new Collectible(
        d.x - 10, d.y - 10, itemType, 1,
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 90,
      );
      this.collectibles.push(special);
      this.entityLayer.addChild(special.container);
    }
  }

  // ── Boss ──────────────────────────────────────────────────────

  private spawnBoss(type: BossType, bx = 0, by = -140): void {
    const config = BOSS_CONFIGS[type];
    const boss = new Boss(bx, by, config, Math.floor(this.elapsedSec / 60));
    this.bosses.push(boss);
    this.entityLayer.addChild(boss.container);
    this.bossWarning.trigger(config.nameIT);
    audioManager.playSFX('boss_spawn');
    this.hud.showToast(`⚠ Boss: ${config.nameIT}`);
  }

  private spawnBossShockwave(boss: Boss): void {
    const ring = new Graphics();
    ring.circle(0, 0, 10);
    ring.fill({ color: boss.config.accentColor, alpha: 0.6 });
    ring.x = boss.x;
    ring.y = boss.y;
    this.entityLayer.addChild(ring);
    let t = 0;
    const anim = (ticker: { deltaMS: number }) => {
      t += ticker.deltaMS / 1000;
      ring.clear();
      ring.circle(0, 0, 10 + t * boss.config.specialAttackRadius);
      ring.fill({ color: boss.config.accentColor, alpha: Math.max(0, 0.5 - t * 0.8) });
      if (t >= 0.6) {
        this.app.ticker.remove(anim);
        this.entityLayer.removeChild(ring);
      }
    };
    this.app.ticker.add(anim);
  }

  // ── Spacetime Boss Portals & Dimensions ─────────────────────

  private spawnBossPortal(type: BossType): void {
    if (this.activeBossPortal) {
      this.entityLayer.removeChild(this.activeBossPortal.container);
      this.activeBossPortal = undefined;
    }
    const angle = Math.random() * Math.PI * 2;
    const dist = 220 + Math.random() * 120;
    const px = this.player.x + Math.cos(angle) * dist;
    const py = this.player.y + Math.sin(angle) * dist;

    this.activeBossPortal = new BossPortal(px, py, type, 60, false);
    this.entityLayer.addChild(this.activeBossPortal.container);
    audioManager.playSFX('boss_spawn');
    this.hud.showToast(`[PORTALE BOSS] Conduce a ${BOSS_CONFIGS[type]?.nameIT}! (Dura 60s)`);
  }

  private enterBossPortal(portal: BossPortal): void {
    portal.isEntered = true;
    if (this.activeBossPortal) {
      this.entityLayer.removeChild(this.activeBossPortal.container);
      this.activeBossPortal = undefined;
    }

    // Save overworld position
    this.savedOverworldX = this.player.x;
    this.savedOverworldY = this.player.y;
    this.savedOverworldBiome = this.currentBiome;
    this.isInsideBossDimension = true;

    // Dimensional transition flash
    this.triggerScreenFlash(0xA855F7);
    audioManager.playSFX('awakening');

    // Clear normal mobs inside the boss dimension
    for (const e of this.enemies) {
      this.entityLayer.removeChild(e.container);
    }
    this.enemies = [];

    // Switch to ominous dimension
    this.currentBiome = 'VALLEY_OF_END';
    this.infiniteTilemap.clear();
    this.infiniteTilemap = new InfiniteTilemap(this.currentBiome, this.groundLayer);
    this.infiniteTilemap.update(0, 0, true);

    // Position player and companions in arena
    this.player.x = 0;
    this.player.y = 180;
    if (this.companion) {
      this.companion.x = 40;
      this.companion.y = 180;
    }
    if (this.coopPartnerShinobi) {
      this.coopPartnerShinobi.x = -40;
      this.coopPartnerShinobi.y = 180;
    }

    // Spawn the boss in the center
    this.spawnBoss(portal.bossType, 0, -140);
  }

  private returnFromBossDimension(): void {
    if (this.returnPortal) {
      this.entityLayer.removeChild(this.returnPortal.container);
      this.returnPortal = undefined;
    }
    this.isInsideBossDimension = false;
    this.triggerScreenFlash(0x10B981);
    audioManager.playSFX('awakening');

    // Restore overworld biome & infinite tilemap
    this.currentBiome = this.savedOverworldBiome;
    this.infiniteTilemap.clear();
    this.infiniteTilemap = new InfiniteTilemap(this.currentBiome, this.groundLayer);
    this.infiniteTilemap.update(this.savedOverworldX, this.savedOverworldY, true);

    // Teleport player back to overworld position
    this.player.x = this.savedOverworldX;
    this.player.y = this.savedOverworldY;
    if (this.companion) {
      this.companion.x = this.savedOverworldX + 30;
      this.companion.y = this.savedOverworldY + 30;
    }
    if (this.coopPartnerShinobi) {
      this.coopPartnerShinobi.x = this.savedOverworldX - 30;
      this.coopPartnerShinobi.y = this.savedOverworldY - 30;
    }

    this.hud.showToast('[RITORNO] Mondo Ninja salvato! Boss sconfitto!');
  }

  private triggerScreenFlash(colorHex: number): void {
    const flash = new Graphics();
    flash.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    flash.fill({ color: colorHex, alpha: 0.55 });
    this.uiLayer.addChild(flash);
    setTimeout(() => {
      if (flash.parent) flash.parent.removeChild(flash);
    }, 180);
  }

  private onBossDead(boss: Boss): void {
    this.bossesDefeatedCount++;
    this.scrollsEarnedInRun++;
    audioManager.playSFX('boss_die');
    // Big drop
    for (let i = 0; i < 15; i++) {
      const ox = boss.x + (Math.random() - 0.5) * 120;
      const oy = boss.y + (Math.random() - 0.5) * 120;
      const orb = new Collectible(ox, oy, 'chakra_orb',
        Math.round(GAME_CONFIG.CHAKRA_ORB_BASE_VALUE * 8 * this.upgStats.chakraorbmultiplier));
      this.collectibles.push(orb);
      this.entityLayer.addChild(orb.container);
    }
    for (let i = 0; i < 5; i++) {
      const rx = boss.x + (Math.random() - 0.5) * 80;
      const ry = boss.y + (Math.random() - 0.5) * 80;
      const ryo = new Collectible(rx, ry, 'ryo_coin',
        Math.round(boss.config.ryoValue * this.upgStats.ryomultiplier));
      this.collectibles.push(ryo);
      this.entityLayer.addChild(ryo.container);
    }
    // Guaranteed Special items from Boss: Delicious Ichiraku Ramen & Chakra Magnet
    const ramen = new Collectible(boss.x + 35, boss.y - 15, 'ramen', 1, 60, -60);
    const magnet = new Collectible(boss.x - 35, boss.y - 15, 'magnet', 1, -60, -60);
    this.collectibles.push(ramen, magnet);
    this.entityLayer.addChild(ramen.container, magnet.container);

    // Fragment & Scroll drop
    this.currentFragments += boss.config.fragments;
    SaveSystem.addScrolls(1);
    this.hud.showToast(`[RICOMPENSA] +1 Rotolo di Evocazione da ${boss.config.nameIT}!`);
    this.hud.showToast(`✦ +${boss.config.fragments} Frammenti da ${boss.config.nameIT}!`);

    // Spawn return portal if inside boss dimension
    if (this.isInsideBossDimension) {
      this.returnPortal = new BossPortal(boss.x, boss.y, boss.config.type, 9999, true);
      this.entityLayer.addChild(this.returnPortal.container);
      this.hud.showToast('[BOSS SCONFITTO] Raggiungi il Portale di Ritorno!');
    }

    // ── Final Boss Ten Tails Defeated: Trigger Shinobi Victory ──
    if (boss.config.type === 'ten_tails') {
      this.hud.showToast('[VITTORIA LEGGENDARIA] JŪBI SCONFITTO! IL MONDO NINJA È SALVO!');
      setTimeout(() => {
        if (!this.gameOver) {
          this.triggerVictory();
        }
      }, 1500);
      return;
    }

    // ── Boss Defeated: Trigger Jutsu Fusion Modal if player has >= 2 slots ──
    if (this.combatSlots.length >= 2) {
      setTimeout(() => {
        if (!this.gameOver && !this.levelUpPanel.isVisible) {
          this.jutsuFusionModal.show(
            this.combatSlots,
            (slotAIdx, slotBIdx) => this.mergeSlots(slotAIdx, slotBIdx),
          );
        }
      }, 900);
    }
  }

  // ── Drops & Collection ───────────────────────────────────────

  private spawnDrops(x: number, y: number, config: EnemyConfig): void {
    const isElite = config.isElite ?? false;
    const orbDivisor = isElite ? 6 : 8;
    const orbCount = Math.max(1, Math.ceil(config.expValue / orbDivisor));
    for (let i = 0; i < orbCount; i++) {
      const ivx = (Math.random() - 0.5) * 160;
      const ivy = (Math.random() - 0.5) * 160;
      const orb = new Collectible(
        x, y, 'chakra_orb',
        Math.round(GAME_CONFIG.CHAKRA_ORB_BASE_VALUE * this.upgStats.chakraorbmultiplier),
        ivx, ivy,
      );
      this.collectibles.push(orb);
      this.entityLayer.addChild(orb.container);
    }
    if (isElite || Math.random() < GAME_CONFIG.RYO_DROP_CHANCE) {
      const ivx = (Math.random() - 0.5) * 120;
      const ivy = (Math.random() - 0.5) * 120;
      const ryo = new Collectible(
        x, y, 'ryo_coin',
        Math.round(config.ryoValue * this.upgStats.ryomultiplier),
        ivx, ivy,
      );
      this.collectibles.push(ryo);
      this.entityLayer.addChild(ryo.container);
    }
    // Special drops: Bomba, Magnete, Ramen di Ichiraku
    // ~3.5% chance from normal mobs, 22% chance from elite mobs
    const specialDropChance = isElite ? 0.22 : 0.035;
    if (Math.random() < specialDropChance) {
      const roll = Math.random();
      let specialType: 'bomb' | 'magnet' | 'ramen' = 'ramen';
      if (roll < 0.40) {
        specialType = 'ramen';
      } else if (roll < 0.72) {
        specialType = 'magnet';
      } else {
        specialType = 'bomb';
      }

      const ivx = (Math.random() - 0.5) * 140;
      const ivy = (Math.random() - 0.5) * 140;
      const special = new Collectible(x, y, specialType, 1, ivx, ivy);
      this.collectibles.push(special);
      this.entityLayer.addChild(special.container);
    }

    // Rare fragment drop (25% for elite, 2% for normal)
    if (Math.random() < (isElite ? 0.25 : 0.02)) {
      this.currentFragments += 1;
      this.hud.showToast('✦ +1 Frammento Ninja!');
    }
  }

  private collectItem(c: Collectible): void {
    if (c.type === 'chakra_orb') {
      this.chakraOrbs += c.value;
      this.xp += c.value;
      this.awakeningMeter = Math.min(100, this.awakeningMeter + 0.4);
      this.particleSystem.emitChakraCollect(c.x, c.y, c.value);
      audioManager.playSFX('collect_orb');
      this.checkLevelUp();
    } else if (c.type === 'ryo_coin') {
      this.ryo += c.value;
      audioManager.playSFX('collect_ryo');
      this.particleSystem.emitRyoCollect(c.x, c.y);
    } else if (c.type === 'bomb') {
      this.triggerBombExplosion(c.x, c.y);
    } else if (c.type === 'magnet') {
      this.triggerMagnetVacuum();
    } else if (c.type === 'ramen') {
      this.triggerRamenHeal();
    }
  }

  private triggerBombExplosion(originX: number, originY: number): void {
    audioManager.playSFX('bomb_explode');
    this.particleSystem.emitBombExplosion(originX, originY);
    this.hud.showToast('[CARTA BOMBA] Esplosione devastante!');

    // Eliminate all active normal enemies on map with explosion VFX and drops
    const enemiesToKill = [...this.enemies];
    for (const enemy of enemiesToKill) {
      if (enemy.isDead) continue;
      this.particleSystem.emitEnemyDeath(enemy.x, enemy.y, 0xEF4444);
      this.particleSystem.emitNinjaSmoke(enemy.x, enemy.y);
      this.spawnDrops(enemy.x, enemy.y, enemy.config);
      enemy.isDead = true;
      this.totalKills++;
    }

    // Heavy direct blast damage to all active bosses (600 dmg)
    for (const boss of this.bosses) {
      if (boss.isDead) continue;
      this.onEnemyHit(boss, 600);
      this.particleSystem.emitBombExplosion(boss.x, boss.y);
    }

    // Screen flash blast wave
    const flash = new Graphics();
    flash.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    flash.fill({ color: 0xFFEDD5, alpha: 0.60 });
    this.uiLayer.addChild(flash);
    setTimeout(() => {
      if (flash.parent) flash.parent.removeChild(flash);
    }, 120);
  }

  private triggerMagnetVacuum(): void {
    audioManager.playSFX('magnet_pickup');
    this.particleSystem.emitMagnetPulse(this.player.x, this.player.y);
    this.hud.showToast('[SIGILLO MAGNETICO] Tutti gli orbi attratti!');

    for (const item of this.collectibles) {
      if (!item.collected) {
        item.isMagnetized = true;
      }
    }
  }

  private triggerRamenHeal(): void {
    audioManager.playSFX('ramen_heal');
    this.particleSystem.emitHealing(this.player.x, this.player.y);

    // Heals 50% of max HP
    const healAmount = Math.max(50, Math.round(this.upgStats.maxHp * 0.50));
    const oldHp = this.upgStats.hp;
    this.upgStats.hp = Math.min(this.upgStats.maxHp, this.upgStats.hp + healAmount);
    this.player.hp = this.upgStats.hp;
    const actualHealed = this.upgStats.hp - oldHp;

    const screenX = this.player.x + this.world.x;
    const screenY = this.player.y + this.world.y - 30;
    this.hud.showHealNumber(screenX, screenY, actualHealed > 0 ? actualHealed : healAmount);
    this.hud.showToast(`[RAMEN ICHIRAKU] +${actualHealed > 0 ? actualHealed : healAmount} HP!`);
  }

  private checkLevelUp(): void {
    if (this.levelUpPanel.isVisible || this.promotionPanel.isVisible) return;

    const xpNeeded = getXpNeededForLevel(this.level);
    if (this.xp >= xpNeeded) {
      this.xp -= xpNeeded;
      this.level++;
      audioManager.playSFX('level_up');
      this.hud.showToast(`⬆ Livello ${this.level}!`);
      this.particleSystem.emitLevelUp(this.player.x, this.player.y);

      const showLevelModal = () => {
        const options = this.generateLevelUpOptions();
        const rerollCost = 100;
        const canReroll = this.ryo >= rerollCost;

        this.levelUpPanel.show(
          this.level,
          (opt) => {
            opt.apply(this.upgStats);
            // Sync player HP
            this.player.hp    = this.upgStats.hp;
            this.player.maxHp = this.upgStats.maxHp;
            // Update orbitals if stats changed
            for (const s of this.combatSlots) {
              for (const aj of s.moves) {
                if (aj.definition.behavior === 'Orbital') {
                  const orbDmg = Math.round(this.upgStats.jutsudmg * aj.definition.baseDmgCoeff * 10);
                  const orbs = createOrbitalProjectiles(this.player.x, this.player.y, 3, orbDmg, aj.definition.vfxColor);
                  this.projectileSystem.setOrbitals(orbs);
                }
              }
            }
            // Check if player has accumulated enough XP for another level-up
            this.checkLevelUp();
          },
          options,
          () => {
            if (this.ryo >= rerollCost) {
              this.ryo -= rerollCost;
              audioManager.playSFX('button_click');
              this.hud.showToast(`[REROLL] Eseguito (-${rerollCost} ¥)`);
              showLevelModal();
            }
          },
          rerollCost,
          canReroll,
        );
      };

      showLevelModal();
    }
  }

  // ── In-Run Level Up Option Generator (Synergies + Tools + Jutsu + Stats) ──

  private generateLevelUpOptions(): UpgradeOption[] {
    const options: UpgradeOption[] = [];

    // ── OPZIONE 1: MOSSA JUTSU (Nuova Mossa Canonica dell'Anime o Upgrade o Sinergia) ──
    const currentLearnedIds = new Set<string>();
    const allMoves: ActiveJutsuInstance[] = [];
    for (const s of this.combatSlots) {
      for (const m of s.moves) {
        currentLearnedIds.add(m.definition.id);
        allMoves.push(m);
      }
    }
    const availableNewJutsu = getAvailableJutsuForCharacter(this.session.character, currentLearnedIds);

    // ── Check if any Plus (+) Evolution is ready to be awakened! ──
    const readyPlusEvolutions = allMoves.filter(m => m.level === 5 && m.statRequirementMet && !m.isPlus);
    let addedJutsuOption = false;

    if (readyPlusEvolutions.length > 0) {
      const targetPlus = readyPlusEvolutions[0];
      options.push({
        id: `plus_evolve_${targetPlus.definition.id}`,
        icon: targetPlus.definition.plusEvolution.icon,
        title: targetPlus.definition.plusEvolution.nameIT,
        description: `${targetPlus.definition.plusEvolution.description} [${targetPlus.definition.element} • Danno ×${(targetPlus.definition.baseDmgCoeff * targetPlus.definition.plusEvolution.dmgMultiplier).toFixed(1)}]`,
        color: 0xF59E0B,
        isPlusEvolution: true,
        type: 'plus_evolution',
        tag: '✦ EVOLUZIONE PLUS (+) ✦',
        levelText: '✦ PLUS ✦',
        apply: () => {
          targetPlus.isPlus = true;
          SaveSystem.recordPlusEvolution();
          audioManager.playSFX('plus_evolve');
          this.particleSystem.emitLevelUp(this.player.x, this.player.y);
          this.hud.showToast(`[EVOLUZIONE PLUS] Risvegliata: ${targetPlus.definition.plusEvolution.nameIT}!`);
        },
      });
      addedJutsuOption = true;
    }

    // Check if a synergy can be awakened
    const primaryJutsu = this.combatSlots[0]?.moves[0]?.definition;
    const candidateRecipe = primaryJutsu ? findAvailableSynergyForJutsu(primaryJutsu.id, primaryJutsu.nameIT) : null;

    if (!addedJutsuOption && candidateRecipe && !this.activeSynergy) {
      const hasRequiredTool = this.acquiredTools.has(candidateRecipe.requiredToolId);
      const isHighLevel = (this.combatSlots[0]?.moves[0]?.level ?? 1) >= 3;
      if (hasRequiredTool && isHighLevel) {
        options.push({
          id: `synergy_${candidateRecipe.id}`,
          icon: '/icons/jutsu/jutsu_synergy.svg',
          title: candidateRecipe.nameIT,
          description: `${candidateRecipe.description} (+${Math.round((candidateRecipe.dmgMultiplier - 1) * 100)}% Danno)`,
          color: 0xFBBF24,
          isSynergy: true,
          type: 'synergy_evolution',
          tag: '★ RISVEGLIO SINERGIA ★',
          levelText: 'SUPREMO',
          apply: () => {
            this.activateSynergy(candidateRecipe);
          },
        });
        addedJutsuOption = true;
      }
    }

    if (!addedJutsuOption) {
      const MAX_TOTAL_SLOTS = 4;
      if (this.combatSlots.length < MAX_TOTAL_SLOTS && availableNewJutsu.length > 0) {
        const nextJutsuDef = availableNewJutsu[0];
        options.push({
          id: `new_jutsu_${nextJutsuDef.id}`,
          icon: nextJutsuDef.icon,
          title: `${nextJutsuDef.nameIT}`,
          description: `${nextJutsuDef.description} [${nextJutsuDef.element} • Danno ×${nextJutsuDef.baseDmgCoeff.toFixed(1)}]`,
          color: nextJutsuDef.vfxColor,
          type: 'new_jutsu',
          tag: '🌀 NUOVA MOSSA ANIME',
          levelText: 'APPRENDI',
          apply: () => {
            const newInst: ActiveJutsuInstance = {
              definition: nextJutsuDef,
              level: 1,
              cooldownTimer: 0.2,
              isPlus: false,
              statRequirementMet: false,
            };
            this.combatSlots.push({
              id: `slot_${this.combatSlots.length}`,
              name: nextJutsuDef.nameIT,
              moves: [newInst],
              slotCooldownTimer: 0.2,
            });
            if (nextJutsuDef.behavior === 'Orbital') {
              const orbDmg = Math.round(this.upgStats.jutsudmg * nextJutsuDef.baseDmgCoeff * 10);
              const orbs = createOrbitalProjectiles(this.player.x, this.player.y, 3, orbDmg, nextJutsuDef.vfxColor);
              this.projectileSystem.setOrbitals(orbs);
            }
            this.hud.showToast(`[NUOVA MOSSA] Slot #${this.combatSlots.length}: ${nextJutsuDef.nameIT}!`);
          },
        });
      } else {
        const upgradable = allMoves.filter(a => a.level < a.definition.maxLevel && !a.isPlus);
        if (upgradable.length > 0) {
          const targetJutsu = upgradable[0];
          const nextLvl = targetJutsu.level + 1;
          options.push({
            id: `jutsu_lvl_${targetJutsu.definition.id}`,
            icon: targetJutsu.definition.icon,
            title: `${targetJutsu.definition.nameIT} (Lv. ${nextLvl})`,
            description: nextLvl === 5
              ? `Potenzia a Livello Massimo (Lv. 5/5): +35% Danno. Sbloccherà il requisito per la forma PLUS (+)!`
              : `Potenzia la tecnica: +35% Danno, +raggio d'azione e -10% Cooldown. (Livello ${nextLvl}/5)`,
            color: targetJutsu.definition.vfxColor,
            type: 'jutsu_level',
            tag: '✦ POTENZIAMENTO MOSSA',
            levelText: `Lv. ${nextLvl}/5`,
            apply: (stats) => {
              targetJutsu.level++;
              stats.jutsudmg *= 1.15;
              if (targetJutsu.level === 5) {
                const req = targetJutsu.definition.evolutionReq;
                this.hud.showToast(`[JUTSU MAX] ${targetJutsu.definition.nameIT} Lv. 5! Potenzia "${req.statName}" per forma PLUS (+)`);
              } else {
                this.hud.showToast(`[JUTSU UPGRADE] ${targetJutsu.definition.nameIT} Livello ${targetJutsu.level}/5!`);
              }
            },
          });
        } else {
          options.push({
            id: 'jutsu_mastery',
            icon: '/icons/chakra_orb.svg',
            title: 'Maestria del Chakra Shinobi',
            description: '+40% Danno a tutte le mosse Jutsu possedute',
            color: 0x38BDF8,
            type: 'jutsu_level',
            tag: '✦ MAESTRIA JUTSU',
            levelText: 'MAX',
            apply: (stats) => {
              stats.jutsudmg *= 1.40;
              this.hud.showToast('[MAESTRIA JUTSU] Danno aumentato del 40%!');
            },
          });
        }
      }
    }

    // ── OPZIONE 2: STRUMENTO NINJA PASSIVO ──────────────────
    const availableTools = NINJA_TOOLS.filter(t => (this.acquiredTools.get(t.id) ?? 0) < t.maxLevel);
    if (availableTools.length > 0) {
      if (candidateRecipe && !this.activeSynergy) {
        availableTools.sort((a, b) => {
          if (a.id === candidateRecipe.requiredToolId) return -1;
          if (b.id === candidateRecipe.requiredToolId) return 1;
          return 0;
        });
      }
      const tool = availableTools[0];
      const curLvl = this.acquiredTools.get(tool.id) ?? 0;
      const nextLvl = curLvl + 1;
      const isSynComponent = candidateRecipe?.requiredToolId === tool.id;

      options.push({
        id: `tool_${tool.id}`,
        icon: tool.icon,
        title: `${tool.nameIT} ${nextLvl > 1 ? `(Lv. ${nextLvl})` : ''}`,
        description: `${tool.description} [${tool.statBonusText}]${isSynComponent ? ' ✦ Compatibile con Sinergia!' : ''}`,
        color: tool.color,
        type: 'ninja_tool',
        tag: isSynComponent ? '✦ SINERGIA COMPATIBILE' : '✦ STRUMENTO NINJA',
        levelText: `Lv. ${nextLvl}/${tool.maxLevel}`,
        apply: (stats) => {
          this.acquiredTools.set(tool.id, nextLvl);
          tool.apply(stats, nextLvl);
          this.hud.showToast(`[STRUMENTO NINJA] ${tool.nameIT} Livello ${nextLvl}!`);
        },
      });
    } else {
      options.push({
        id: 'ninja_pouch_buff',
        icon: '/icons/menu_bag.jpg',
        title: 'Borsa Tattica Completa',
        description: '+25% Difesa e +20% Velocità di Raccolta Chakra',
        color: 0xEA580C,
        type: 'ninja_tool',
        tag: '✦ STRUMENTO NINJA',
        levelText: 'MAX',
        apply: (stats) => {
          stats.defense += 25;
          stats.collectradius += 40;
          this.hud.showToast('[ZAINO TATTICO] Difesa e Raccolta potenziate!');
        },
      });
    }

    // ── OPZIONE 3: POTENZIAMENTO DI STATS (Con supporto Requisiti Evoluzione +) ──
    const waitingForStat = allMoves.filter(m => m.level === 5 && !m.statRequirementMet && !m.isPlus);
    let chosenStat: UpgradeOption;
    let isReqStat = false;
    let reqMoveName = '';

    if (waitingForStat.length > 0) {
      const targetReq = waitingForStat[0].definition.evolutionReq;
      const matching = UPGRADE_POOL.find(s => s.id === targetReq.statId);
      if (matching) {
        chosenStat = matching;
        isReqStat = true;
        reqMoveName = waitingForStat[0].definition.nameIT;
      } else {
        chosenStat = UPGRADE_POOL[Math.floor(Math.random() * UPGRADE_POOL.length)];
      }
    } else {
      chosenStat = UPGRADE_POOL[Math.floor(Math.random() * UPGRADE_POOL.length)];
    }

    if (isReqStat) {
      options.push({
        ...chosenStat,
        title: `${chosenStat.title} (Requisito)`,
        description: `${chosenStat.description} • Soddisfa il requisito per evolvere "${reqMoveName}" in forma PLUS (+)!`,
        color: 0xF59E0B,
        tag: `✦ SBLOCCA ${reqMoveName.toUpperCase()} + ✦`,
        type: 'stat',
        levelText: '✦ SBLOCCA + ✦',
        apply: (stats) => {
          chosenStat.apply(stats);
          this.onStatChosen(chosenStat.id);
        },
      });
    } else {
      options.push({
        ...chosenStat,
        tag: '✦ POTENZIAMENTO STATISTICHE',
        type: 'stat',
        levelText: '+BUFF',
        apply: (stats) => {
          chosenStat.apply(stats);
          this.onStatChosen(chosenStat.id);
        },
      });
    }

    return options;
  }

  private onStatChosen(statId: string): void {
    for (const slot of this.combatSlots) {
      for (const aj of slot.moves) {
        if (aj.level === 5 && !aj.isPlus && !aj.statRequirementMet) {
          if (aj.definition.evolutionReq?.statId === statId) {
            aj.statRequirementMet = true;
            audioManager.playSFX('plus_evolve');
            this.particleSystem.emitLevelUp(this.player.x, this.player.y);
            this.hud.showToast(`✨ REQUISITO SODDISFATTO! "${aj.definition.nameIT} +" è ora sbloccato per il prossimo Level Up!`);
          }
        }
      }
    }
  }

  private activateSynergy(recipe: SynergyRecipe): void {
    this.activeSynergy = recipe;
    this.combinedActive = true;
    this.upgStats.jutsudmg *= recipe.dmgMultiplier;
    this.upgStats.jutsuCooldownMult = Math.max(0.2, this.upgStats.jutsuCooldownMult * recipe.cooldownMultiplier);
    audioManager.playSFX('combined_activate');
    this.particleSystem.emitLevelUp(this.player.x, this.player.y);
    this.hud.showToast(recipe.announcement);
  }

  // ── Promotion Panel ──────────────────────────────────────────

  private openPromotionPanel(): void {
    const nextTier = getNextPromotionTier(this.session.character, this.currentRank);
    if (!nextTier) {
      this.hud.showToast('✦ Personaggio già al rango massimo!');
      return;
    }
    this.promotionPanel.show(
      this.session.character.nameIT,
      this.currentRank,
      this.currentFragments,
      nextTier.fragmentCost,
      () => this.doPromotion(),
      () => {},
    );
  }

  private doPromotion(): void {
    const result = tryPromote(this.session.character, this.currentRank, this.currentFragments);
    if (!result) return;
    this.currentRank      = result.newRank;
    this.currentFragments = result.fragmentsLeft;
    audioManager.playSFX('promotion');
    this.hud.showToast(`✦ Promosso a ${result.newRank}★!`);

    // Recompute stats and boost
    const newStats = computeScaledStats(this.session.character, result.newRank);
    const hpBonus = newStats.hp - this.upgStats.maxHp;
    this.upgStats.maxHp += hpBonus;
    this.upgStats.hp     = Math.min(this.upgStats.maxHp, this.upgStats.hp + hpBonus * 0.5);
    this.upgStats.jutsudmg            = Math.max(this.upgStats.jutsudmg, newStats.jutsudmg);
    this.upgStats.defense             = Math.max(this.upgStats.defense, newStats.defense);
    this.upgStats.ryomultiplier       = Math.max(this.upgStats.ryomultiplier, newStats.ryomultiplier);
    this.upgStats.chakraorbmultiplier = Math.max(this.upgStats.chakraorbmultiplier, newStats.chakraorbmultiplier);
    this.player.hp    = this.upgStats.hp;
    this.player.maxHp = this.upgStats.maxHp;
  }

  // ── Spawning ──────────────────────────────────────────────────

  private spawnWave(count: number, forceType?: EnemyType, forceElite = false): void {
    const diff = difficultyManager.getSnapshot(this.elapsedSec);
    const activeCount = this.enemies.filter(e => !e.isDead).length;
    if (activeCount >= diff.enemyBudget && !forceElite) return;

    const actualCount = Math.min(count, Math.max(1, diff.enemyBudget - activeCount));

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = GAME_CONFIG.ENEMY_SPAWN_RADIUS_MIN +
        Math.random() * (GAME_CONFIG.ENEMY_SPAWN_RADIUS_MAX - GAME_CONFIG.ENEMY_SPAWN_RADIUS_MIN);
      const ex = this.player.x + Math.cos(angle) * dist;
      const ey = this.player.y + Math.sin(angle) * dist;

      const enemyType = forceType ?? difficultyManager.pickEnemyType(this.elapsedSec);
      const template = ENEMY_TEMPLATES[enemyType];
      const isElite = forceElite || Math.random() < diff.eliteChance;

      const eliteHpBonus  = isElite ? 2.2 : 1.0;
      const eliteDmgBonus = isElite ? 1.35 : 1.0;
      const eliteSpdBonus = isElite ? 1.15 : 1.0;
      const eliteExpBonus = isElite ? 3.0 : 1.0;

      const scaledConfig: EnemyConfig = {
        ...template,
        hp:       Math.max(25, Math.round(template.hp * diff.hpMultiplier * eliteHpBonus)),
        speed:    Math.round(template.speed * diff.speedMultiplier * eliteSpdBonus),
        damage:   Math.max(3, Math.round(template.damage * diff.damageMultiplier * eliteDmgBonus)),
        expValue: Math.round(template.expValue * diff.expMultiplier * eliteExpBonus),
        ryoValue: Math.round(template.ryoValue * (isElite ? 2.5 : 1.0)),
        isElite,
      };

      const enemy = new Enemy(ex, ey, scaledConfig);
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }
  }

  private triggerSurgeEvent(): void {
    const diff = difficultyManager.getSnapshot(this.elapsedSec);
    this.hud.showToast("[ONDA D'INVASIONE] In arrivo!");
    audioManager.playSFX('boss_spawn');

    const count = Math.min(14, 6 + Math.floor(diff.minute * 2));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist  = GAME_CONFIG.ENEMY_SPAWN_RADIUS_MIN + 30;
      const ex = this.player.x + Math.cos(angle) * dist;
      const ey = this.player.y + Math.sin(angle) * dist;

      const enemyType = difficultyManager.pickEnemyType(this.elapsedSec);
      const template = ENEMY_TEMPLATES[enemyType];
      const isElite = i === 0 && diff.minute >= 2.0;

      const scaledConfig: EnemyConfig = {
        ...template,
        hp:       Math.round(template.hp * diff.hpMultiplier * (isElite ? 2.2 : 1.0)),
        speed:    Math.round(template.speed * diff.speedMultiplier * (isElite ? 1.15 : 1.08)),
        damage:   Math.round(template.damage * diff.damageMultiplier),
        expValue: Math.round(template.expValue * (isElite ? 3.0 : 1.2)),
        ryoValue: Math.round(template.ryoValue * (isElite ? 2.5 : 1.0)),
        isElite,
      };

      const enemy = new Enemy(ex, ey, scaledConfig);
      this.enemies.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private findNearest(): Enemy | Boss | null {
    let nearest: Enemy | Boss | null = null;
    let nearestDist = Infinity;
    for (const e of [...this.enemies, ...this.bosses]) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
    return nearest;
  }

  private updateHUD(): void {
    const xpToNext = getXpNeededForLevel(this.level);
    const diff = difficultyManager.getSnapshot(this.elapsedSec);

    let portalInfo: { screenX: number; screenY: number; dist: number; timeLeft: number; bossName: string; isReturn: boolean } | undefined;
    const targetPortal = this.activeBossPortal || this.returnPortal;
    if (targetPortal) {
      const screenX = targetPortal.x + this.world.x;
      const screenY = targetPortal.y + this.world.y;
      const dist = Math.hypot(targetPortal.x - this.player.x, targetPortal.y - this.player.y);
      const bossConfig = BOSS_CONFIGS[targetPortal.bossType];
      portalInfo = {
        screenX,
        screenY,
        dist,
        timeLeft: targetPortal.durationRemaining,
        bossName: bossConfig?.nameIT ?? 'Boss',
        isReturn: targetPortal.isReturnPortal,
      };
    }

    this.hud.update({
      hp:            this.upgStats.hp,
      maxHp:         this.upgStats.maxHp,
      chakraOrbs:    this.chakraOrbs,
      ryo:           this.ryo,
      level:         this.level,
      xp:            this.xp,
      xpToNext,
      elapsedSec:    this.elapsedSec,
      enemyCount:    this.enemies.filter(e => !e.isDead).length + this.bosses.filter(b => !b.isDead).length,
      characterName: this.session.character.nameIT,
      rank:          this.currentRank,
      fragments:     this.currentFragments,
      paused:        this.paused,
      combinedActive: this.combinedActive,
      inputSource:   this.input.lastSource,
      threatBadge:   diff.threatTier.badgeText,
      threatColor:   diff.threatTier.color,
      portalInfo,
      awakeningMeter:        this.awakeningMeter,
      awakeningActive:       this.awakeningActive,
      awakeningDurationLeft: this.awakeningTimer,
      slots:         this.combatSlots.map((s, i) => ({
        id: s.id,
        moves: s.moves.map(m => ({
          id: m.definition.id,
          icon: m.isPlus ? m.definition.plusEvolution.icon : m.definition.icon,
          name: m.isPlus ? m.definition.plusEvolution.nameIT : m.definition.nameIT,
          level: m.level,
          color: m.isPlus ? 0xF59E0B : m.definition.vfxColor,
          isPlus: m.isPlus,
        })),
        isActive: i === this.activeSlotIndex,
      })),
      activeJutsu:   this.combatSlots.flatMap(s => s.moves).map(m => ({
        id: m.definition.id,
        icon: m.isPlus ? m.definition.plusEvolution.icon : m.definition.icon,
        name: m.isPlus ? m.definition.plusEvolution.nameIT : m.definition.nameIT,
        level: m.level,
        isPlus: m.isPlus,
      })),
      jutsuStatuses: this.combatSlots.flatMap(s => s.moves).map(m => ({
        id: m.definition.id,
        name: m.isPlus ? m.definition.plusEvolution.nameIT : m.definition.nameIT,
        icon: m.isPlus ? m.definition.plusEvolution.icon : m.definition.icon,
        level: m.level,
        isPlus: !!m.isPlus,
        statRequirementMet: !!m.statRequirementMet,
        reqStatName: m.definition.evolutionReq?.statName || 'Danno',
        reqStatIcon: m.definition.evolutionReq?.statIcon || '⚡',
      })),
      activeTools:   Array.from(this.acquiredTools.entries()).map(([id, lvl]) => {
        const tool = NINJA_TOOLS.find(t => t.id === id);
        return { id, icon: tool?.icon || '🗡️', name: tool?.nameIT || id, level: lvl };
      }),
    });
  }

  private restart(): void {
    this.stop();
    this.start(this.session);
  }
}
