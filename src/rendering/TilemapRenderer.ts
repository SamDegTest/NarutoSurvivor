import { Container, Graphics } from 'pixi.js';

function drawTri(g: Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  g.poly([x1, y1, x2, y2, x3, y3], true);
}

// ============================================================
//  NarutoSurvivor — Tilemap Renderer
//  3 Biomi: Foresta della Morte | Valle della Fine | Konoha
//  Procedural tile-based ground rendering (no external assets)
// ============================================================

export type Biome = 'FOREST_OF_DEATH' | 'VALLEY_OF_END' | 'KONOHA_VILLAGE';

export const BIOME_NAMES: Record<Biome, string> = {
  FOREST_OF_DEATH:  'Foresta della Morte',
  VALLEY_OF_END:    'Valle della Fine',
  KONOHA_VILLAGE:   'Villaggio della Foglia',
};

// ── Biome palettes ────────────────────────────────────────────

interface BiomePalette {
  groundBase: number;    // base tile color
  groundVar: number;     // tile variation color
  gridColor: number;     // tile grid lines
  borderColor: number;   // world border
  deco1: number;         // primary decoration color
  deco2: number;         // secondary decoration color
  fogColor: number;      // vignette fog color
}

const PALETTES: Record<Biome, BiomePalette> = {
  FOREST_OF_DEATH: {
    groundBase: 0x0D2211,
    groundVar:  0x0F2B15,
    gridColor:  0x14391A,
    borderColor:0xF97316,
    deco1:      0x14532D,
    deco2:      0x166534,
    fogColor:   0x052E16,
  },
  VALLEY_OF_END: {
    groundBase: 0x1A0B0B,
    groundVar:  0x21100D,
    gridColor:  0x2D1515,
    borderColor:0x3B82F6,
    deco1:      0x7F1D1D,
    deco2:      0x991B1B,
    fogColor:   0x450A0A,
  },
  KONOHA_VILLAGE: {
    groundBase: 0x1A1508,
    groundVar:  0x22190A,
    gridColor:  0x2D2310,
    borderColor:0x22C55E,
    deco1:      0x3B2810,
    deco2:      0x4A3618,
    fogColor:   0x0F100A,
  },
};

// ── Tile size constants ───────────────────────────────────────
const TILE_SIZE = 128;     // each tile
const DECO_GRID = 256;     // decoration spacing

// ── Seeded pseudo-random (deterministic per tile) ─────────────
function seededRand(seed: number): number {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ═══════════════════════════════════════════════════════════════
//  Main renderer
// ═══════════════════════════════════════════════════════════════

export function buildTilemap(
  biome: Biome,
  worldW: number,
  worldH: number,
  groundLayer: Container,
): void {
  const pal = PALETTES[biome];

  // ── 1. Base ground tiles ─────────────────────────────────
  const ground = new Graphics();
  const cols = Math.ceil(worldW / TILE_SIZE);
  const rows = Math.ceil(worldH / TILE_SIZE);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = row * 1000 + col;
      const r = seededRand(seed);
      const isVar = r < 0.30;

      ground.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ground.fill({ color: isVar ? pal.groundVar : pal.groundBase });
    }
  }
  groundLayer.addChild(ground);

  // ── 2. Tile edge shading (inner grid lines) ───────────────
  const grid = new Graphics();
  for (let x = 0; x <= worldW; x += TILE_SIZE) {
    grid.moveTo(x, 0); grid.lineTo(x, worldH);
  }
  for (let y = 0; y <= worldH; y += TILE_SIZE) {
    grid.moveTo(0, y); grid.lineTo(worldW, y);
  }
  grid.stroke({ color: pal.gridColor, width: 1, alpha: 0.6 });
  groundLayer.addChild(grid);

  // ── 3. Biome-specific decorations ────────────────────────
  switch (biome) {
    case 'FOREST_OF_DEATH':  addForestDecorations(groundLayer, worldW, worldH, pal); break;
    case 'VALLEY_OF_END':    addValleyDecorations(groundLayer, worldW, worldH, pal); break;
    case 'KONOHA_VILLAGE':   addKonohaDecorations(groundLayer, worldW, worldH, pal); break;
  }

  // ── 4. World border ──────────────────────────────────────
  const border = new Graphics();
  border.rect(0, 0, worldW, worldH);
  border.stroke({ color: pal.borderColor, width: 10, alpha: 0.85 });
  groundLayer.addChild(border);

  // ── 5. Corner vignette ───────────────────────────────────
  const vignette = new Graphics();
  // Four corner triangles
  const vig = worldW * 0.08;
  vignette.poly([0, 0, vig, 0, 0, vig]); vignette.fill({ color: pal.fogColor, alpha: 0.7 });
  vignette.poly([worldW - vig, 0, worldW, 0, worldW, vig]); vignette.fill({ color: pal.fogColor, alpha: 0.7 });
  vignette.poly([0, worldH - vig, 0, worldH, vig, worldH]); vignette.fill({ color: pal.fogColor, alpha: 0.7 });
  vignette.poly([worldW - vig, worldH, worldW, worldH - vig, worldW, worldH]); vignette.fill({ color: pal.fogColor, alpha: 0.7 });
  groundLayer.addChild(vignette);
}

