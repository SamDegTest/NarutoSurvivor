import { Container, Graphics } from 'pixi.js';

// ============================================================
//  NarutoSurvivor — VFX Particle System
//  Pooled particles for: enemy death, chakra collect, hit flash,
//  chakra burst, level-up aura, boss death explosion
// ============================================================

interface Particle {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0…1, decreases to 0
  maxLife: number;    // starting life value
  startRadius: number;
  endRadius: number;
  color: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  trail: boolean;     // leave ghost behind
  shape: 'circle' | 'rect' | 'star';
  gravity: number;    // downward acceleration
}

// Pool constants
const POOL_SIZE = 500;

export class ParticleSystem {
  private readonly layer: Container;
  private readonly pool: Particle[] = [];
  private readonly active: Particle[] = [];

  constructor(layer: Container) {
    this.layer = layer;
    // Pre-allocate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = new Graphics();
      this.pool.push(this.makeParticle(g));
    }
  }

  // ── Pool management ───────────────────────────────────────

  private makeParticle(g: Graphics): Particle {
    g.visible = false;
    return {
      g, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      startRadius: 4, endRadius: 0,
      color: 0xffffff, alpha: 1,
      rotation: 0, rotSpeed: 0,
      trail: false, shape: 'circle', gravity: 0,
    };
  }

  private acquire(): Particle | null {
    const p = this.pool.pop();
    if (!p) return null; // pool exhausted
    p.g.visible = true;
    this.layer.addChild(p.g);
    this.active.push(p);
    return p;
  }

  private release(p: Particle): void {
    p.g.visible = false;
    this.layer.removeChild(p.g);
    const idx = this.active.indexOf(p);
    if (idx >= 0) this.active.splice(idx, 1);
    this.pool.push(p);
  }

  // ── Tick ─────────────────────────────────────────────────

  update(dt: number): void {
    const toRelease: Particle[] = [];

    for (const p of this.active) {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) { toRelease.push(p); continue; }

      // Physics
      p.vy += p.gravity * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.rotation += p.rotSpeed * dt;

      // Render
      const t = 1 - p.life; // 0=born, 1=dead
      const r = p.startRadius + (p.endRadius - p.startRadius) * t;
      const a = p.alpha * p.life; // fade out

      p.g.clear();
      p.g.x = p.x;
      p.g.y = p.y;
      p.g.rotation = p.rotation;

      switch (p.shape) {
        case 'circle':
          p.g.circle(0, 0, Math.max(0.5, r));
          p.g.fill({ color: p.color, alpha: a });
          break;
        case 'rect':
          p.g.rect(-r, -r * 0.5, r * 2, r);
          p.g.fill({ color: p.color, alpha: a });
          break;
        case 'star':
          drawStar(p.g, 0, 0, r * 0.5, r, 5);
          p.g.fill({ color: p.color, alpha: a });
          break;
      }
    }

    for (const p of toRelease) this.release(p);
  }

  // ═══════════════════════════════════════════════════════════
  //  Emitter helpers
  // ═══════════════════════════════════════════════════════════

  /** Enemy killed — burst of color shards */
  emitEnemyDeath(x: number, y: number, color: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 160;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1; p.maxLife = 0.5 + Math.random() * 0.4;
      p.startRadius = 3 + Math.random() * 4;
      p.endRadius = 0;
      p.color = color; p.alpha = 0.9;
      p.gravity = 200;
      p.shape = i % 3 === 0 ? 'rect' : 'circle';
      p.rotSpeed = (Math.random() - 0.5) * 6;
    }

    // Central flash
    const flash = this.acquire(); if (flash) {
      flash.x = x; flash.y = y;
      flash.vx = 0; flash.vy = 0;
      flash.life = 1; flash.maxLife = 0.25;
      flash.startRadius = 22; flash.endRadius = 4;
      flash.color = 0xffffff; flash.alpha = 0.7;
      flash.gravity = 0; flash.shape = 'circle';
    }
  }

  /** Boss killed — massive explosion */
  emitBossDeath(x: number, y: number, color: number, accentColor: number): void {
    // Shockwave ring (growing circle)
    for (let ring = 0; ring < 3; ring++) {
      const p = this.acquire(); if (!p) continue;
      p.x = x; p.y = y; p.vx = 0; p.vy = 0;
      p.life = 1; p.maxLife = 0.4 + ring * 0.15;
      p.startRadius = 10 + ring * 20; p.endRadius = 100 + ring * 80;
      p.color = ring % 2 === 0 ? color : accentColor; p.alpha = 0.6 - ring * 0.1;
      p.gravity = 0; p.shape = 'circle';
    }
    // Debris shards
    for (let i = 0; i < 30; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      p.x = x + (Math.random() - 0.5) * 30;
      p.y = y + (Math.random() - 0.5) * 30;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 80;
      p.life = 1; p.maxLife = 0.6 + Math.random() * 0.6;
      p.startRadius = 4 + Math.random() * 8; p.endRadius = 0;
      p.color = i % 3 === 0 ? 0xffffff : i % 3 === 1 ? color : accentColor;
      p.alpha = 1; p.gravity = 350;
      p.shape = Math.random() < 0.4 ? 'rect' : 'circle';
      p.rotSpeed = (Math.random() - 0.5) * 10;
    }
    // Stars
    for (let i = 0; i < 10; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
      p.life = 1; p.maxLife = 0.8 + Math.random() * 0.5;
      p.startRadius = 6 + Math.random() * 8; p.endRadius = 0;
      p.color = accentColor; p.alpha = 0.9;
      p.gravity = 80; p.shape = 'star';
      p.rotSpeed = (Math.random() - 0.5) * 8;
    }
  }

  /** Chakra orb collected — cyan sparkle burst */
  emitChakraCollect(x: number, y: number, value: number): void {
    const count = Math.min(8, 4 + Math.floor(value / 20));
    for (let i = 0; i < count; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = (i / count) * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 60;
      p.life = 1; p.maxLife = 0.35 + Math.random() * 0.25;
      p.startRadius = 3 + Math.random() * 3; p.endRadius = 0;
      p.color = i % 2 === 0 ? 0x22D3EE : 0xE0F2FE; p.alpha = 0.85;
      p.gravity = -30; p.shape = i % 2 === 0 ? 'star' : 'circle';
      p.rotSpeed = (Math.random() - 0.5) * 5;
    }
  }

  /** Ryo coin collected — gold coin splash */
  emitRyoCollect(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 50 + Math.random() * 100;
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
      p.life = 1; p.maxLife = 0.4 + Math.random() * 0.2;
      p.startRadius = 4 + Math.random() * 3; p.endRadius = 0;
      p.color = i % 2 === 0 ? 0xFBBF24 : 0xFDE68A; p.alpha = 0.9;
      p.gravity = 180; p.shape = 'circle';
    }
  }

  /** Player hit flash */
  emitPlayerHit(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      p.x = x + (Math.random() - 0.5) * 20;
      p.y = y + (Math.random() - 0.5) * 20;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
      p.life = 1; p.maxLife = 0.25;
      p.startRadius = 5; p.endRadius = 0;
      p.color = 0xEF4444; p.alpha = 0.8;
      p.gravity = 0; p.shape = 'circle';
    }
  }

  /** Level-up celestial aura */
  emitLevelUp(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = (i / 20) * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 120;
      p.life = 1; p.maxLife = 0.8 + Math.random() * 0.5;
      p.startRadius = 4 + Math.random() * 5; p.endRadius = 0;
      p.color = i % 3 === 0 ? 0xFBBF24 : i % 3 === 1 ? 0xA78BFA : 0x22D3EE;
      p.alpha = 0.9; p.gravity = 60; p.shape = 'star';
      p.rotSpeed = (Math.random() - 0.5) * 8;
    }
  }

  /** Jutsu hit impact spark */
  emitJutsuImpact(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
      p.life = 1; p.maxLife = 0.2 + Math.random() * 0.2;
      p.startRadius = 3 + Math.random() * 4; p.endRadius = 0;
      p.color = i % 2 === 0 ? color : 0xffffff; p.alpha = 0.85;
      p.gravity = 0; p.shape = 'rect';
      p.rotSpeed = (Math.random() - 0.5) * 12;
    }
  }

  /** Promotion (rank up) — golden shower */
  emitPromotion(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      p.x = x + (Math.random() - 0.5) * 60;
      p.y = y + (Math.random() - 0.5) * 60;
      p.vx = Math.cos(angle) * speed * 0.4; p.vy = -speed;
      p.life = 1; p.maxLife = 0.7 + Math.random() * 0.8;
      p.startRadius = 3 + Math.random() * 7; p.endRadius = 0;
      p.color = i % 2 === 0 ? 0xFBBF24 : 0xFEF3C7; p.alpha = 1;
      p.gravity = 180; p.shape = 'star';
      p.rotSpeed = (Math.random() - 0.5) * 6;
    }
  }

  /** Ninja substitution / enemy puff of smoke on death */
  emitNinjaSmoke(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const p = this.acquire(); if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 70;
      p.x = x + (Math.random() - 0.5) * 16;
      p.y = y + (Math.random() - 0.5) * 16;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 15;
      p.life = 1;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.startRadius = 7 + Math.random() * 8;
      p.endRadius = 14 + Math.random() * 10;
      p.color = i % 3 === 0 ? 0xF3F4F6 : (i % 3 === 1 ? 0xE5E7EB : 0xD1D5DB);
      p.alpha = 0.85;
      p.gravity = -20; // slow upward drift
      p.shape = 'circle';
      p.rotSpeed = 0;
    }
  }
}

// ── Star shape helper ────────────────────────────────────────
function drawStar(g: Graphics, cx: number, cy: number, innerR: number, outerR: number, points: number): void {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  g.poly(pts);
}
