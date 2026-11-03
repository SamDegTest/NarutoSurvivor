import { Container, Graphics } from 'pixi.js';
import type { Enemy } from '../entities/entities';
import type { DestructibleObject } from '../entities/DestructibleObject';
import { buildJutsuGraphic } from '../rendering/JutsuVFXFactory';
import type { ElementalAffinity, JutsuBehavior } from '../types/character';

// ============================================================
//  NarutoSurvivor — Jutsu Projectile System
// ============================================================

export interface Projectile {
  container: Container;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  piercing: number;        // how many enemies it can hit
  lifetime: number;        // seconds remaining
  color: number;
  hitEnemyIds: Set<number>;
  expired: boolean;
  updateVisual?: (dt: number) => void;
  isPlus?: boolean;
}

export function createProjectile(
  x: number, y: number,
  angle: number,
  speed: number,
  damage: number,
  color: number,
  radius = 8,
  piercing = 1,
  lifetime = 2.0,
  element: ElementalAffinity = 'None',
  jutsuName = '',
  behavior: JutsuBehavior = 'Projectile',
  isPlus = false,
): Projectile {
  const { container, update } = buildJutsuGraphic({
    element,
    behavior,
    name: jutsuName,
    color,
    radius,
    isPlus,
  });

  container.x = x;
  container.y = y;
  container.rotation = angle;

  return {
    container, x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, radius, piercing, lifetime,
    color, hitEnemyIds: new Set(),
    expired: false,
    updateVisual: update,
    isPlus,
  };
}

/**
 * Creates an orbital set of projectiles (Kage Bunshin behavior).
 */
export function createOrbitalProjectiles(
  _cx: number, _cy: number,
  count: number,
  damage: number,
  color: number,
): OrbitalProjectile[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2,
    orbitRadius: 55,
    orbitSpeed:  1.8, // rad/sec
    damage,
    color,
    hitCooldowns: new Map<number, number>(),
    container: new Container(),
  }));
}

export interface OrbitalProjectile {
  angle: number;
  orbitRadius: number;
  orbitSpeed: number;
  damage: number;
  color: number;
  hitCooldowns: Map<number, number>; // enemyId → cooldown remaining
  container: Container;
}

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private orbitals: OrbitalProjectile[] = [];
  readonly stage: Container;

  constructor(parentStage: Container) {
    this.stage = new Container();
    parentStage.addChild(this.stage);
  }

  fireProjectile(proj: Projectile): void {
    this.projectiles.push(proj);
    this.stage.addChild(proj.container);
  }

  setOrbitals(orbs: OrbitalProjectile[]): void {
    this.orbitals.forEach(o => this.stage.removeChild(o.container));
    this.orbitals = orbs;
    orbs.forEach(o => {
      const g = new Graphics();
      g.circle(0, 0, 10);
      g.fill({ color: o.color });
      g.circle(0, 0, 15);
      g.fill({ color: o.color, alpha: 0.2 });
      o.container.addChild(g);
      this.stage.addChild(o.container);
    });
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: Enemy[],
    onEnemyHit: (enemy: Enemy, damage: number, isPlus?: boolean) => void,
    destructibles?: DestructibleObject[],
    onDestructibleHit?: (d: DestructibleObject, damage: number) => void,
  ): void {
    // Update linear projectiles
    for (const proj of this.projectiles) {
      if (proj.expired) continue;

      proj.lifetime -= dt;
      if (proj.lifetime <= 0) { proj.expired = true; continue; }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.container.x = proj.x;
      proj.container.y = proj.y;
      proj.updateVisual?.(dt);

      // Check hits on enemies
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        if (proj.hitEnemyIds.has(enemy.id)) continue;
        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < proj.radius + enemy.config.size) {
          onEnemyHit(enemy, proj.damage, proj.isPlus);
          proj.hitEnemyIds.add(enemy.id);
          proj.piercing--;
          if (proj.piercing <= 0) { proj.expired = true; break; }
        }
      }

      // Check hits on destructible world objects (crates, training posts)
      if (!proj.expired && destructibles && onDestructibleHit) {
        for (const d of destructibles) {
          if (d.isBroken) continue;
          if (proj.hitEnemyIds.has(-d.id)) continue;
          const dist = Math.hypot(proj.x - d.x, proj.y - d.y);
          if (dist < proj.radius + d.radius) {
            proj.hitEnemyIds.add(-d.id);
            onDestructibleHit(d, proj.damage);
            proj.piercing--;
            if (proj.piercing <= 0) { proj.expired = true; break; }
          }
        }
      }
    }

    // Update orbital projectiles
    for (const orb of this.orbitals) {
      orb.angle += orb.orbitSpeed * dt;
      const ox = playerX + Math.cos(orb.angle) * orb.orbitRadius;
      const oy = playerY + Math.sin(orb.angle) * orb.orbitRadius;
      orb.container.x = ox;
      orb.container.y = oy;

      // Cooldown tick
      orb.hitCooldowns.forEach((cd, id) => {
        const next = cd - dt;
        if (next <= 0) orb.hitCooldowns.delete(id);
        else orb.hitCooldowns.set(id, next);
      });

      // Check orbital hits
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        if (orb.hitCooldowns.has(enemy.id)) continue;
        const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
        if (dist < 14 + enemy.config.size) {
          onEnemyHit(enemy, orb.damage);
          orb.hitCooldowns.set(enemy.id, 0.35);
        }
      }
    }

      // Clean up expired projectiles
    this.projectiles = this.projectiles.filter(p => {
      if (p.expired) { this.stage.removeChild(p.container); return false; }
      return true;
    });

    // Update enemy projectiles
    this.enemyProjectiles = this.enemyProjectiles.filter(ep => {
      if (ep.expired) {
        this.stage.removeChild(ep.container);
        return false;
      }
      ep.lifetime -= dt;
      if (ep.lifetime <= 0) {
        ep.expired = true;
        this.stage.removeChild(ep.container);
        return false;
      }

      ep.x += ep.vx * dt;
      ep.y += ep.vy * dt;
      ep.container.x = ep.x;
      ep.container.y = ep.y;
      ep.updateVisual?.(dt);

      // Hit check against player
      const dist = Math.hypot(ep.x - playerX, ep.y - playerY);
      if (dist < ep.radius + 14) { // Player hitbox radius ~14
        ep.expired = true;
        this.stage.removeChild(ep.container);
        if (this.onPlayerHitCallback) {
          this.onPlayerHitCallback(ep.damage);
        }
        return false;
      }
      return true;
    });
  }

  private enemyProjectiles: EnemyProjectile[] = [];
  private onPlayerHitCallback?: (damage: number) => void;

  setOnPlayerHit(cb: (damage: number) => void): void {
    this.onPlayerHitCallback = cb;
  }

  fireEnemyProjectile(
    x: number, y: number,
    angle: number,
    speed: number,
    damage: number,
    type: EnemyProjectileType = 'kunai',
  ): void {
    const proj = createEnemyProjectile(x, y, angle, speed, damage, type);
    this.enemyProjectiles.push(proj);
    this.stage.addChild(proj.container);
  }
}