// ═══════════════════════════════════════════════════════════════
//  FOREST OF DEATH
// ═══════════════════════════════════════════════════════════════

function addForestDecorations(
  layer: Container,
  worldW: number,
  worldH: number,
  pal: BiomePalette,
): void {
  const decos = new Graphics();
  const seed0 = 42;

  let decoIdx = 0;
  for (let gx = DECO_GRID; gx < worldW; gx += DECO_GRID) {
    for (let gy = DECO_GRID; gy < worldH; gy += DECO_GRID) {
      const r  = seededRand(seed0 + decoIdx++);
      const r2 = seededRand(seed0 + decoIdx++);
      const r3 = seededRand(seed0 + decoIdx++);

      const dx = gx + (r - 0.5) * 80;
      const dy = gy + (r2 - 0.5) * 80;

      if (r < 0.45) {
        // Tree trunk
        const trunkH = 30 + r3 * 30;
        const trunkW = 8 + r3 * 6;
        decos.rect(dx - trunkW / 2, dy - trunkH, trunkW, trunkH);
        decos.fill({ color: 0x44301E });

        // Foliage (layered circles)
        const leafR1 = 22 + r3 * 18;
        const leafR2 = leafR1 * 0.7;
        decos.circle(dx, dy - trunkH - leafR1 * 0.6, leafR1);
        decos.fill({ color: pal.deco1, alpha: 0.9 });
        decos.circle(dx - leafR1 * 0.3, dy - trunkH - leafR2, leafR2 * 0.8);
        decos.fill({ color: pal.deco2, alpha: 0.75 });
        decos.circle(dx + leafR1 * 0.3, dy - trunkH - leafR2, leafR2 * 0.8);
        decos.fill({ color: pal.deco2, alpha: 0.75 });

      } else if (r < 0.70) {
        // Brambles / undergrowth
        const bCount = 3 + Math.round(r3 * 3);
        for (let b = 0; b < bCount; b++) {
          const bx = dx + (seededRand(seed0 + decoIdx + b) - 0.5) * 40;
          const by = dy + (seededRand(seed0 + decoIdx + b + 1) - 0.5) * 30;
          const br = 4 + r3 * 6;
          decos.circle(bx, by, br);
          decos.fill({ color: 0x1A3B1A, alpha: 0.6 + r3 * 0.3 });
        }

      } else if (r < 0.88) {
        // Mushroom (giant, Foresta della Morte style)
        const stalkH = 18 + r3 * 12;
        decos.rect(dx - 4, dy - stalkH, 8, stalkH);
        decos.fill({ color: 0xFDE68A });
        decos.ellipse(dx, dy - stalkH, 16 + r3 * 12, 9 + r3 * 5);
        decos.fill({ color: 0xDC2626 });
        decos.ellipse(dx, dy - stalkH, 8, 5);
        decos.fill({ color: 0xFEF2F2 });

      } else {
        // Puddle / water pool
        const pr = 12 + r3 * 14;
        decos.ellipse(dx, dy, pr, pr * 0.5);
        decos.fill({ color: 0x0E7490, alpha: 0.55 });
        // Reflection glint
        decos.ellipse(dx - pr * 0.2, dy - pr * 0.1, pr * 0.3, pr * 0.15);
        decos.fill({ color: 0xE0F2FE, alpha: 0.35 });
      }
    }
  }

  layer.addChild(decos);

  // ── Fog wisps (additional atmosphere) ────────────────────
  const fog = new Graphics();
  for (let i = 0; i < 40; i++) {
    const r = seededRand(9000 + i);
    const r2 = seededRand(9100 + i);
    const fx = r * worldW;
    const fy = r2 * worldH;
    const fw = 80 + seededRand(9200 + i) * 200;
    fog.ellipse(fx, fy, fw, 20 + seededRand(9300 + i) * 30);
    fog.fill({ color: 0x166534, alpha: 0.06 + seededRand(9400 + i) * 0.08 });
  }
  layer.addChild(fog);
}

