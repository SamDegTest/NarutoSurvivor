// ============================================================
//  NarutoSurvivor — Canonical Jutsu VFX & Projectile Graphics
//  Renders distinct animated pixel-art jutsu shapes for each element
//  Includes radiant glowing visual effects for Plus (+) evolutions
// ============================================================

import { Container, Graphics } from 'pixi.js';
import type { ElementalAffinity, JutsuBehavior } from '../types/character';

export interface JutsuVisualConfig {
  element: ElementalAffinity;
  behavior: JutsuBehavior;
  name: string;
  color: number;
  radius: number;
  isPlus?: boolean;
}

function drawPlusAura(g: Graphics, r: number, time: number) {
  const pulse = Math.sin(time * 8) * 3;
  // Radiant pulsating golden crown
  g.circle(0, 0, r + 9 + pulse);
  g.fill({ color: 0xFDE047, alpha: 0.25 });

  g.circle(0, 0, r + 4);
  g.stroke({ color: 0xF59E0B, width: 2.2, alpha: 0.90 });

  // Rotating solar rays / golden star points
  for (let i = 0; i < 4; i++) {
    const a = time * 5 + (i * Math.PI) / 2;
    const rayDist = r + 8 + pulse;
    const rx = Math.cos(a) * rayDist;
    const ry = Math.sin(a) * rayDist;
    g.circle(rx, ry, 2.5);
    g.fill({ color: 0xFFFBEB });
  }
}

