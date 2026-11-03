import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { GamepadMenuNavigator } from '../controls/GamepadMenuNavigator';
import { createNarutoIcon } from '../rendering/IconManager';

// ============================================================
//  NarutoSurvivor — HUD / UI Overlay (v2)
// ============================================================

export interface HUDSlotMove {
  id?: string;
  icon: string;
  name: string;
  level: number;
  color: number;
  isPlus?: boolean;
}

export interface HUDSlotData {
  id: string;
  moves: HUDSlotMove[];
  isActive: boolean;
}

export interface HUDJutsuStatus {
  id: string;
  name: string;
  icon: string;
  level: number;
  isPlus: boolean;
  statRequirementMet: boolean;
  reqStatName: string;
  reqStatIcon: string;
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
  activeJutsu?: Array<{ id?: string; icon: string; name: string; level: number; isPlus?: boolean }>;
  activeTools?: Array<{ id?: string; icon: string; name: string; level: number }>;
  jutsuStatuses?: HUDJutsuStatus[];
  slots?: HUDSlotData[];
  threatBadge?: string;
  threatColor?: number;
  awakeningMeter?: number;
  awakeningActive?: boolean;
  awakeningDurationLeft?: number;
  portalInfo?: {
    screenX: number;
    screenY: number;
    dist: number;
    timeLeft: number;
    bossName: string;
    isReturn: boolean;
  };
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
  private wasPaused = false;
  private onResumeCallback?: () => void;
  private onQuitCallback?: () => void;
  private slotsContainer!: Container;
  private bottomActionBarContainer!: Container;
  private onSelectSlotCallback?: (slotIndex: number) => void;
  private awakeningBadge!: Container;
  private awakeningBadgeBg!: Graphics;
  private awakeningBadgeText!: Text;
  private onAwakenCallback?: () => void;
  private portalCompass!: Container;
  private portalCompassBg!: Graphics;
  private portalCompassText!: Text;

  setOnSelectSlot(cb: (slotIndex: number) => void): void {
    this.onSelectSlotCallback = cb;
  }

  setOnAwaken(cb: () => void): void {
    this.onAwakenCallback = cb;
  }

  // Damage numbers
  private dmgNumbers: { container: Container; text: Text; life: number; vy: number }[] = [];

  // Toast notifications
  private toasts: { container: Container; text: Text; life: number }[] = [];

  // Controls hint text ref (for dynamic update)
  private hintText!: Text;

  constructor(app: Application, parentContainer?: Container) {
    this.W = app.screen.width;
    this.H = app.screen.height;
    this.container = new Container();

    this.buildHUD();
    this.buildPauseOverlay();
    this.buildCombinedBadge();
    this.buildAwakeningBadge();

    if (parentContainer) {
      parentContainer.addChild(this.container);
    } else {
      app.stage.addChild(this.container);
    }
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
    const chakraIcon = createNarutoIcon('chakra_orb', 18);
    chakraIcon.x = W - 220;
    chakraIcon.y = 16;
    this.container.addChild(chakraIcon);

    this.chakraText = makeText('0', 14, 0x22D3EE, true);
    this.chakraText.x = W - 206;
    this.chakraText.y = 8;
    this.container.addChild(this.chakraText);

    const ryoIcon = createNarutoIcon('ryo', 18);
    ryoIcon.x = W - 220;
    ryoIcon.y = 34;
    this.container.addChild(ryoIcon);

    this.ryoText = makeText('0', 14, 0xFBBF24, true);
    this.ryoText.x = W - 206;
    this.ryoText.y = 26;
    this.container.addChild(this.ryoText);

    const fragIcon = createNarutoIcon('scroll', 18);
    fragIcon.x = W - 220;
    fragIcon.y = 52;
    this.container.addChild(fragIcon);

    this.fragmentText = makeText('0 frammenti', 12, 0xA78BFA);
    this.fragmentText.x = W - 206;
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

    // ── Portal Compass / Radar Indicator ─────────────────────
    this.portalCompass = new Container();
    this.portalCompass.visible = false;
    this.portalCompassBg = new Graphics();
    this.portalCompassText = makeText('', 11, 0xFFFFFF, true);
    this.portalCompassText.anchor.set(0.5);
    this.portalCompass.addChild(this.portalCompassBg, this.portalCompassText);
    this.container.addChild(this.portalCompass);
  }

  private buildPauseOverlay(): void {
    this.pauseOverlay = new Container();
    this.pauseOverlay.visible = false;
    this.container.addChild(this.pauseOverlay);
  }

