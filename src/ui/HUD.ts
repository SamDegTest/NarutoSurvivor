import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';

// ============================================================
//  NarutoSurvivor — HUD / UI Overlay (v2)
// ============================================================

interface HUDData {
  hp: number;
  maxHp: number;
  chakraOrbs: number;
  ryo: number;
  level: number;
  xp: number;
  xpToNext: number;
  elapsedSec: number;
  enemyCount: number;
  characterName: string;
  rank: number;
  fragments: number;
  paused: boolean;
  combinedActive: boolean;
}

const FONT = GAME_CONFIG.FONT_FAMILY;

function makeText(text: string, size: number, color = 0xffffff, bold = false): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: FONT,
      fontSize: size,
      fill: color,
      fontWeight: bold ? '700' : '400',
      dropShadow: { color: 0x000000, blur: 4, alpha: 0.7, distance: 2 },
    }),
  });
}

export class HUD {
  private readonly container: Container;
  private readonly W: number;
  private readonly H: number;

  // HP bar
  private hpBarBg!: Graphics;
  private hpBarFill!: Graphics;
  private hpText!: Text;

  // XP bar
  private xpBarBg!: Graphics;
  private xpBarFill!: Graphics;

  // Info texts
  private timerText!: Text;
  private enemyCountText!: Text;
  private ryoText!: Text;
  private chakraText!: Text;
  private levelText!: Text;
  private charNameText!: Text;
  private fragmentText!: Text;
  private combinedBadge!: Container;
  private pauseOverlay!: Container;

  // Damage numbers
  private dmgNumbers: { container: Container; text: Text; life: number; vy: number }[] = [];

  // Toast notifications
  private toasts: { container: Container; text: Text; life: number }[] = [];

  constructor(app: Application) {
    this.W = app.screen.width;
    this.H = app.screen.height;
    this.container = new Container();

    this.buildHUD();
    this.buildPauseOverlay();
    this.buildCombinedBadge();

    app.stage.addChild(this.container);
  }

  private buildHUD(): void {
    const W = this.W;
    const H = this.H;

    // ── Top panel bg ─────────────────────────────────────────
    const topPanel = new Graphics();
    topPanel.rect(0, 0, W, 68);
    topPanel.fill({ color: 0x000000, alpha: 0.60 });
    this.container.addChild(topPanel);

    // ── HP Bar ───────────────────────────────────────────────
    this.hpBarBg = new Graphics();
    this.hpBarBg.roundRect(12, 10, 270, 20, 10);
    this.hpBarBg.fill({ color: 0x1f1f1f });
    this.container.addChild(this.hpBarBg);

    this.hpBarFill = new Graphics();
    this.container.addChild(this.hpBarFill);

    this.hpText = makeText('HP 420 / 420', 11);
    this.hpText.x = 16;
    this.hpText.y = 32;
    this.container.addChild(this.hpText);

    // ── Level badge ───────────────────────────────────────────
    this.levelText = makeText('Lv.1', 16, 0xFBBF24, true);
    this.levelText.x = 14;
    this.levelText.y = 46;
    this.container.addChild(this.levelText);

    // ── Character name / rank ─────────────────────────────────
    this.charNameText = makeText('Naruto  ★☆☆☆☆', 13, 0xFED7AA);
    this.charNameText.x = 296;
    this.charNameText.y = 10;
    this.container.addChild(this.charNameText);

    // ── Timer ─────────────────────────────────────────────────
    this.timerText = makeText('00:00', 24, 0xffffff, true);
    this.timerText.anchor.set(0.5, 0);
    this.timerText.x = W / 2;
    this.timerText.y = 8;
    this.container.addChild(this.timerText);

    // ── Enemy count ───────────────────────────────────────────
    this.enemyCountText = makeText('0 nemici', 12, 0xFCA5A5);
    this.enemyCountText.anchor.set(0.5, 0);
    this.enemyCountText.x = W / 2;
    this.enemyCountText.y = 38;
    this.container.addChild(this.enemyCountText);

    // ── Right panel ───────────────────────────────────────────
    this.chakraText = makeText('◉ 0', 14, 0x22D3EE);
    this.chakraText.x = W - 210;
    this.chakraText.y = 8;
    this.container.addChild(this.chakraText);

    this.ryoText = makeText('¥ 0', 14, 0xFBBF24);
    this.ryoText.x = W - 210;
    this.ryoText.y = 26;
    this.container.addChild(this.ryoText);

    this.fragmentText = makeText('✦ 0 frammenti', 12, 0xA78BFA);
    this.fragmentText.x = W - 210;
    this.fragmentText.y = 46;
    this.container.addChild(this.fragmentText);

    // ── XP bar (bottom) ───────────────────────────────────────
    this.xpBarBg = new Graphics();
    this.xpBarBg.rect(0, H - 7, W, 7);
    this.xpBarBg.fill({ color: 0x1f1f1f });
    this.container.addChild(this.xpBarBg);

    this.xpBarFill = new Graphics();
    this.container.addChild(this.xpBarFill);

    // ── Controls hint ─────────────────────────────────────────
    const hint = makeText('P=Pausa  F=Frammenti  M=Audio  WASD=Muovi', 11, 0x374151);
    hint.x = W / 2;
    hint.anchor.set(0.5, 1);
    hint.y = H - 10;
    this.container.addChild(hint);
  }

