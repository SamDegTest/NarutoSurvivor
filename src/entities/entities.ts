import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import type { Character } from '../types/character';

// ============================================================
//  NarutoSurvivor — Input Manager
// ============================================================

export class InputManager {
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
  private readonly body: Graphics;
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
    this.x = GAME_CONFIG.WORLD_WIDTH / 2;
    this.y = GAME_CONFIG.WORLD_HEIGHT / 2;
    this.speed         = character.baseStats.movespeed;
    this.hp            = character.baseStats.hp;
    this.maxHp         = character.baseStats.hp;
    this.collectRadius = character.baseStats.collectradius;
    this.characterColor = character.assets.color;

    this.container = new Container();

    // Aura glow
    this.aura = new Graphics();
    this.container.addChild(this.aura);

    // Body
    this.body = new Graphics();
    this.drawBody();
    this.container.addChild(this.body);
  }

  private drawBody(): void {
    const r = GAME_CONFIG.PLAYER_HITBOX_RADIUS;
    const c = this.characterColor;

    // Aura pulse
    this.aura.clear();
    this.aura.circle(0, 0, r + 10);
    this.aura.fill({ color: c, alpha: 0.18 });

    // Main body circle
    this.body.clear();
    this.body.circle(0, 0, r);
    this.body.fill({ color: c });

    // Headband stripe
    this.body.rect(-r, -4, r * 2, 7);
    this.body.fill({ color: 0xffffff, alpha: 0.35 });
  }

  update(dt: number, input: InputManager): void {
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

      // Clamp to world bounds
      this.x = Math.max(32, Math.min(GAME_CONFIG.WORLD_WIDTH  - 32, this.x));
      this.y = Math.max(32, Math.min(GAME_CONFIG.WORLD_HEIGHT - 32, this.y));
    }

    // Pulse aura
    const pulse = 1 + Math.sin(Date.now() / 400) * 0.12;
    this.aura.scale.set(pulse);

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

export interface EnemyConfig {
  type: 'zetsu' | 'traitor_ninja' | 'summon';
  hp: number;
  speed: number;
  damage: number;
  color: number;
  size: number;
  expValue: number;
  ryoValue: number;
}

export const ENEMY_TEMPLATES: Record<string, EnemyConfig> = {
  zetsu: {
    type: 'zetsu', hp: 80, speed: 65, damage: 10,
    color: 0x2D6A4F, size: 14, expValue: 8, ryoValue: 3,
  },
  traitor_ninja: {
    type: 'traitor_ninja', hp: 180, speed: 55, damage: 22,
    color: 0x6B21A8, size: 16, expValue: 18, ryoValue: 7,
  },
  summon: {
    type: 'summon', hp: 350, speed: 40, damage: 35,
    color: 0x991B1B, size: 22, expValue: 35, ryoValue: 15,
  },
};

export class Enemy {
  readonly container: Container;
  private readonly body: Graphics;

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

    this.body = new Graphics();
    this.body.roundRect(-config.size, -config.size, config.size * 2, config.size * 2, 4);
    this.body.fill({ color: config.color });

    // Eye detail
    this.body.circle(-5, -3, 3);
    this.body.circle( 5, -3, 3);
    this.body.fill({ color: 0xffffff, alpha: 0.8 });

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

export type CollectibleType = 'chakra_orb' | 'ryo_coin';

export class Collectible {
  readonly container: Container;
  private readonly body: Graphics;

  x: number;
  y: number;
  type: CollectibleType;
  value: number;
  collected = false;
  private age = 0;

  constructor(x: number, y: number, type: CollectibleType, value: number) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.value = value;

    this.container = new Container();
    this.body = new Graphics();

    const color = type === 'chakra_orb' ? GAME_CONFIG.COLORS.CHAKRA_ORB : GAME_CONFIG.COLORS.RYO_COIN;
    const size  = type === 'chakra_orb' ? 7 : 5;

    this.body.circle(0, 0, size);
    this.body.fill({ color });

    // Inner shine
    this.body.circle(-2, -2, size * 0.35);
    this.body.fill({ color: 0xffffff, alpha: 0.6 });

    this.container.addChild(this.body);
    this.container.x = x;
    this.container.y = y;
  }

  update(dt: number): void {
    this.age += dt;
    // Floating bob
    this.container.y = this.y + Math.sin(this.age * 3.0) * 2.5;
    // Pulse
    const p = 1 + Math.sin(this.age * 5) * 0.08;
    this.body.scale.set(p);
  }
}
