// ============================================================
//  NarutoSurvivor — Canonical Jutsu VFX & Projectile Graphics
//  Renders distinct animated pixel-art jutsu shapes for each element
// ============================================================

import { Container, Graphics } from 'pixi.js';
import type { ElementalAffinity, JutsuBehavior } from '../types/character';

export interface JutsuVisualConfig {
  element: ElementalAffinity;
  behavior: JutsuBehavior;
  name: string;
  color: number;
  radius: number;
}

export function buildJutsuGraphic(config: JutsuVisualConfig): { container: Container; update?: (dt: number) => void } {
  const container = new Container();
  const g = new Graphics();
  container.addChild(g);

  const normName = config.name.toLowerCase();
  const elem = config.element;
  const r = config.radius;
  const c = config.color;

  let animTime = 0;

  // ── 1. RASENGAN & VARIANTI (Sfera rotante con spirale di chakra) ──
  if (normName.includes('rasen') || normName.includes('spirale')) {
    const isRasenshuriken = normName.includes('shuriken') || normName.includes('fūton');

    const drawRasengan = (time: number) => {
      g.clear();

      // Outer aura
      g.circle(0, 0, r + 7);
      g.fill({ color: 0x38BDF8, alpha: 0.25 });

      // Spinning wind blades if Rasenshuriken
      if (isRasenshuriken) {
        for (let i = 0; i < 4; i++) {
          const bladeAngle = time * 8 + (i * Math.PI) / 2;
          const bx = Math.cos(bladeAngle) * (r + 14);
          const by = Math.sin(bladeAngle) * (r + 14);
          const p1x = Math.cos(bladeAngle + 0.4) * (r + 4);
          const p1y = Math.sin(bladeAngle + 0.4) * (r + 4);
          const p2x = Math.cos(bladeAngle - 0.4) * (r + 4);
          const p2y = Math.sin(bladeAngle - 0.4) * (r + 4);

          g.poly([bx, by, p1x, p1y, p2x, p2y], true);
          g.fill({ color: 0xE0F2FE, alpha: 0.85 });
        }
      }

      // Main core
      g.circle(0, 0, r);
      g.fill({ color: 0x0284C7 });

      // Internal vortex lines
      for (let i = 0; i < 3; i++) {
        const spiralAngle = -time * 12 + (i * Math.PI * 2) / 3;
        const sx = Math.cos(spiralAngle) * (r * 0.55);
        const sy = Math.sin(spiralAngle) * (r * 0.55);
        g.circle(sx, sy, r * 0.35);
        g.fill({ color: 0xBAE6FD, alpha: 0.7 });
      }

      // Bright white core
      g.circle(0, 0, r * 0.35);
      g.fill({ color: 0xffffff });
    };

    drawRasengan(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawRasengan(animTime);
      },
    };
  }

  // ── 2. CHIDORI / RAIKIRI / RAITON (Fulmine crepitante spezzato) ──
  if (elem === 'Raiton' || normName.includes('chidori') || normName.includes('raikiri') || normName.includes('fulmine')) {
    const drawChidori = (time: number) => {
      g.clear();

      // Electric glow
      g.circle(0, 0, r + 6);
      g.fill({ color: 0x60A5FA, alpha: 0.3 });

      // Core electric sphere
      g.circle(0, 0, r * 0.8);
      g.fill({ color: 0x93C5FD });

      // Lightning arcs
      for (let i = 0; i < 4; i++) {
        const baseA = (i * Math.PI) / 2 + Math.sin(time * 20 + i) * 0.5;
        const x1 = Math.cos(baseA) * (r * 0.6);
        const y1 = Math.sin(baseA) * (r * 0.6);
        const x2 = Math.cos(baseA + 0.3) * (r * 1.5 + Math.sin(time * 30 + i) * 4);
        const y2 = Math.sin(baseA + 0.3) * (r * 1.5 + Math.sin(time * 30 + i) * 4);
        const x3 = Math.cos(baseA) * (r * 2.0);
        const y3 = Math.sin(baseA) * (r * 2.0);

        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.lineTo(x3, y3);
        g.stroke({ color: 0xffffff, width: 2 });
      }

      // White center
      g.circle(0, 0, r * 0.4);
      g.fill({ color: 0xffffff });
    };

    drawChidori(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawChidori(animTime);
      },
    };
  }

  // ── 3. KATON (Palla di fuoco incandescente con fiamma) ──
  if (elem === 'Katon' || normName.includes('fuoco') || normName.includes('gōkakyū') || normName.includes('hōsenka')) {
    const drawKaton = (time: number) => {
      g.clear();

      // Flame heat aura
      g.circle(0, 0, r + 6);
      g.fill({ color: 0xEF4444, alpha: 0.35 });

      // Outer fireball
      g.circle(0, 0, r + 2);
      g.fill({ color: 0xF97316 });

      // Trailing micro flames
      for (let i = 0; i < 3; i++) {
        const offsetA = Math.PI + (i - 1) * 0.5 + Math.sin(time * 15 + i) * 0.2;
        const fx = Math.cos(offsetA) * (r * 1.4);
        const fy = Math.sin(offsetA) * (r * 1.4);
        g.circle(fx, fy, r * 0.5);
        g.fill({ color: 0xEA580C, alpha: 0.6 });
      }

      // Yellow fiery center
      g.circle(0, 0, r * 0.6);
      g.fill({ color: 0xFDE047 });

      // Core spark
      g.circle(0, 0, r * 0.28);
      g.fill({ color: 0xffffff });
    };

    drawKaton(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawKaton(animTime);
      },
    };
  }

  // ── 4. SHURIKEN & KUNAI & LAME (Rotanti metalliche) ──
  if (normName.includes('shuriken') || normName.includes('kunai') || normName.includes('hiraishin')) {
    const drawNinjaTool = (time: number) => {
      g.clear();
      const rot = time * 16;

      // 4-pointed shuriken
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        const pTipX = Math.cos(a) * (r + 6);
        const pTipY = Math.sin(a) * (r + 6);
        const p1X = Math.cos(a + 0.35) * (r * 0.45);
        const p1Y = Math.sin(a + 0.35) * (r * 0.45);
        const p2X = Math.cos(a - 0.35) * (r * 0.45);
        const p2Y = Math.sin(a - 0.35) * (r * 0.45);

        g.poly([pTipX, pTipY, p1X, p1Y, p2X, p2Y], true);
        g.fill({ color: 0x94A3B8 });
      }

      // Center ring
      g.circle(0, 0, r * 0.35);
      g.fill({ color: 0x1E293B });
      g.circle(0, 0, r * 0.15);
      g.fill({ color: 0xffffff });
    };

    drawNinjaTool(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawNinjaTool(animTime);
      },
    };
  }

  // ── 5. SUITON (Sfere d'acqua e siluri idraulici) ──
  if (elem === 'Suiton' || normName.includes('acqua') || normName.includes('suiryūdan')) {
    const drawSuiton = (time: number) => {
      g.clear();
      g.circle(0, 0, r + 5);
      g.fill({ color: 0x0284C7, alpha: 0.3 });

      // Water droplet body
      g.circle(0, 0, r);
      g.fill({ color: 0x38BDF8 });

      // Fluid specular shine
      const shineOffset = Math.sin(time * 6) * (r * 0.2);
      g.circle(-r * 0.3 + shineOffset, -r * 0.3, r * 0.3);
      g.fill({ color: 0xffffff, alpha: 0.75 });
    };

    drawSuiton(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawSuiton(animTime);
      },
    };
  }

  // ── 6. DOTON & SABBIA (Massi di roccia e piramidi) ──
  if (elem === 'Doton' || normName.includes('sabaku') || normName.includes('sabbia') || normName.includes('roccia')) {
    // Jagged polygonal boulder
    g.circle(0, 0, r + 4);
    g.fill({ color: c, alpha: 0.25 });

    const points = [
      0, -r * 1.2,
      r * 1.1, -r * 0.4,
      r * 0.8, r * 1.0,
      -r * 0.7, r * 1.1,
      -r * 1.1, -r * 0.3,
    ];
    g.poly(points, true);
    g.fill({ color: c });

    // Inner rock texture lines
    g.moveTo(-r * 0.4, -r * 0.5);
    g.lineTo(r * 0.2, r * 0.3);
    g.stroke({ color: 0x1C1917, width: 2 });

    return { container };
  }

  // ── 7. DEFAULT STYLIZED ENERGY PROJECTILE (Yin, Yang, SixPaths, Generici) ──
  g.circle(0, 0, r + 6);
  g.fill({ color: c, alpha: 0.3 });

  g.circle(0, 0, r);
  g.fill({ color: c });

  g.circle(-r * 0.25, -r * 0.25, r * 0.4);
  g.fill({ color: 0xffffff, alpha: 0.8 });

  return { container };
}
