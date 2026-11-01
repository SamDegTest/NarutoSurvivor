import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import type { Character } from '../types/character';
import { buildPlayerSprite, buildEnemySprite } from '../rendering/SpriteFactory';

// ============================================================
//  NarutoSurvivor — Input Manager (legacy shim)
//  Kept for backward-compat. GameScene now uses InputHandler.
// ============================================================

/** Minimal interface satisfied by both InputManager and InputHandler */
export interface IInputSource {
  moveX: number;
  moveY: number;
}

export class InputManager implements IInputSource {
  readonly keys = new Set<string>();
  mouse = { x: 0, y: 0, down: false };

  constructor() {
    window.addEventListener('keydown', e => this.keys.add(e.code));
    window.addEventListener('keyup',   e => this.keys.delete(e.code));
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => { this.mouse.down = true;  });
    window.addEventListener('mouseup',   () => { this.mouse.down = false; });
  }

  isDown(...codes: string[]): boolean {
    return codes.some(c => this.keys.has(c));
  }

  get moveX(): number {
    const left  = this.isDown('ArrowLeft',  'KeyA') ? -1 : 0;
    const right = this.isDown('ArrowRight', 'KeyD') ?  1 : 0;
    return left + right;
  }

  get moveY(): number {
    const up   = this.isDown('ArrowUp',   'KeyW') ? -1 : 0;
    const down = this.isDown('ArrowDown', 'KeyS') ?  1 : 0;
    return up + down;
  }
}

// ============================================================
//  Player Entity
// ============================================================

export class Player {
  readonly container: Container;
  private readonly spriteRoot: Container;
  private readonly aura: Graphics;
  private trail: { x: number; y: number; alpha: number }[] = [];

  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  collectRadius: number;
  characterColor: number;

  constructor(character: Character) {
    this.x = 0;
    this.y = 0;
    this.speed         = character.baseStats.movespeed;
    this.hp            = character.baseStats.hp;
    this.maxHp         = character.baseStats.hp;
    this.collectRadius = character.baseStats.collectradius;
    this.characterColor = character.assets.color;

    this.container = new Container();

    // Aura glow ring (behind sprite)
    this.aura = new Graphics();
    this.container.addChild(this.aura);

    // Pixel-art sprite from SpriteFactory
    this.spriteRoot = buildPlayerSprite(character);
    this.container.addChild(this.spriteRoot);
  }

  update(dt: number, input: IInputSource): void {
    const dx = input.moveX;
    const dy = input.moveY;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const nx = dx / len;
      const ny = dy / len;

      this.trail.push({ x: this.x, y: this.y, alpha: 0.5 });
      if (this.trail.length > 6) this.trail.shift();

      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;

      // Infinite world: free movement without border clamping

      // Flip sprite horizontally based on movement direction
      if (this.spriteRoot) this.spriteRoot.scale.x = nx < 0 ? -1 : 1;
    }

    // Pulse aura glow
    const pulse = 1 + Math.sin(Date.now() / 400) * 0.12;
    this.aura.clear();
    this.aura.circle(0, 0, GAME_CONFIG.PLAYER_HITBOX_RADIUS + 12);
    this.aura.fill({ color: this.characterColor, alpha: 0.14 * pulse });

    this.container.x = this.x;
    this.container.y = this.y;
  }

  takeDamage(amount: number, defense: number): void {
    const effective = Math.max(1, amount - defense);
    this.hp = Math.max(0, this.hp - effective);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  get hpPercent(): number {
    return this.hp / this.maxHp;
  }
}

// ============================================================
//  Enemy Entity
// ============================================================

export type EnemyType = 'zetsu' | 'traitor_ninja' | 'anbu_corrupt' | 'summon';

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  color: number;
  size: number;
  expValue: number;
  ryoValue: number;
  isElite?: boolean;
}

export const ENEMY_TEMPLATES: Record<EnemyType, EnemyConfig> = {
  zetsu: {
    type: 'zetsu', hp: 70, speed: 56, damage: 10,
    color: 0x2D6A4F, size: 14, expValue: 12, ryoValue: 3,
  },
  traitor_ninja: {
    type: 'traitor_ninja', hp: 150, speed: 64, damage: 18,
    color: 0x6B21A8, size: 16, expValue: 24, ryoValue: 8,
  },
  anbu_corrupt: {
    type: 'anbu_corrupt', hp: 240, speed: 76, damage: 26,
    color: 0x475569, size: 17, expValue: 38, ryoValue: 14,
  },
  summon: {
    type: 'summon', hp: 420, speed: 44, damage: 42,
    color: 0x991B1B, size: 24, expValue: 60, ryoValue: 24,
  },
};