// ═══════════════════════════════════════════════════════════════
//  VALLEY OF THE END
// ═══════════════════════════════════════════════════════════════

function addValleyDecorations(
  layer: Container,
  worldW: number,
  worldH: number,
  pal: BiomePalette,
): void {
  const decos = new Graphics();
  const seed0 = 99;
  let decoIdx = 0;

  // ── Waterfall / river channel (diagonal) ─────────────────
  const riverG = new Graphics();
  const riverPath = [
    { x: worldW * 0.15, y: 0 },
    { x: worldW * 0.35, y: worldH * 0.3 },
    { x: worldW * 0.45, y: worldH * 0.55 },
    { x: worldW * 0.4, y: worldH },
  ];
  riverG.moveTo(riverPath[0].x, riverPath[0].y);
  for (const pt of riverPath.slice(1)) riverG.lineTo(pt.x, pt.y);
  riverG.stroke({ color: 0x164E63, width: 80, alpha: 0.55 });
  // River shimmer
  riverG.moveTo(riverPath[0].x - 10, riverPath[0].y);
  for (const pt of riverPath.slice(1)) riverG.lineTo(pt.x - 10, pt.y);
  riverG.stroke({ color: 0x38BDF8, width: 6, alpha: 0.3 });
  layer.addChild(riverG);

  // ── Statues (Hashirama and Madara at the falls) ───────────
  drawStatue(decos, worldW * 0.28, worldH * 0.48, 50, false);
  drawStatue(decos, worldW * 0.55, worldH * 0.48, 50, true);

  // ── Cliff rocks ───────────────────────────────────────────
  for (let gx = DECO_GRID; gx < worldW; gx += DECO_GRID) {
    for (let gy = DECO_GRID; gy < worldH; gy += DECO_GRID) {
      const r  = seededRand(seed0 + decoIdx++);
      const r2 = seededRand(seed0 + decoIdx++);
      const r3 = seededRand(seed0 + decoIdx++);

      const dx = gx + (r - 0.5) * 80;
      const dy = gy + (r2 - 0.5) * 80;

      if (r < 0.50) {
        // Jagged rock formation
        const rockW = 20 + r3 * 30;
        const rockH = 15 + r3 * 25;
        const rockPts = [
          -rockW * 0.5, rockH * 0.5,
          -rockW * 0.35, 0,
          0, -rockH * 0.5,
          rockW * 0.25, -rockH * 0.3,
          rockW * 0.5, rockH * 0.1,
          rockW * 0.35, rockH * 0.5,
        ];
        decos.poly(rockPts.map((v, i) => i % 2 === 0 ? dx + v : dy + v));
        decos.fill({ color: pal.deco1 });
        // Rock highlight
        decos.poly([dx - rockW * 0.2, dy - rockH * 0.3, dx + rockW * 0.1, dy - rockH * 0.45, dx + rockW * 0.15, dy - rockH * 0.15]);
        decos.fill({ color: 0x3F1515, alpha: 0.5 });

      } else if (r < 0.75) {
        // Cracked earth / fissure
        const fLen = 40 + r3 * 60;
        const fAngle = r2 * Math.PI;
        decos.moveTo(dx, dy);
        decos.lineTo(dx + Math.cos(fAngle) * fLen, dy + Math.sin(fAngle) * fLen);
        decos.stroke({ color: 0x7F1D1D, width: 3, alpha: 0.6 });
        // Branch cracks
        decos.moveTo(dx + Math.cos(fAngle) * fLen * 0.5, dy + Math.sin(fAngle) * fLen * 0.5);
        decos.lineTo(dx + Math.cos(fAngle + 0.8) * fLen * 0.4, dy + Math.sin(fAngle + 0.8) * fLen * 0.4);
        decos.stroke({ color: 0x7F1D1D, width: 2, alpha: 0.4 });

      } else if (r < 0.88) {
        // Dead tree (charred)
        const th = 25 + r3 * 20;
        decos.rect(dx - 5, dy - th, 10, th);
        decos.fill({ color: 0x1C0A0A });
        // Bare branches
        for (let b = 0; b < 3; b++) {
          const ba = (b / 3 - 0.5) * 1.5 - Math.PI / 2;
          const bl = 12 + r3 * 10;
          decos.moveTo(dx, dy - th * 0.7);
          decos.lineTo(dx + Math.cos(ba) * bl, dy - th * 0.7 + Math.sin(ba) * bl);
          decos.stroke({ color: 0x1C0A0A, width: 3 });
        }
      } else {
        // Splash / water impact mark
        decos.circle(dx, dy, 8 + r3 * 12);
        decos.fill({ color: 0x164E63, alpha: 0.45 });
      }
    }
  }

  layer.addChild(decos);

  // ── Chakra energy residue (blue/red aura spots) ───────────
  const aura = new Graphics();
  for (let i = 0; i < 20; i++) {
    const r = seededRand(8000 + i);
    const r2 = seededRand(8100 + i);
    aura.ellipse(r * worldW, r2 * worldH, 50 + r * 80, 20 + r2 * 30);
    const isBlue = seededRand(8200 + i) < 0.5;
    aura.fill({ color: isBlue ? 0x1E40AF : 0xDC2626, alpha: 0.06 + seededRand(8300 + i) * 0.08 });
  }
  layer.addChild(aura);
}

