// ============================================================
//  NarutoSurvivor — Canonical Shinobi Missions System (D to S Rank)
//  Real progress tracking and claimable Ryo & Summon Scroll rewards
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';

const FONT = GAME_CONFIG.FONT_FAMILY;

function textLabel(txt: string, size: number, color = 0xffffff, bold = false): Text {
  return new Text({
    text: txt,
    style: new TextStyle({
      fontFamily: FONT,
      fontSize: size,
      fill: color,
      fontWeight: bold ? '700' : '400',
      dropShadow: { color: 0x000000, alpha: 0.7, blur: 3, distance: 1 },
    }),
  });
}

export interface MissionDef {
  id: string;
  rank: 'D' | 'C' | 'B' | 'A' | 'S';
  title: string;
  desc: string;
  target: number;
  current: (p: ReturnType<typeof SaveSystem.getProfile>) => number;
  rewardRyo: number;
  rewardScrolls: number;
}

const MISSIONS: MissionDef[] = [
  {
    id: 'm_first_blood',
    rank: 'D',
    title: 'Battesimo del Fuoco',
    desc: 'Sconfiggi 50 nemici in qualsiasi missione di sopravvivenza.',
    target: 50,
    current: p => p.enemiesDefeated,
    rewardRyo: 400,
    rewardScrolls: 1,
  },
  {
    id: 'm_survive_3',
    rank: 'D',
    title: 'Resistenza dell’Accademia',
    desc: 'Sopravvivi per almeno 3 minuti (180s) in una singola run.',
    target: 180,
    current: p => p.bestTimeSec,
    rewardRyo: 500,
    rewardScrolls: 1,
  },
  {
    id: 'm_kills_500',
    rank: 'C',
    title: 'Sterminatore di Zetsu Bianchi',
    desc: 'Elimina un totale di 500 nemici nel tuo percorso da shinobi.',
    target: 500,
    current: p => p.enemiesDefeated,
    rewardRyo: 1000,
    rewardScrolls: 2,
  },
  {
    id: 'm_boss_1',
    rank: 'C',
    title: 'Primo Scontro Akatsuki',
    desc: 'Abbatti almeno 1 boss (Kisame al minuto 5 o superiore).',
    target: 1,
    current: p => p.bossesDefeated,
    rewardRyo: 1200,
    rewardScrolls: 3,
  },
  {
    id: 'm_survive_10',
    rank: 'B',
    title: 'Valore da Chūnin',
    desc: 'Sopravvivi per almeno 10 minuti (600s) contro le orde nemiche.',
    target: 600,
    current: p => p.bestTimeSec,
    rewardRyo: 2000,
    rewardScrolls: 4,
  },
  {
    id: 'm_boss_5',
    rank: 'A',
    title: 'Difensore del Villaggio',
    desc: 'Sconfiggi 5 boss Akatsuki nelle tue partite complessive.',
    target: 5,
    current: p => p.bossesDefeated,
    rewardRyo: 3500,
    rewardScrolls: 6,
  },
  {
    id: 'm_mastery_s',
    rank: 'S',
    title: 'Leggenda dei Sette Spadaccini & Akatsuki',
    desc: 'Sopravvivi per 20 minuti (1.200s) e supera il livello 30.',
    target: 1200,
    current: p => p.bestTimeSec,
    rewardRyo: 6000,
    rewardScrolls: 10,
  },
];

const CLAIMED_MISSIONS_KEY = 'naruto_survivor_claimed_missions_v1';

