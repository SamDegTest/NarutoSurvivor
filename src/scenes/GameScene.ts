import { Application, Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  Player, Enemy, Collectible, InputManager,
  ENEMY_TEMPLATES,
  type EnemyConfig,
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
import { LevelUpPanel, PromotionPanel, BossWarningBanner, type UpgradeTarget } from '../ui/Panels';
import { computeScaledStats, getNextPromotionTier, tryPromote } from '../systems/promotionSystem';
import { findCombinedTechnique } from '../data/combinedTechniques';
import { audioManager } from '../systems/audioManager';
import { SaveSystem } from '../systems/saveSystem';
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

// XP thresholds per level (index = level)
const XP_PER_LEVEL = [0, 50, 120, 240, 400, 620, 900, 1250, 1700, 2300, 9999];

export class GameScene {
  private readonly app: Application;
  private readonly world: Container;
  private readonly groundLayer: Container;
  private readonly entityLayer: Container;
  private readonly uiLayer: Container;

  private input!: InputManager;
  private player!: Player;
  private enemies: Enemy[] = [];
  private bosses: Boss[] = [];
  private collectibles: Collectible[] = [];
  private projectileSystem!: ProjectileSystem;
  private hud!: HUD;
  private levelUpPanel!: LevelUpPanel;
  private promotionPanel!: PromotionPanel;
  private bossWarning!: BossWarningBanner;

  // ── Session state ─────────────────────────────────────────
  private elapsedSec = 0;
  private chakraOrbs = 0;
  private ryo = 0;
  private level = 1;
  private xp = 0;
  private gameOver = false;
  private paused = false;
  private session!: PlayerSession;

  // ── Upgrade target (live mutable stats) ────────────────────
  private upgStats!: UpgradeTarget;

  // ── Jutsu ─────────────────────────────────────────────────
  private jutsuCooldown = 0;
  private jutsuCooldownBase = 0;
  private combinedActive = false;

  // ── Spawn ─────────────────────────────────────────────────
  private spawnTimer = 0;
  private readonly spawnInterval = GAME_CONFIG.ENEMY_SPAWN_INTERVAL_MS / 1000;
  private enemyBudget: number = GAME_CONFIG.ENEMY_INITIAL_COUNT;

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
    this.enemies = [];
    this.bosses  = [];
    this.collectibles = [];
    this.bossMinutesSpawned.clear();
    this.entityLayer.removeChildren();
    this.groundLayer.removeChildren();
    this.uiLayer.removeChildren();

    // ── Resume audio context on interaction ───────────────────
    audioManager.resume();
    audioManager.startBGM();

    // ── Input ────────────────────────────────────────────────
    this.input = new InputManager();

    // ── Ground ───────────────────────────────────────────────
    this.buildGround();

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

    // ── Player entity ─────────────────────────────────────────
    this.player = new Player({ ...session.character, baseStats } as Character);
    this.entityLayer.addChild(this.player.container);

    // ── Jutsu setup ───────────────────────────────────────────
    this.jutsuCooldownBase = session.character.jutsuSlot.cooldownSec;
    this.jutsuCooldown = 0;
    this.projectileSystem = new ProjectileSystem(this.entityLayer);

    // Check if combined technique is active
    const combined = findCombinedTechnique(
      session.character.jutsuSlot.id,
      session.character.passiveAbility.id,
    );
    this.combinedActive = !!combined;
    if (this.combinedActive) audioManager.playSFX('combined_activate');

    if (session.character.jutsuSlot.behavior === 'Orbital') {
      const orbDmg = Math.round(this.upgStats.jutsudmg * session.character.jutsuSlot.baseDmgCoeff * 10);
      const orbs = createOrbitalProjectiles(
        this.player.x, this.player.y, 3, orbDmg, session.character.assets.color,
      );
      this.projectileSystem.setOrbitals(orbs);
    }

    // ── HUD ───────────────────────────────────────────────────
    this.hud = new HUD(this.app);

    // ── UI Panels ─────────────────────────────────────────────
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    this.levelUpPanel   = new LevelUpPanel(this.uiLayer, W, H);
    this.promotionPanel = new PromotionPanel(this.uiLayer, W, H);
    this.bossWarning    = new BossWarningBanner(this.uiLayer, W, H);

    // ── Keybindings ───────────────────────────────────────────
    this.setupKeybindings();

    // ── Initial wave ──────────────────────────────────────────
    this.spawnWave(this.enemyBudget);

    // ── Game Loop ─────────────────────────────────────────────
    this.app.ticker.add(this.tick, this);
  }

  stop(): void {
    this.app.ticker.remove(this.tick, this);
    audioManager.stopBGM();
    this.entityLayer.removeChildren();
    this.groundLayer.removeChildren();
    this.uiLayer.removeChildren();
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

  // ── Ground ──────────────────────────────────────────────────

  private buildGround(): void {
    const W = GAME_CONFIG.WORLD_WIDTH;
    const H = GAME_CONFIG.WORLD_HEIGHT;

    const ground = new Graphics();
    ground.rect(0, 0, W, H);
    ground.fill({ color: GAME_CONFIG.COLORS.GROUND });
    this.groundLayer.addChild(ground);

    const grid = new Graphics();
    for (let x = 0; x <= W; x += 128) { grid.moveTo(x, 0); grid.lineTo(x, H); }
    for (let y = 0; y <= H; y += 128) { grid.moveTo(0, y); grid.lineTo(W, y); }
    grid.stroke({ color: GAME_CONFIG.COLORS.GRID, width: 1 });
    this.groundLayer.addChild(grid);

    const foliage = new Graphics();
    for (let i = 0; i < 500; i++) {
      foliage.circle(Math.random() * W, Math.random() * H, 3 + Math.random() * 9);
      foliage.fill({ color: 0x1A3B1A, alpha: 0.55 + Math.random() * 0.3 });
    }
    this.groundLayer.addChild(foliage);

    const border = new Graphics();
    border.rect(0, 0, W, H);
    border.stroke({ color: 0xFF6B00, width: 8 });
    this.groundLayer.addChild(border);
  }

  // ── Main Tick ────────────────────────────────────────────────

  private tick = (ticker: { deltaTime: number; deltaMS: number }): void => {
    if (this.gameOver) return;

    // Boss warning and promotion panel use real-time
    const dt = ticker.deltaMS / 1000;
    this.bossWarning.update(dt);

    if (this.paused || this.levelUpPanel.isVisible || this.promotionPanel.isVisible) {
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

    // ── Jutsu ─────────────────────────────────────────────────
    const effectiveCooldown = this.jutsuCooldownBase * this.upgStats.jutsuCooldownMult;
    this.jutsuCooldown -= dt;
    if (this.jutsuCooldown <= 0) {
      this.fireJutsu();
      this.jutsuCooldown = effectiveCooldown;
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
        this.spawnDrops(e.x, e.y, e.config);
        this.entityLayer.removeChild(e.container);
        audioManager.playSFX('enemy_die');
        return false;
      }
      return true;
    });

    this.bosses = this.bosses.filter(b => {
      if (b.isDead) {
        this.onBossDead(b);
        this.entityLayer.removeChild(b.container);
        return false;
      }
      return true;
    });

    // ── Collectibles ──────────────────────────────────────────
    this.collectibles = this.collectibles.filter(c => {
      if (c.collected) return false;
      c.update(dt);
      const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
      if (dist < this.upgStats.collectradius) {
        this.collectItem(c);
        c.collected = true;
        this.entityLayer.removeChild(c.container);
        return false;
      }
      return true;
    });

    // ── Enemy Spawning ────────────────────────────────────────
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const toSpawn = Math.ceil(this.enemyBudget * 0.40);
      this.spawnWave(toSpawn);
      this.enemyBudget = Math.ceil(
        GAME_CONFIG.ENEMY_INITIAL_COUNT *
        Math.pow(GAME_CONFIG.ENEMY_SPAWN_SCALE, this.elapsedSec / 60),
      );
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
        this.enemies.filter(e => e.isDead).length,
        this.bosses.some(b => b.isDead),
      );
      SaveSystem.addFragments(this.session.character.id, this.currentFragments);
      this.hud.showGameOver(
        () => this.restart(),
        () => this.returnToMenu(),
      );
    }

    this.updateHUD();
  };

  // ── Jutsu Fire ───────────────────────────────────────────────

  private fireJutsu(): void {
    const jutsu = this.session.character.jutsuSlot;
    const combined = this.combinedActive
      ? findCombinedTechnique(jutsu.id, this.session.character.passiveAbility.id)
      : null;

    const dmgMult = combined ? combined.dmgMultiplier : 1.0;
    const rawDmg = this.upgStats.jutsudmg * jutsu.baseDmgCoeff * 10;
    const isCrit = Math.random() < this.upgStats.critchance;
    const dmg = Math.round(rawDmg * dmgMult * (isCrit ? this.upgStats.critdmg : 1));

    const nearest = this.findNearest();
    const angle = nearest
      ? Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x)
      : -Math.PI / 2;

    const color = combined
      ? combined.vfxColor
      : this.session.character.assets.color;

    if (combined?.behavior === 'GravityPulse') {
      this.fireGravityPulse(dmg, combined.specialParam.pullRadius, color);
      audioManager.playSFX('combined_activate');
    } else if (jutsu.behavior === 'Beam' || combined?.behavior === 'BeamExploding') {
      const proj = createProjectile(this.player.x, this.player.y, angle, 950, dmg * 2, color, 7, combined ? 8 : 5, 0.8);
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX('jutsu_beam');
    } else if (jutsu.behavior === 'ProjectileOmni') {
      const count = combined ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const proj = createProjectile(this.player.x, this.player.y, a, 520, dmg, color, 9, 2, 1.5);
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX('jutsu_omni');
    } else if (jutsu.behavior === 'ProjectileSpread') {
      const spreadCount = combined ? 7 : 5;
      const fan = 0.55;
      for (let i = 0; i < spreadCount; i++) {
        const offset = ((i / (spreadCount - 1)) - 0.5) * fan;
        const proj = createProjectile(
          this.player.x, this.player.y,
          angle + offset,
          580,
          Math.round(dmg * 0.75),
          color,
          7,
          combined ? 3 : 2,
          1.8,
        );
        this.projectileSystem.fireProjectile(proj);
      }
      audioManager.playSFX('jutsu_fire');
    } else if (jutsu.behavior === 'Orbital') {
      const proj = createProjectile(this.player.x, this.player.y, angle, 540, Math.round(dmg * 1.2), color, 9, 3, 1.8);
      this.projectileSystem.fireProjectile(proj);
      audioManager.playSFX('jutsu_fire');
    } else {
      const proj = createProjectile(this.player.x, this.player.y, angle, 500, dmg, color, 8, combined ? 4 : 1, 2.2);
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
    // Fragment & Scroll drop
    this.currentFragments += boss.config.fragments;
    SaveSystem.addScrolls(1);
    this.hud.showToast(`📜 +1 Rotolo di Evocazione da ${boss.config.nameIT}!`);
    this.hud.showToast(`✦ +${boss.config.fragments} Frammenti da ${boss.config.nameIT}!`);
  }

  // ── Drops & Collection ───────────────────────────────────────

  private spawnDrops(x: number, y: number, config: EnemyConfig): void {
    const orbCount = Math.ceil(config.expValue / 8);
    for (let i = 0; i < orbCount; i++) {
      const ox = x + (Math.random() - 0.5) * 40;
      const oy = y + (Math.random() - 0.5) * 40;
      const orb = new Collectible(ox, oy, 'chakra_orb',
        Math.round(GAME_CONFIG.CHAKRA_ORB_BASE_VALUE * this.upgStats.chakraorbmultiplier));
      this.collectibles.push(orb);
      this.entityLayer.addChild(orb.container);
    }
    if (Math.random() < GAME_CONFIG.RYO_DROP_CHANCE) {
      const ryo = new Collectible(x, y, 'ryo_coin',
        Math.round(config.ryoValue * this.upgStats.ryomultiplier));
      this.collectibles.push(ryo);
      this.entityLayer.addChild(ryo.container);
    }
    // Rare fragment drop (2% chance)
    if (Math.random() < 0.02) {
      this.currentFragments += 1;
    }
  }

  private collectItem(c: Collectible): void {
    if (c.type === 'chakra_orb') {
      this.chakraOrbs += c.value;
      this.xp += c.value;
      audioManager.playSFX('collect_orb');
      this.checkLevelUp();
    } else {
      this.ryo += c.value;
      audioManager.playSFX('collect_ryo');
    }
  }

  private checkLevelUp(): void {
    const xpNeeded = XP_PER_LEVEL[Math.min(this.level, XP_PER_LEVEL.length - 1)] ?? 9999;
    if (this.xp >= xpNeeded && this.level < XP_PER_LEVEL.length - 1) {
      this.xp -= xpNeeded;
      this.level++;
      audioManager.playSFX('level_up');
      this.hud.showToast(`⬆ Livello ${this.level}!`);
      this.levelUpPanel.show(this.level, (opt) => {
        opt.apply(this.upgStats);
        // Sync player HP
        this.player.hp    = this.upgStats.hp;
        this.player.maxHp = this.upgStats.maxHp;
        // Update orbitals if stats changed
        if (this.session.character.jutsuSlot.behavior === 'Orbital') {
          const orbDmg = Math.round(this.upgStats.jutsudmg * this.session.character.jutsuSlot.baseDmgCoeff * 10);
          const orbs = createOrbitalProjectiles(this.player.x, this.player.y, 3, orbDmg, this.session.character.assets.color);
          this.projectileSystem.setOrbitals(orbs);
        }
      });
    }
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

  private spawnWave(count: number): void {
    const TYPES = Object.values(ENEMY_TEMPLATES);
    const minute = Math.floor(this.elapsedSec / 60);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = GAME_CONFIG.ENEMY_SPAWN_RADIUS_MIN +
        Math.random() * (GAME_CONFIG.ENEMY_SPAWN_RADIUS_MAX - GAME_CONFIG.ENEMY_SPAWN_RADIUS_MIN);
      const ex = this.player.x + Math.cos(angle) * dist;
      const ey = this.player.y + Math.sin(angle) * dist;

      let typeIdx = 0;
      if (minute >= 3 && Math.random() < 0.35) typeIdx = 1;
      if (minute >= 6 && Math.random() < 0.25) typeIdx = 2;

      const template = TYPES[typeIdx];
      const scaledConfig: EnemyConfig = {
        ...template,
        hp:     Math.round(template.hp     * (1 + minute * 0.15)),
        damage: Math.round(template.damage * (1 + minute * 0.10)),
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
    });
  }

  private restart(): void {
    this.stop();
    this.start(this.session);
  }
}