/** Draw a simplified monumental statue (Hashirama / Madara style) */
function drawStatue(g: Graphics, x: number, y: number, size: number, isMadara: boolean): void {
  const c = isMadara ? 0x3B1515 : 0x1B3B2B;
  const face = isMadara ? 0x7F1D1D : 0x14532D;

  // Base plinth
  g.rect(x - size * 0.6, y, size * 1.2, size * 0.4);
  g.fill({ color: c });

  // Torso
  g.rect(x - size * 0.35, y - size * 0.9, size * 0.7, size * 0.9);
  g.fill({ color: c });

  // Head
  g.ellipse(x, y - size * 1.1, size * 0.3, size * 0.28);
  g.fill({ color: c });

  // Hair/Horns for Madara
  if (isMadara) {
    drawTri(g, x - size * 0.22, y - size * 1.2, x - size * 0.35, y - size * 1.55, x - size * 0.08, y - size * 1.2);
    g.fill({ color: c });
    drawTri(g, x + size * 0.22, y - size * 1.2, x + size * 0.35, y - size * 1.55, x + size * 0.08, y - size * 1.2);
    g.fill({ color: c });
  }

  // Eyes
  g.circle(x - size * 0.1, y - size * 1.12, size * 0.04); g.fill({ color: face });
  g.circle(x + size * 0.1, y - size * 1.12, size * 0.04); g.fill({ color: face });

  // Arms (raised)
  g.rect(x - size * 0.7, y - size * 0.7, size * 0.35, size * 0.15); g.fill({ color: c });
  g.rect(x + size * 0.35, y - size * 0.7, size * 0.35, size * 0.15); g.fill({ color: c });
}

