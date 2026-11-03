// ============================================================
//  NarutoSurvivor — Stage & Mission Select Modal
//  Vampire Survivors & PokéSurvivor style Map Selection
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import { createNarutoIcon } from '../rendering/IconManager';
import type { Biome } from '../rendering/TilemapRenderer';
import type { Character } from '../types/character';

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

export interface StageDefinition {
  id: string;
  biome: Biome | 'RANDOM';
  nameIT: string;
  nameJP: string;
  icon: string;
  difficultyStars: string;
  difficultyLabel: string;
  color: number;
  bgFill: number;
  description: string;
  modifiers: string[];
}

export const STAGES: StageDefinition[] = [
  {
    id: 'stage_konoha',
    biome: 'KONOHA_VILLAGE',
    nameIT: 'Villaggio della Foglia',
    nameJP: '木ノ葉隠れの里',
    icon: '🍃',
    difficultyStars: '★☆☆',
    difficultyLabel: 'NORMALE',
    color: 0x22C55E,
    bgFill: 0x05230F,
    description: 'Il cuore protetto dal Monumento degli Hokage. Ideale per Genin e Chūnin che vogliono testare nuove tecniche e raccogliere risorse base.',
    modifiers: ['• Moltiplicatore EXP: 1.0x', '• Moltiplicatore Ryo: 1.0x', '• Danno nemici: Standard'],
  },
  {
    id: 'stage_forest',
    biome: 'FOREST_OF_DEATH',
    nameIT: 'Foresta della Morte',
    nameJP: '死の森',
    icon: '🌲',
    difficultyStars: '★★☆',
    difficultyLabel: 'DIFFICILE',
    color: 0xF59E0B,
    bgFill: 0x221303,
    description: 'La 44ª zona di addestramento dell\'Esame Chūnin. Vegetazione ostile e ondate di Zetsu Bianchi che attaccano con cadenza serrata.',
    modifiers: ['• +25% Guadagno Chakra (EXP)', '• Ondate di nemici più dense', '• Più elite e ninja con shuriken'],
  },
  {
    id: 'stage_valley',
    biome: 'VALLEY_OF_END',
    nameIT: 'Valle della Fine',
    nameJP: '終末の谷',
    icon: '⚡',
    difficultyStars: '★★★',
    difficultyLabel: 'INCUBO',
    color: 0xEF4444,
    bgFill: 0x230505,
    description: 'Il leggendario anfiteatro roccioso tra le statue di Madara e Hashirama. Sfida suprema dove i nemici infliggono danni critici aumentati.',
    modifiers: ['• +50% Ryo & Chakra EXP', '• Nemici +15% Velocità e Danno', '• Proiettili nemici e boss devastanti'],
  },
  {
    id: 'stage_random',
    biome: 'RANDOM',
    nameIT: 'Destino Shinobi (Casuale)',
    nameJP: '忍の運命',
    icon: '🎲',
    difficultyStars: '★★★',
    difficultyLabel: 'SORPRESA',
    color: 0xA855F7,
    bgFill: 0x180528,
    description: 'Lascia che sia il vento del destino a decidere l\'arena di battaglia. Un vero ninja deve adattarsi a qualsiasi terreno.',
    modifiers: ['• Bioma scelto casualmente all\'avvio', '• Bonus sorpresa alla vittoria (+10% Ryo)', '• Ideale per ninja audaci'],
  },
  {
    id: 'stage_war',
    biome: 'VALLEY_OF_END',
    nameIT: 'Grande Guerra Ninja',
    nameJP: '第四次忍界大戦',
    icon: '⚔️',
    difficultyStars: '★★★★',
    difficultyLabel: 'INFINITA',
    color: 0xDC2626,
    bgFill: 0x24070A,
    description: 'Il campo di battaglia della Quarta Guerra Ninja. Sopravvivi all\'infinito senza limite di tempo e scala la Classifica Hokage!',
    modifiers: ['• Modalità Sopravvivenza Infinita (Nessun limite 18m)', '• +75% Guadagno Ryo e Chakra continuo', '• Portali Boss Akatsuki frequenti ogni 2 minuti'],
  },
];

