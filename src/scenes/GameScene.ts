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
import type { Character } from '../types/character';
import type { StarRank } from '../types/character';

// ============================================================
//  NarutoSurvivor — Game Scene (Full Integration)
// ============================================================

export interface PlayerSession {
  character: Character;
  rank: StarRank;
  fragments: number;
}

// XP thresholds per level (index = level) — calibrated for fast early upgrades and smooth curve
const XP_PER_LEVEL = [0, 25, 65, 130, 220, 340, 500, 720, 1000, 1350, 1800, 2350, 3000, 3800, 4800, 6000, 7500, 99999];

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

    // ── Biome & Ground Infinite Tilemap ───────────────────────
    this.currentBiome = randomBiome();
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

    // ── Player entity ─────────────────────────────────────────
    this.player = new Player({ ...session.character, baseStats } as Character);
    this.player.hp = this.upgStats.hp;
    this.player.maxHp = this.upgStats.maxHp;
    this.entityLayer.addChild(this.player.container);

    // ── Active Jutsu setup ────────────────────────────────────
    this.acquiredTools.clear();
    this.activeSynergy = null;
    this.projectileSystem = new ProjectileSystem(this.entityLayer);

    // Initial character signature jutsu
    const charJutsuSlot = session.character.jutsuSlot;
    const catalogMatch = CANONICAL_JUTSU_CATALOG.find(
      j => j.id === charJutsuSlot.id || j.nameIT.toLowerCase() === charJutsuSlot.nameIT.toLowerCase(),
    );
    const initialDef: JutsuDefinition = catalogMatch ?? {
      id: charJutsuSlot.id,
      nameIT: charJutsuSlot.nameIT,
      nameJP: charJutsuSlot.nameJP,
      icon: '🌀',
      element: charJutsuSlot.element,
      behavior: charJutsuSlot.behavior,
      baseDmgCoeff: charJutsuSlot.baseDmgCoeff,
      cooldownSec: charJutsuSlot.cooldownSec,
      maxLevel: 5,
      vfxColor: session.character.assets.color,
      description: `Tecnica caratteristica di ${session.character.nameIT}`,
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
    this.hud = new HUD(this.app);
    this.hud.setOnSelectSlot((idx) => this.selectSlot(idx));
    this.hud.showToast(`Bioma: ${BIOME_NAMES[this.currentBiome]}`);
    if (hasRunBuffs) {
      setTimeout(() => {
        this.hud.showToast('🍜 Buff Ichiraku & Tenten attivi per questa run!');
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

    // ── Game Loop ─────────────────────────────────────────────
    this.app.ticker.add(this.tick, this);
  }

  stop(): void {
    this.app.ticker.remove(this.tick, this);
    audioManager.stopBGM();
    this.infiniteTilemap?.clear();
    this.entityLayer.removeChildren();
    this.groundLayer.removeChildren();
    this.uiLayer.removeChildren();
    this.virtualJoystick?.hide();
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
        this.hud.showToast(on ? '🔊 Audio ON' : '🔇 Audio OFF');
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

    // ── Active Slot Jutsu: Simultaneous Cooldown & Fire ───────
    const curSlot = this.combatSlots[this.activeSlotIndex];
    if (curSlot && curSlot.moves.length > 0) {
      if (curSlot.slotCooldownTimer === undefined) {
        curSlot.slotCooldownTimer = 0;
      }
      curSlot.slotCooldownTimer -= dt;
      if (curSlot.slotCooldownTimer <= 0) {
        // Fire ALL merged techniques in this slot simultaneously!
        for (const aj of curSlot.moves) {
          this.fireSpecificJutsu(aj);
        }
        // Slot cooldown determined by minimum cooldown of moves + fusion bonus
        const minCd = Math.min(...curSlot.moves.map(m => {
          const cdRed = Math.pow(0.90, m.level - 1);
          return m.definition.cooldownSec * cdRed;
        }));
        const fusionSpeedMult = Math.pow(0.90, curSlot.moves.length - 1);
        curSlot.slotCooldownTimer = Math.max(
          0.30,
          minCd * fusionSpeedMult * this.upgStats.jutsuCooldownMult,
        );
      }
    }

    // ── Normal Enemies ────────────────────────────────────────
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      enemy.update(dt, this.player.x, this.player.y);
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < GAME_CONFIG.PLAYER_HITBOX_RADIUS + enemy.config.size * 0.8) {
        this.damagePlayer(enemy.config.damage * dt * 2);
      }
    }

    // ── Bosses ────────────────────────────────────────────────
    for (const boss of this.bosses) {
      if (boss.isDead) continue;
      const { specialAttack } = boss.update(dt, this.player.x, this.player.y);

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
          this.hud.showToast(`💀 ${boss.config.nameIT}: Attacco Speciale!`);
          this.spawnBossShockwave(boss);
        }
      }
    }

    // ── Projectile System ─────────────────────────────────────
    const allEnemies = [...this.enemies, ...this.bosses] as Enemy[];
    this.projectileSystem.update(
      dt,
      this.player.x, this.player.y,
      allEnemies,
      (enemy, dmg) => this.onEnemyHit(enemy as Enemy | Boss, dmg),
    );

    // ── Process dead enemies ──────────────────────────────────
    this.enemies = this.enemies.filter(e => {
      if (e.isDead) {
        this.totalKills++;
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

    // ── Dynamic Difficulty & Enemy Spawning ────────────────────
    const diff = difficultyManager.getSnapshot(this.elapsedSec);

    // Announce threat tier changes
    if (diff.tierChanged && this.elapsedSec > 5) {
      this.hud.showToast(`⚡ ALLERTA: ${diff.threatTier.nameIT}!`);
      audioManager.playSFX('promotion');
    }

    // Periodic invasion surge event
    if (difficultyManager.checkSurge(this.elapsedSec)) {
      this.triggerSurgeEvent();
    }

    // Regular wave spawn
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

    // ── Boss Scheduling ───────────────────────────────────────
    const currentMinute = Math.floor(this.elapsedSec / 60);
    for (const [minute, bossType] of BOSS_SCHEDULE) {
      if (currentMinute >= minute && !this.bossMinutesSpawned.has(minute)) {
        this.bossMinutesSpawned.add(minute);
        this.spawnBoss(bossType, currentMinute);
      }
    }

    // ── Player death ──────────────────────────────────────────
    if (this.player.isDead) {
      this.gameOver = true;
      audioManager.playSFX('game_over');
      audioManager.stopBGM();
      SaveSystem.recordRunEnd(
        this.ryo,
        this.elapsedSec,
        this.level,
        this.totalKills,
        this.bossesDefeatedCount > 0,
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

  selectSlot(idx: number): void {
    if (idx >= 0 && idx < this.combatSlots.length && idx !== this.activeSlotIndex) {
      this.activeSlotIndex = idx;
      audioManager.playSFX('button_click');
      const slot = this.combatSlots[idx];
      const names = slot.moves.map(m => m.definition.nameIT).join(' + ');
      this.hud.showToast(`⚡ Mossa Attiva: ${names}`);
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
    this.hud.showToast(`💥 FUSIONE RIUSCITA! Le tecniche ora sparano contemporaneamente!`);
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

    const synMult = (syn && isPrimary) ? syn.dmgMultiplier : 1.0;
    const combMult = combined ? combined.dmgMultiplier : 1.0;
    const lvlMult = 1 + (aj.level - 1) * 0.35;
    const rawDmg = this.upgStats.jutsudmg * jutsu.baseDmgCoeff * lvlMult * 10;
    const isCrit = Math.random() < this.upgStats.critchance;
    const dmg = Math.round(rawDmg * synMult * combMult * (isCrit ? this.upgStats.critdmg : 1));

    const nearest = this.findNearest();
    const angle = nearest
      ? Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x)
      : -Math.PI / 2;

    const color = (syn && isPrimary)
      ? syn.vfxColor
      : (combined ? combined.vfxColor : jutsu.vfxColor);

    const effectiveBehavior = (syn && isPrimary)
      ? syn.behavior
      : (combined ? combined.behavior : jutsu.behavior);

    const jName = (syn && isPrimary) ? syn.nameIT : jutsu.nameIT;
    const jElem = jutsu.element;

    if (effectiveBehavior === 'AreaPersistent' || effectiveBehavior === 'Explosion') {
      this.fireGravityPulse(dmg * 1.5, 260 + (aj.level - 1) * 20, color);
      audioManager.playSFX('combined_activate');
    } else if (effectiveBehavior === 'Beam') {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        960,
        dmg * 2,
        color,
        7 + aj.level,
        8 + aj.level * 2,
        0.8,
        jElem,
        jName,
        'Beam',
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX('jutsu_beam');
    } else if (effectiveBehavior === 'ProjectileOmni') {
      const count = (syn && isPrimary) ? 16 : (8 + aj.level * 2);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const proj = createProjectile(
          this.player.x, this.player.y,
          a,
          560,
          dmg,
          color,
          8 + aj.level,
          2 + Math.floor(aj.level / 2),
          1.6,
          jElem,
          jName,
          'ProjectileOmni',
        );
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX('jutsu_omni');
    } else if (effectiveBehavior === 'ProjectileSpread') {
      const spreadCount = (syn && isPrimary) ? 8 : (3 + aj.level);
      const fan = 0.60;
      for (let i = 0; i < spreadCount; i++) {
        const offset = ((i / Math.max(1, spreadCount - 1)) - 0.5) * fan;
        const proj = createProjectile(
          this.player.x, this.player.y,
          angle + offset,
          620,
          Math.round(dmg * 0.90),
          color,
          8 + aj.level,
          (syn && isPrimary) ? 4 : (1 + Math.floor(aj.level / 2)),
          2.0,
          jElem,
          jName,
          'ProjectileSpread',
        );
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX('jutsu_fire');
    } else if (effectiveBehavior === 'Orbital') {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        540,
        Math.round(dmg * 1.2),
        color,
        9,
        3,
        1.8,
        jElem,
        jName,
        'Orbital',
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX('jutsu_fire');
    } else {
      const proj = createProjectile(
        this.player.x, this.player.y,
        angle,
        540,
        dmg,
        color,
        8 + aj.level,
        1 + Math.floor(aj.level / 2),
        2.2,
        jElem,
        jName,
        'Projectile',
      );
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX('jutsu_fire');
    }
  }

  private fireGravityPulse(dmg: number, radius: number, color: number): void {
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
          if (d < radius) this.onEnemyHit(e as Enemy, dmg * (1 - d / radius));
        }
      }
    };
    this.app.ticker.add(expand);
  }

  // ── Hit handling ─────────────────────────────────────────────

  private onEnemyHit(enemy: Enemy | Boss, damage: number): void {
    const isCrit = Math.random() < this.upgStats.critchance;
    const finalDmg = isCrit ? Math.round(damage * this.upgStats.critdmg) : Math.round(damage);
    enemy.takeDamage(finalDmg);
    const screenX = enemy.x + this.world.x;
    const screenY = enemy.y + this.world.y - 20;
    this.hud.showDamageNumber(screenX, screenY, finalDmg, isCrit);
    audioManager.playSFX('enemy_hit');
  }

  private damagePlayer(rawDmg: number): void {
    const eff = Math.max(1, rawDmg - this.upgStats.defense);
    this.upgStats.hp = Math.max(0, this.upgStats.hp - eff);
    this.player.hp = this.upgStats.hp;
    this.particleSystem.emitPlayerHit(this.player.x, this.player.y);
    audioManager.playSFX('player_hurt');
  }

  // ── Boss ──────────────────────────────────────────────────────

  private spawnBoss(type: BossType, minute: number): void {
    const config = BOSS_CONFIGS[type];
    const angle  = Math.random() * Math.PI * 2;
    const dist   = GAME_CONFIG.ENEMY_SPAWN_RADIUS_MAX + 80;
    const bx = this.player.x + Math.cos(angle) * dist;
    const by = this.player.y + Math.sin(angle) * dist;
    const boss = new Boss(bx, by, config, minute);
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
    this.hud.showToast(`📜 +1 Rotolo di Evocazione da ${boss.config.nameIT}!`);
    this.hud.showToast(`✦ +${boss.config.fragments} Frammenti da ${boss.config.nameIT}!`);

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
    this.hud.showToast('💥 CARTA BOMBA! Esplosione devastante!');

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
    this.hud.showToast('🧲 SIGILLO MAGNETICO! Tutti gli orbi attratti!');

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
    this.hud.showToast(`🍜 RAMEN DI ICHIRAKU! +${actualHealed > 0 ? actualHealed : healAmount} HP!`);
  }

  private checkLevelUp(): void {
    const xpNeeded = XP_PER_LEVEL[Math.min(this.level, XP_PER_LEVEL.length - 1)] ?? 9999;
    if (this.xp >= xpNeeded && this.level < XP_PER_LEVEL.length - 1) {
      this.xp -= xpNeeded;
      this.level++;
      audioManager.playSFX('level_up');
      this.hud.showToast(`⬆ Livello ${this.level}!`);
      this.particleSystem.emitLevelUp(this.player.x, this.player.y);

      const options = this.generateLevelUpOptions();
      this.levelUpPanel.show(this.level, (opt) => {
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
      }, options);
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

    // Check if a synergy can be awakened
    const primaryJutsu = this.combatSlots[0]?.moves[0]?.definition;
    const candidateRecipe = primaryJutsu ? findAvailableSynergyForJutsu(primaryJutsu.id, primaryJutsu.nameIT) : null;
    let addedJutsuOption = false;

    if (candidateRecipe && !this.activeSynergy) {
      const hasRequiredTool = this.acquiredTools.has(candidateRecipe.requiredToolId);
      const isHighLevel = (this.combatSlots[0]?.moves[0]?.level ?? 1) >= 3;
      if (hasRequiredTool && isHighLevel) {
        options.push({
          id: `synergy_${candidateRecipe.id}`,
          icon: '🌟',
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
            this.hud.showToast(`🌀 Nuova Mossa nello Slot #${this.combatSlots.length}: ${nextJutsuDef.nameIT}!`);
          },
        });
      } else {
        const upgradable = allMoves.filter(a => a.level < a.definition.maxLevel);
        if (upgradable.length > 0) {
          const targetJutsu = upgradable[0];
          const nextLvl = targetJutsu.level + 1;
          options.push({
            id: `jutsu_lvl_${targetJutsu.definition.id}`,
            icon: targetJutsu.definition.icon,
            title: `${targetJutsu.definition.nameIT} (Lv. ${nextLvl})`,
            description: `Potenzia la tecnica: +35% Danno, +raggio d'azione e -10% Cooldown. (Livello ${nextLvl}/5)`,
            color: targetJutsu.definition.vfxColor,
            type: 'jutsu_level',
            tag: '🌀 POTENZIAMENTO MOSSA',
            levelText: `Lv. ${nextLvl}/5`,
            apply: (stats) => {
              targetJutsu.level++;
              stats.jutsudmg *= 1.15;
              this.hud.showToast(`🌀 ${targetJutsu.definition.nameIT} potenziato a Livello ${targetJutsu.level}!`);
            },
          });
        } else {
          options.push({
            id: 'jutsu_mastery',
            icon: '⚡',
            title: 'Maestria del Chakra Shinobi',
            description: '+40% Danno a tutte le mosse Jutsu possedute',
            color: 0x38BDF8,
            type: 'jutsu_level',
            tag: '🌀 MAESTRIA JUTSU',
            levelText: 'MAX',
            apply: (stats) => {
              stats.jutsudmg *= 1.40;
              this.hud.showToast('⚡ Maestria Jutsu: Danno aumentato del 40%!');
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
        tag: isSynComponent ? '✦ SINERGIA COMPATIBILE' : '🗡️ STRUMENTO NINJA',
        levelText: `Lv. ${nextLvl}/${tool.maxLevel}`,
        apply: (stats) => {
          this.acquiredTools.set(tool.id, nextLvl);
          tool.apply(stats, nextLvl);
          this.hud.showToast(`🗡 ${tool.nameIT} Livello ${nextLvl}!`);
        },
      });
    } else {
      options.push({
        id: 'ninja_pouch_buff',
        icon: '🎒',
        title: 'Borsa Tattica Completa',
        description: '+25% Difesa e +20% Velocità di Raccolta Chakra',
        color: 0xEA580C,
        type: 'ninja_tool',
        tag: '🗡️ STRUMENTO NINJA',
        levelText: 'MAX',
        apply: (stats) => {
          stats.defense += 25;
          stats.collectradius += 40;
          this.hud.showToast('🎒 Difesa e Raccolta potenziate!');
        },
      });
    }

    // ── OPZIONE 3: POTENZIAMENTO DI STATS ───────────────────
    const statPool = [...UPGRADE_POOL];
    const rndIdx = Math.floor(Math.random() * statPool.length);
    const chosenStat = statPool[rndIdx];
    options.push({
      ...chosenStat,
      tag: '⚡ POTENZIAMENTO STATISTICHE',
      type: 'stat',
      levelText: '+BUFF',
    });

    return options;
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
    this.hud.showToast(`⚡ ONDA D'INVASIONE IN ARRIVO!`);
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
    const xpToNext = XP_PER_LEVEL[Math.min(this.level, XP_PER_LEVEL.length - 1)] ?? 9999;
    const diff = difficultyManager.getSnapshot(this.elapsedSec);
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
      slots:         this.combatSlots.map((s, i) => ({
        id: s.id,
        moves: s.moves.map(m => ({
          icon: m.definition.icon,
          name: m.definition.nameIT,
          level: m.level,
          color: m.definition.vfxColor,
        })),
        isActive: i === this.activeSlotIndex,
      })),
      activeTools:   Array.from(this.acquiredTools.entries()).map(([id, lvl]) => {
        const tool = NINJA_TOOLS.find(t => t.id === id);
        return { icon: tool?.icon || '🗡️', name: tool?.nameIT || id, level: lvl };
      }),
    });
  }

  private restart(): void {
    this.stop();
    this.start(this.session);
  }
}