// ═══════════════════════════════════════════════════════════════
//  KONOHA VILLAGE
// ═══════════════════════════════════════════════════════════════

function addKonohaDecorations(
  layer: Container,
  worldW: number,
  worldH: number,
  pal: BiomePalette,
): void {
  const decos = new Graphics();
  const seed0 = 77;
  let decoIdx = 0;

  // ── Stone paths (main roads) ──────────────────────────────
  const roads = new Graphics();
  // Horizontal main road
  roads.rect(0, worldH * 0.48, worldW, 90);
  roads.fill({ color: 0x292218, alpha: 0.75 });
  // Vertical main road
  roads.rect(worldW * 0.48, 0, 90, worldH);
  roads.fill({ color: 0x292218, alpha: 0.75 });
  // Road texture (cobblestone lines)
  for (let x = 0; x < worldW; x += 30) {
    roads.moveTo(x, worldH * 0.48);
    roads.lineTo(x, worldH * 0.48 + 90);
    roads.stroke({ color: 0x3B2F1A, width: 1, alpha: 0.4 });
  }
  for (let y = 0; y < worldH; y += 30) {
    roads.moveTo(worldW * 0.48, y);
    roads.lineTo(worldW * 0.48 + 90, y);
    roads.stroke({ color: 0x3B2F1A, width: 1, alpha: 0.4 });
  }
  layer.addChild(roads);

  // ── Hokage Rock (Faces carved in cliff) ──────────────────
  drawHokageRock(decos, worldW * 0.5, worldH * 0.12, 80);

  // ── Buildings and village structures ─────────────────────
  for (let gx = DECO_GRID; gx < worldW; gx += DECO_GRID) {
    for (let gy = DECO_GRID; gy < worldH; gy += DECO_GRID) {
      const r  = seededRand(seed0 + decoIdx++);
      const r2 = seededRand(seed0 + decoIdx++);
      const r3 = seededRand(seed0 + decoIdx++);
      const r4 = seededRand(seed0 + decoIdx++);

      const dx = gx + (r - 0.5) * 80;
      const dy = gy + (r2 - 0.5) * 80;

      // Skip near roads
      if (Math.abs(dy - worldH * 0.48) < 60 || Math.abs(dx - worldW * 0.48) < 60) continue;

      if (r < 0.35) {
        // Building
        const bW = 35 + r3 * 40;
        const bH = 40 + r3 * 60;
        const wallColor = r4 < 0.5 ? 0x3B2F1A : 0x2D2210;
        decos.rect(dx - bW / 2, dy - bH, bW, bH);
        decos.fill({ color: wallColor });

        // Roof (Japanese style — low-pitched)
        decos.poly([
          dx - bW * 0.7, dy - bH,
          dx + bW * 0.7, dy - bH,
          dx + bW * 0.55, dy - bH - bW * 0.3,
          dx - bW * 0.55, dy - bH - bW * 0.3,
        ]);
        decos.fill({ color: 0x1A1208 });
        decos.poly([
          dx - bW * 0.55, dy - bH - bW * 0.3,
          dx + bW * 0.55, dy - bH - bW * 0.3,
          dx, dy - bH - bW * 0.65,
        ]);
        decos.fill({ color: 0x140E06 });

        // Window
        if (bW > 40) {
          decos.rect(dx - 8, dy - bH * 0.6, 16, 16);
          decos.fill({ color: 0xFEF3C7, alpha: 0.4 });
        }

      } else if (r < 0.58) {
        // Cherry blossom tree (sakura)
        const th = 20 + r3 * 25;
        decos.rect(dx - 5, dy - th, 10, th);
        decos.fill({ color: 0x44301E });

        // Blossom clusters (pink)
        const leafR = 18 + r3 * 14;
        decos.circle(dx, dy - th - leafR * 0.5, leafR);
        decos.fill({ color: 0xFDA4AF, alpha: 0.85 });
        decos.circle(dx - leafR * 0.5, dy - th - leafR * 0.3, leafR * 0.7);
        decos.fill({ color: 0xFCE7F3, alpha: 0.7 });
        decos.circle(dx + leafR * 0.5, dy - th - leafR * 0.3, leafR * 0.7);
        decos.fill({ color: 0xFBBFD4, alpha: 0.7 });

        // Fallen petals on ground
        for (let p = 0; p < 4; p++) {
          const pr = seededRand(seed0 + decoIdx + p);
          const pr2 = seededRand(seed0 + decoIdx + p + 1);
          decos.ellipse(dx + (pr - 0.5) * 40, dy + pr2 * 8, 5, 3);
          decos.fill({ color: 0xFDA4AF, alpha: 0.5 });
        }

      } else if (r < 0.75) {
        // Fence / gate post
        const fLen = 50 + r3 * 80;
        const fAngle = Math.round(r2 * 2) * Math.PI / 2;
        const fEndX = dx + Math.cos(fAngle) * fLen;
        const fEndY = dy + Math.sin(fAngle) * fLen;
        decos.moveTo(dx, dy); decos.lineTo(fEndX, fEndY);
        decos.stroke({ color: pal.deco1, width: 8 });
        // Posts
        for (let s = 0; s <= 1; s += 0.25) {
          decos.rect(dx + (fEndX - dx) * s - 4, dy + (fEndY - dy) * s - 15, 8, 15);
          decos.fill({ color: pal.deco2 });
          // Post cap
          drawTri(
            decos,
            dx + (fEndX - dx) * s - 5, dy + (fEndY - dy) * s - 15,
            dx + (fEndX - dx) * s + 5, dy + (fEndY - dy) * s - 15,
            dx + (fEndX - dx) * s, dy + (fEndY - dy) * s - 22,
          );
          decos.fill({ color: 0x1A1208 });
        }

      } else if (r < 0.88) {
        // Training post (Konoha training ground)
        decos.rect(dx - 5, dy - 40, 10, 40);
        decos.fill({ color: 0x5C3D1A });
        // Cuts/slashes on post
        for (let s = 0; s < 3; s++) {
          decos.rect(dx - 5, dy - 35 + s * 12, 10, 2);
          decos.fill({ color: 0x3B2210 });
        }
        // Top of post
        decos.rect(dx - 7, dy - 42, 14, 5);
        decos.fill({ color: 0x3B2210 });

      } else {
        // Konoha leaf lantern
        drawLantern(decos, dx, dy, 12 + r3 * 8);
      }
    }
  }

  layer.addChild(decos);

  // ── Ambient grass patches ─────────────────────────────────
  const grass = new Graphics();
  for (let i = 0; i < 80; i++) {
    const r = seededRand(7000 + i);
    const r2 = seededRand(7100 + i);
    const gx = r * worldW;
    const gy = r2 * worldH;
    grass.ellipse(gx, gy, 15 + r * 25, 8 + r2 * 12);
    grass.fill({ color: 0x14532D, alpha: 0.25 + seededRand(7200 + i) * 0.20 });
  }
  layer.addChild(grass);
}

