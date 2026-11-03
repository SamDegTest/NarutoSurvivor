// ============================================================
//  NarutoSurvivor — Spacetime Ninjutsu Boss Portal Entity
//  Vortex portal that appears on the terrain and lasts 60s.
//  Teleports the shinobi to the Boss Arena Dimension.
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { BOSS_CONFIGS, type BossType } from './bosses';

export class BossPortal {
  readonly container: Container;
  private readonly vortexGraphics: Graphics;
  private readonly runeRing: Graphics;
  private readonly labelText: Text;
  private readonly timerText: Text;

  id: number;
  x: number;
  y: number;
  bossType: BossType;
  durationRemaining: number;
  maxDuration: number;
  radius = 42;
  isExpired = false;
  isEntered = false;
  isReturnPortal: boolean;

  private rot = 0;
  private static _idCounter = 0;

  constructor(x: number, y: number, bossType: BossType, durationSec = 60, isReturn = false) {
    this.id = ++BossPortal._idCounter;
    this.x = x;
    this.y = y;
    this.bossType = bossType;
    this.durationRemaining = durationSec;
    this.maxDuration = durationSec;
    this.isReturnPortal = isReturn;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Glowing aura base
    this.runeRing = new Graphics();
    this.container.addChild(this.runeRing);

    // Swirling Kamui / Dimensional vortex
    this.vortexGraphics = new Graphics();
    this.container.addChild(this.vortexGraphics);

    const bossName = isReturn ? 'Mondo Ninja (Ritorno)' : (BOSS_CONFIGS[bossType]?.nameIT ?? 'Boss');
    const title = isReturn ? '🌀 PORTALE DI RITORNO' : `🌀 PORTALE BOSS: ${bossName}`;

    this.labelText = new Text({
      text: title,
      style: new TextStyle({
        fontFamily: GAME_CONFIG.FONT_FAMILY,
        fontSize: 12,
        fill: isReturn ? 0x34D399 : 0xFBBF24,
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 4, alpha: 0.9, distance: 1 },
      }),
    });
    this.labelText.anchor.set(0.5, 1);
    this.labelText.y = -this.radius - 14;
    this.container.addChild(this.labelText);

    this.timerText = new Text({
      text: isReturn ? 'Tocca per uscire' : `Chiude tra: ${Math.ceil(this.durationRemaining)}s`,
      style: new TextStyle({
        fontFamily: GAME_CONFIG.FONT_FAMILY,
        fontSize: 10,
        fill: isReturn ? 0xA7F3D0 : 0xFCA5A5,
        dropShadow: { color: 0x000000, blur: 3, alpha: 0.8, distance: 1 },
      }),
    });
    this.timerText.anchor.set(0.5, 0);
    this.timerText.y = this.radius + 6;
    this.container.addChild(this.timerText);
  }

  update(dt: number): void {
    if (this.isExpired || this.isEntered) return;

    if (!this.isReturnPortal) {
      this.durationRemaining -= dt;
      if (this.durationRemaining <= 0) {
        this.durationRemaining = 0;
        this.isExpired = true;
      }
      this.timerText.text = `Chiude tra: ${Math.ceil(this.durationRemaining)}s`;
    }

    this.rot += dt * 3.5;

    // Draw animated swirling vortex
    this.vortexGraphics.clear();
    const primaryColor = this.isReturnPortal ? 0x10B981 : 0x8B5CF6;
    const accentColor = this.isReturnPortal ? 0x34D399 : 0xEC4899;

    // Dark void core
    this.vortexGraphics.circle(0, 0, this.radius);
    this.vortexGraphics.fill({ color: 0x0F0728, alpha: 0.88 });
    this.vortexGraphics.stroke({ color: primaryColor, width: 2.5, alpha: 0.85 });

    // Spiral swirl arms
    const arms = 6;
    for (let i = 0; i < arms; i++) {
      const baseA = this.rot + (i * Math.PI * 2) / arms;
      const points: number[] = [];
      for (let step = 0; step <= 8; step++) {
        const r = (step / 8) * (this.radius - 4);
        const a = baseA + (step * 0.35);
        points.push(Math.cos(a) * r, Math.sin(a) * r);
      }
      this.vortexGraphics.poly(points, false);
      this.vortexGraphics.stroke({ color: (i % 2 === 0) ? primaryColor : accentColor, width: 2.2, alpha: 0.75 });
    }

    // Outer pulsating rune ring
    this.runeRing.clear();
    const pulse = 1 + Math.sin(Date.now() / 250) * 0.12;
    this.runeRing.circle(0, 0, (this.radius + 8) * pulse);
    this.runeRing.stroke({ color: accentColor, width: 1.5, alpha: 0.5 });
  }
}
