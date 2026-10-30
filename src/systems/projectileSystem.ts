import { Container, Graphics } from 'pixi.js';
import type { Enemy } from '../entities/entities';
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
): Projectile {
  const { container, update } = buildJutsuGraphic({
    element,
    behavior,
    name: jutsuName,
    color,
    radius,
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
    onEnemyHit: (enemy: Enemy, damage: number) => void,
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

      // Check hits
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        if (proj.hitEnemyIds.has(enemy.id)) continue;
        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < proj.radius + enemy.config.size) {
          onEnemyHit(enemy, proj.damage);
          proj.hitEnemyIds.add(enemy.id);
          proj.piercing--;
          if (proj.piercing <= 0) { proj.expired = true; break; }
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
  }
}