  private renderPauseOverlay(data: HUDData): void {
    this.pauseOverlay.removeChildren();

    // Dim backdrop
    const bg = new Graphics();
    bg.rect(0, 0, this.W, this.H);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    this.pauseOverlay.addChild(bg);

    // Modal Card
    const MODAL_W = Math.min(840, this.W - 40);
    const MODAL_H = Math.min(500, this.H - 60);
    const startX = (this.W - MODAL_W) / 2;
    const startY = (this.H - MODAL_H) / 2;

    const modalBox = new Graphics();
    modalBox.roundRect(startX, startY, MODAL_W, MODAL_H, 16);
    modalBox.fill({ color: 0x0B1120, alpha: 0.98 });
    modalBox.stroke({ color: 0x38BDF8, width: 2 });
    this.pauseOverlay.addChild(modalBox);

    // Header
    const title = makeText('⏸  PAUSA TATTICA SHINOBI', 24, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = this.W / 2;
    title.y = startY + 18;
    this.pauseOverlay.addChild(title);

    const sub = makeText('Stato Tecniche, Requisiti Evoluzioni Plus (+) e Strumenti Ninja', 12, 0x94A3B8);
    sub.anchor.set(0.5, 0);
    sub.x = this.W / 2;
    sub.y = startY + 48;
    this.pauseOverlay.addChild(sub);

    // Two Columns: Left = Jutsu & Plus Evolution Status (58%), Right = Ninja Status & Tools
    const colY = startY + 76;
    const leftW = MODAL_W * 0.58;
    const rightW = MODAL_W - leftW - 36;
    const leftX = startX + 20;
    const rightX = leftX + leftW + 16;

    // ── LEFT COLUMN: ARSENALE JUTSU ──
    const leftTitle = makeText('🌀 ARSENALE JUTSU & EVOLUZIONI PLUS (+)', 13, 0x38BDF8, true);
    leftTitle.x = leftX; leftTitle.y = colY;
    this.pauseOverlay.addChild(leftTitle);

    let jY = colY + 26;
    if (data.jutsuStatuses && data.jutsuStatuses.length > 0) {
      data.jutsuStatuses.forEach((j) => {
        const itemBox = new Graphics();
        itemBox.roundRect(leftX, jY, leftW, 62, 8);
        itemBox.fill({ color: j.isPlus ? 0x2E1A04 : 0x1E293B });
        itemBox.stroke({ color: j.isPlus ? 0xF59E0B : (j.level === 5 ? 0x38BDF8 : 0x334155), width: j.isPlus ? 2 : 1.2 });
        this.pauseOverlay.addChild(itemBox);

        // Icon + Name
        const icContainer = createNarutoIcon(j.id || j.icon, 24, true, j.isPlus);
        icContainer.x = leftX + 22;
        icContainer.y = jY + 16;
        this.pauseOverlay.addChild(icContainer);

        const iconTxt = makeText(j.name, 13, j.isPlus ? 0xFDE047 : 0xFFFFFF, true);
        iconTxt.x = leftX + 40; iconTxt.y = jY + 8;
        this.pauseOverlay.addChild(iconTxt);

        // Level badge
        const lvlStr = j.isPlus ? '✦ PLUS (+) ✦' : `Livello ${j.level}/5`;
        const lvlTxt = makeText(lvlStr, 11, j.isPlus ? 0xF59E0B : (j.level === 5 ? 0x38BDF8 : 0x94A3B8), true);
        lvlTxt.anchor.set(1, 0);
        lvlTxt.x = leftX + leftW - 12; lvlTxt.y = jY + 8;
        this.pauseOverlay.addChild(lvlTxt);

        // Evolution Status Subtext
        let statusStr = '';
        let statusColor = 0x94A3B8;
        if (j.isPlus) {
          statusStr = '✨ FORMA PLUS ATTIVA: +100% Danno, VFX Dorati & Perforazione Massima!';
          statusColor = 0xFDE047;
        } else if (j.level === 5 && j.statRequirementMet) {
          statusStr = '🌟 REQUISITO SODDISFATTO! Apparirà nelle prossime scelte di Level Up!';
          statusColor = 0x34D399;
        } else if (j.level === 5 && !j.statRequirementMet) {
          statusStr = `🔒 Requisito: Potenzia "${j.reqStatName}" per sbloccare la forma PLUS (+)`;
          statusColor = 0xF59E0B;
        } else {
          statusStr = `Progressione: Raggiungi prima il Livello 5 (${j.level}/5) per iniziare l'evoluzione`;
          statusColor = 0x64748B;
        }

        const statusTxt = makeText(statusStr, 10, statusColor, j.isPlus || j.statRequirementMet);
        statusTxt.x = leftX + 12; statusTxt.y = jY + 34;
        this.pauseOverlay.addChild(statusTxt);

        jY += 68;
      });
    }

    // ── RIGHT COLUMN: SHINOBI STATS & TOOLS ──
    const rightTitle = makeText('🛡️ STATI NINJA & STRUMENTI', 13, 0x10B981, true);
    rightTitle.x = rightX; rightTitle.y = colY;
    this.pauseOverlay.addChild(rightTitle);

    const statsBox = new Graphics();
    statsBox.roundRect(rightX, colY + 26, rightW, 140, 8);
    statsBox.fill({ color: 0x13251A });
    statsBox.stroke({ color: 0x22C55E, width: 1.2 });
    this.pauseOverlay.addChild(statsBox);

    const s1 = makeText(`Shinobi: ${data.characterName}`, 12, 0xFED7AA, true);
    s1.x = rightX + 12; s1.y = colY + 38;
    this.pauseOverlay.addChild(s1);

    const s2 = makeText(`Salute: HP ${Math.ceil(data.hp)} / ${Math.ceil(data.maxHp)}`, 11, 0x4ADE80);
    s2.x = rightX + 12; s2.y = colY + 60;
    this.pauseOverlay.addChild(s2);

    const s3 = makeText(`Livello: Lv. ${data.level} (EXP: ${data.xp}/${data.xpToNext})`, 11, 0xFBBF24);
    s3.x = rightX + 12; s3.y = colY + 82;
    this.pauseOverlay.addChild(s3);

    const s4 = makeText(`Ryo: ¥ ${data.ryo}  •  Chakra: ◉ ${data.chakraOrbs}`, 11, 0x38BDF8);
    s4.x = rightX + 12; s4.y = colY + 104;
    this.pauseOverlay.addChild(s4);

    const s5 = makeText(`Nemici abbattuti: ${data.enemyCount}`, 11, 0xFCA5A5);
    s5.x = rightX + 12; s5.y = colY + 126;
    this.pauseOverlay.addChild(s5);

    // Tools Sub-box
    const toolsTitle = makeText('🗡️ STRUMENTI ATTIVI:', 11, 0x94A3B8, true);
    toolsTitle.x = rightX; toolsTitle.y = colY + 180;
    this.pauseOverlay.addChild(toolsTitle);

    let toolY = colY + 200;
    if (data.activeTools && data.activeTools.length > 0) {
      data.activeTools.forEach(t => {
        const ic = createNarutoIcon(t.id || t.icon, 18, true);
        ic.x = rightX + 16;
        ic.y = toolY + 6;
        this.pauseOverlay.addChild(ic);

        const tTxt = makeText(`${t.name} (Lv. ${t.level})`, 10.5, 0xE2E8F0);
        tTxt.x = rightX + 30; tTxt.y = toolY;
        this.pauseOverlay.addChild(tTxt);
        toolY += 22;
      });
    } else {
      const noneTxt = makeText('Nessuno strumento attivo', 10.5, 0x64748B);
      noneTxt.x = rightX + 8; noneTxt.y = toolY;
      this.pauseOverlay.addChild(noneTxt);
    }

    // ── Bottom Action Buttons (Navigatable via Gamepad) ──
    const btnW = 230;
    const btnH = 36;
    const btnY = startY + MODAL_H - 46;

    // Resume Button
    const resumeBtn = new Container();
    resumeBtn.eventMode = 'static';
    resumeBtn.cursor = 'pointer';
    resumeBtn.x = this.W / 2 - btnW - 12;
    resumeBtn.y = btnY;
    const rBg = new Graphics();
    rBg.roundRect(0, 0, btnW, btnH, 8);
    rBg.fill({ color: 0x16A34A });
    rBg.stroke({ color: 0x86EFAC, width: 1.5 });
    resumeBtn.addChild(rBg);
    const handleResume = () => {
      this.pauseOverlay.visible = false;
      this.wasPaused = false;
      GamepadMenuNavigator.get()?.popContext('pause_overlay');
      this.onResumeCallback?.();
    };

    const handleQuit = () => {
      this.pauseOverlay.visible = false;
      this.wasPaused = false;
      GamepadMenuNavigator.get()?.popContext('pause_overlay');
      this.onQuitCallback?.();
    };

    resumeBtn.on('pointerdown', handleResume);
    this.pauseOverlay.addChild(resumeBtn);

    // Quit Button
    const quitBtn = new Container();
    quitBtn.eventMode = 'static';
    quitBtn.cursor = 'pointer';
    quitBtn.x = this.W / 2 + 12;
    quitBtn.y = btnY;
    const qBg = new Graphics();
    qBg.roundRect(0, 0, btnW, btnH, 8);
    qBg.fill({ color: 0xDC2626 });
    qBg.stroke({ color: 0xFCA5A5, width: 1.5 });
    quitBtn.addChild(qBg);
    const qTxt = makeText('✕ ABBANDONA (Al Villaggio)', 12, 0xFFFFFF, true);
    qTxt.anchor.set(0.5);
    qTxt.x = btnW / 2; qTxt.y = btnH / 2;
    quitBtn.addChild(qTxt);
    quitBtn.on('pointerdown', handleQuit);
    this.pauseOverlay.addChild(quitBtn);

    // Register with GamepadMenuNavigator
    GamepadMenuNavigator.get()?.pushContext({
      id: 'pause_overlay',
      items: [
        { container: resumeBtn, onSelect: handleResume, rightIndex: 1 },
        { container: quitBtn, onSelect: handleQuit, leftIndex: 0 },
      ],
      columns: 2,
      selectedIndex: 0,
      onCancel: handleResume,
    });
  }

  hide(): void {
    this.pauseOverlay.visible = false;
    this.wasPaused = false;
    this.container.visible = false;
    GamepadMenuNavigator.get()?.popContext('pause_overlay');
  }

  destroy(): void {
    this.hide();
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }

  setOnResume(cb: () => void): void { this.onResumeCallback = cb; }
  setOnQuit(cb: () => void): void { this.onQuitCallback = cb; }

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

  private buildAwakeningBadge(): void {
    this.awakeningBadge = new Container();
    this.awakeningBadge.x = this.W / 2 - 130;
    this.awakeningBadge.y = this.H - 96;
    this.awakeningBadge.eventMode = 'static';
    this.awakeningBadge.cursor = 'pointer';
    this.awakeningBadge.visible = false;

    this.awakeningBadgeBg = new Graphics();
    this.awakeningBadge.addChild(this.awakeningBadgeBg);

    this.awakeningBadgeText = makeText('🔥 [SPAZIO] RISVEGLIO CHAKRA', 12, 0xFFFFFF, true);
    this.awakeningBadgeText.anchor.set(0.5);
    this.awakeningBadgeText.x = 130;
    this.awakeningBadgeText.y = 15;
    this.awakeningBadge.addChild(this.awakeningBadgeText);

    this.awakeningBadge.on('pointerdown', () => {
      this.onAwakenCallback?.();
    });

    this.container.addChild(this.awakeningBadge);
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
    this.chakraText.text = `${data.chakraOrbs}`;
    this.ryoText.text = `${data.ryo}`;
    this.fragmentText.text = `${data.fragments} frammenti`;

    // Active Jutsu and Tools loadout chips
    this.slotsContainer.removeChildren();
    let chipX = 0;
    if (data.activeJutsu) {
      data.activeJutsu.forEach(j => {
        const chip = new Container();
        chip.x = chipX;
        const bg = new Graphics();
        const chipW = j.isPlus ? 64 : 54;
        bg.roundRect(0, 0, chipW, 22, 6);
        if (j.isPlus) {
          bg.fill({ color: 0x3B1D08, alpha: 0.95 });
          bg.stroke({ color: 0xF59E0B, width: 2.0 });
        } else {
          bg.fill({ color: 0x1E293B, alpha: 0.90 });
          bg.stroke({ color: 0x38BDF8, width: 1.2 });
        }
        chip.addChild(bg);

        // Real Naruto Jutsu icon
        const ic = createNarutoIcon(j.id || j.icon, 16, true, j.isPlus);
        ic.x = 11;
        ic.y = 11;
        chip.addChild(ic);

        const lvlStr = j.isPlus ? '5+' : `Lv.${j.level}`;
        const t = makeText(lvlStr, 9.5, j.isPlus ? 0xFDE047 : 0xE0F2FE, true);
        t.anchor.set(0, 0.5);
        t.x = 22; t.y = 11;
        chip.addChild(t);
        this.slotsContainer.addChild(chip);
        chipX += chipW + 4;
      });
    }
    if (data.activeTools) {
      data.activeTools.forEach(t => {
        const chip = new Container();
        chip.x = chipX;
        const bg = new Graphics();
        const chipW = 54;
        bg.roundRect(0, 0, chipW, 22, 6);
        bg.fill({ color: 0x13251A, alpha: 0.90 });
        bg.stroke({ color: 0x22C55E, width: 1.2 });
        chip.addChild(bg);

        const ic = createNarutoIcon(t.id || t.icon, 16, true);
        ic.x = 11;
        ic.y = 11;
        chip.addChild(ic);

        const txt = makeText(`Lv.${t.level}`, 9.5, 0xDCFCE7, true);
        txt.anchor.set(0, 0.5);
        txt.x = 22; txt.y = 11;
        chip.addChild(txt);
        this.slotsContainer.addChild(chip);
        chipX += chipW + 4;
      });
    }

    // Combined badge
    this.combinedBadge.visible = data.combinedActive;

    // Awakening Chakra Badge
    if (data.awakeningActive) {
      this.awakeningBadge.visible = true;
      const timeLeft = Math.max(0, data.awakeningDurationLeft ?? 0).toFixed(1);
      this.awakeningBadgeText.text = `🔥 RISVEGLIO ATTIVO: ${timeLeft}s`;
      this.awakeningBadgeBg.clear();
      this.awakeningBadgeBg.roundRect(0, 0, 260, 30, 8);
      this.awakeningBadgeBg.fill({ color: 0x991B1B, alpha: 0.95 });
      this.awakeningBadgeBg.stroke({ color: 0xF59E0B, width: 2.5 });
    } else if ((data.awakeningMeter ?? 0) >= 100) {
      this.awakeningBadge.visible = true;
      this.awakeningBadgeText.text = '🔥 [SPAZIO] RISVEGLIO CHAKRA PRONTO!';
      const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;
      this.awakeningBadgeBg.clear();
      this.awakeningBadgeBg.roundRect(0, 0, 260, 30, 8);
      this.awakeningBadgeBg.fill({ color: 0x78350F, alpha: 0.92 });
      this.awakeningBadgeBg.stroke({ color: 0xFBBF24, width: 2 * pulse });
    } else {
      this.awakeningBadge.visible = false;
    }

    // Pause overlay
    if (data.paused) {
      if (!this.wasPaused) {
        this.renderPauseOverlay(data);
        this.pauseOverlay.visible = true;
        this.wasPaused = true;
      }
    } else {
      if (this.wasPaused) {
        this.pauseOverlay.visible = false;
        this.wasPaused = false;
        GamepadMenuNavigator.get()?.popContext('pause_overlay');
      }
    }

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
        const hasPlus = slot.moves.some(m => m.isPlus);

        const bg = new Graphics();
        bg.roundRect(0, 0, slotW, slotH, 8);
        const bgColor = hasPlus
          ? (isAct ? 0x381E04 : 0x221303)
          : (isAct ? (isMerged ? 0x2A1A45 : 0x1E293B) : 0x0F172A);
        bg.fill({ color: bgColor, alpha: 0.95 });
        const strokeColor = hasPlus
          ? 0xF59E0B
          : (isAct ? (isMerged ? 0xF59E0B : 0x38BDF8) : (isMerged ? 0xA855F7 : 0x334155));
        bg.stroke({ color: strokeColor, width: (hasPlus || isAct) ? 2.4 : 1.2 });
        slotCont.addChild(bg);

        // Hotkey badge
        const hotkeyText = data.inputSource === 'gamepad'
          ? (i === 0 ? 'L1' : (i === 1 ? 'R1' : `[${i + 1}]`))
          : `[ ${i + 1} ]`;
        const hotkey = makeText(hotkeyText, 9.5, isAct ? 0xFBBF24 : 0x64748B, true);
        hotkey.x = 8; hotkey.y = 4;
        slotCont.addChild(hotkey);

        // Status / Combo / Plus tag
        if (hasPlus) {
          const plusTag = makeText('★ PLUS (+) ★', 8, 0xFDE047, true);
          plusTag.anchor.set(1, 0);
          plusTag.x = slotW - 8; plusTag.y = 4;
          slotCont.addChild(plusTag);
        } else if (isAct) {
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
        iconsCont.x = 8; iconsCont.y = 16;
        let ix = 0;
        slot.moves.forEach((move, mi) => {
          const moveIconKey = move.id || move.icon;
          const ic = createNarutoIcon(moveIconKey, 20, true, move.isPlus);
          ic.x = ix + 10;
          ic.y = 12;
          iconsCont.addChild(ic);
          ix += 24;
          if (mi < slot.moves.length - 1) {
            const plus = makeText('+', 11, 0xFBBF24, true);
            plus.anchor.set(0.5);
            plus.x = ix + 1; plus.y = 12;
            iconsCont.addChild(plus);
            ix += 12;
          }
        });
        slotCont.addChild(iconsCont);

        // Level or Name
        let labelText = isMerged
          ? `Combo (${slot.moves.length})`
          : (slot.moves[0]?.name.length > 12 ? slot.moves[0]?.name.slice(0, 11) + '…' : (slot.moves[0]?.name ?? ''));
        if (hasPlus && !isMerged && !labelText.includes('+')) {
          labelText += ' +';
        }
        const lbl = makeText(labelText, 9.5, hasPlus ? 0xFDE047 : (isAct ? 0xFFFFFF : 0x94A3B8), isAct || hasPlus);
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

    // ── Portal Compass Radar ──────────────────────────────────
    if (data.portalInfo) {
      const { screenX, screenY, dist, timeLeft, bossName, isReturn } = data.portalInfo;
      const margin = 50;
      const isOffscreen = screenX < margin || screenX > this.W - margin || screenY < margin || screenY > this.H - margin;

      if (isOffscreen) {
        this.portalCompass.visible = true;
        const centerX = this.W / 2;
        const centerY = this.H / 2;
        const angle = Math.atan2(screenY - centerY, screenX - centerX);

        const edgeDistX = (this.W / 2) - margin;
        const edgeDistY = (this.H / 2) - margin;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Clamp to screen rectangle
        let targetX = centerX + cos * edgeDistX;
        let targetY = centerY + sin * edgeDistY;
        if (Math.abs(cos * edgeDistY) > Math.abs(sin * edgeDistX)) {
          targetX = centerX + (cos > 0 ? edgeDistX : -edgeDistX);
          targetY = centerY + (cos > 0 ? edgeDistX : -edgeDistX) * Math.tan(angle);
        } else {
          targetY = centerY + (sin > 0 ? edgeDistY : -edgeDistY);
          targetX = centerX + (sin > 0 ? edgeDistY : -edgeDistY) / Math.tan(angle);
        }

        this.portalCompass.x = Math.max(margin, Math.min(this.W - margin, targetX));
        this.portalCompass.y = Math.max(margin, Math.min(this.H - margin, targetY));

        const themeCol = isReturn ? 0x10B981 : 0x8B5CF6;
        const strokeCol = isReturn ? 0x34D399 : 0xEC4899;
        this.portalCompassBg.clear();
        this.portalCompassBg.roundRect(-90, -18, 180, 36, 18);
        this.portalCompassBg.fill({ color: 0x0F0728, alpha: 0.94 });
        this.portalCompassBg.stroke({ color: strokeCol, width: 2 });

        // Chevron arrow pointing direction
        const arrowLen = 12;
        const ax = Math.cos(angle) * (80 + arrowLen);
        const ay = Math.sin(angle) * (14 + arrowLen);
        this.portalCompassBg.circle(ax * 0.3, ay * 0.3, 4);
        this.portalCompassBg.fill({ color: themeCol });

        const timeStr = isReturn ? 'APERTO' : `${Math.ceil(timeLeft)}s`;
        this.portalCompassText.text = `🌀 ${isReturn ? 'Ritorno' : bossName.slice(0, 10)} [${Math.round(dist)}px • ${timeStr}]`;
      } else {
        this.portalCompass.visible = false;
      }
    } else {
      this.portalCompass.visible = false;
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

  showDamageNumber(screenX: number, screenY: number, value: number, isCrit = false, isPlus = false): void {
    const container = new Container();
    const txtStr = isPlus
      ? `💥 [+] ${value}`
      : (isCrit ? `💥 ${value}` : `${value}`);
    const fontSize = isPlus ? 21 : (isCrit ? 20 : 14);
    const fontColor = isPlus ? 0xFDE047 : (isCrit ? 0xFBBF24 : 0xffa0a0);

    const text = makeText(
      txtStr,
      fontSize,
      fontColor,
      isCrit || isPlus,
    );
    text.anchor.set(0.5);
    container.addChild(text);
    container.x = screenX;
    container.y = screenY;
    this.container.addChild(container);
    this.dmgNumbers.push({ container, text, life: isPlus ? 1.4 : 1.2, vy: (isCrit || isPlus) ? 2.2 : 1.3 });
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