export class Enemy {
  readonly container: Container;
  private readonly body: Graphics;
  private readonly eliteAura?: Graphics;
  private auraTimer = 0;

  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  config: EnemyConfig;
  isDead = false;

  private static _idCounter = 0;

  constructor(x: number, y: number, config: EnemyConfig) {
    this.id = ++Enemy._idCounter;
    this.x = x;
    this.y = y;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.config = config;

    this.container = new Container();

    // Elite visual aura (behind sprite)
    if (config.isElite) {
      this.eliteAura = new Graphics();
      this.container.addChild(this.eliteAura);
    }

    // Pixel-art sprite from SpriteFactory
    this.body = buildEnemySprite(config);
    this.container.addChild(this.body);
    this.container.x = x;
    this.container.y = y;
  }

  update(dt: number, targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      this.x += (dx / dist) * this.config.speed * dt;
      this.y += (dy / dist) * this.config.speed * dt;
    }
    this.container.x = this.x;
    this.container.y = this.y;

    // Pulse elite aura
    if (this.eliteAura) {
      this.auraTimer += dt * 4;
      const pulse = 1 + Math.sin(this.auraTimer) * 0.18;
      this.eliteAura.clear();
      this.eliteAura.circle(0, 0, (this.config.size + 6) * pulse);
      this.eliteAura.fill({ color: 0xFBBF24, alpha: 0.22 });
      this.eliteAura.stroke({ color: 0xF59E0B, width: 2, alpha: 0.85 });
    }
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) this.isDead = true;

    // Flash red on hit
    this.body.tint = 0xff4444;
    setTimeout(() => { if (this.body) this.body.tint = 0xffffff; }, 80);
  }

  get distanceTo(): (x: number, y: number) => number {
    return (x, y) => Math.hypot(this.x - x, this.y - y);
  }
}

// ============================================================
//  Collectible (Chakra Orb / Ryo Coin)
// ============================================================

export type CollectibleType = 'chakra_orb' | 'ryo_coin' | 'bomb' | 'magnet' | 'ramen';

export class Collectible {
  readonly container: Container;
  private readonly body: Graphics;

  x: number;
  y: number;
  vx = 0;
  vy = 0;
  type: CollectibleType;
  value: number;
  collected = false;
  isMagnetized = false;
  private magnetSpeed = 320;
  private age = 0;

