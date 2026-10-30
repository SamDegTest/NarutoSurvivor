import { Container, Graphics } from 'pixi.js';
import type { Character, ElementalAffinity } from '../types/character';
import type { EnemyConfig } from '../entities/entities';
import type { BossConfig } from '../entities/bosses';

// ============================================================
//  NarutoSurvivor — Pixel Art Sprite Factory
//  All sprites are drawn procedurally using PixiJS Graphics
//  in a 16-bit ninja game style (Jump Ultimate Stars / Ninja Council)
// ============================================================

// ── Pixel helpers ──────────────────────────────────────────────
/** Draw a "pixel" block (for pixel-art upscaling illusion) */
function px(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(x, y, w, h);
  g.fill({ color, alpha });
}

function drawTri(g: Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  g.poly([x1, y1, x2, y2, x3, y3], true);
}

// ── Colour palette per element ─────────────────────────────────
export function elementToColor(elements: ElementalAffinity[]): number {
  const primary = elements[0] ?? 'None';
  const MAP: Record<string, number> = {
    Katon: 0xF97316, Fuuton: 0x34D399, Raiton: 0x60A5FA,
    Doton: 0xD97706, Suiton: 0x38BDF8, Yang: 0xFBBF24,
    Yin: 0xA78BFA, YinYang: 0xEC4899, SixPaths: 0xE879F9,
    Jinton: 0x14B8A6, Mokuton: 0x15803D, Hyoton: 0xBAE6FD,
    Shakuton: 0xFB923C, Yoton: 0xF43F5E, Bakuton: 0xEF4444,
    Ranton: 0x818CF8, SenjutsuNatural: 0x10B981, SenjutsuTailed: 0xFB923C,
    None: 0x9CA3AF,
  };
  return MAP[primary] ?? 0x9CA3AF;
}

/** Clan/village color from character id prefix */
function clanColor(id: string): number {
  if (id.includes('uchiha') || id.includes('sasuke') || id.includes('itachi') || id.includes('shisui') || id.includes('obito') || id.includes('madara'))
    return 0x7C3AED; // Uchiha — purple
  if (id.includes('hyuga') || id.includes('hinata') || id.includes('neji'))
    return 0xF8FAFC; // Hyuga — white/pale
  if (id.includes('uzumaki') || id.includes('naruto') || id.includes('kushina'))
    return 0xF97316; // Uzumaki — orange
  if (id.includes('hatake') || id.includes('kakashi'))
    return 0x94A3B8; // Hatake — silver
  if (id.includes('akatsuki') || id.includes('pain') || id.includes('konan') || id.includes('hidan') || id.includes('kakuzu') || id.includes('kisame') || id.includes('deidara') || id.includes('sasori') || id.includes('zetsu') || id.includes('tobi'))
    return 0x4C0519; // Akatsuki — dark crimson
  if (id.includes('gaara') || id.includes('temari') || id.includes('kankuro'))
    return 0xD97706; // Sand — amber
  if (id.includes('minato'))
    return 0xFBBF24; // Yellow Flash — gold
  if (id.includes('tsunade') || id.includes('sakura'))
    return 0xFB7185; // Medical — pink
  return 0x334155;  // Default — dark slate
}