export function buildJutsuGraphic(config: JutsuVisualConfig): { container: Container; update?: (dt: number) => void } {
  const container = new Container();
  const g = new Graphics();
  container.addChild(g);

  const normName = config.name.toLowerCase();
  const elem = config.element;
  const isPlus = !!config.isPlus;
  const r = isPlus ? config.radius * 1.35 : config.radius;
  const c = config.color;

  let animTime = 0;

  // ── 1. RASENGAN & VARIANTI (Sfera rotante con spirale di chakra) ──
  if (normName.includes('rasen') || normName.includes('spirale')) {
    const isRasenshuriken = normName.includes('shuriken') || normName.includes('fūton');

    const drawRasengan = (time: number) => {
      g.clear();

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      // Outer aura
      g.circle(0, 0, r + 7);
      g.fill({ color: isPlus ? 0xFDE047 : 0x38BDF8, alpha: isPlus ? 0.40 : 0.25 });

      // Spinning wind blades if Rasenshuriken
      if (isRasenshuriken) {
        const bladeCount = isPlus ? 6 : 4;
        for (let i = 0; i < bladeCount; i++) {
          const bladeAngle = time * (isPlus ? 12 : 8) + (i * Math.PI * 2) / bladeCount;
          const bladeLen = isPlus ? r + 20 : r + 14;
          const bx = Math.cos(bladeAngle) * bladeLen;
          const by = Math.sin(bladeAngle) * bladeLen;
          const p1x = Math.cos(bladeAngle + 0.35) * (r + 4);
          const p1y = Math.sin(bladeAngle + 0.35) * (r + 4);
          const p2x = Math.cos(bladeAngle - 0.35) * (r + 4);
          const p2y = Math.sin(bladeAngle - 0.35) * (r + 4);

          g.poly([bx, by, p1x, p1y, p2x, p2y], true);
          g.fill({ color: isPlus ? 0xFEF08A : 0xE0F2FE, alpha: 0.90 });
        }
      }

      // Main core
      g.circle(0, 0, r);
      g.fill({ color: isPlus ? 0x0369A1 : 0x0284C7 });

      // Internal vortex lines
      const spiralCount = isPlus ? 5 : 3;
      for (let i = 0; i < spiralCount; i++) {
        const spiralAngle = -time * 14 + (i * Math.PI * 2) / spiralCount;
        const sx = Math.cos(spiralAngle) * (r * 0.55);
        const sy = Math.sin(spiralAngle) * (r * 0.55);
        g.circle(sx, sy, r * 0.35);
        g.fill({ color: isPlus ? 0xFEF08A : 0xBAE6FD, alpha: 0.75 });
      }

      // Bright white core
      g.circle(0, 0, r * 0.38);
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

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      // Electric glow
      g.circle(0, 0, r + 6);
      g.fill({ color: isPlus ? 0xFBBF24 : 0x60A5FA, alpha: 0.35 });

      // Core electric sphere
      g.circle(0, 0, r * 0.8);
      g.fill({ color: isPlus ? 0xA5B4FC : 0x93C5FD });

      // Lightning arcs
      const arcCount = isPlus ? 6 : 4;
      for (let i = 0; i < arcCount; i++) {
        const baseA = (i * Math.PI * 2) / arcCount + Math.sin(time * 25 + i) * 0.5;
        const x1 = Math.cos(baseA) * (r * 0.6);
        const y1 = Math.sin(baseA) * (r * 0.6);
        const reach = isPlus ? r * 2.5 : r * 2.0;
        const x2 = Math.cos(baseA + 0.3) * (reach * 0.7 + Math.sin(time * 30 + i) * 4);
        const y2 = Math.sin(baseA + 0.3) * (reach * 0.7 + Math.sin(time * 30 + i) * 4);
        const x3 = Math.cos(baseA) * reach;
        const y3 = Math.sin(baseA) * reach;

        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.lineTo(x3, y3);
        g.stroke({ color: isPlus ? 0xFEF08A : 0xffffff, width: isPlus ? 2.8 : 2 });
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

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      // Flame heat aura
      g.circle(0, 0, r + 7);
      g.fill({ color: isPlus ? 0xF59E0B : 0xEF4444, alpha: 0.40 });

      // Outer fireball
      g.circle(0, 0, r + 2);
      g.fill({ color: isPlus ? 0xDC2626 : 0xF97316 });

      // Trailing micro flames
      const flameCount = isPlus ? 5 : 3;
      for (let i = 0; i < flameCount; i++) {
        const offsetA = Math.PI + (i - flameCount / 2) * 0.4 + Math.sin(time * 16 + i) * 0.25;
        const fx = Math.cos(offsetA) * (r * 1.5);
        const fy = Math.sin(offsetA) * (r * 1.5);
        g.circle(fx, fy, r * 0.55);
        g.fill({ color: isPlus ? 0xF97316 : 0xEA580C, alpha: 0.65 });
      }

      // Fiery center
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

  // ── 4. SHURIKEN & LAME NINJA (Shuriken ruotante metallico) ──
  if (normName.includes('shuriken') || normName.includes('lama') || normName.includes('senbon') || normName.includes('dardi')) {
    const drawNinjaTool = (time: number) => {
      g.clear();

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      // Speed blur trail
      g.circle(0, 0, r + 4);
      g.fill({ color: isPlus ? 0xFBBF24 : 0x94A3B8, alpha: 0.3 });

      // 4-pointed cross star
      const spinSpeed = 16;
      for (let i = 0; i < 4; i++) {
        const bladeA = time * spinSpeed + (i * Math.PI) / 2;
        const tipX = Math.cos(bladeA) * (r * 1.4);
        const tipY = Math.sin(bladeA) * (r * 1.4);
        const p1X  = Math.cos(bladeA + 0.5) * (r * 0.4);
        const p1Y  = Math.sin(bladeA + 0.5) * (r * 0.4);
        const p2X  = Math.cos(bladeA - 0.5) * (r * 0.4);
        const p2Y  = Math.sin(bladeA - 0.5) * (r * 0.4);

        g.poly([tipX, tipY, p1X, p1Y, p2X, p2Y], true);
        g.fill({ color: isPlus ? 0xFDE68A : 0xCBD5E1 });
      }

      // Center ring
      g.circle(0, 0, r * 0.35);
      g.fill({ color: 0x1E293B });
      g.circle(0, 0, r * 0.15);
      g.fill({ color: 0x000000 });
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
  if (elem === 'Suiton' || normName.includes('acqua') || normName.includes('suiryūdan') || normName.includes('teppou')) {
    const drawSuiton = (time: number) => {
      g.clear();

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      g.circle(0, 0, r + 6);
      g.fill({ color: isPlus ? 0x38BDF8 : 0x0284C7, alpha: 0.35 });

      // Water droplet body
      g.circle(0, 0, r);
      g.fill({ color: isPlus ? 0x60A5FA : 0x38BDF8 });

      // Fluid specular shine
      const shineOffset = Math.sin(time * 6) * (r * 0.2);
      g.circle(-r * 0.3 + shineOffset, -r * 0.3, r * 0.32);
      g.fill({ color: 0xffffff, alpha: 0.85 });
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
  if (elem === 'Doton' || normName.includes('sabaku') || normName.includes('sabbia') || normName.includes('roccia') || normName.includes('doryuu')) {
    const drawDoton = (time: number) => {
      g.clear();

      if (isPlus) {
        drawPlusAura(g, r, time);
      }

      // Jagged polygonal boulder
      g.circle(0, 0, r + 5);
      g.fill({ color: isPlus ? 0xFBBF24 : c, alpha: 0.30 });

      const points = [
        0, -r * 1.25,
        r * 1.15, -r * 0.4,
        r * 0.85, r * 1.0,
        -r * 0.75, r * 1.15,
        -r * 1.15, -r * 0.3,
      ];
      g.poly(points, true);
      g.fill({ color: isPlus ? 0xD97706 : c });

      // Inner rock texture lines
      g.moveTo(-r * 0.4, -r * 0.5);
      g.lineTo(r * 0.2, r * 0.3);
      g.stroke({ color: isPlus ? 0xFEF08A : 0x1C1917, width: 2.2 });
    };

    drawDoton(0);
    return {
      container,
      update: (dt) => {
        animTime += dt;
        drawDoton(animTime);
      },
    };
  }

  // ── 7. DEFAULT STYLIZED ENERGY PROJECTILE (Yin, Yang, SixPaths, Generici) ──
  const drawDefault = (time: number) => {
    g.clear();

    if (isPlus) {
      drawPlusAura(g, r, time);
    }

    g.circle(0, 0, r + 6);
    g.fill({ color: isPlus ? 0xFBBF24 : c, alpha: 0.35 });

    g.circle(0, 0, r);
    g.fill({ color: c });

    g.circle(-r * 0.25, -r * 0.25, r * 0.4);
    g.fill({ color: 0xffffff, alpha: 0.85 });
  };

  drawDefault(0);
  return {
    container,
    update: (dt) => {
      animTime += dt;
      drawDefault(animTime);
    },
  };
}
