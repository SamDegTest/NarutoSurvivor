// ============================================================
//  NarutoSurvivor — GameOverScene (Vampire Survivors Style)
// ============================================================

import { Container, Graphics, Text, TextStyle, Application } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { renderStars } from '../systems/promotionSystem';
import { GamepadMenuNavigator } from '../controls/GamepadMenuNavigator';
import type { Character, StarRank } from '../types/character';

export interface RunSummaryData {
  character: Character;
  rank: StarRank;
  elapsedSec: number;
  level: number;
  kills: number;
  bossesDefeated: number;
  chakraCollected: number;
  ryoEarned: number;
  fragmentsEarned: number;
  scrollsEarned: number;
  activeSynergyName?: string;
  isVictory?: boolean;
}

const FONT = GAME_CONFIG.FONT_FAMILY;

function textLabel(txt: string, size: number, color = 0xffffff, bold = false): Text {
  return new Text({
    text: txt,
    style: new TextStyle({
      fontFamily: FONT,
      fontSize: size,
      fill: color,
      fontWeight: bold ? '700' : '400',
      dropShadow: { color: 0x000000, alpha: 0.8, blur: 4, distance: 1 },
    }),
  });
}

export class GameOverScene {
  private readonly app: Application;
  private readonly container: Container;
  private onRestartCallback?: () => void;
  private onVillageCallback?: () => void;
  private keyListener?: (e: KeyboardEvent) => void;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    app.stage.addChild(this.container);
  }

  show(data: RunSummaryData, onRestart: () => void, onVillage: () => void): void {
    this.onRestartCallback = onRestart;
    this.onVillageCallback = onVillage;
    this.container.removeChildren();
    this.container.visible = true;

    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // 1. Full Dark Backdrop with Vignette
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x070913, alpha: 0.94 });
    this.container.addChild(bg);

    // 2. Center Panel (Glassmorphism modal)
    const MODAL_W = Math.min(680, W - 40);
    const MODAL_H = Math.min(540, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modal = new Container();
    modal.x = modalX;
    modal.y = modalY;
    this.container.addChild(modal);

    const isVictory = !!data.isVictory;
    const themeColor = isVictory ? 0xFBBF24 : 0xEF4444;

    const modalBg = new Graphics();
    modalBg.roundRect(0, 0, MODAL_W, MODAL_H, 20);
    modalBg.fill({ color: 0x111827 });
    modalBg.stroke({ color: themeColor, width: 2.5, alpha: 0.85 });
    modal.addChild(modalBg);

    // Kanji Background Watermark
    const watermark = textLabel(isVictory ? '完全勝利' : '作戦終了', 72, 0xffffff);
    watermark.alpha = 0.04;
    watermark.anchor.set(0.5);
    watermark.x = MODAL_W / 2;
    watermark.y = MODAL_H / 2 - 20;
    modal.addChild(watermark);

    // 3. Header Banner
    const bannerTitle = isVictory ? '🏆 VITTORIA SHINOBI' : '💀 MISSIONE TERMINATA';
    const title = textLabel(bannerTitle, 28, themeColor, true);
    title.anchor.set(0.5, 0);
    title.x = MODAL_W / 2;
    title.y = 22;
    modal.addChild(title);

    const subtitleText = isVictory
      ? 'Hai sconfitto i capi Akatsuki e protetto il Villaggio!'
      : 'Il tuo chakra si è esaurito, ma il tuo spirito ninja continua a vivere';
    const sub = textLabel(subtitleText, 13, 0x9CA3AF);
    sub.anchor.set(0.5, 0);
    sub.x = MODAL_W / 2;
    sub.y = 56;
    modal.addChild(sub);

    // 4. Character Card Bar
    const charBar = new Graphics();
    charBar.roundRect(24, 82, MODAL_W - 48, 52, 12);
    charBar.fill({ color: 0x1F2937, alpha: 0.7 });
    charBar.stroke({ color: 0x374151, width: 1 });
    modal.addChild(charBar);

    const charName = textLabel(data.character.nameIT, 16, 0xF97316, true);
    charName.x = 42;
    charName.y = 90;
    modal.addChild(charName);

    const charForm = textLabel(`${data.character.form}  •  ${renderStars(data.rank)}`, 12, 0xCBD5E1);
    charForm.x = 42;
    charForm.y = 112;
    modal.addChild(charForm);

    if (data.activeSynergyName) {
      const synBadge = new Graphics();
      synBadge.roundRect(MODAL_W - 250, 92, 210, 30, 8);
      synBadge.fill({ color: 0x78350F });
      synBadge.stroke({ color: 0xF59E0B, width: 1.5 });
      modal.addChild(synBadge);

      const synTxt = textLabel(`★ ${data.activeSynergyName}`, 11, 0xFDE68A, true);
      synTxt.anchor.set(0.5);
      synTxt.x = MODAL_W - 145;
      synTxt.y = 107;
      modal.addChild(synTxt);
    }

    // 5. Statistics Grid (2 columns x 4 rows)
    const m = Math.floor(data.elapsedSec / 60);
    const s = Math.floor(data.elapsedSec % 60);
    const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const stats = [
      { icon: '⏱️', label: 'Tempo Sopravvissuto', value: timeFormatted, color: 0x38BDF8 },
      { icon: '⚔️', label: 'Nemici Sconfitti', value: data.kills.toLocaleString('it-IT'), color: 0xF87171 },
      { icon: '👹', label: 'Boss Sconfitti', value: `${data.bossesDefeated}`, color: 0xE879F9 },
      { icon: '⬆️', label: 'Livello Shinobi', value: `Lv. ${data.level}`, color: 0x818CF8 },
      { icon: '◉', label: 'Chakra Raccolto', value: data.chakraCollected.toLocaleString('it-IT'), color: 0x67E8F9 },
      { icon: '¥', label: 'Ryo Guadagnati', value: `+${data.ryoEarned.toLocaleString('it-IT')} ¥`, color: 0xFBBF24 },
      { icon: '✦', label: 'Frammenti Ottenuti', value: `+${data.fragmentsEarned}`, color: 0x34D399 },
      { icon: '📜', label: 'Rotoli Shinobi', value: `+${data.scrollsEarned}`, color: 0xF97316 },
    ];

    const gridStartX = 28;
    const gridStartY = 150;
    const colW = (MODAL_W - 56) / 2;
    const rowH = 46;

    stats.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = gridStartX + col * colW;
      const y = gridStartY + row * rowH;

      const cellBg = new Graphics();
      cellBg.roundRect(x, y, colW - 10, rowH - 6, 8);
      cellBg.fill({ color: 0x171E2E, alpha: 0.6 });
      modal.addChild(cellBg);

      const ic = textLabel(st.icon, 18);
      ic.x = x + 12;
      ic.y = y + 8;
      modal.addChild(ic);

      const lbl = textLabel(st.label, 11, 0x94A3B8);
      lbl.x = x + 38;
      lbl.y = y + 6;
      modal.addChild(lbl);

      const val = textLabel(st.value, 15, st.color, true);
      val.x = x + 38;
      val.y = y + 20;
      modal.addChild(val);
    });

    // 6. Action Buttons
    const btnY = MODAL_H - 74;
    const btnW = (MODAL_W - 70) / 2;

    // Retry Button
    const retryBtn = new Container();
    retryBtn.eventMode = 'static';
    retryBtn.cursor = 'pointer';
    retryBtn.x = 26;
    retryBtn.y = btnY;

    const retryBg = new Graphics();
    retryBg.roundRect(0, 0, btnW, 48, 12);
    retryBg.fill({ color: 0xDC2626 });
    retryBtn.addChild(retryBg);

    const retryTxt = textLabel('🔄 RIGIOCA (R)', 14, 0xffffff, true);
    retryTxt.anchor.set(0.5);
    retryTxt.x = btnW / 2;
    retryTxt.y = 24;
    retryBtn.addChild(retryTxt);

    retryBtn.on('pointerover', () => { retryBg.tint = 0xFF4444; retryBtn.scale.set(1.02); });
    retryBtn.on('pointerout',  () => { retryBg.tint = 0xFFFFFF; retryBtn.scale.set(1.0); });
    retryBtn.on('pointertap',  () => this.handleRestart());
    modal.addChild(retryBtn);

    // Village Menu Button
    const villageBtn = new Container();
    villageBtn.eventMode = 'static';
    villageBtn.cursor = 'pointer';
    villageBtn.x = 38 + btnW;
    villageBtn.y = btnY;

    const villageBg = new Graphics();
    villageBg.roundRect(0, 0, btnW, 48, 12);
    villageBg.fill({ color: 0x2563EB });
    villageBtn.addChild(villageBg);

    const villageTxt = textLabel('⛩️ VILLAGGIO SHINOBI (M)', 14, 0xffffff, true);
    villageTxt.anchor.set(0.5);
    villageTxt.x = btnW / 2;
    villageTxt.y = 24;
    villageBtn.addChild(villageTxt);

    villageBtn.on('pointerover', () => { villageBg.tint = 0x3B82F6; villageBtn.scale.set(1.02); });
    villageBtn.on('pointerout',  () => { villageBg.tint = 0xFFFFFF; villageBtn.scale.set(1.0); });
    villageBtn.on('pointertap',  () => this.handleVillage());
    modal.addChild(villageBtn);

    // Gamepad Navigator context
    GamepadMenuNavigator.get()?.pushContext({
      id: 'game_over_scene',
      items: [
        { container: retryBtn, onSelect: () => this.handleRestart() },
        { container: villageBtn, onSelect: () => this.handleVillage() },
      ],
      columns: 2,
      selectedIndex: 0,
      onCancel: () => this.handleVillage(),
    });

    // Keyboard handlers (R to restart, M / Escape to return to menu)
    this.setupKeyboardShortcuts();
  }

  private setupKeyboardShortcuts(): void {
    if (this.keyListener) window.removeEventListener('keydown', this.keyListener);
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.container.visible) return;
      if (e.code === 'KeyR' || e.code === 'Enter') {
        this.handleRestart();
      } else if (e.code === 'KeyM' || e.code === 'Escape') {
        this.handleVillage();
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }

  private handleRestart(): void {
    this.hide();
    if (this.onRestartCallback) this.onRestartCallback();
  }

  private handleVillage(): void {
    this.hide();
    if (this.onVillageCallback) this.onVillageCallback();
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('game_over_scene');
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = undefined;
    }
    this.container.visible = false;
    this.container.removeChildren();
  }
}
