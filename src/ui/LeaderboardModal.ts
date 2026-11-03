// ============================================================
//  NarutoSurvivor — Shinobi Leaderboard & Hall of Fame (Albo d'Oro)
//  Real player statistics, dynamic ninja rank, Hokage benchmarks,
//  and recent run mission certificates history.
// ============================================================

import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { SaveSystem, type RunHistoryEntry } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import { createNarutoIcon } from '../rendering/IconManager';

const FONT = GAME_CONFIG.FONT_FAMILY;

function textLabel(txt: string, size: number, color = 0xffffff, bold = false): Text {
  return new Text({
    text: txt,
    style: new TextStyle({
      fontFamily: FONT,
      fontSize: size,
      fill: color,
      fontWeight: bold ? '700' : '400',
      dropShadow: { color: 0x000000, alpha: 0.75, blur: 3, distance: 1 },
    }),
  });
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface BenchmarkShinobi {
  name: string;
  title: string;
  timeSec: number;
  score: number;
  badge: string;
  isPlayer?: boolean;
}

export class LeaderboardModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private currentTab: 'hall_of_fame' | 'history' = 'hall_of_fame';
  private contentContainer!: Container;
  private tabButtonsContainer!: Container;
  private closeBtn!: Container;

  constructor(parentStage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    parentStage.addChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.container.visible) {
        this.hide();
      }
    });
    this.buildUI();
  }

  private buildUI(): void {
    const W = this.W;
    const H = this.H;

    // Dark backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x05070B, alpha: 0.94 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.container.addChild(backdrop);

    // Modal card
    const MODAL_W = Math.min(880, W - 40);
    const MODAL_H = Math.min(590, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, MODAL_W, MODAL_H, 18);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0xFACC15, width: 2.2, alpha: 0.85 });
    this.container.addChild(modalBg);

    // Close button
    this.closeBtn = new Container();
    this.closeBtn.eventMode = 'static';
    this.closeBtn.cursor = 'pointer';
    this.closeBtn.hitArea = new Rectangle(0, 0, 36, 36);
    this.closeBtn.x = modalX + MODAL_W - 44;
    this.closeBtn.y = modalY + 16;
    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 30, 30, 8);
    closeBg.fill({ color: 0x1E293B });
    closeBg.stroke({ color: 0x475569, width: 1 });
    this.closeBtn.addChild(closeBg);
    const closeTxt = textLabel('✕', 14, 0x94A3B8, true);
    closeTxt.anchor.set(0.5);
    closeTxt.x = 15; closeTxt.y = 15;
    this.closeBtn.addChild(closeTxt);
    this.closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.addChild(this.closeBtn);

    // Header Title with authentic Hokage Trophy Icon
    const titleContainer = new Container();
    const trophyIcon = createNarutoIcon('leaderboard', 32);
    trophyIcon.x = 0; trophyIcon.y = 12;
    titleContainer.addChild(trophyIcon);

    const title = textLabel('ALBO D\'ORO & CLASSIFICA HOKAGE', 22, 0xFACC15, true);
    title.x = 24; title.y = 0;
    titleContainer.addChild(title);

    titleContainer.x = (W - titleContainer.width) / 2;
    titleContainer.y = modalY + 16;
    this.container.addChild(titleContainer);

    const sub = textLabel(
      'I più grandi shinobi della storia del mondo ninja e i tuoi traguardi di sopravvivenza',
      12,
      0x94A3B8,
    );
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = modalY + 48;
    this.container.addChild(sub);

    // Dynamic Player Career Strip
    this.buildCareerStrip(modalX + 24, modalY + 74, MODAL_W - 48);

    // Tabs Header
    this.tabButtonsContainer = new Container();
    this.tabButtonsContainer.x = modalX + 24;
    this.tabButtonsContainer.y = modalY + 144;
    this.container.addChild(this.tabButtonsContainer);

    // Dynamic Content Container
    this.contentContainer = new Container();
    this.contentContainer.x = modalX + 24;
    this.contentContainer.y = modalY + 188;
    this.container.addChild(this.contentContainer);
  }

  private buildCareerStrip(x: number, y: number, w: number): void {
    const profile = SaveSystem.getProfile();
    const rank = SaveSystem.getCalculatedNinjaRank(profile);

    const strip = new Container();
    strip.x = x;
    strip.y = y;

    const bg = new Graphics();
    bg.roundRect(0, 0, w, 58, 10);
    bg.fill({ color: 0x1E293B, alpha: 0.85 });
    bg.stroke({ color: rank.color, width: 1.5, alpha: 0.8 });
    strip.addChild(bg);

    // Player name & Rank Title
    const nameTxt = textLabel(`👤 ${profile.playerName}`, 13, 0xFFFFFF, true);
    nameTxt.x = 16; nameTxt.y = 10;
    strip.addChild(nameTxt);

    const rankPill = textLabel(rank.badge, 10, rank.color, true);
    rankPill.x = 16; rankPill.y = 32;
    strip.addChild(rankPill);

    const titleTxt = textLabel(`• ${rank.title}`, 11, 0x94A3B8);
    titleTxt.x = rankPill.x + rankPill.width + 8;
    titleTxt.y = 32;
    strip.addChild(titleTxt);

    // Stat 1: Best Time
    const tLabel = textLabel('Miglior Tempo', 9, 0x64748B);
    tLabel.x = w - 340; tLabel.y = 12;
    strip.addChild(tLabel);
    const tVal = textLabel(formatTime(profile.bestTimeSec), 13, 0x38BDF8, true);
    tVal.x = w - 340; tVal.y = 28;
    strip.addChild(tVal);

    // Stat 2: Total Kills
    const kLabel = textLabel('Nemici Eliminati', 9, 0x64748B);
    kLabel.x = w - 210; kLabel.y = 12;
    strip.addChild(kLabel);
    const kVal = textLabel(`${profile.enemiesDefeated.toLocaleString()}`, 13, 0xEF4444, true);
    kVal.x = w - 210; kVal.y = 28;
    strip.addChild(kVal);

    // Stat 3: Bosses / Victories
    const bLabel = textLabel('Boss Abbattuti', 9, 0x64748B);
    bLabel.x = w - 90; bLabel.y = 12;
    strip.addChild(bLabel);
    const bVal = textLabel(`${profile.bossesDefeated}`, 13, 0xFACC15, true);
    bVal.x = w - 90; bVal.y = 28;
    strip.addChild(bVal);

    this.container.addChild(strip);
  }

  show(): void {
    this.container.visible = true;
    this.renderTabs();
    this.renderContent();
    this.updateGamepadContext();
  }

  hide(): void {
    this.container.visible = false;
    GamepadMenuNavigator.get()?.popContext('leaderboard_modal');
  }

  private renderTabs(): void {
    this.tabButtonsContainer.removeChildren();

    const tabs: Array<{ id: 'hall_of_fame' | 'history'; label: string; iconKey: string }> = [
      { id: 'hall_of_fame', label: 'CLASSIFICA HOKAGE (HALL OF FAME)', iconKey: 'leaderboard' },
      { id: 'history', label: 'STORICO MISSIONI RECENTI', iconKey: 'missions' },
    ];

    const tabW = 270;
    const tabH = 36;

    tabs.forEach((tab, i) => {
      const isSelected = this.currentTab === tab.id;
      const btn = new Container();
      btn.x = i * (tabW + 12);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.hitArea = new Rectangle(0, 0, tabW, tabH);

      const bg = new Graphics();
      bg.roundRect(0, 0, tabW, tabH, 8);
      bg.fill({ color: isSelected ? 0x2563EB : 0x1E293B });
      bg.stroke({ color: isSelected ? 0x38BDF8 : 0x334155, width: 1.5 });
      btn.addChild(bg);

      const tabIcon = createNarutoIcon(tab.iconKey, 20);
      tabIcon.x = 20;
      tabIcon.y = tabH / 2;
      btn.addChild(tabIcon);

      const txt = textLabel(tab.label, 11, isSelected ? 0xFFFFFF : 0x94A3B8, isSelected);
      txt.anchor.set(0, 0.5);
      txt.x = 36; txt.y = tabH / 2;
      btn.addChild(txt);

      btn.on('pointerdown', () => {
        this.currentTab = tab.id;
        audioManager.playSFX('button_click');
        this.renderTabs();
        this.renderContent();
      });

      this.tabButtonsContainer.addChild(btn);
    });
  }

  private renderContent(): void {
    this.contentContainer.removeChildren();

    if (this.currentTab === 'hall_of_fame') {
      this.renderHallOfFame();
    } else {
      this.renderMissionHistory();
    }
  }

  private renderHallOfFame(): void {
    const profile = SaveSystem.getProfile();
    const MODAL_W = Math.min(880, this.W - 40);
    const contentW = MODAL_W - 48;

    // Calculate player's score
    const playerScore = Math.floor(
      (profile.bestTimeSec * 450) +
      (profile.enemiesDefeated * 2) +
      (profile.bossesDefeated * 12000) +
      (profile.highestLevel * 1500),
    );

    const playerEntry: BenchmarkShinobi = {
      name: `${profile.playerName} (Tu)`,
      title: profile.ninjaRank,
      timeSec: profile.bestTimeSec,
      score: playerScore,
      badge: '⭐ IL TUO RECORD',
      isPlayer: true,
    };

    // Canonical legendary Hokage benchmarks
    const benchmarks: BenchmarkShinobi[] = [
      { name: 'Minato Namikaze', title: 'Il Lampo Giallo di Konoha (4° Hokage)', timeSec: 2538, score: 1420000, badge: '🥇 1° POSTO' },
      { name: 'Hashirama Senju', title: 'Il Dio degli Shinobi (1° Hokage)', timeSec: 2400, score: 1350000, badge: '🥈 2° POSTO' },
      { name: 'Itachi Uchiha', title: 'Genio Silente degli Uchiha (ANBU)', timeSec: 2325, score: 1180000, badge: '🥉 3° POSTO' },
      { name: 'Tobirama Senju', title: 'Creatore dei Jutsu Proibiti (2° Hokage)', timeSec: 2110, score: 1020000, badge: '4° POSTO' },
      { name: 'Jiraiya', title: 'Il Sannin dei Rospi di Monte Myoboku', timeSec: 1960, score: 920000, badge: '5° POSTO' },
      { name: 'Gaara del Deserto', title: 'Comandante Supremo delle Forze Alleate', timeSec: 1862, score: 840000, badge: '6° POSTO' },
    ];

    // Merge player and sort descending by score
    const all = [...benchmarks, playerEntry].sort((a, b) => b.score - a.score).slice(0, 6);

    const itemH = 52;
    const gap = 8;

    all.forEach((item, idx) => {
      const row = new Container();
      row.y = idx * (itemH + gap);

      const bg = new Graphics();
      bg.roundRect(0, 0, contentW, itemH, 8);
      bg.fill({ color: item.isPlayer ? 0x1E1B4B : 0x111827, alpha: 0.9 });
      bg.stroke({
        color: item.isPlayer ? 0xFBBF24 : (idx === 0 ? 0xFACC15 : (idx === 1 ? 0xE2E8F0 : (idx === 2 ? 0xD97706 : 0x334155))),
        width: item.isPlayer ? 2 : 1,
      });
      row.addChild(bg);

      // Rank index
      const rankNum = textLabel(`#${idx + 1}`, 13, item.isPlayer ? 0xFBBF24 : 0x94A3B8, true);
      rankNum.x = 16; rankNum.y = 17;
      row.addChild(rankNum);

      // Shinobi Name
      const name = textLabel(item.name, 13, item.isPlayer ? 0xFDE047 : 0xFFFFFF, true);
      name.x = 56; name.y = 10;
      row.addChild(name);

      const titleTxt = textLabel(item.title, 10, 0x94A3B8);
      titleTxt.x = 56; titleTxt.y = 28;
      row.addChild(titleTxt);

      // Time survived
      const timeTxt = textLabel(`⏱️ ${formatTime(item.timeSec)}`, 11, 0x38BDF8, true);
      timeTxt.x = contentW - 240; timeTxt.y = 18;
      row.addChild(timeTxt);

      // Score
      const scoreTxt = textLabel(`Pts: ${item.score.toLocaleString()}`, 12, item.isPlayer ? 0xFBBF24 : 0xE2E8F0, true);
      scoreTxt.anchor.set(1, 0.5);
      scoreTxt.x = contentW - 20; scoreTxt.y = 26;
      row.addChild(scoreTxt);

      this.contentContainer.addChild(row);
    });
  }

  private renderMissionHistory(): void {
    const profile = SaveSystem.getProfile();
    const MODAL_W = Math.min(880, this.W - 40);
    const contentW = MODAL_W - 48;
    const history: RunHistoryEntry[] = profile.runHistory || [];

    if (history.length === 0) {
      const emptyBox = new Container();
      const emptyTxt = textLabel(
        '📜 Nessuna missione completata di recente.\nScendi nell\'arena per imprimere il tuo nome nell\'Albo d\'Oro della Foglia!',
        13,
        0x94A3B8,
      );
      emptyTxt.style.align = 'center';
      emptyTxt.anchor.set(0.5);
      emptyTxt.x = contentW / 2;
      emptyTxt.y = 140;
      emptyBox.addChild(emptyTxt);
      this.contentContainer.addChild(emptyBox);
      return;
    }

    const itemH = 54;
    const gap = 8;

    history.slice(0, 6).forEach((run, idx) => {
      const row = new Container();
      row.y = idx * (itemH + gap);

      const bg = new Graphics();
      bg.roundRect(0, 0, contentW, itemH, 8);
      bg.fill({ color: 0x111827 });
      bg.stroke({ color: run.isVictory ? 0x10B981 : 0x334155, width: run.isVictory ? 1.5 : 1 });
      row.addChild(bg);

      // Grade Stamp
      const gradeColor = run.grade === 'S' ? 0xF59E0B : (run.grade === 'A' ? 0x8B5CF6 : (run.grade === 'B' ? 0x3B82F6 : 0x10B981));
      const gradeCircle = new Graphics();
      gradeCircle.circle(28, 27, 16);
      gradeCircle.fill({ color: gradeColor, alpha: 0.15 });
      gradeCircle.stroke({ color: gradeColor, width: 1.5 });
      row.addChild(gradeCircle);

      const gTxt = textLabel(run.grade, 12, gradeColor, true);
      gTxt.anchor.set(0.5);
      gTxt.x = 28; gTxt.y = 27;
      row.addChild(gTxt);

      // Character & Stage
      const cTxt = textLabel(`🌀 ${run.characterName}`, 12, 0xFFFFFF, true);
      cTxt.x = 58; cTxt.y = 10;
      row.addChild(cTxt);

      const stageTxt = textLabel(`Arena: ${run.stageName} • ${run.date}`, 10, 0x94A3B8);
      stageTxt.x = 58; stageTxt.y = 28;
      row.addChild(stageTxt);

      // Stats
      const timeVal = textLabel(`⏱️ ${formatTime(run.elapsedSec)}`, 11, 0x38BDF8, true);
      timeVal.x = contentW - 270; timeVal.y = 18;
      row.addChild(timeVal);

      const killVal = textLabel(`💀 ${run.kills} kills`, 11, 0xEF4444);
      killVal.x = contentW - 170; killVal.y = 18;
      row.addChild(killVal);

      const ryoVal = textLabel(`+${run.ryo} ¥`, 11, 0xFACC15, true);
      ryoVal.anchor.set(1, 0.5);
      ryoVal.x = contentW - 16; ryoVal.y = 27;
      row.addChild(ryoVal);

      this.contentContainer.addChild(row);
    });
  }

  private updateGamepadContext(): void {
    const navItems: NavigatableItem[] = [
      {
        container: this.closeBtn,
        onSelect: () => this.hide(),
      },
    ];

    GamepadMenuNavigator.get()?.pushContext({
      id: 'leaderboard_modal',
      items: navItems,
      selectedIndex: 0,
      onCancel: () => this.hide(),
      onTabPrev: () => {
        this.currentTab = this.currentTab === 'hall_of_fame' ? 'history' : 'hall_of_fame';
        this.renderTabs();
        this.renderContent();
      },
      onTabNext: () => {
        this.currentTab = this.currentTab === 'hall_of_fame' ? 'history' : 'hall_of_fame';
        this.renderTabs();
        this.renderContent();
      },
    });
  }
}
