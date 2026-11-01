import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';

// ============================================================
//  NarutoSurvivor — HUD / UI Overlay (v2)
// ============================================================

export interface HUDSlotMove {
  icon: string;
  name: string;
  level: number;
  color: number;
}

export interface HUDSlotData {
  id: string;
  moves: HUDSlotMove[];
  isActive: boolean;
}

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
  inputSource?: 'keyboard' | 'gamepad' | 'touch';
  activeJutsu?: Array<{ icon: string; name: string; level: number }>;
  activeTools?: Array<{ icon: string; name: string; level: number }>;
  slots?: HUDSlotData[];
  threatBadge?: string;
  threatColor?: number;
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
  private threatBadgeText!: Text;
  private ryoText!: Text;
  private chakraText!: Text;
  private levelText!: Text;
  private charNameText!: Text;
  private fragmentText!: Text;
  private combinedBadge!: Container;
  private pauseOverlay!: Container;
  private slotsContainer!: Container;
  private bottomActionBarContainer!: Container;
  private onSelectSlotCallback?: (slotIndex: number) => void;

  setOnSelectSlot(cb: (slotIndex: number) => void): void {
    this.onSelectSlotCallback = cb;
  }

  // Damage numbers
  private dmgNumbers: { container: Container; text: Text; life: number; vy: number }[] = [];

  // Toast notifications
  private toasts: { container: Container; text: Text; life: number }[] = [];

  // Controls hint text ref (for dynamic update)
  private hintText!: Text;

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

    // ── Active Loadout Chips Container ───────────────────────
    this.slotsContainer = new Container();
    this.slotsContainer.x = 296;
    this.slotsContainer.y = 34;
    this.container.addChild(this.slotsContainer);

    // ── Timer ─────────────────────────────────────────────────
    this.timerText = makeText('00:00', 24, 0xffffff, true);
    this.timerText.anchor.set(0.5, 0);
    this.timerText.x = W / 2;
    this.timerText.y = 8;
    this.container.addChild(this.timerText);

    // ── Enemy count & Threat Level ────────────────────────────
    this.enemyCountText = makeText('0 nemici', 12, 0xFCA5A5);
    this.enemyCountText.anchor.set(1, 0);
    this.enemyCountText.x = W / 2 - 8;
    this.enemyCountText.y = 38;
    this.container.addChild(this.enemyCountText);

    this.threatBadgeText = makeText('• MINACCIA: BASSA 🟢', 11, 0x22C55E, true);
    this.threatBadgeText.anchor.set(0, 0);
    this.threatBadgeText.x = W / 2 + 4;
    this.threatBadgeText.y = 39;
    this.container.addChild(this.threatBadgeText);

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
    this.hintText = makeText('P=Pausa  F=Frammenti  M=Audio  WASD=Muovi', 11, 0x374151);
    this.hintText.x = W / 2;
    this.hintText.anchor.set(0.5, 1);
    this.hintText.y = H - 10;
    this.container.addChild(this.hintText);

    // ── Bottom Action Bar (Slot Mosse Shinobi) ───────────────
    this.bottomActionBarContainer = new Container();
    this.container.addChild(this.bottomActionBarContainer);
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
    if (data.threatBadge) {
      this.threatBadgeText.text = `• MINACCIA: ${data.threatBadge}`;
      if (data.threatColor !== undefined) {
        this.threatBadgeText.style.fill = data.threatColor;
      }
    }
    this.chakraText.text = `◉ ${data.chakraOrbs}`;
    this.ryoText.text = `¥ ${data.ryo}`;
    this.fragmentText.text = `✦ ${data.fragments} frammenti`;

    // Active Jutsu and Tools loadout chips
    this.slotsContainer.removeChildren();
    let chipX = 0;
    if (data.activeJutsu) {
      data.activeJutsu.forEach(j => {
        const chip = new Container();
        chip.x = chipX;
        const bg = new Graphics();
        bg.roundRect(0, 0, 48, 20, 5);
        bg.fill({ color: 0x1E293B, alpha: 0.90 });
        bg.stroke({ color: 0x38BDF8, width: 1.2 });
        chip.addChild(bg);
        const t = makeText(`${j.icon} ${j.level}`, 9.5, 0xE0F2FE, true);
        t.anchor.set(0.5);
        t.x = 24; t.y = 10;
        chip.addChild(t);
        this.slotsContainer.addChild(chip);
        chipX += 52;
      });
    }
    if (data.activeTools) {
      data.activeTools.forEach(t => {
        const chip = new Container();
        chip.x = chipX;
        const bg = new Graphics();
        bg.roundRect(0, 0, 48, 20, 5);
        bg.fill({ color: 0x13251A, alpha: 0.90 });
        bg.stroke({ color: 0x22C55E, width: 1.2 });
        chip.addChild(bg);
        const txt = makeText(`${t.icon} ${t.level}`, 9.5, 0xDCFCE7, true);
        txt.anchor.set(0.5);
        txt.x = 24; txt.y = 10;
        chip.addChild(txt);
        this.slotsContainer.addChild(chip);
        chipX += 52;
      });
    }

    // Combined badge
    this.combinedBadge.visible = data.combinedActive;

    // Pause overlay
    this.pauseOverlay.visible = data.paused;

    // ── Bottom Action Bar (Mosse in uso & combinazioni) ────
    this.bottomActionBarContainer.removeChildren();
    if (data.slots && data.slots.length > 0) {
      const slotCount = data.slots.length;
      const slotW = 142;
      const slotH = 46;
      const gap = 12;
      const totalW = slotCount * slotW + (slotCount - 1) * gap;
      const startX = (this.W - totalW) / 2;
      const barY = this.H - 68;

      data.slots.forEach((slot, i) => {
        const slotCont = new Container();
        slotCont.eventMode = 'static';
        slotCont.cursor = 'pointer';
        slotCont.x = startX + i * (slotW + gap);
        slotCont.y = barY;

        const isAct = slot.isActive;
        const isMerged = slot.moves.length > 1;

        const bg = new Graphics();
        bg.roundRect(0, 0, slotW, slotH, 8);
        bg.fill({ color: isAct ? (isMerged ? 0x2A1A45 : 0x1E293B) : 0x0F172A, alpha: 0.95 });
        const strokeColor = isAct ? (isMerged ? 0xF59E0B : 0x38BDF8) : (isMerged ? 0xA855F7 : 0x334155);
        bg.stroke({ color: strokeColor, width: isAct ? 2.4 : 1.2 });
        slotCont.addChild(bg);

        // Hotkey badge
        const hotkeyText = data.inputSource === 'gamepad'
          ? (i === 0 ? 'L1' : (i === 1 ? 'R1' : `[${i + 1}]`))
          : `[ ${i + 1} ]`;
        const hotkey = makeText(hotkeyText, 9.5, isAct ? 0xFBBF24 : 0x64748B, true);
        hotkey.x = 8; hotkey.y = 4;
        slotCont.addChild(hotkey);

        // Status / Combo tag
        if (isAct) {
          const actTag = makeText(isMerged ? '⚡ FUSIONE ATTIVA' : '✔ ATTIVO', 8, 0x34D399, true);
          actTag.anchor.set(1, 0);
          actTag.x = slotW - 8; actTag.y = 4;
          slotCont.addChild(actTag);
        } else if (isMerged) {
          const comboTag = makeText(`FUSIONE x${slot.moves.length}`, 8, 0xC084FC, true);
          comboTag.anchor.set(1, 0);
          comboTag.x = slotW - 8; comboTag.y = 4;
          slotCont.addChild(comboTag);
        }

        // Icons
        const iconsCont = new Container();
        iconsCont.x = 8; iconsCont.y = 20;
        let ix = 0;
        slot.moves.forEach((move, mi) => {
          const ic = makeText(move.icon, 16, 0xFFFFFF);
          ic.x = ix;
          iconsCont.addChild(ic);
          ix += 22;
          if (mi < slot.moves.length - 1) {
            const plus = makeText('+', 11, 0xFBBF24, true);
            plus.x = ix - 4; plus.y = 2;
            iconsCont.addChild(plus);
            ix += 12;
          }
        });
        slotCont.addChild(iconsCont);

        // Level or Name
        const labelText = isMerged
          ? `Combo (${slot.moves.length})`
          : (slot.moves[0]?.name.length > 12 ? slot.moves[0]?.name.slice(0, 11) + '…' : (slot.moves[0]?.name ?? ''));
        const lbl = makeText(labelText, 9.5, isAct ? 0xFFFFFF : 0x94A3B8, isAct);
        lbl.anchor.set(1, 1);
        lbl.x = slotW - 8; lbl.y = slotH - 4;
        slotCont.addChild(lbl);

        slotCont.on('pointerdown', () => {
          if (this.onSelectSlotCallback) {
            this.onSelectSlotCallback(i);
          }
        });

        this.bottomActionBarContainer.addChild(slotCont);
      });
    }

    // Controls hint — update dynamically based on input source
    if (data.inputSource === 'touch') {
      this.hintText.text = '👆 Tocca lo slot in basso per cambiare mossa  •  Joystick=Muovi';
    } else if (data.inputSource === 'gamepad') {
      this.hintText.text = '🎮 L1/R1 = Cambia Mossa  •  L-Stick=Muovi  •  Start=Pausa';
    } else {
      this.hintText.text = 'Tasti [1..4] o Click in basso = Cambia Mossa  •  WASD=Muovi  •  P=Pausa';
    }

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

  showHealNumber(screenX: number, screenY: number, value: number): void {
    const container = new Container();
    const text = makeText(`+${value} HP 💚`, 17, 0x4ADE80, true);
    text.anchor.set(0.5);
    container.addChild(text);
    container.x = screenX;
    container.y = screenY;
    this.container.addChild(container);
    this.dmgNumbers.push({ container, text, life: 1.4, vy: 1.8 });
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