export class StageSelectModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private selectedStageIndex = 0;
  private onConfirmCallback?: (stage: StageDefinition) => void;
  private cardsContainer!: Container;

  constructor(parentStage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    parentStage.addChild(this.container);
  }

  show(char: Character, onConfirm: (stage: StageDefinition) => void): void {
    this.onConfirmCallback = onConfirm;
    this.container.removeChildren();
    this.container.visible = true;

    const W = this.W;
    const H = this.H;

    // 1. Dark Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x060912, alpha: 0.94 });
    bg.eventMode = 'static';
    this.container.addChild(bg);

    // 2. Center Modal Frame
    const MODAL_W = Math.min(880, W - 40);
    const MODAL_H = Math.min(560, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modal = new Container();
    modal.x = modalX;
    modal.y = modalY;
    this.container.addChild(modal);

    const modalBg = new Graphics();
    modalBg.roundRect(0, 0, MODAL_W, MODAL_H, 20);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0x38BDF8, width: 2.5, alpha: 0.85 });
    modal.addChild(modalBg);

    // Close button
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.x = MODAL_W - 44;
    closeBtn.y = 16;
    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 30, 30, 8);
    closeBg.fill({ color: 0x1E293B });
    closeBg.stroke({ color: 0x475569, width: 1 });
    closeBtn.addChild(closeBg);
    const closeTxt = textLabel('✕', 14, 0x94A3B8, true);
    closeTxt.anchor.set(0.5);
    closeTxt.x = 15; closeTxt.y = 15;
    closeBtn.addChild(closeTxt);
    closeBtn.on('pointerdown', () => this.hide());
    modal.addChild(closeBtn);

    // Header
    const titleBox = new Container();
    const mIcon = createNarutoIcon('missions', 26);
    mIcon.x = -240; mIcon.y = 12;
    const title = textLabel('SELEZIONE STAGE & MISSIONE SHINOBI', 22, 0xFACC15, true);
    title.anchor.set(0.5, 0);
    titleBox.addChild(mIcon, title);
    titleBox.x = MODAL_W / 2;
    titleBox.y = 20;
    modal.addChild(titleBox);

    const sub = textLabel(
      `Ninja schierato: ${char.nameIT} • Scegli l'arena di combattimento e affronta le orde nemiche`,
      12,
      0x94A3B8,
    );
    sub.anchor.set(0.5, 0);
    sub.x = MODAL_W / 2;
    sub.y = 52;
    modal.addChild(sub);

    // 3. Stage Cards Grid
    this.cardsContainer = new Container();
    this.cardsContainer.x = 24;
    this.cardsContainer.y = 86;
    modal.addChild(this.cardsContainer);

    this.renderCards(MODAL_W);

    // 4. Bottom Deploy Button
    const deployBtn = new Container();
    deployBtn.eventMode = 'static';
    deployBtn.cursor = 'pointer';
    deployBtn.x = MODAL_W / 2 - 160;
    deployBtn.y = MODAL_H - 66;

    const depBg = new Graphics();
    depBg.roundRect(0, 0, 320, 48, 12);
    depBg.fill({ color: 0xEF4444 });
    depBg.stroke({ color: 0xFCA5A5, width: 2 });
    deployBtn.addChild(depBg);

    const depTxt = textLabel('▶ DISPIEGA SHINOBI NELL\'ARENA', 14, 0xFFFFFF, true);
    depTxt.anchor.set(0.5);
    depTxt.x = 160; depTxt.y = 24;
    deployBtn.addChild(depTxt);

    deployBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.confirmSelection();
    });
    modal.addChild(deployBtn);

    this.deployBtnContainer = deployBtn;
    this.updateGamepadNav(MODAL_W);
  }

  private deployBtnContainer?: Container;
  private cardContainers: Container[] = [];

  private updateGamepadNav(MODAL_W: number): void {
    const navItems: NavigatableItem[] = [];

    // Stage Cards
    this.cardContainers.forEach((card, idx) => {
      navItems.push({
        container: card,
        onSelect: () => {
          this.selectedStageIndex = idx;
          this.renderCards(MODAL_W);
          this.updateGamepadNav(MODAL_W);
        },
        downIndex: idx <= 1 ? idx + 3 : (this.deployBtnContainer ? this.cardContainers.length : undefined),
        upIndex: idx >= 3 ? idx - 3 : undefined,
        leftIndex: idx % 3 > 0 ? idx - 1 : undefined,
        rightIndex: (idx % 3 < 2 && idx + 1 < this.cardContainers.length) ? idx + 1 : undefined,
      });
    });

    // Deploy button
    if (this.deployBtnContainer) {
      navItems.push({
        container: this.deployBtnContainer,
        onSelect: () => this.confirmSelection(),
        upIndex: this.selectedStageIndex,
      });
    }

    GamepadMenuNavigator.get()?.pushContext({
      id: 'stage_select',
      items: navItems,
      selectedIndex: this.selectedStageIndex,
      columns: 3,
      onCancel: () => this.hide(),
    });
  }

  private renderCards(MODAL_W: number): void {
    this.cardsContainer.removeChildren();
    this.cardContainers = [];

    const cols = 3;
    const cardW = (MODAL_W - 48 - (cols - 1) * 16) / cols;
    const cardH = 175;

    STAGES.forEach((stage, idx) => {
      const isSelected = idx === this.selectedStageIndex;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = col * (cardW + 16);
      const cy = row * (cardH + 16);

      const card = new Container();
      card.x = cx;
      card.y = cy;
      card.eventMode = 'static';
      card.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, cardW, cardH, 14);
      bg.fill({ color: isSelected ? stage.bgFill : 0x1E293B, alpha: 0.95 });
      bg.stroke({
        color: isSelected ? stage.color : 0x334155,
        width: isSelected ? 3 : 1.5,
      });
      card.addChild(bg);

      // Authentic Naruto Icon Badge & Name header
      const iconBadge = createNarutoIcon(stage.id, 32);
      iconBadge.x = 28; iconBadge.y = 24;
      card.addChild(iconBadge);

      const nameTxt = textLabel(stage.nameIT, 14, isSelected ? 0xFFFFFF : 0xE2E8F0, true);
      nameTxt.x = 52; nameTxt.y = 12;
      card.addChild(nameTxt);

      const diffBadge = textLabel(`${stage.difficultyStars} ${stage.difficultyLabel}`, 10, stage.color, true);
      diffBadge.x = 52; diffBadge.y = 33;
      card.addChild(diffBadge);

      // Selected Checkmark Pill
      if (isSelected) {
        const checkPill = new Graphics();
        checkPill.roundRect(cardW - 85, 12, 72, 22, 6);
        checkPill.fill({ color: stage.color, alpha: 0.25 });
        checkPill.stroke({ color: stage.color, width: 1.5 });
        card.addChild(checkPill);
        const checkTxt = textLabel('✓ SCELTO', 10, stage.color, true);
        checkTxt.anchor.set(0.5);
        checkTxt.x = cardW - 49; checkTxt.y = 23;
        card.addChild(checkTxt);
      }

      // Description
      const descTxt = textLabel(stage.description, 11, 0x94A3B8);
      descTxt.style.wordWrap = true;
      descTxt.style.wordWrapWidth = cardW - 32;
      descTxt.x = 16; descTxt.y = 58;
      card.addChild(descTxt);

      // Modifiers list
      let modY = 112;
      for (const mod of stage.modifiers) {
        const mTxt = textLabel(mod, 10, isSelected ? 0xFDE047 : 0x64748B, isSelected);
        mTxt.x = 16; mTxt.y = modY;
        card.addChild(mTxt);
        modY += 16;
      }

      card.on('pointerdown', () => {
        this.selectedStageIndex = idx;
        audioManager.playSFX('button_click');
        this.renderCards(MODAL_W);
        this.updateGamepadNav(MODAL_W);
      });

      this.cardContainers.push(card);
      this.cardsContainer.addChild(card);
    });
  }

  private confirmSelection(): void {
    const stage = STAGES[this.selectedStageIndex];
    this.hide();
    if (this.onConfirmCallback) {
      this.onConfirmCallback(stage);
    }
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('stage_select');
    this.container.visible = false;
  }
}
