import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import type { ActiveJutsuInstance } from '../data/jutsuCatalog';

// ============================================================
//  NarutoSurvivor — JutsuFusionModal (Fusione di Chakra Shinobi)
//  Allows merging 2 moves into a single slot (up to 4 simultaneous)
// ============================================================

export interface CombatJutsuSlot {
  id: string;
  name: string;
  moves: ActiveJutsuInstance[];
}

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

export class JutsuFusionModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private onCloseCallback?: () => void;

  private slots: CombatJutsuSlot[] = [];
  private selectedSlotAIndex: number = 0;
  private selectedSlotBIndex: number = -1;
  private onConfirmMerge?: (slotAIdx: number, slotBIdx: number) => void;

  private slotsContainer!: Container;
  private previewContainer!: Container;
  private actionButtonContainer!: Container;
  private navItems: NavigatableItem[] = [];

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

    // Semi-transparent backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x030712, alpha: 0.94 });
    this.container.addChild(backdrop);

    // Modal Card
    const modalW = 980;
    const modalH = 560;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0xF59E0B, width: 2.5, alpha: 0.85 });
    this.container.addChild(modalBg);

    // Header
    const title = makeText('💥 FUSIONE DI CHAKRA SHINOBI (BOSS REWARD)', 25, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 24;
    this.container.addChild(title);

    const subtitle = makeText(
      'Hai sconfitto il Boss nemico! Scegli due tecniche da unire in un singolo slot per eseguirle contemporaneamente (fino a 4 per slot).',
      12.5,
      0xE2E8F0,
    );
    subtitle.anchor.set(0.5, 0);
    subtitle.x = W / 2;
    subtitle.y = modalY + 58;
    this.container.addChild(subtitle);

    // Slots container
    this.slotsContainer = new Container();
    this.slotsContainer.x = modalX + 40;
    this.slotsContainer.y = modalY + 104;
    this.container.addChild(this.slotsContainer);

    // Fusion Preview Area
    this.previewContainer = new Container();
    this.previewContainer.x = modalX + 40;
    this.previewContainer.y = modalY + 360;
    this.container.addChild(this.previewContainer);

    // Action button area
    this.actionButtonContainer = new Container();
    this.actionButtonContainer.x = modalX + 40;
    this.actionButtonContainer.y = modalY + modalH - 64;
    this.container.addChild(this.actionButtonContainer);
  }

  show(
    slots: CombatJutsuSlot[],
    onConfirmMerge: (slotAIdx: number, slotBIdx: number) => void,
    onClose?: () => void,
  ): void {
    this.slots = slots;
    this.onConfirmMerge = onConfirmMerge;
    this.onCloseCallback = onClose;

    this.selectedSlotAIndex = 0;
    // Default pick slot B as the second slot if available
    this.selectedSlotBIndex = slots.length > 1 ? 1 : -1;

    this.container.visible = true;
    this.renderContent();

    GamepadMenuNavigator.get()?.pushContext({
      id: 'jutsu_fusion_modal',
      items: this.navItems,
      columns: 2,
      selectedIndex: 0,
      onCancel: () => this.hide(),
    });
  }

  private renderContent(): void {
    this.renderSlots();
    this.renderPreview();
    this.renderActionButtons();
    GamepadMenuNavigator.get()?.updateItems(this.navItems);
  }

  private renderSlots(): void {
    this.slotsContainer.removeChildren();
    this.navItems = [];

    const slotW = 430;
    const slotH = 105;
    const gapX = 40;
    const gapY = 16;
    const cols = 2;

    this.slots.forEach((slot, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const isA = idx === this.selectedSlotAIndex;
      const isB = idx === this.selectedSlotBIndex;

      const card = new Container();
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.x = col * (slotW + gapX);
      card.y = row * (slotH + gapY);

      const bg = new Graphics();
      bg.roundRect(0, 0, slotW, slotH, 10);
      bg.fill({ color: isA ? 0x1E3A8A : (isB ? 0x701A75 : 0x1E293B) });

      const strokeColor = isA ? 0x60A5FA : (isB ? 0xF472B6 : 0x334155);
      const strokeWidth = (isA || isB) ? 2.5 : 1.2;
      bg.stroke({ color: strokeColor, width: strokeWidth });
      card.addChild(bg);

      // Status Badge
      let badgeTxt = `Slot #${idx + 1} (${slot.moves.length}/4 Mosse)`;
      if (isA) badgeTxt = `★ BASE PRINCIPALE (Slot #${idx + 1})`;
      if (isB) badgeTxt = `⚡ DA UNIRE QUI (Slot #${idx + 1})`;

      const badge = makeText(badgeTxt, 11, isA ? 0x93C5FD : (isB ? 0xFBCFE8 : 0x94A3B8), true);
      badge.x = 14; badge.y = 10;
      card.addChild(badge);

      // Icons of moves inside this slot
      const iconsCont = new Container();
      iconsCont.x = 14; iconsCont.y = 34;

      let ix = 0;
      slot.moves.forEach((move, mi) => {
        const iconBg = new Graphics();
        iconBg.roundRect(ix, 0, 48, 36, 6);
        iconBg.fill({ color: 0x0F172A });
        iconBg.stroke({ color: move.definition.vfxColor, width: 1.2 });
        iconsCont.addChild(iconBg);

        const iconTxt = makeText(move.definition.icon, 18, 0xFFFFFF);
        iconTxt.anchor.set(0.5);
        iconTxt.x = ix + 24; iconTxt.y = 18;
        iconsCont.addChild(iconTxt);

        ix += 54;
        if (mi < slot.moves.length - 1) {
          const plus = makeText('+', 14, 0xFBBF24, true);
          plus.anchor.set(0.5);
          plus.x = ix - 3; plus.y = 18;
          iconsCont.addChild(plus);
        }
      });
      card.addChild(iconsCont);

      // Moves names list
      const names = slot.moves.map(m => m.definition.nameIT).join(' + ');
      const namesDisplay = names.length > 40 ? names.slice(0, 39) + '…' : names;
      const namesTxt = makeText(namesDisplay, 10.5, 0xE2E8F0, true);
      namesTxt.x = 14; namesTxt.y = 78;
      card.addChild(namesTxt);

      card.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        if (this.selectedSlotAIndex === idx) {
          // Deselect or do nothing
        } else if (this.selectedSlotBIndex === idx) {
          this.selectedSlotBIndex = -1;
        } else if (this.selectedSlotBIndex === -1) {
          this.selectedSlotBIndex = idx;
        } else {
          // Switch A to this, or B to this
          this.selectedSlotAIndex = idx;
        }
        this.renderContent();
      });

      this.slotsContainer.addChild(card);

      this.navItems.push({
        container: card,
        onSelect: () => {
          if (this.selectedSlotAIndex !== idx && this.selectedSlotBIndex !== idx) {
            if (this.selectedSlotBIndex === -1) {
              this.selectedSlotBIndex = idx;
            } else {
              this.selectedSlotAIndex = idx;
            }
          } else if (this.selectedSlotBIndex === idx) {
            this.selectedSlotBIndex = -1;
          }
          this.renderContent();
        },
      });
    });
  }

  private renderPreview(): void {
    this.previewContainer.removeChildren();

    const panelW = 900;
    const panelH = 72;

    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 10);
    bg.fill({ color: 0x111827 });
    bg.stroke({ color: 0x38BDF8, width: 1.5, alpha: 0.6 });
    this.previewContainer.addChild(bg);

    const slotA = this.slots[this.selectedSlotAIndex];
    const slotB = this.slots[this.selectedSlotBIndex];

    if (!slotA || !slotB || this.selectedSlotAIndex === this.selectedSlotBIndex) {
      const hint = makeText('👆 Seleziona due slot diversi sopra per visualizzare l\'anteprima della fusione.', 12.5, 0x94A3B8);
      hint.anchor.set(0.5);
      hint.x = panelW / 2; hint.y = panelH / 2;
      this.previewContainer.addChild(hint);
      return;
    }

    const totalMoves = slotA.moves.length + slotB.moves.length;
    if (totalMoves > 4) {
      const err = makeText('⚠️ Limite superato: uno slot può contenere al massimo 4 mosse contemporanee!', 13, 0xEF4444, true);
      err.anchor.set(0.5);
      err.x = panelW / 2; err.y = panelH / 2;
      this.previewContainer.addChild(err);
      return;
    }

    // Valid combination preview
    const comboTitle = makeText('✦ ANTEPRIMA SLOT FUSO CONTEMPORANEO ✦', 11, 0xFBBF24, true);
    comboTitle.x = 20; comboTitle.y = 12;
    this.previewContainer.addChild(comboTitle);

    const combinedMoves = [...slotA.moves, ...slotB.moves];
    const icons = combinedMoves.map(m => m.definition.icon).join('  +  ');
    const iconsTxt = makeText(icons, 18, 0xFFFFFF);
    iconsTxt.x = 20; iconsTxt.y = 36;
    this.previewContainer.addChild(iconsTxt);

    const desc = makeText(
      `Tutte le ${totalMoves} tecniche scatteranno simultaneamente quando questo slot è attivo! (+25% Danno di risonanza)`,
      11.5,
      0x34D399,
      true,
    );
    desc.x = 280; desc.y = 40;
    this.previewContainer.addChild(desc);
  }

  private renderActionButtons(): void {
    this.actionButtonContainer.removeChildren();

    const slotA = this.slots[this.selectedSlotAIndex];
    const slotB = this.slots[this.selectedSlotBIndex];
    const canMerge = slotA && slotB && this.selectedSlotAIndex !== this.selectedSlotBIndex && (slotA.moves.length + slotB.moves.length <= 4);

    const btnW = 260;
    const btnH = 42;

    // Confirm Merge Button
    const mergeBtn = new Container();
    mergeBtn.eventMode = canMerge ? 'static' : 'none';
    mergeBtn.cursor = canMerge ? 'pointer' : 'default';

    const mBg = new Graphics();
    mBg.roundRect(0, 0, btnW, btnH, 8);
    mBg.fill({ color: canMerge ? 0xF59E0B : 0x334155 });
    mergeBtn.addChild(mBg);

    const mTxt = makeText('💥 CONFERMA FUSIONE', 12.5, canMerge ? 0x000000 : 0x94A3B8, true);
    mTxt.anchor.set(0.5);
    mTxt.x = btnW / 2; mTxt.y = btnH / 2;
    mergeBtn.addChild(mTxt);

    mergeBtn.x = 900 - btnW;

    if (canMerge) {
      mergeBtn.on('pointerdown', () => {
        this.executeMerge();
      });
    }
    this.actionButtonContainer.addChild(mergeBtn);

    // Skip Button
    const skipBtn = new Container();
    skipBtn.eventMode = 'static';
    skipBtn.cursor = 'pointer';

    const sBg = new Graphics();
    sBg.roundRect(0, 0, 200, btnH, 8);
    sBg.fill({ color: 0x1E293B });
    sBg.stroke({ color: 0x475569, width: 1.2 });
    skipBtn.addChild(sBg);

    const sTxt = makeText('SALTA FUSIONE ✕', 11.5, 0xCBD5E1, true);
    sTxt.anchor.set(0.5);
    sTxt.x = 100; sTxt.y = btnH / 2;
    skipBtn.addChild(sTxt);

    skipBtn.x = 0;
    skipBtn.on('pointerdown', () => this.hide());
    this.actionButtonContainer.addChild(skipBtn);

    if (canMerge) {
      this.navItems.push({
        container: mergeBtn,
        onSelect: () => this.executeMerge(),
      });
    }

    this.navItems.push({
      container: skipBtn,
      onSelect: () => this.hide(),
    });
  }

  private executeMerge(): void {
    audioManager.playSFX('combined_activate');
    if (this.onConfirmMerge) {
      this.onConfirmMerge(this.selectedSlotAIndex, this.selectedSlotBIndex);
    }
    this.hide();
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('jutsu_fusion_modal');
    this.container.visible = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
