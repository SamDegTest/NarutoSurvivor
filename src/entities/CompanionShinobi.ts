// ============================================================
//  NarutoSurvivor — Allied Companion Shinobi Entity
//  Fights alongside the player, casts support jutsu and heals
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { buildPlayerSprite } from '../rendering/SpriteFactory';
import { createProjectile, type Projectile } from '../systems/projectileSystem';
import { audioManager } from '../systems/audioManager';
import type { Character } from '../types/character';
import type { Enemy } from './entities';
import type { Boss } from './bosses';

const FONT = GAME_CONFIG.FONT_FAMILY;

export class CompanionShinobi {
  readonly container: Container;
  readonly character: Character;
  private readonly spriteRoot: Container;
  private readonly aura: Graphics;
  private readonly nameplate: Text;

  x = 0;
  y = 0;
  private attackCooldown = 2.4;
  private followOffsetAngle = Math.PI * 0.75;
  private followDistance = 65;

  constructor(character: Character, startX: number, startY: number) {
    this.character = character;
    this.x = startX - 45;
    this.y = startY + 45;

    this.container = new Container();

    // Friendly green/cyan aura
    this.aura = new Graphics();
    this.aura.circle(0, 0, 18);
    this.aura.fill({ color: 0x34D399, alpha: 0.25 });
    this.aura.stroke({ color: 0x10B981, width: 1.5, alpha: 0.8 });
    this.container.addChild(this.aura);

    // Sprite
    this.spriteRoot = buildPlayerSprite(character);
    this.container.addChild(this.spriteRoot);

    // Name tag
    this.nameplate = new Text({
      text: `🤝 ${character.nameIT}`,
      style: new TextStyle({
        fontFamily: FONT,
        fontSize: 10,
        fill: 0x34D399,
        fontWeight: '700',
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 3, distance: 1 },
      }),
    });
    this.nameplate.anchor.set(0.5, 1);
    this.nameplate.y = -22;
    this.container.addChild(this.nameplate);

    this.container.x = this.x;
    this.container.y = this.y;
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: (Enemy | Boss)[],
    onFireProjectile: (proj: Projectile) => void,
    onHealPlayer?: (amount: number) => void,
  ): void {
    // 1. Follow player smoothly
    const targetX = playerX + Math.cos(this.followOffsetAngle) * this.followDistance;
    const targetY = playerY + Math.sin(this.followOffsetAngle) * this.followDistance;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    const speed = Math.max(120, dist * 3.5);
    if (dist > 4) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
      if (this.spriteRoot) {
        this.spriteRoot.scale.x = dx < 0 ? -1 : 1;
      }
    }

    this.container.x = this.x;
    this.container.y = this.y;

    // Pulse aura
    this.aura.alpha = 0.2 + Math.sin(Date.now() / 300) * 0.1;

    // 2. Attack / Support Cooldown
    this.attackCooldown -= dt;
    if (this.attackCooldown <= 0) {
      this.attackCooldown = 2.6 + Math.random() * 0.6;
      this.performSupportAction(enemies, onFireProjectile, onHealPlayer);
    }
  }

  private performSupportAction(
    enemies: (Enemy | Boss)[],
    onFireProjectile: (proj: Projectile) => void,
    onHealPlayer?: (amount: number) => void,
  ): void {
    const isMedical = this.character.id.includes('sakura') || this.character.id.includes('tsunade') || this.character.id.includes('shizune');

    if (isMedical && onHealPlayer) {
      onHealPlayer(25);
      audioManager.playSFX('collect_orb');
      // Healing ring effect
      const ring = new Graphics();
      ring.circle(0, 0, 30);
      ring.fill({ color: 0x34D399, alpha: 0.45 });
      this.container.addChild(ring);
      setTimeout(() => {
        if (ring.parent) ring.parent.removeChild(ring);
      }, 350);
      return;
    }

    // Find nearest enemy
    let nearest: Enemy | Boss | null = null;
    let minDist = 420;
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    if (!nearest) return;

    const angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
    const jutsu = this.character.jutsuSlot;
    const dmg = Math.round(35 * (jutsu.baseDmgCoeff || 1.2));

    const proj = createProjectile(
      this.x,
      this.y,
      angle,
      620,
      dmg,
      this.character.assets.color,
      9,
      2,
      1.5,
      jutsu.element,
      `🤝 ${jutsu.nameIT}`,
      jutsu.behavior,
      false,
    );

    onFireProjectile(proj);
    audioManager.playSFX('jutsu_beam');
  }
}