function drawHokageRock(g: Graphics, x: number, y: number, size: number): void {
  // Cliff base
  const cliffW = size * 6;
  const cliffH = size * 2;
  g.rect(x - cliffW / 2, y, cliffW, cliffH);
  g.fill({ color: 0x292218 });
  // Cliff face
  g.rect(x - cliffW / 2, y - cliffH * 0.3, cliffW, cliffH * 0.3);
  g.fill({ color: 0x3B2F1A });

  // The 4 faces (simplified head silhouettes)
  const faces = [-2.2, -0.7, 0.7, 2.2];
  faces.forEach((offset, i) => {
    const fx = x + offset * size * 0.85;
    const fy = y - size * 0.15;
    const faceColor = 0x2D2210;

    // Head
    g.ellipse(fx, fy, size * 0.38, size * 0.42); g.fill({ color: faceColor });

    // Hair characteristic of each Hokage
    if (i === 0) {
      // 1st Hokage (Hashirama) — mid-parted
      g.rect(fx - size * 0.3, fy - size * 0.38, size * 0.6, size * 0.2);
      g.fill({ color: 0x1A1208 });
    } else if (i === 1) {
      // 2nd Hokage (Tobirama) — red feather headpiece
      drawTri(g, fx - size * 0.1, fy - size * 0.38, fx + size * 0.1, fy - size * 0.38, fx, fy - size * 0.6);
      g.fill({ color: 0x7F1D1D });
    } else if (i === 2) {
      // 3rd Hokage (Hiruzen) — wrinkled forehead + beard
      g.rect(fx - size * 0.25, fy - size * 0.38, size * 0.5, size * 0.2);
      g.fill({ color: 0x1A1208 });
      g.rect(fx - size * 0.15, fy + size * 0.15, size * 0.3, size * 0.12);
      g.fill({ color: 0xffffff, alpha: 0.7 }); // beard
    } else {
      // 4th Hokage (Minato) — spiky yellow hair
      for (let s = 0; s < 5; s++) {
        const sx = fx - size * 0.3 + s * size * 0.15;
        drawTri(g, sx, fy - size * 0.38, sx + size * 0.1, fy - size * 0.38 - size * 0.2, sx + size * 0.2, fy - size * 0.38);
        g.fill({ color: 0xFBBF24 });
      }
    }

    // Hat (Hokage kanji hat)
    g.ellipse(fx, fy - size * 0.3, size * 0.42, size * 0.12);
    g.fill({ color: 0xDC2626 }); // Hokage hat rim
    g.rect(fx - size * 0.22, fy - size * 0.42, size * 0.44, size * 0.15);
    g.fill({ color: 0xDC2626 }); // Hat top
  });
}

function drawLantern(g: Graphics, x: number, y: number, size: number): void {
  // Hanging post
  g.rect(x - 2, y - 30, 4, 25); g.fill({ color: 0x3B2810 });
  // Lantern body
  g.roundRect(x - size * 0.5, y - 30 + 25, size, size * 1.3, 4);
  g.fill({ color: 0xC2410C, alpha: 0.9 });
  // Glow
  g.roundRect(x - size * 0.35, y - 5 + 25, size * 0.7, size * 0.9, 3);
  g.fill({ color: 0xFDE68A, alpha: 0.55 });
  // Leaf symbol
  g.circle(x, y + 15, size * 0.22); g.fill({ color: 0x14532D, alpha: 0.7 });
  // Bottom tassel
  g.rect(x - 2, y + size * 1.4, 4, 8); g.fill({ color: 0x7F1D1D });
}

// ═══════════════════════════════════════════════════════════════
//  Helper: select random biome for a run
// ═══════════════════════════════════════════════════════════════

export function randomBiome(): Biome {
  const biomes: Biome[] = ['FOREST_OF_DEATH', 'VALLEY_OF_END', 'KONOHA_VILLAGE'];
  return biomes[Math.floor(Math.random() * biomes.length)];
}
