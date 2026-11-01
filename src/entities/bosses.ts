import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { buildBossSprite } from '../rendering/SpriteFactory';

// ============================================================
//  NarutoSurvivor — Boss Entities
// ============================================================

export type BossType = 'kisame' | 'itachi' | 'pain_tendo' | 'ten_tails';

export interface BossConfig {
  type: BossType;
  nameIT: string;
  nameJP: string;
  hpBase: number;
  speed: number;
  damage: number;
  size: number;
  color: number;
  accentColor: number;
  expValue: number;
  ryoValue: number;
  // Boss-specific mechanics
  phase2HpPercent: number;     // triggers phase 2 at this HP%
  specialAttackInterval: number; // seconds between special attacks
  specialAttackRadius: number;
  specialAttackDamage: number;
  fragments: number;            // fragments dropped on kill
}

export const BOSS_CONFIGS: Record<BossType, BossConfig> = {
  kisame: {
    type: 'kisame',
    nameIT: 'Kisame Hoshigaki',
    nameJP: '干柿鬼鮫',
    hpBase: 1800,
    speed: 50,
    damage: 28,
    size: 36,
    color: 0x1E40AF,
    accentColor: 0x60A5FA,
    expValue: 180,
    ryoValue: 120,
    phase2HpPercent: 0.50,
    specialAttackInterval: 6,
    specialAttackRadius: 200,
    specialAttackDamage: 40,
    fragments: 8,
  },
  itachi: {
    type: 'itachi',
    nameIT: 'Itachi Uchiha',
    nameJP: 'うちはイタチ',
    hpBase: 1400,
    speed: 65,
    damage: 35,
    size: 30,
    color: 0x1F0A30,
    accentColor: 0xC4B5FD,
    expValue: 200,
    ryoValue: 150,
    phase2HpPercent: 0.40,
    specialAttackInterval: 5,
    specialAttackRadius: 240,
    specialAttackDamage: 55,
    fragments: 10,
  },
  pain_tendo: {
    type: 'pain_tendo',
    nameIT: 'Pain — Samsara of Heavenly Life',
    nameJP: '天道・六道ペイン',
    hpBase: 3200,
    speed: 45,
    damage: 45,
    size: 44,
    color: 0x4C0519,
    accentColor: 0xFDA4AF,
    expValue: 380,
    ryoValue: 300,
    phase2HpPercent: 0.35,
    specialAttackInterval: 8,
    specialAttackRadius: 320,
    specialAttackDamage: 80,
    fragments: 20,
  },
  ten_tails: {
    type: 'ten_tails',
    nameIT: 'Jūbi — La Bestia dei Dieci Code',
    nameJP: '十尾',
    hpBase: 7500,
    speed: 35,
    damage: 80,
    size: 70,
    color: 0x1C0530,
    accentColor: 0xE879F9,
    expValue: 900,
    ryoValue: 800,
    phase2HpPercent: 0.50,
    specialAttackInterval: 10,
    specialAttackRadius: 420,
    specialAttackDamage: 140,
    fragments: 50,
  },
};

export class Boss {
  readonly container: Container;
  private body: Graphics;
  private readonly nameplate: Text;
  private readonly hpBarBg: Graphics;
  private readonly hpBarFill: Graphics;
  private readonly phaseAura: Graphics;

  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  config: BossConfig;
  isDead = false;
  isPhase2 = false;

  private specialAttackTimer = 0;
  private floatAngle = 0;
  private pulseAngle = 0;

  private static _idCounter = 0;

  private rebuildSprite(phase2: boolean): void {
    // Remove old sprite
    if (this.body.parent) this.body.parent.removeChild(this.body);
    const idx = this.container.children.indexOf(this.body);
    if (idx > 0) {
      this.container.removeChildAt(idx);
    }
    // Build new sprite
    const newSprite = buildBossSprite(this.config, phase2);
    // Insert after phaseAura (index 1)
    this.container.addChildAt(newSprite, 1);
    // Update reference
    this.body = newSprite;
  }