// ── Headband colours ───────────────────────────────────────────
function headbandColor(id: string): number {
  if (id.includes('akatsuki') || id.includes('pain') || id.includes('itachi') || id.includes('kisame'))
    return 0x374151; // Scratched out / missing
  if (id.includes('konoha') || id.includes('naruto') || id.includes('sasuke') || id.includes('sakura') || id.includes('kakashi') || id.includes('neji'))
    return 0x94A3B8; // Konoha — silver
  if (id.includes('gaara') || id.includes('temari'))
    return 0xD97706; // Sand — amber
  if (id.includes('rock_lee') || id.includes('gai'))
    return 0x22C55E; // Konoha green
  return 0x64748B;
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER SPRITE
// ═══════════════════════════════════════════════════════════════

export function buildPlayerSprite(character: Character): Container {
  const root = new Container();
  const g = new Graphics();
  const id = character.id;

  const skinColor    = 0xFECDD3; // warm skin
  const hairColor    = character.assets.color;
  const clanC        = clanColor(id);
  const hbColor      = headbandColor(id);
  const elementColor = elementToColor(character.element);
  const isAkatsuki   = id.includes('akatsuki') || ['itachi', 'kisame', 'pain', 'konan', 'hidan', 'kakuzu', 'deidara', 'sasori', 'tobi', 'zetsu'].some(k => id.includes(k));

  const S = 2; // pixel scale (each "pixel" = 2px → 32×32 at S=2)

  // ── Shadow ────────────────────────────────────────────────
  g.ellipse(0, 16, 14, 5);
  g.fill({ color: 0x000000, alpha: 0.25 });

  // ── Legs ──────────────────────────────────────────────────
  const pantsColor = isAkatsuki ? 0x1C1C1C : 0x1E3A5F;
  px(g, -7 * S, 5 * S,  5 * S, 7 * S, pantsColor);  // left leg
  px(g,  2 * S, 5 * S,  5 * S, 7 * S, pantsColor);  // right leg

  // Sandals
  px(g, -8 * S, 11 * S, 6 * S, 3 * S, 0x292524);
  px(g,  2 * S, 11 * S, 6 * S, 3 * S, 0x292524);

  // ── Body (torso) ──────────────────────────────────────────
  const jacketColor = isAkatsuki ? 0x0F172A : clanC;
  px(g, -7 * S, -2 * S, 14 * S, 8 * S, jacketColor);

  // Jacket collar/markings
  if (isAkatsuki) {
    // Akatsuki cloud pattern (simplified)
    px(g, -3 * S, -2 * S, 6 * S, 8 * S, 0x1F0A30); // dark inner
    g.circle(0, 0, 5); g.fill({ color: 0xE11D48, alpha: 0.6 }); // red cloud
  } else {
    // Konoha leaf symbol on chest (simplified)
    px(g, -2 * S, 0, 4 * S, 4 * S, elementColor);
    g.ellipse(0, 1 * S, 3 * S, 3 * S); g.fill({ color: elementColor, alpha: 0.5 });
  }

  // Arms
  px(g, -11 * S, -2 * S, 4 * S, 6 * S, jacketColor); // left arm
  px(g,  7 * S, -2 * S, 4 * S, 6 * S, jacketColor);  // right arm

  // Hands (fingerless gloves or bare)
  px(g, -11 * S, 4 * S, 4 * S, 3 * S, 0xFECDD3);
  px(g,  7 * S, 4 * S, 4 * S, 3 * S, 0xFECDD3);

  // ── Headband ──────────────────────────────────────────────
  px(g, -8 * S, -9 * S, 16 * S, 3 * S, hbColor);
  // Metal plate
  px(g, -5 * S, -9 * S, 10 * S, 3 * S, 0xCBD5E1);
  // Konoha spiral symbol
  g.circle(-1, -7 * S, 2); g.fill({ color: 0x1E3A5F });

  // ── Head ──────────────────────────────────────────────────
  g.roundRect(-6 * S, -8 * S, 12 * S, 12 * S, 3);
  g.fill({ color: skinColor });

  // Eyes
  const eyeColor = id.includes('uchiha') || id.includes('sasuke') || id.includes('itachi') ? 0xDC2626: 0x1E293B;
  px(g, -5 * S, -5 * S, 3 * S, 2 * S, eyeColor);
  px(g,  2 * S, -5 * S, 3 * S, 2 * S, eyeColor);

  // Sharingan pupils for Uchiha
  if (id.includes('uchiha') || id.includes('sasuke') || id.includes('itachi') || id.includes('obito') || id.includes('madara') || id.includes('shisui')) {
    g.circle(-3 * S + 1, -5 * S + 1, 2); g.fill({ color: 0xFF0000, alpha: 0.9 });
    g.circle( 3 * S - 1, -5 * S + 1, 2); g.fill({ color: 0xFF0000, alpha: 0.9 });
  }

  // Byakugan for Hyuga
  if (id.includes('hyuga') || id.includes('hinata') || id.includes('neji')) {
    g.circle(-3 * S + 1, -5 * S + 1, 2); g.fill({ color: 0xDDD6FE, alpha: 0.9 });
    g.circle( 3 * S - 1, -5 * S + 1, 2); g.fill({ color: 0xDDD6FE, alpha: 0.9 });
  }

  // Mouth
  px(g, -2 * S, -2 * S, 4 * S, 1 * S, 0x9F1239);

  // ── Hair ──────────────────────────────────────────────────
  drawHair(g, id, hairColor, S);

  // ── Whisker marks (Naruto) ────────────────────────────────
  if (id.includes('naruto') || id.includes('boruto')) {
    px(g, -7 * S, -4 * S, 2 * S, 1, 0xD97706);
    px(g, -7 * S, -3 * S, 2 * S, 1, 0xD97706);
    px(g, -7 * S, -2 * S, 2 * S, 1, 0xD97706);
    px(g,  4 * S, -4 * S, 2 * S, 1, 0xD97706);
    px(g,  4 * S, -3 * S, 2 * S, 1, 0xD97706);
    px(g,  4 * S, -2 * S, 2 * S, 1, 0xD97706);
  }

  root.addChild(g);
  return root;
}

function drawHair(g: Graphics, id: string, color: number, S: number): void {
  if (id.includes('naruto') || id.includes('uzumaki')) {
    // Spiky blonde hair
    px(g, -7 * S, -13 * S, 4 * S, 6 * S, color);
    px(g, -3 * S, -15 * S, 3 * S, 8 * S, color);
    px(g,  0,     -13 * S, 4 * S, 6 * S, color);
    px(g,  4 * S, -11 * S, 3 * S, 4 * S, color);
    px(g, -8 * S, -11 * S, 2 * S, 4 * S, color);
  } else if (id.includes('sasuke') || id.includes('uchiha')) {
    // Duck butt hair (Sasuke style)
    px(g, -6 * S, -14 * S, 12 * S, 7 * S, 0x1C1917); // dark hair top
    px(g,  2 * S, -10 * S, 6 * S, 6 * S, 0x1C1917);   // back flap
    px(g, -6 * S, -8 * S, 3 * S, 3 * S, 0x1C1917);    // sideburn left
  } else if (id.includes('sakura') || id.includes('haruno')) {
    // Short pink bob
    px(g, -6 * S, -14 * S, 12 * S, 7 * S, color);
    px(g, -7 * S, -9 * S, 2 * S, 5 * S, color);
  } else if (id.includes('kakashi') || id.includes('hatake')) {
    // Silver spiky leaning hair
    px(g, -5 * S, -15 * S, 10 * S, 8 * S, 0xE2E8F0);
    px(g,  2 * S, -16 * S, 4 * S, 5 * S, 0xE2E8F0);
    px(g, -7 * S, -12 * S, 2 * S, 5 * S, 0xE2E8F0);
  } else if (id.includes('minato')) {
    // Yellow spiky with long side spikes
    px(g, -6 * S, -15 * S, 12 * S, 8 * S, 0xFBBF24);
    px(g, -9 * S, -11 * S, 3 * S, 5 * S, 0xFBBF24);
    px(g,  6 * S, -11 * S, 3 * S, 5 * S, 0xFBBF24);
  } else if (id.includes('gaara')) {
    // Red hair, short
    px(g, -6 * S, -14 * S, 12 * S, 7 * S, 0xDC2626);
    // Kanji "love" scar on forehead
    px(g, -2 * S, -11 * S, 4 * S, 5 * S, 0x7C0000);
  } else {
    // Generic ninja hair
    px(g, -6 * S, -14 * S, 12 * S, 7 * S, color);
    px(g, -7 * S, -10 * S, 2 * S, 4 * S, color);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ENEMY SPRITES
// ═══════════════════════════════════════════════════════════════

export function buildEnemySprite(config: EnemyConfig): Graphics {
  const g = new Graphics();

  switch (config.type) {
    case 'zetsu':    drawZetsu(g, config.size, config.color);    break;
    case 'traitor_ninja': drawTraitorNinja(g, config.size, config.color); break;
    case 'summon':   drawSummon(g, config.size, config.color);   break;
    default:         drawGenericEnemy(g, config.size, config.color);
  }

  return g;
}

function drawZetsu(g: Graphics, size: number, color: number): void {
  // Zetsu: plant/spore creature — split face (white/black halves)
  const s = size;

  // Shadow
  g.ellipse(0, s * 0.85, s * 0.9, s * 0.25); g.fill({ color: 0x000000, alpha: 0.30 });

  // Body (leaf-shaped)
  g.ellipse(0, 0, s * 0.7, s);  g.fill({ color: 0x14532D });   // dark green
  g.ellipse(0, 0, s * 0.35, s); g.fill({ color: 0x86EFAC });   // light half

  // Vine tendrils
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tx = Math.cos(a) * s * 0.6;
    const ty = Math.sin(a) * s * 0.6 - s * 0.3;
    g.moveTo(0, -s * 0.3); g.lineTo(tx, ty);
    g.stroke({ color: 0x166534, width: 2 });
  }

  // Face
  g.rect(-s * 0.3, -s * 0.2, s * 0.6, s * 0.4);
  g.fill({ color: color, alpha: 0.7 });

  // Eyes (split: green/white)
  g.circle(-s * 0.15, -s * 0.1, s * 0.08); g.fill({ color: 0x86EFAC });
  g.circle( s * 0.15, -s * 0.1, s * 0.08); g.fill({ color: 0xffffff });
}

function drawTraitorNinja(g: Graphics, size: number, color: number): void {
  const s = size;
  const S = 1;

  // Shadow
  g.ellipse(0, s + 4, s * 0.7, s * 0.25); g.fill({ color: 0x000000, alpha: 0.28 });

  // Legs
  g.rect(-s * 0.4, s * 0.2, s * 0.35, s * 0.8); g.fill({ color: 0x1C1917 });
  g.rect( s * 0.05, s * 0.2, s * 0.35, s * 0.8); g.fill({ color: 0x1C1917 });

  // Body
  g.rect(-s * 0.5, -s * 0.2, s, s * 0.5); g.fill({ color: color });
  // Cloak/chest detail
  g.rect(-s * 0.25, -s * 0.2, s * 0.5, s * 0.5); g.fill({ color: 0x292524 });

  // Arms
  g.rect(-s * 0.75, -s * 0.2, s * 0.3, s * 0.45); g.fill({ color: color });
  g.rect( s * 0.45, -s * 0.2, s * 0.3, s * 0.45); g.fill({ color: color });

  // Head
  g.roundRect(-s * 0.4, -s * 1.05, s * 0.8, s * 0.9, 3);
  g.fill({ color: 0xFECDD3 });

  // Mask (missing-nin mask, scratched headband)
  g.rect(-s * 0.5, -s * 0.7, s, s * 0.25 * S); g.fill({ color: 0x44403C, alpha: 0.9 });
  // Red slit eyes behind mask
  g.rect(-s * 0.3, -s * 0.78, s * 0.18, s * 0.12); g.fill({ color: 0xEF4444 });
  g.rect( s * 0.12, -s * 0.78, s * 0.18, s * 0.12); g.fill({ color: 0xEF4444 });
}

function drawSummon(g: Graphics, size: number, color: number): void {
  const s = size;

  // Shadow
  g.ellipse(0, s, s * 1.1, s * 0.3); g.fill({ color: 0x000000, alpha: 0.35 });

  // Body (creature — like a large snake/giant)
  g.ellipse(0, 0, s * 0.85, s * 1.1); g.fill({ color: color });
  // Scale pattern
  for (let row = -1; row < 2; row++) {
    for (let col = -1; col < 2; col++) {
      g.ellipse(col * s * 0.3, row * s * 0.35, s * 0.18, s * 0.12);
      g.fill({ color: 0x000000, alpha: 0.25 });
    }
  }

  // Outer ring
  g.ellipse(0, 0, s * 0.85, s * 1.1); g.stroke({ color: 0x991B1B, width: 3 });

  // Head/face
  g.ellipse(0, -s * 0.7, s * 0.55, s * 0.5); g.fill({ color: color });

  // Eyes (3 on each side — like a summoned creature)
  [-s * 0.2, 0, s * 0.2].forEach((ey, i) => {
    g.circle(-s * 0.3, ey - s * 0.7, s * 0.07 + i * 1); g.fill({ color: 0xFBBF24 });
    g.circle( s * 0.3, ey - s * 0.7, s * 0.07 + i * 1); g.fill({ color: 0xFBBF24 });
  });

  // Mouth/fangs
  g.rect(-s * 0.2, -s * 0.5, s * 0.4, s * 0.1); g.fill({ color: 0x1C1917 });
  drawTri(g, -s * 0.15, -s * 0.5, -s * 0.08, -s * 0.35, -s * 0.01, -s * 0.5);
  g.fill({ color: 0xffffff });
  drawTri(g, s * 0.01, -s * 0.5, s * 0.08, -s * 0.35, s * 0.15, -s * 0.5);
  g.fill({ color: 0xffffff });
}

function drawGenericEnemy(g: Graphics, size: number, color: number): void {
  const s = size;
  g.ellipse(0, s * 0.8, s * 0.8, s * 0.2); g.fill({ color: 0x000000, alpha: 0.25 });
  g.roundRect(-s, -s, s * 2, s * 2, 4); g.fill({ color });
  g.circle(-s * 0.3, -s * 0.2, s * 0.15); g.fill({ color: 0xffffff, alpha: 0.8 });
  g.circle( s * 0.3, -s * 0.2, s * 0.15); g.fill({ color: 0xffffff, alpha: 0.8 });
}

// ═══════════════════════════════════════════════════════════════
//  BOSS SPRITES
// ═══════════════════════════════════════════════════════════════

export function buildBossSprite(config: BossConfig, isPhase2 = false): Graphics {
  const g = new Graphics();
  const s = config.size;

  switch (config.type) {
    case 'kisame':    drawKisame(g, s, isPhase2);    break;
    case 'itachi':    drawItachi(g, s, isPhase2);    break;
    case 'pain_tendo': drawPain(g, s, isPhase2);     break;
    case 'ten_tails': drawTenTails(g, s, isPhase2);  break;
    default:
      drawGenericBoss(g, s, config.color, config.accentColor, isPhase2);
  }

  return g;
}

function drawKisame(g: Graphics, s: number, p2: boolean): void {
  // Shark-man silhouette
  const skin = 0x1E3A5F;

  // Samehada sword (behind)
  g.rect(s * 0.4, -s * 1.2, s * 0.25, s * 2.4);
  g.fill({ color: 0x6B21A8 });
  // Scales on sword
  for (let y = -s; y < s; y += 8) {
    g.rect(s * 0.38, y, s * 0.29, 4); g.fill({ color: 0x7E22CE });
  }

  // Shadow
  g.ellipse(0, s, s, s * 0.3); g.fill({ color: 0x000000, alpha: 0.35 });

  // Body
  g.ellipse(0, 0, s * 0.75, s); g.fill({ color: skin });
  // Akatsuki cloak
  g.ellipse(0, s * 0.2, s * 0.8, s * 0.85); g.fill({ color: 0x0F172A });
  g.ellipse(0, s * 0.2, s * 0.4, s * 0.85); g.fill({ color: 0x1F0A30 }); // inner
  // Red clouds
  [-s * 0.25, s * 0.1].forEach(cx => {
    g.ellipse(cx, s * 0.3, s * 0.2, s * 0.1); g.fill({ color: 0xE11D48, alpha: 0.7 });
  });

  // Head (shark-like)
  g.ellipse(0, -s * 0.8, s * 0.65, s * 0.7); g.fill({ color: skin });
  // Gill markings
  [-s * 0.25, s * 0.25].forEach(gx => {
    g.rect(gx, -s * 0.95, 2, s * 0.3); g.fill({ color: 0x1E40AF });
  });

  // Teeth
  for (let i = -2; i <= 2; i++) {
    drawTri(g, i * s * 0.1, -s * 0.5, i * s * 0.1 - 4, -s * 0.3, i * s * 0.1 + 4, -s * 0.3);
    g.fill({ color: 0xffffff });
  }

  // Eyes (yellow slit)
  g.ellipse(-s * 0.2, -s * 0.85, s * 0.1, s * 0.07); g.fill({ color: 0xFBBF24 });
  g.ellipse( s * 0.2, -s * 0.85, s * 0.1, s * 0.07); g.fill({ color: 0xFBBF24 });

  if (p2) {
    // Samehada merged — skin turns darker
    g.ellipse(0, 0, s * 0.82, s); g.fill({ color: 0x1E1B4B, alpha: 0.5 });
    // Extra fins
    drawTri(g, -s * 0.8, -s * 0.3, -s * 0.45, -s * 0.6, -s * 0.45, 0);
    g.fill({ color: 0x1E40AF, alpha: 0.8 });
    drawTri(g, s * 0.8, -s * 0.3, s * 0.45, -s * 0.6, s * 0.45, 0);
    g.fill({ color: 0x1E40AF, alpha: 0.8 });
  }
}

function drawItachi(g: Graphics, s: number, p2: boolean): void {
  const skin = 0xFDE7D0;

  // Shadow
  g.ellipse(0, s, s * 0.8, s * 0.25); g.fill({ color: 0x000000, alpha: 0.30 });

  // Akatsuki cloak
  g.ellipse(0, s * 0.1, s * 0.78, s * 1.1); g.fill({ color: 0x0A0A0F });
  // Red cloud ring
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.ellipse(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4 + s * 0.1, s * 0.18, s * 0.09);
    g.fill({ color: 0xE11D48, alpha: 0.65 });
  }

  // Body outline
  g.ellipse(0, 0, s * 0.6, s * 0.85); g.fill({ color: 0x0F0A1A });

  // Head
  g.ellipse(0, -s * 0.8, s * 0.52, s * 0.6); g.fill({ color: skin });

  // Long black hair
  g.rect(-s * 0.5, -s * 1.35, s, s * 0.7); g.fill({ color: 0x0C0A09 });
  // Hair bands (red)
  g.rect(-s * 0.45, -s * 1.0, s * 0.9, 3); g.fill({ color: 0xE11D48 });
  g.rect(-s * 0.45, -s * 0.75, s * 0.9, 3); g.fill({ color: 0xE11D48 });

  // Mangekyo Sharingan eyes
  const eyeR = p2 ? 0xC026D3 : 0xDC2626;
  g.circle(-s * 0.18, -s * 0.82, s * 0.1); g.fill({ color: eyeR });
  g.circle( s * 0.18, -s * 0.82, s * 0.1); g.fill({ color: eyeR });
  // Mangekyō pattern
  if (p2) {
    g.circle(-s * 0.18, -s * 0.82, s * 0.15); g.stroke({ color: 0xC026D3, width: 2, alpha: 0.8 });
    g.circle( s * 0.18, -s * 0.82, s * 0.15); g.stroke({ color: 0xC026D3, width: 2, alpha: 0.8 });
  }
  // Tear marks
  g.rect(-s * 0.2, -s * 0.72, 2, s * 0.15); g.fill({ color: 0x7F1D1D, alpha: 0.8 });
  g.rect( s * 0.18, -s * 0.72, 2, s * 0.15); g.fill({ color: 0x7F1D1D, alpha: 0.8 });

  // Kunai (held)
  g.rect(s * 0.45, -s * 0.1, 4, s * 0.7); g.fill({ color: 0x94A3B8 });
  drawTri(g, s * 0.45, -s * 0.1, s * 0.49, -s * 0.3, s * 0.53, -s * 0.1);
  g.fill({ color: 0xCBD5E1 });
}

function drawPain(g: Graphics, s: number, p2: boolean): void {
  const skin = 0xD4A5A5; // pale/rinnegan skin

  // Shadow
  g.ellipse(0, s * 1.1, s, s * 0.3); g.fill({ color: 0x000000, alpha: 0.40 });

  // Cape/cloak (dark grey)
  g.ellipse(0, s * 0.2, s * 0.9, s * 1.3); g.fill({ color: 0x1C1917 });

  // Body
  g.ellipse(0, 0, s * 0.7, s * 1.0); g.fill({ color: 0x292524 });

  // Piercings (body)
  for (let i = -2; i <= 2; i++) {
    g.circle(i * s * 0.18, -s * 0.05, 3); g.fill({ color: 0x94A3B8 });
  }

  // Head
  g.ellipse(0, -s * 0.9, s * 0.58, s * 0.65); g.fill({ color: skin });

  // Dark blue/black hair (Nagato styled)
  g.rect(-s * 0.55, -s * 1.55, s * 1.1, s * 0.8); g.fill({ color: 0x1A0030 });
  // Hair spikes outward
  drawTri(g, -s * 0.55, -s * 1.3, -s * 0.75, -s * 1.5, -s * 0.4, -s * 1.1); g.fill({ color: 0x1A0030 });
  drawTri(g,  s * 0.55, -s * 1.3,  s * 0.75, -s * 1.5,  s * 0.4, -s * 1.1); g.fill({ color: 0x1A0030 });

  // Rinnegan eyes
  const rinColor = p2 ? 0x9333EA : 0x7C3AED;
  g.circle(-s * 0.2, -s * 0.92, s * 0.13); g.fill({ color: rinColor });
  g.circle( s * 0.2, -s * 0.92, s * 0.13); g.fill({ color: rinColor });
  // Rinnegan ripple pattern
  g.circle(-s * 0.2, -s * 0.92, s * 0.09); g.stroke({ color: 0xDDD6FE, width: 1, alpha: 0.7 });
  g.circle( s * 0.2, -s * 0.92, s * 0.09); g.stroke({ color: 0xDDD6FE, width: 1, alpha: 0.7 });

  // Nose ring + piercings
  g.circle(0, -s * 0.82, 3); g.fill({ color: 0xCBD5E1 });
  g.circle(-s * 0.32, -s * 0.88, 2); g.fill({ color: 0xCBD5E1 });
  g.circle( s * 0.32, -s * 0.88, 2); g.fill({ color: 0xCBD5E1 });

  // Phase 2: Deva Path black rods
  if (p2) {
    for (let i = -2; i <= 2; i++) {
      g.rect(i * s * 0.22 - 2, -s * 1.3, 4, s * 0.5);
      g.fill({ color: 0x0F0F0F });
    }
    g.ellipse(0, -s * 0.9, s * 0.65, s * 0.7); g.fill({ color: 0x4C0519, alpha: 0.3 });
  }
}

function drawTenTails(g: Graphics, s: number, p2: boolean): void {
  // Ten-Tails: massive eldritch beast
  const bodyC = 0x1C0530;
  const accentC = p2 ? 0xFF00FF : 0xE879F9;

  // Shadow
  g.ellipse(0, s * 1.3, s * 1.3, s * 0.4); g.fill({ color: 0x000000, alpha: 0.50 });

  // Outer dark mass
  g.ellipse(0, 0, s, s * 1.3); g.fill({ color: bodyC });

  // Tails (radiating)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tx = Math.cos(a) * s * 1.2;
    const ty = Math.sin(a) * s * 1.2;
    g.moveTo(0, 0); g.lineTo(tx, ty);
    g.stroke({ color: bodyC, width: s * 0.28 });
    g.moveTo(0, 0); g.lineTo(tx, ty);
    g.stroke({ color: accentC, width: 2, alpha: 0.6 });
  }

  // Main body
  g.ellipse(0, 0, s * 0.9, s * 1.1); g.fill({ color: bodyC });
  g.ellipse(0, 0, s * 0.9, s * 1.1); g.stroke({ color: accentC, width: 4, alpha: 0.7 });

  // Single giant eye (Jūbi)
  g.circle(0, -s * 0.15, s * 0.45); g.fill({ color: 0xFFFFFF });
  g.circle(0, -s * 0.15, s * 0.3); g.fill({ color: accentC });
  g.circle(0, -s * 0.15, s * 0.15); g.fill({ color: 0x000000 });
  g.circle(-s * 0.07, -s * 0.22, s * 0.06); g.fill({ color: 0xffffff, alpha: 0.8 });

  // Phase 2: more chaotic tentacles and glow
  if (p2) {
    g.ellipse(0, 0, s * 0.95, s * 1.15); g.fill({ color: accentC, alpha: 0.15 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.circle(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7, s * 0.12);
      g.fill({ color: accentC, alpha: 0.6 });
    }
  }
}

function drawGenericBoss(g: Graphics, s: number, color: number, accent: number, p2: boolean): void {
  g.ellipse(0, s, s * 1.1, s * 0.3); g.fill({ color: 0x000000, alpha: 0.35 });
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    pts.push(Math.cos(a) * s, Math.sin(a) * s);
  }
  g.poly(pts); g.fill({ color: p2 ? accent : color });
  g.poly(pts); g.stroke({ color: accent, width: 3 });
  [-12, 12].forEach(ex => {
    g.circle(ex, -6, 7); g.fill({ color: p2 ? 0xFF0000 : accent });
    g.circle(ex, -6, 3); g.fill({ color: 0x000000 });
  });
}
