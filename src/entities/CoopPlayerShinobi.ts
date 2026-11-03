// ============================================================
//  NarutoSurvivor — Co-op Player Shinobi Entity (P2 / Remote Ally)
//  Controlled via Arrow Keys/Enter (Local Co-op) or WebRTC Sync (Online)
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { buildPlayerSprite } from '../rendering/SpriteFactory';
import type { Character } from '../types/character';
import type { Projectile } from '../systems/projectileSystem';
import { createProjectile } from '../systems/projectileSystem';
import { audioManager } from '../systems/audioManager';

export class CoopPlayerShinobi {
  readonly container: Container;
  readonly character: Character;
  private readonly spriteRoot: Container;
  private readonly aura: Graphics;
  private readonly hpBarBg: Graphics;
  private readonly hpBarFill: Graphics;
  private readonly nameplate: Text;

  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  isDead = false;
  isAwakened = false;
  isLocalControl: boolean;

  private attackCooldown = 0;
  private awakenRot = 0;
  private keysDown = new Set<string>();

  constructor(character: Character, startX: number, startY: number, isLocalControl = true) {
    this.character = character;
    this.x = startX;
    this.y = startY;
    this.isLocalControl = isLocalControl;

    this.speed = character.baseStats.movespeed * 1.05;
    this.hp = character.baseStats.hp;
    this.maxHp = character.baseStats.hp;

    this.container = new Container();
    this.container.x = startX;
    this.container.y = startY;

    // Aura
    this.aura = new Graphics();
    this.container.addChild(this.aura);

    // Sprite
    this.spriteRoot = buildPlayerSprite(character);
    this.container.addChild(this.spriteRoot);

    // Nameplate
    this.nameplate = new Text({
      text: `[P2] ${character.nameIT}`,
      style: new TextStyle({
        fontFamily: GAME_CONFIG.FONT_FAMILY,
        fontSize: 10,
        fill: 0x38BDF8,
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 3, alpha: 0.8, distance: 1 },
      }),
    });
    this.nameplate.anchor.set(0.5, 1);
    this.nameplate.y = -GAME_CONFIG.PLAYER_HITBOX_RADIUS - 16;
    this.container.addChild(this.nameplate);

    // HP Bar
    this.hpBarBg = new Graphics();
    this.hpBarBg.rect(-18, -GAME_CONFIG.PLAYER_HITBOX_RADIUS - 12, 36, 4);
    this.hpBarBg.fill({ color: 0x0F172A, alpha: 0.8 });
    this.container.addChild(this.hpBarBg);

    this.hpBarFill = new Graphics();
    this.container.addChild(this.hpBarFill);
    this.updateHPBar();

    if (this.isLocalControl) {
      window.addEventListener('keydown', (e) => this.keysDown.add(e.code));
      window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    }
  }

  update(
    dt: number,
    enemies: Array<{ x: number; y: number; isDead: boolean; takeDamage: (d: number) => void }>,
    onFireProjectile: (proj: Projectile) => void,
  ): void {
    if (this.isDead) return;

    // Local Co-op input: Arrow keys
    if (this.isLocalControl) {
      let mx = 0;
      let my = 0;
      if (this.keysDown.has('ArrowLeft') || this.keysDown.has('Numpad4')) mx -= 1;
      if (this.keysDown.has('ArrowRight') || this.keysDown.has('Numpad6')) mx += 1;
      if (this.keysDown.has('ArrowUp') || this.keysDown.has('Numpad8')) my -= 1;
      if (this.keysDown.has('ArrowDown') || this.keysDown.has('Numpad2') || this.keysDown.has('Numpad5')) my += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        const effSpeed = this.isAwakened ? this.speed * 1.45 : this.speed;
        this.x += (mx / len) * effSpeed * dt;
        this.y += (my / len) * effSpeed * dt;
        if (this.spriteRoot) this.spriteRoot.scale.x = mx < 0 ? -1 : 1;
      }

      // Local P2 Awakening (Enter / Numpad0)
      if ((this.keysDown.has('Enter') || this.keysDown.has('Numpad0')) && !this.isAwakened) {
        this.triggerAwakening();
      }
    }

    this.container.x = this.x;
    this.container.y = this.y;

    // Co-op Shinobi autonomous jutsu attack
    this.attackCooldown -= dt;
    const cdLimit = this.isAwakened ? 0.75 : 1.5;
    if (this.attackCooldown <= 0) {
      this.attackCooldown = cdLimit;
      const target = this.findNearestEnemy(enemies);
      if (target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const dmg = Math.round(this.character.baseStats.jutsudmg * (this.isAwakened ? 2.0 : 1.2));
        const proj = createProjectile(
          this.x, this.y,
          angle,
          520,
          dmg,
          this.character.assets.color,
          10,
          2,
          2.0,
          this.character.element[0] ?? 'Katon',
          this.character.jutsuSlot.nameIT,
          'Projectile',
          this.isAwakened,
        );
        onFireProjectile(proj);
        audioManager.playSFX('jutsu_fire');
      }
    }

    // Aura
    this.aura.clear();
    if (this.isAwakened) {
      this.awakenRot += dt * 5.0;
      this.aura.circle(0, 0, GAME_CONFIG.PLAYER_HITBOX_RADIUS + 10);
      this.aura.fill({ color: 0x38BDF8, alpha: 0.35 });
      this.aura.stroke({ color: 0x60A5FA, width: 2, alpha: 0.8 });
    }
  }

  takeDamage(amount: number): void {
    if (this.isAwakened || this.isDead) return;
    this.hp = Math.max(0, this.hp - Math.max(1, amount - this.character.baseStats.defense));
    this.updateHPBar();
    if (this.hp <= 0) {
      this.isDead = true;
      this.container.alpha = 0.45;
    }
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHPBar();
  }

  triggerAwakening(): void {
    this.isAwakened = true;
    audioManager.playSFX('awakening');
    setTimeout(() => {
      this.isAwakened = false;
    }, 8000);
  }

  private updateHPBar(): void {
    this.hpBarFill.clear();
    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const w = 36 * pct;
    const col = pct > 0.5 ? 0x22C55E : (pct > 0.25 ? 0xEAB308 : 0xEF4444);
    this.hpBarFill.rect(-18, -GAME_CONFIG.PLAYER_HITBOX_RADIUS - 12, w, 4);
    this.hpBarFill.fill({ color: col });
  }

  private findNearestEnemy(enemies: Array<{ x: number; y: number; isDead: boolean }>): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let minDist = 480;
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }
}