  private buildPauseOverlay(): void {
    this.pauseOverlay = new Container();
    this.pauseOverlay.visible = false;

    const bg = new Graphics();
    bg.rect(0, 0, this.W, this.H);
    bg.fill({ color: 0x000000, alpha: 0.55 });
    this.pauseOverlay.addChild(bg);

    const t = makeText('⏸  PAUSA', 56, 0xFBBF24, true);
    t.anchor.set(0.5);
    t.x = this.W / 2;
    t.y = this.H / 2;
    this.pauseOverlay.addChild(t);

    const sub = makeText('Premi P per continuare', 18, 0x9CA3AF);
    sub.anchor.set(0.5, 0);
    sub.x = this.W / 2;
    sub.y = this.H / 2 + 48;
    this.pauseOverlay.addChild(sub);

    this.container.addChild(this.pauseOverlay);
  }

  private buildCombinedBadge(): void {
    this.combinedBadge = new Container();
    this.combinedBadge.visible = false;

    const bg = new Graphics();
    bg.roundRect(0, 0, 200, 26, 13);
    bg.fill({ color: 0x7C3AED, alpha: 0.85 });
    this.combinedBadge.addChild(bg);

    const t = makeText('⚡ TECNICA COMBINATA', 11, 0xffffff, true);
    t.anchor.set(0.5);
    t.x = 100;
    t.y = 13;
    this.combinedBadge.addChild(t);

    this.combinedBadge.x = this.W / 2 - 100;
    this.combinedBadge.y = 72;
    this.container.addChild(this.combinedBadge);
  }

  // ── Public API ───────────────────────────────────────────────

  update(data: HUDData): void {
    // HP bar
    const hpPct = Math.max(0, data.hp / data.maxHp);
    const hpColor = hpPct > 0.6 ? 0x22C55E : hpPct > 0.25 ? 0xF59E0B : 0xEF4444;
    this.hpBarFill.clear();
    this.hpBarFill.roundRect(12, 10, 270 * hpPct, 20, 10);
    this.hpBarFill.fill({ color: hpColor });
    this.hpText.text = `HP ${Math.ceil(data.hp)} / ${Math.ceil(data.maxHp)}`;

    // XP bar
    const xpPct = data.xpToNext > 0 ? data.xp / data.xpToNext : 1;
    this.xpBarFill.clear();
    this.xpBarFill.rect(0, this.H - 7, this.W * xpPct, 7);
    this.xpBarFill.fill({ color: 0x818CF8 });

    // Texts
    this.levelText.text = `Lv.${data.level}`;
    const stars = '★'.repeat(data.rank) + '☆'.repeat(5 - data.rank);
    this.charNameText.text = `${data.characterName}  ${stars}`;

    const m = Math.floor(data.elapsedSec / 60);
    const s = Math.floor(data.elapsedSec % 60);
    this.timerText.text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    this.enemyCountText.text = `${data.enemyCount} nemici`;
    this.chakraText.text = `◉ ${data.chakraOrbs}`;
    this.ryoText.text = `¥ ${data.ryo}`;
    this.fragmentText.text = `✦ ${data.fragments} frammenti`;

    // Combined badge
    this.combinedBadge.visible = data.combinedActive;

    // Pause overlay
    this.pauseOverlay.visible = data.paused;

    // Damage number animation
    this.dmgNumbers = this.dmgNumbers.filter(d => {
      d.life -= 1 / 60;
      d.container.y -= d.vy;
      d.text.alpha = Math.max(0, d.life * 2);
      if (d.life <= 0) { this.container.removeChild(d.container); return false; }
      return true;
    });

    // Toast animation
    this.toasts = this.toasts.filter((toast, i) => {
      toast.life -= 1 / 60;
      toast.container.y = this.H - 100 - i * 36;
      toast.container.alpha = toast.life > 0.5 ? 1 : toast.life * 2;
      if (toast.life <= 0) { this.container.removeChild(toast.container); return false; }
      return true;
    });
  }

