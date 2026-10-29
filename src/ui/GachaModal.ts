import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GachaSystem, type GachaPullResult } from '../systems/gachaSystem';
import { SaveSystem } from '../systems/saveSystem';
import { renderStars } from '../systems/promotionSystem';
import { audioManager } from '../systems/audioManager';

// ============================================================
//  NarutoSurvivor — Gacha (Rotoli Ninja) Summoning Modal
// ============================================================

const RARITY_COLORS: Record<number, number> = {
  1: 0x9CA3AF,
  2: 0x22C55E,
  3: 0x3B82F6,
  4: 0xA855F7,
  5: 0xF59E0B,
};

function makeText(
  text: string,
  fontSize: number,
  fill: number,
  bold = false,
): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Outfit, Inter, sans-serif',
      fontSize,
      fill,
      fontWeight: bold ? '700' : '400',
    }),
  });
}

export class GachaModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private onCloseCallback?: () => void;
  private currencyText!: Text;
  private resultsContainer!: Container;
  private altarContainer!: Container;

  constructor(parentStage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    parentStage.addChild(this.container);

    this.buildUI();
  }

  private buildUI(): void {
    const W = this.W;
    const H = this.H;

    // ── Semi-transparent backdrop ───────────────────────────
    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x05070A, alpha: 0.95 });
    this.container.addChild(backdrop);

    // ── Modal window ─────────────────────────────────────────
    const modalW = 1060;
    const modalH = 620;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.fill({ color: 0x0F172A });
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.stroke({ color: 0x38BDF8, width: 2, alpha: 0.5 });
    this.container.addChild(modalBg);

    // ── Header ───────────────────────────────────────────────
    const title = makeText('📜  TEMPIO DI EVOCAZIONE SHINOBI (GACHA)', 26, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 24;
    this.container.addChild(title);

    const subtitle = makeText(
      'Sblocca nuovi ninja leggendari per la tua squadra o accumula frammenti di promozione',
      13,
      0x94A3B8,
    );
    subtitle.anchor.set(0.5, 0);
    subtitle.x = W / 2;
    subtitle.y = modalY + 62;
    this.container.addChild(subtitle);

    // Currency bar
    this.currencyText = makeText('', 14, 0xFFFFFF, true);
    this.currencyText.anchor.set(0.5, 0);
    this.currencyText.x = W / 2;
    this.currencyText.y = modalY + 86;
    this.container.addChild(this.currencyText);

    // Backdrop click-to-close
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());

    // Close button (X)
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.x = modalX + modalW - 50;
    closeBtn.y = modalY + 20;

    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 36, 36, 8);
    closeBg.fill({ color: 0x334155 });
    closeBg.roundRect(0, 0, 36, 36, 8);
    closeBg.stroke({ color: 0x64748B, width: 1.5 });
    closeBtn.addChild(closeBg);

    const closeTxt = makeText('✕', 18, 0xFFFFFF, true);
    closeTxt.anchor.set(0.5);
    closeTxt.x = 18;
    closeTxt.y = 18;
    closeBtn.addChild(closeTxt);

    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.addChild(closeBtn);

    // ── Altar / Center Summoning Area ─────────────────────────
    this.altarContainer = new Container();
    this.altarContainer.x = W / 2;
    this.altarContainer.y = modalY + 280;
    this.container.addChild(this.altarContainer);

    this.renderAltar();

    // ── Results Area (overlays center on summon) ─────────────
    this.resultsContainer = new Container();
    this.resultsContainer.visible = false;
    this.container.addChild(this.resultsContainer);

    // ── Rates banner ─────────────────────────────────────────
    const ratesText = makeText(
      'Probabilità: 5★ Sei Vie (2%)  •  4★ Leggendari (6%)  •  3★ Jōnin (16%)  •  2★ Chūnin (31%)  •  1★ Genin (45%)',
      12,
      0x64748B,
    );
    ratesText.anchor.set(0.5);
    ratesText.x = W / 2;
    ratesText.y = modalY + modalH - 96;
    this.container.addChild(ratesText);

    // ── Summon Buttons ───────────────────────────────────────
    const btnY = modalY + modalH - 58;
    const btnW = 210;
    const btnH = 42;
    const gap = 16;
    const totalButtonsW = 4 * btnW + 3 * gap;
    const startBtnX = (W - totalButtonsW) / 2;

    // 1x Scroll
    this.createButton(
      startBtnX,
      btnY,
      btnW,
      btnH,
      `📜 Evoca 1x (1 Rotolo)`,
      0x2563EB,
      () => this.doSummon('single', 'scroll'),
    );

    // 1x Ryo
    this.createButton(
      startBtnX + (btnW + gap),
      btnY,
      btnW,
      btnH,
      `¥ Evoca 1x (150 Ryo)`,
      0x059669,
      () => this.doSummon('single', 'ryo'),
    );

    // 10x Scroll
    this.createButton(
      startBtnX + 2 * (btnW + gap),
      btnY,
      btnW,
      btnH,
      `📜 Evoca 10x (10 Rotoli)`,
      0x7C3AED,
      () => this.doSummon('multi', 'scroll'),
    );

    // 10x Ryo
    this.createButton(
      startBtnX + 3 * (btnW + gap),
      btnY,
      btnW,
      btnH,
      `¥ Evoca 10x (1350 Ryo)`,
      0xD97706,
      () => this.doSummon('multi', 'ryo'),
    );
  }

  private renderAltar(): void {
    this.altarContainer.removeChildren();

    // Summoning circle (Fuuinjutsu)
    const circle = new Graphics();
    circle.circle(0, 0, 110);
    circle.stroke({ color: 0x38BDF8, width: 2, alpha: 0.6 });
    circle.circle(0, 0, 85);
    circle.stroke({ color: 0xF59E0B, width: 1.5, alpha: 0.5 });
    circle.circle(0, 0, 50);
    circle.fill({ color: 0x1E293B, alpha: 0.8 });
    this.altarContainer.addChild(circle);

    // Central Kanji / Scroll Icon
    const scrollIcon = makeText('📜', 48, 0xFFFFFF);
    scrollIcon.anchor.set(0.5);
    this.altarContainer.addChild(scrollIcon);

    const altarPrompt = makeText('Usa i tuoi Rotoli o i Ryo guadagnati in battaglia', 14, 0x94A3B8);
    altarPrompt.anchor.set(0.5);
    altarPrompt.y = 135;
    this.altarContainer.addChild(altarPrompt);
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: number,
    onClick: () => void,
  ): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 8);
    bg.fill({ color });
    btn.addChild(bg);

    const label = makeText(text, 12, 0xFFFFFF, true);
    label.anchor.set(0.5);
    label.x = w / 2;
    label.y = h / 2;
    btn.addChild(label);

    btn.x = x;
    btn.y = y;

    btn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      onClick();
    });

    btn.on('pointerover', () => {
      bg.alpha = 0.85;
    });
    btn.on('pointerout', () => {
      bg.alpha = 1.0;
    });

    this.container.addChild(btn);
    return btn;
  }

  private updateCurrencyDisplay(): void {
    const profile = SaveSystem.getProfile();
    this.currencyText.text = `📜 Rotoli di Evocazione: ${profile.scrolls}   •   💰 Ryo Disponibili: ¥ ${profile.ryo}`;
  }

  private doSummon(type: 'single' | 'multi', payment: 'scroll' | 'ryo'): void {
    if (type === 'single') {
      const res = GachaSystem.pullSingle(payment);
      if (!res.success) {
        alert(res.error);
        return;
      }
      this.showResults([res.result!]);
    } else {
      const res = GachaSystem.pullMulti(payment);
      if (!res.success) {
        alert(res.error);
        return;
      }
      this.showResults(res.results!);
    }

    this.updateCurrencyDisplay();
  }

  private showResults(results: GachaPullResult[]): void {
    this.altarContainer.visible = false;
    this.resultsContainer.removeChildren();
    this.resultsContainer.visible = true;

    // Check highest rarity in roll for SFX
    const maxRank = Math.max(...results.map(r => r.rank));
    if (maxRank >= 4) {
      audioManager.playSFX('promotion');
    } else {
      audioManager.playSFX('level_up');
    }

    const W = this.W;
    const modalY = (this.H - 620) / 2;

    if (results.length === 1) {
      // Single card centered
      const card = this.buildResultCard(results[0], 240, 240);
      card.x = (W - 240) / 2;
      card.y = modalY + 140;
      this.resultsContainer.addChild(card);
    } else {
      // 10 cards: 2 rows of 5
      const cols = 5;
      const cardW = 160;
      const cardH = 135;
      const gapX = 16;
      const gapY = 14;
      const totalW = cols * cardW + (cols - 1) * gapX;
      const startX = (W - totalW) / 2;
      const startY = modalY + 120;

      results.forEach((r, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const card = this.buildCompactResultCard(r, cardW, cardH);
        card.x = startX + col * (cardW + gapX);
        card.y = startY + row * (cardH + gapY);
        this.resultsContainer.addChild(card);
      });
    }

    // Action Buttons
    const btnGap = 20;
    const btnW = 180;
    const btnH = 38;
    const startActionsX = (W - (btnW * 2 + btnGap)) / 2;
    const actionsY = modalY + 440;

    // 1. Evoca Ancora
    const okBtn = new Container();
    okBtn.eventMode = 'static';
    okBtn.cursor = 'pointer';
    okBtn.x = startActionsX;
    okBtn.y = actionsY;
    const okBg = new Graphics();
    okBg.roundRect(0, 0, btnW, btnH, 8);
    okBg.fill({ color: 0x38BDF8 });
    okBtn.addChild(okBg);
    const okTxt = makeText('EVOCA ANCORA', 13, 0x000000, true);
    okTxt.anchor.set(0.5);
    okTxt.x = btnW / 2;
    okTxt.y = btnH / 2;
    okBtn.addChild(okTxt);
    okBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.resultsContainer.visible = false;
      this.altarContainer.visible = true;
    });
    this.resultsContainer.addChild(okBtn);

    // 2. Torna al Roster
    const backBtn = new Container();
    backBtn.eventMode = 'static';
    backBtn.cursor = 'pointer';
    backBtn.x = startActionsX + btnW + btnGap;
    backBtn.y = actionsY;
    const backBg = new Graphics();
    backBg.roundRect(0, 0, btnW, btnH, 8);
    backBg.fill({ color: 0x10B981 });
    backBtn.addChild(backBg);
    const backTxt = makeText('VAI AL ROSTER', 13, 0x000000, true);
    backTxt.anchor.set(0.5);
    backTxt.x = btnW / 2;
    backTxt.y = btnH / 2;
    backBtn.addChild(backTxt);
    backBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.hide();
    });
    this.resultsContainer.addChild(backBtn);

    this.resultsContainer.addChild(okBtn);
  }

  private buildResultCard(result: GachaPullResult, w: number, h: number): Container {
    const card = new Container();
    const rarityColor = RARITY_COLORS[result.rank] ?? 0xFFFFFF;

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 14);
    bg.fill({ color: 0x1E293B });
    bg.roundRect(0, 0, w, h, 14);
    bg.stroke({ color: rarityColor, width: 3 });
    card.addChild(bg);

    // Avatar
    const avatar = new Graphics();
    avatar.circle(w / 2, 55, 34);
    avatar.fill({ color: result.character.assets.color });
    card.addChild(avatar);

    // Stars
    const stars = makeText(renderStars(result.rank), 14, rarityColor, true);
    stars.anchor.set(0.5);
    stars.x = w / 2;
    stars.y = 104;
    card.addChild(stars);

    // Name
    const name = makeText(result.character.nameIT, 14, 0xFFFFFF, true);
    name.anchor.set(0.5);
    name.x = w / 2;
    name.y = 126;
    card.addChild(name);

    // Form
    const form = makeText(result.character.form, 10, 0x94A3B8);
    form.anchor.set(0.5);
    form.x = w / 2;
    form.y = 146;
    card.addChild(form);

    // Result badge: New or Fragments
    const badge = new Graphics();
    badge.roundRect(16, h - 44, w - 32, 28, 6);
    if (result.isNew) {
      badge.fill({ color: 0x10B981 });
      card.addChild(badge);
      const bTxt = makeText('✨ NUOVO NINJA! ✨', 11, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.x = w / 2;
      bTxt.y = h - 30;
      card.addChild(bTxt);
    } else {
      badge.fill({ color: 0x6366F1 });
      card.addChild(badge);
      const bTxt = makeText(`+${result.fragmentsAwarded} Frammenti`, 11, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.x = w / 2;
      bTxt.y = h - 30;
      card.addChild(bTxt);
    }

    return card;
  }

  private buildCompactResultCard(result: GachaPullResult, w: number, h: number): Container {
    const card = new Container();
    const rarityColor = RARITY_COLORS[result.rank] ?? 0xFFFFFF;

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 10);
    bg.fill({ color: 0x1E293B });
    bg.roundRect(0, 0, w, h, 10);
    bg.stroke({ color: rarityColor, width: 2 });
    card.addChild(bg);

    // Small avatar
    const avatar = new Graphics();
    avatar.circle(28, 28, 16);
    avatar.fill({ color: result.character.assets.color });
    card.addChild(avatar);

    // Stars
    const stars = makeText(renderStars(result.rank), 10, rarityColor, true);
    stars.x = 52;
    stars.y = 14;
    card.addChild(stars);

    // Name
    const name = makeText(result.character.nameIT, 11, 0xFFFFFF, true);
    name.x = 52;
    name.y = 30;
    card.addChild(name);

    // Badge
    const badge = new Graphics();
    badge.roundRect(8, h - 30, w - 16, 22, 6);
    if (result.isNew) {
      badge.fill({ color: 0x10B981 });
      card.addChild(badge);
      const bTxt = makeText('✨ NUOVO! ✨', 10, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.x = w / 2;
      bTxt.y = h - 19;
      card.addChild(bTxt);
    } else {
      badge.fill({ color: 0x4F46E5 });
      card.addChild(badge);
      const bTxt = makeText(`+${result.fragmentsAwarded} Framm.`, 10, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.x = w / 2;
      bTxt.y = h - 19;
      card.addChild(bTxt);
    }

    return card;
  }

  private escHandler?: (e: KeyboardEvent) => void;

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.updateCurrencyDisplay();
    this.altarContainer.visible = true;
    this.resultsContainer.visible = false;
    this.container.visible = true;

    this.escHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.hide();
    };
    window.addEventListener('keydown', this.escHandler);
  }

  hide(): void {
    if (this.escHandler) {
      window.removeEventListener('keydown', this.escHandler);
      this.escHandler = undefined;
    }
    this.container.visible = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