  constructor(x: number, y: number, type: CollectibleType, value: number, initVx = 0, initVy = 0) {
    this.x = x;
    this.y = y;
    this.vx = initVx;
    this.vy = initVy;
    this.type = type;
    this.value = value;

    this.container = new Container();
    this.body = new Graphics();

    if (type === 'chakra_orb') {
      const isLarge = value >= 35;
      const isMedium = value >= 15;
      const size = isLarge ? 10 : (isMedium ? 8 : 6);
      const color = isLarge ? 0xFBBF24 : (isMedium ? 0x22D3EE : 0x38BDF8);

      // Outer glow ring
      this.body.circle(0, 0, size + 4);
      this.body.fill({ color, alpha: 0.35 });

      // Core sphere
      this.body.circle(0, 0, size);
      this.body.fill({ color });

      // Specular highlight
      this.body.circle(-size * 0.3, -size * 0.3, size * 0.4);
      this.body.fill({ color: 0xffffff, alpha: 0.85 });
    } else if (type === 'ryo_coin') {
      // Ryo Gold Coin
      this.body.circle(0, 0, 7);
      this.body.fill({ color: 0xD97706 });
      this.body.circle(0, 0, 5.5);
      this.body.fill({ color: 0xFBBF24 });
      this.body.rect(-1.5, -1.5, 3, 3);
      this.body.fill({ color: 0x78350F }); // classic square center
    } else if (type === 'bomb') {
      // Kibaku Fuda (Carta Bomba Ninja)
      // Pulsing red explosive aura
      this.body.circle(0, 0, 15);
      this.body.fill({ color: 0xEF4444, alpha: 0.28 });

      // Parchment paper tag
      this.body.roundRect(-8, -12, 16, 24, 2);
      this.body.fill({ color: 0xFEF3C7 });
      this.body.stroke({ color: 0xDC2626, width: 1.5 });

      // Explosive kanji / seal (Bakuretsu)
      this.body.rect(-1, -7, 2, 14);
      this.body.fill({ color: 0x991B1B });
      this.body.rect(-5, -3, 10, 2);
      this.body.fill({ color: 0x991B1B });
      this.body.rect(-6, 2, 12, 2);
      this.body.fill({ color: 0x991B1B });
      this.body.circle(-4, -6, 1.2);
      this.body.fill({ color: 0x991B1B });
      this.body.circle(4, -6, 1.2);
      this.body.fill({ color: 0x991B1B });

      // Spark fuse on top
      this.body.circle(0, -13, 2.5);
      this.body.fill({ color: 0xFBBF24 });
    } else if (type === 'magnet') {
      // Calamita di Chakra (Chakra Magnet)
      // Pulsing magnetic field glow
      this.body.circle(0, 0, 16);
      this.body.fill({ color: 0x38BDF8, alpha: 0.30 });

      // U-shape magnet legs
      this.body.roundRect(-9, -8, 6, 16, 2);
      this.body.fill({ color: 0xEF4444 }); // red North pole
      this.body.roundRect(3, -8, 6, 16, 2);
      this.body.fill({ color: 0x3B82F6 }); // blue South pole
      this.body.roundRect(-9, 3, 18, 6, 3);
      this.body.fill({ color: 0x334155 }); // metal bridge

      // Silver pole tips
      this.body.rect(-9, -8, 6, 4);
      this.body.fill({ color: 0xE2E8F0 });
      this.body.rect(3, -8, 6, 4);
      this.body.fill({ color: 0xE2E8F0 });

      // Electric spark between tips
      this.body.moveTo(-3, -6);
      this.body.lineTo(0, -4);
      this.body.lineTo(3, -6);
      this.body.stroke({ color: 0xFBBF24, width: 1.5 });
    } else if (type === 'ramen') {
      // Ciotola fumante di Ramen di Ichiraku
      // Soft green healing vitality aura
      this.body.circle(0, 0, 16);
      this.body.fill({ color: 0x22C55E, alpha: 0.32 });

      // Red ceramic bowl
      this.body.roundRect(-10, -2, 20, 13, 4);
      this.body.fill({ color: 0xDC2626 });
      this.body.stroke({ color: 0x991B1B, width: 1.2 });
      this.body.rect(-5, 10, 10, 2);
      this.body.fill({ color: 0x1E293B }); // foot

      // Golden miso broth
      this.body.ellipse(0, -2, 9, 3.5);
      this.body.fill({ color: 0xD97706 });

      // Narutomaki (pink spiral fishcake)
      this.body.circle(-3, -2.5, 3);
      this.body.fill({ color: 0xffffff });
      this.body.circle(-3, -2.5, 1.4);
      this.body.stroke({ color: 0xF43F5E, width: 1.2 });

      // Green nori sheet
      this.body.rect(2, -4.5, 4, 3);
      this.body.fill({ color: 0x166534 });

      // Wooden chopsticks
      this.body.moveTo(1, -2);
      this.body.lineTo(8, -10);
      this.body.stroke({ color: 0x78350F, width: 1.5 });
    }

    this.container.addChild(this.body);
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * Updates position.
   * If magnetized to player, accelerates towards player.
   * Returns true when close enough to be absorbed.
   */
  update(dt: number, targetX?: number, targetY?: number): boolean {
    this.age += dt;

    // Phase 1: Physical scatter explosion decay
    if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= Math.pow(0.08, dt);
      this.vy *= Math.pow(0.08, dt);
      this.container.x = this.x;
      this.container.y = this.y;
    }

    // Phase 2: Magnetic pull towards player
    if (this.isMagnetized && targetX !== undefined && targetY !== undefined) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      const step = this.magnetSpeed * dt;
      if (dist <= step + 14 || dist < 32) {
        return true; // Reached target, absorb reliably!
      }

      this.magnetSpeed += dt * 1800;
      this.x += (dx / dist) * this.magnetSpeed * dt;
      this.y += (dy / dist) * this.magnetSpeed * dt;
      this.container.x = this.x;
      this.container.y = this.y;

      // Suction scaling effect
      const s = Math.min(1.2, Math.max(0.4, dist / 60));
      this.container.scale.set(s);
      return false;
    }

    // Phase 3: Idle floating bob
    this.container.y = this.y + Math.sin(this.age * 3.5) * 2.5;
    const p = 1 + Math.sin(this.age * 5.0) * 0.08;
    this.body.scale.set(p);

    return false;
  }
}