  showDamageNumber(screenX: number, screenY: number, value: number, isCrit = false): void {
    const container = new Container();
    const text = makeText(
      isCrit ? `💥 ${value}` : `${value}`,
      isCrit ? 20 : 14,
      isCrit ? 0xFBBF24 : 0xffa0a0,
      isCrit,
    );
    text.anchor.set(0.5);
    container.addChild(text);
    container.x = screenX;
    container.y = screenY;
    this.container.addChild(container);
    this.dmgNumbers.push({ container, text, life: 1.2, vy: isCrit ? 2.0 : 1.3 });
  }

  showToast(message: string): void {
    const container = new Container();
    const bg = new Graphics();
    const txt = makeText(message, 14, 0xffffff, true);
    const padX = 18;
    const padY = 8;
    txt.x = padX;
    txt.y = padY;
    bg.roundRect(0, 0, txt.width + padX * 2, txt.height + padY * 2, 10);
    bg.fill({ color: 0x111827, alpha: 0.9 });
    container.addChild(bg);
    container.addChild(txt);
    container.x = this.W / 2 - container.width / 2;
    container.y = this.H - 100;
    this.container.addChild(container);
    this.toasts.push({ container, text: txt, life: 2.5 });
  }

  showGameOver(onRestart: () => void, onMenu?: () => void): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, this.W, this.H);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(overlay);

    const title = makeText('💀  GAME OVER', 64, 0xEF4444, true);
    title.anchor.set(0.5);
    title.x = this.W / 2;
    title.y = this.H / 2 - 80;
    this.container.addChild(title);

    const sub = makeText('Premi [ R ] per ricominciare  •  Premi [ M ] per il Menu Shinobi', 20, 0x94A3B8);
    sub.anchor.set(0.5);
    sub.x = this.W / 2;
    sub.y = this.H / 2 - 10;
    this.container.addChild(sub);

    // Clickable Menu Button
    const menuBtn = new Container();
    menuBtn.eventMode = 'static';
    menuBtn.cursor = 'pointer';
    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, 220, 44, 10);
    btnBg.fill({ color: 0x2563EB });
    menuBtn.addChild(btnBg);
    const btnTxt = makeText('MENU & EVOCAZIONE', 14, 0xFFFFFF, true);
    btnTxt.anchor.set(0.5);
    btnTxt.x = 110;
    btnTxt.y = 22;
    menuBtn.addChild(btnTxt);
    menuBtn.x = this.W / 2 - 110;
    menuBtn.y = this.H / 2 + 40;
    this.container.addChild(menuBtn);

    const cleanup = () => {
      window.removeEventListener('keydown', keyHandler);
      this.container.removeChild(overlay);
      this.container.removeChild(title);
      this.container.removeChild(sub);
      this.container.removeChild(menuBtn);
    };

    menuBtn.on('pointerdown', () => {
      cleanup();
      if (onMenu) onMenu();
    });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        cleanup();
        onRestart();
      } else if (e.code === 'KeyM') {
        cleanup();
        if (onMenu) onMenu();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }
}