function getClaimedMissions(): Set<string> {
  try {
    const raw = localStorage.getItem(CLAIMED_MISSIONS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveClaimedMissions(set: Set<string>): void {
  try {
    localStorage.setItem(CLAIMED_MISSIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export class MissionsModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private listContainer!: Container;
  private onCloseCallback?: () => void;

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

    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x05070B, alpha: 0.93 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.container.addChild(backdrop);

    const MODAL_W = Math.min(880, W - 40);
    const MODAL_H = Math.min(590, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, MODAL_W, MODAL_H, 18);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0xEAB308, width: 2, alpha: 0.8 });
    this.container.addChild(modalBg);

    // Title
    const title = textLabel('🎖️ BACHECA DELLE MISSIONI SHINOBI', 22, 0xFACC15, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 18;
    this.container.addChild(title);

    const sub = textLabel('Completa incarichi di Grado D, C, B, A ed S per ottenere ricompense in Ryo e Rotoli di Evocazione', 12, 0x94A3B8);
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = modalY + 48;
    this.container.addChild(sub);

    // Close button
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.x = modalX + MODAL_W - 44;
    closeBtn.y = modalY + 18;
    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 32, 32, 8);
    closeBg.fill({ color: 0x334155 });
    closeBtn.addChild(closeBg);
    const closeX = textLabel('✕', 14, 0xffffff, true);
    closeX.anchor.set(0.5);
    closeX.x = 16; closeX.y = 16;
    closeBtn.addChild(closeX);
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.addChild(closeBtn);

    // List container
    this.listContainer = new Container();
    this.listContainer.x = modalX + 24;
    this.listContainer.y = modalY + 84;
    this.container.addChild(this.listContainer);
  }

  private renderMissions(): void {
    this.listContainer.removeChildren();
    const profile = SaveSystem.getProfile();
    const claimed = getClaimedMissions();

    const itemW = 830;
    const itemH = 62;
    const navItems: NavigatableItem[] = [];

    MISSIONS.forEach((m, idx) => {
      const curVal = m.current(profile);
      const isComplete = curVal >= m.target;
      const isClaimed = claimed.has(m.id);

      const row = new Container();
      row.y = idx * (itemH + 8);

      const rankColors: Record<string, number> = {
        D: 0x60A5FA, C: 0x34D399, B: 0xF59E0B, A: 0xEF4444, S: 0xE879F9,
      };
      const rankColor = rankColors[m.rank] || 0xFACC15;

      const bg = new Graphics();
      bg.roundRect(0, 0, itemW, itemH, 10);
      bg.fill({ color: isClaimed ? 0x0A0F1D : (isComplete ? 0x142033 : 0x1E293B) });
      bg.stroke({ color: isComplete ? 0x10B981 : 0x334155, width: 1.5 });
      row.addChild(bg);

      // Rank Badge
      const badge = new Graphics();
      badge.roundRect(14, 14, 34, 34, 8);
      badge.fill({ color: rankColor, alpha: 0.2 });
      badge.stroke({ color: rankColor, width: 1.5 });
      row.addChild(badge);

      const rTxt = textLabel(m.rank, 16, rankColor, true);
      rTxt.anchor.set(0.5);
      rTxt.x = 31; rTxt.y = 31;
      row.addChild(rTxt);

      // Title & Description
      const title = textLabel(m.title, 14, isClaimed ? 0x94A3B8 : 0xFFFFFF, true);
      title.x = 60; title.y = 12;
      row.addChild(title);

      const desc = textLabel(m.desc, 11, 0x94A3B8);
      desc.x = 60; desc.y = 32;
      row.addChild(desc);

      // Progress bar
      const barW = 140;
      const pct = Math.min(1, curVal / m.target);
      const pBarBg = new Graphics();
      pBarBg.roundRect(itemW - 360, 24, barW, 14, 7);
      pBarBg.fill({ color: 0x0F172A });
      pBarBg.roundRect(itemW - 360, 24, barW * pct, 14, 7);
      pBarBg.fill({ color: isComplete ? 0x10B981 : 0x38BDF8 });
      row.addChild(pBarBg);

      const pTxt = textLabel(`${Math.min(curVal, m.target)} / ${m.target}`, 10, 0xffffff, true);
      pTxt.anchor.set(0.5);
      pTxt.x = itemW - 290; pTxt.y = 31;
      row.addChild(pTxt);

      // Rewards text
      const rewTxt = textLabel(`+${m.rewardRyo}¥  +${m.rewardScrolls}📜`, 11, 0xFBBF24, true);
      rewTxt.x = itemW - 200; rewTxt.y = 24;
      row.addChild(rewTxt);

      // Claim button
      const btn = new Container();
      btn.x = itemW - 105; btn.y = 14;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, 92, 34, 6);
      btnBg.fill({ color: isClaimed ? 0x334155 : (isComplete ? 0x10B981 : 0x1E293B) });
      btn.addChild(btnBg);

      const btnLbl = isClaimed ? 'RISCATTATO' : (isComplete ? 'RISCATTA' : 'IN CORSO');
      const bTxt = textLabel(btnLbl, 10, isComplete && !isClaimed ? 0x000000 : 0x94A3B8, true);
      bTxt.anchor.set(0.5);
      bTxt.x = 46; bTxt.y = 17;
      btn.addChild(bTxt);

      const claimAction = () => {
        if (isComplete && !isClaimed) {
          claimed.add(m.id);
          saveClaimedMissions(claimed);
          SaveSystem.addRyo(m.rewardRyo);
          SaveSystem.addScrolls(m.rewardScrolls);
          audioManager.playSFX('promotion');
          this.renderMissions();
        }
      };

      if (isComplete && !isClaimed) {
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', claimAction);
      }

      navItems.push({ container: row, onSelect: claimAction });
      row.addChild(btn);
      this.listContainer.addChild(row);
    });

    GamepadMenuNavigator.get()?.updateItems(navItems);
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.renderMissions();
    this.container.visible = true;
    GamepadMenuNavigator.get()?.pushContext({
      id: 'missions_modal',
      items: [],
      selectedIndex: 0,
      onCancel: () => this.hide(),
    });
    this.renderMissions();
  }

  hide(): void {
    this.container.visible = false;
    GamepadMenuNavigator.get()?.popContext('missions_modal');
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