  constructor(x: number, y: number, config: BossConfig, minute: number) {
    this.id = ++Boss._idCounter;
    this.x = x;
    this.y = y;
    const hpScale = 1 + minute * 0.22;
    const dmgScale = 1 + minute * 0.12;
    this.hp = Math.round(config.hpBase * hpScale);
    this.maxHp = this.hp;
    this.config = {
      ...config,
      damage: Math.round(config.damage * dmgScale),
      specialAttackDamage: Math.round(config.specialAttackDamage * dmgScale),
    };

    this.container = new Container();

    // ── Phase aura (ring behind body) ────────────────────────
    this.phaseAura = new Graphics();
    this.container.addChild(this.phaseAura);

    // ── Body (pixel-art boss sprite) ─────────────────────────
    this.body = buildBossSprite(config, false);
    this.container.addChild(this.body);

    // ── HP bar ───────────────────────────────────────────────
    const barW = config.size * 4;
    this.hpBarBg = new Graphics();
    this.hpBarBg.roundRect(-barW / 2, -config.size - 28, barW, 10, 5);
    this.hpBarBg.fill({ color: 0x1f1f1f });
    this.container.addChild(this.hpBarBg);

    this.hpBarFill = new Graphics();
    this.container.addChild(this.hpBarFill);
    this.updateHPBar();

    // ── Name tag ─────────────────────────────────────────────
    this.nameplate = new Text({
      text: config.nameIT,
      style: new TextStyle({
        fontFamily: GAME_CONFIG.FONT_FAMILY,
        fontSize: 13,
        fill: config.accentColor,
        fontWeight: '700',
        dropShadow: { color: 0, blur: 4, alpha: 0.9, distance: 1 },
      }),
    });
    this.nameplate.anchor.set(0.5, 1);
    this.nameplate.y = -config.size - 32;
    this.container.addChild(this.nameplate);

    this.container.x = x;
    this.container.y = y;
  }


  private updateHPBar(): void {
    const barW = this.config.size * 4;
    const pct  = Math.max(0, this.hp / this.maxHp);
    const color = pct > 0.6 ? 0xEF4444 : pct > 0.3 ? 0xF59E0B : 0xE879F9;
    this.hpBarFill.clear();
    this.hpBarFill.roundRect(-barW / 2, -this.config.size - 28, barW * pct, 10, 5);
    this.hpBarFill.fill({ color });
  }

  update(dt: number, targetX: number, targetY: number): { specialAttack: boolean } {
    this.floatAngle += dt * 1.2;
    this.pulseAngle += dt * 3.0;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = this.isPhase2 ? this.config.speed * 1.4 : this.config.speed;

    if (dist > 2) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }

    // Float bobbing
    this.container.x = this.x;
    this.container.y = this.y + Math.sin(this.floatAngle) * 5;

    // Pulsing aura
    this.phaseAura.clear();
    const auraR = this.config.size * (1.4 + Math.sin(this.pulseAngle) * 0.15);
    const auraAlpha = this.isPhase2 ? 0.35 : 0.18;
    this.phaseAura.circle(0, 0, auraR);
    this.phaseAura.fill({ color: this.config.accentColor, alpha: auraAlpha });

    // Phase 2 trigger
    if (!this.isPhase2 && this.hp / this.maxHp <= this.config.phase2HpPercent) {
      this.isPhase2 = true;
      this.rebuildSprite(true);
    }

    // Special attack
    this.specialAttackTimer -= dt;
    const doSpecial = this.specialAttackTimer <= 0;
    if (doSpecial) {
      this.specialAttackTimer = this.isPhase2
        ? this.config.specialAttackInterval * 0.65
        : this.config.specialAttackInterval;
    }

    return { specialAttack: doSpecial };
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.isDead = true; }
    this.updateHPBar();
    this.body.tint = 0xFF6666;
    setTimeout(() => { if (this.body) this.body.tint = 0xffffff; }, 100);
  }

  get hpPercent(): number { return this.hp / this.maxHp; }
}

// Boss spawn schedule: [minute, bossType]
export const BOSS_SCHEDULE: [number, BossType][] = [
  [3,  'kisame'],
  [7,  'itachi'],
  [12, 'pain_tendo'],
  [20, 'ten_tails'],
];