export type EnemyProjectileType = 'kunai' | 'shuriken' | 'water_shark' | 'fireball' | 'chakra_rod';

export interface EnemyProjectile {
  container: Container;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifetime: number;
  expired: boolean;
  type: EnemyProjectileType;
  updateVisual?: (dt: number) => void;
}

export function createEnemyProjectile(
  x: number, y: number,
  angle: number,
  speed: number,
  damage: number,
  type: EnemyProjectileType,
): EnemyProjectile {
  const container = new Container();
  container.x = x;
  container.y = y;
  container.rotation = angle;

  const g = new Graphics();
  let radius = 7;
  let lifetime = 4.0;
  let updateVisual: ((dt: number) => void) | undefined;

  if (type === 'shuriken') {
    radius = 8;
    g.circle(0, 0, 8);
    g.fill({ color: 0x64748B, alpha: 0.3 });
    // 4 points
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      g.poly([
        cos * 10, sin * 10,
        Math.cos(a + 0.35) * 4, Math.sin(a + 0.35) * 4,
        0, 0,
        Math.cos(a - 0.35) * 4, Math.sin(a - 0.35) * 4,
      ], true);
      g.fill({ color: 0xE2E8F0 });
    }
    g.circle(0, 0, 2);
    g.fill({ color: 0x0F172A });
    updateVisual = (dt: number) => {
      container.rotation += dt * 14;
    };
  } else if (type === 'kunai') {
    radius = 6;
    // Blade
    g.poly([10, 0, -2, -3.5, -2, 3.5], true);
    g.fill({ color: 0xCBD5E1 });
    // Handle
    g.rect(-7, -1.5, 5, 3);
    g.fill({ color: 0x475569 });
    // Ring
    g.circle(-9, 0, 2.5);
    g.stroke({ color: 0x334155, width: 1.2 });
  } else if (type === 'water_shark') {
    radius = 12;
    // Water shark body
    g.ellipse(0, 0, 16, 7);
    g.fill({ color: 0x0284C7, alpha: 0.85 });
    g.ellipse(-4, 0, 12, 5);
    g.fill({ color: 0x38BDF8, alpha: 0.9 });
    // Fin
    g.poly([2, -6, -4, -13, -2, -6], true);
    g.fill({ color: 0x0369A1 });
    // Tail
    g.poly([-14, 0, -22, -8, -19, 0, -22, 8], true);
    g.fill({ color: 0x0284C7 });
    updateVisual = () => {
      g.alpha = 0.8 + Math.sin(Date.now() / 80) * 0.2;
    };
  } else if (type === 'fireball') {
    radius = 11;
    g.circle(0, 0, 14);
    g.fill({ color: 0xEF4444, alpha: 0.35 });
    g.circle(0, 0, 10);
    g.fill({ color: 0xF97316 });
    g.circle(2, 0, 6);
    g.fill({ color: 0xFDE047 });
    updateVisual = (dt: number) => {
      container.rotation += dt * 5;
    };
  } else if (type === 'chakra_rod') {
    radius = 5;
    // Black receiver rod
    g.rect(-12, -2, 24, 4);
    g.fill({ color: 0x09090B });
    g.stroke({ color: 0x701A75, width: 1 });
    g.poly([12, -2, 17, 0, 12, 2], true);
    g.fill({ color: 0x09090B });
  }

  container.addChild(g);

  return {
    container,
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    radius,
    lifetime,
    expired: false,
    type,
    updateVisual,
  };
}
