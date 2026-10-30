// ============================================================
//  NarutoSurvivor — Tenten Arms & Ichiraku Ramen Shop Modal
//  Full Interactive Meta-Progression Shop with Ryo spending
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

export interface ShopItem {
  id: string;
  category: 'scrolls' | 'ramen' | 'fragments';
  name: string;
  desc: string;
  icon: string;
  cost: number;
  color: number;
  onBuy: () => boolean;
}

export class ShopModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private currentTab: 'tenten' | 'ichiraku' = 'tenten';
  private ryoText!: Text;
  private listContainer!: Container;
  private onCloseCallback?: () => void;
  private toastContainer!: Container;

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

    // Dark backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x030712, alpha: 0.92 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.container.addChild(backdrop);

    // Modal Box
    const MODAL_W = Math.min(880, W - 40);
    const MODAL_H = Math.min(590, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, MODAL_W, MODAL_H, 18);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0xF59E0B, width: 2, alpha: 0.75 });
    this.container.addChild(modalBg);

    // Header Title
    const title = textLabel('🏪 BOTTEGA DI TENTEN & CHIOSCO ICHIRAKU', 22, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 18;
    this.container.addChild(title);

    const sub = textLabel('Investi i tuoi Ryo in pergamene segrete, armi e scorpacciate di ramen per la prossima run', 12, 0x94A3B8);
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = modalY + 48;
    this.container.addChild(sub);

    // Ryo Balance Pill
    const pill = new Graphics();
    pill.roundRect(modalX + MODAL_W - 220, modalY + 18, 160, 32, 16);
    pill.fill({ color: 0x1E293B });
    pill.stroke({ color: 0xF59E0B, width: 1.5 });
    this.container.addChild(pill);

    this.ryoText = textLabel('', 13, 0xFBBF24, true);
    this.ryoText.anchor.set(0.5);
    this.ryoText.x = modalX + MODAL_W - 140;
    this.ryoText.y = modalY + 34;
    this.container.addChild(this.ryoText);

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

    // Tab buttons
    const tabY = modalY + 80;
    this.buildTabs(modalX, tabY, MODAL_W);

    // Scrollable List container
    this.listContainer = new Container();
    this.listContainer.x = modalX + 24;
    this.listContainer.y = tabY + 46;
    this.container.addChild(this.listContainer);

    // Toast feedback notification container
    this.toastContainer = new Container();
    this.toastContainer.x = W / 2;
    this.toastContainer.y = modalY + MODAL_H - 30;
    this.container.addChild(this.toastContainer);
  }

  private buildTabs(modalX: number, tabY: number, modalW: number): void {
    const tabW = (modalW - 60) / 2;

    // Tab 1: Tenten
    const tabTenten = new Container();
    tabTenten.eventMode = 'static';
    tabTenten.cursor = 'pointer';
    tabTenten.x = modalX + 24;
    tabTenten.y = tabY;

    const bgTenten = new Graphics();
    bgTenten.roundRect(0, 0, tabW, 36, 8);
    bgTenten.fill({ color: this.currentTab === 'tenten' ? 0xF59E0B : 0x1E293B });
    tabTenten.addChild(bgTenten);

    const txtTenten = textLabel('🗡️ Emporio di Tenten (Rotoli & Frammenti)', 13, this.currentTab === 'tenten' ? 0x000000 : 0xE2E8F0, true);
    txtTenten.anchor.set(0.5);
    txtTenten.x = tabW / 2;
    txtTenten.y = 18;
    tabTenten.addChild(txtTenten);

    tabTenten.on('pointerdown', () => {
      this.currentTab = 'tenten';
      audioManager.playSFX('button_click');
      bgTenten.clear(); bgTenten.roundRect(0, 0, tabW, 36, 8); bgTenten.fill({ color: 0xF59E0B });
      txtTenten.style.fill = 0x000000;
      bgIchiraku.clear(); bgIchiraku.roundRect(0, 0, tabW, 36, 8); bgIchiraku.fill({ color: 0x1E293B });
      txtIchiraku.style.fill = 0xE2E8F0;
      this.renderItems();
    });
    this.container.addChild(tabTenten);

    // Tab 2: Ichiraku
    const tabIchiraku = new Container();
    tabIchiraku.eventMode = 'static';
    tabIchiraku.cursor = 'pointer';
    tabIchiraku.x = modalX + 36 + tabW;
    tabIchiraku.y = tabY;

    const bgIchiraku = new Graphics();
    bgIchiraku.roundRect(0, 0, tabW, 36, 8);
    bgIchiraku.fill({ color: this.currentTab === 'ichiraku' ? 0xF59E0B : 0x1E293B });
    tabIchiraku.addChild(bgIchiraku);

    const txtIchiraku = textLabel('🍜 Chiosco di Ichiraku (Pasti & Buff Run)', 13, this.currentTab === 'ichiraku' ? 0x000000 : 0xE2E8F0, true);
    txtIchiraku.anchor.set(0.5);
    txtIchiraku.x = tabW / 2;
    txtIchiraku.y = 18;
    tabIchiraku.addChild(txtIchiraku);

    tabIchiraku.on('pointerdown', () => {
      this.currentTab = 'ichiraku';
      audioManager.playSFX('button_click');
      bgIchiraku.clear(); bgIchiraku.roundRect(0, 0, tabW, 36, 8); bgIchiraku.fill({ color: 0xF59E0B });
      txtIchiraku.style.fill = 0x000000;
      bgTenten.clear(); bgTenten.roundRect(0, 0, tabW, 36, 8); bgTenten.fill({ color: 0x1E293B });
      txtTenten.style.fill = 0xE2E8F0;
      this.renderItems();
    });
    this.container.addChild(tabIchiraku);
  }

  private getItemsForTab(): ShopItem[] {
    if (this.currentTab === 'tenten') {
      return [
        {
          id: 'scroll_1',
          category: 'scrolls',
          name: '1× Rotolo di Evocazione Shinobi',
          desc: 'Permette di effettuare un’evocazione al Tempio Ninja per ottenere nuovi shinobi.',
          icon: '📜',
          cost: 500,
          color: 0x38BDF8,
          onBuy: () => {
            SaveSystem.addScrolls(1);
            return true;
          },
        },
        {
          id: 'scroll_5',
          category: 'scrolls',
          name: '5× Fascio di Rotoli Shinobi (Sconto 12%)',
          desc: 'Confezione sigillata di 5 rotoli per evocazioni multiple.',
          icon: '📜',
          cost: 2200,
          color: 0x818CF8,
          onBuy: () => {
            SaveSystem.addScrolls(5);
            return true;
          },
        },
        {
          id: 'frag_naruto',
          category: 'fragments',
          name: '15× Frammenti: Naruto (Genin)',
          desc: 'Frammenti dedicati per promuovere Naruto da 1★ a 2★ o 3★.',
          icon: '🍥',
          cost: 750,
          color: 0xF97316,
          onBuy: () => {
            SaveSystem.addFragments('naruto_genin', 15);
            return true;
          },
        },
        {
          id: 'frag_sasuke',
          category: 'fragments',
          name: '15× Frammenti: Sasuke (Genin)',
          desc: 'Frammenti dedicati per promuovere Sasuke da 1★ a 2★ o 3★.',
          icon: '⚡',
          cost: 750,
          color: 0x38BDF8,
          onBuy: () => {
            SaveSystem.addFragments('sasuke_genin', 15);
            return true;
          },
        },
      ];
    } else {
      const activeBuffs = SaveSystem.getNextRunBuffs();
      return [
        {
          id: 'ramen_special',
          category: 'ramen',
          name: 'Ramen Miso con Chashu Extra di Teuchi',
          desc: activeBuffs.ichirakuRamen ? '✓ GIÀ ATTIVO PER LA PROSSIMA RUN' : '+30% HP Massimi e +15% Velocità di Corsa nella prossima partita.',
          icon: '🍜',
          cost: 450,
          color: 0xFBBF24,
          onBuy: () => {
            if (SaveSystem.getNextRunBuffs().ichirakuRamen) return false;
            SaveSystem.setNextRunBuff('ichirakuRamen', true);
            return true;
          },
        },
        {
          id: 'chakra_tonic',
          category: 'ramen',
          name: 'Tonico di Chakra Puro del Monte Myōboku',
          desc: activeBuffs.chakraTonic ? '✓ GIÀ ATTIVO PER LA PROSSIMA RUN' : '-20% Cooldown di tutti i Jutsu per l’intera durata della prossima run.',
          icon: '🍵',
          cost: 500,
          color: 0x34D399,
          onBuy: () => {
            if (SaveSystem.getNextRunBuffs().chakraTonic) return false;
            SaveSystem.setNextRunBuff('chakraTonic', true);
            return true;
          },
        },
        {
          id: 'military_pill',
          category: 'ramen',
          name: 'Pillola da Guerra delle Tre Vie (Hyōrōgan)',
          desc: activeBuffs.militaryPill ? '✓ GIÀ ATTIVO PER LA PROSSIMA RUN' : '+25% Danno Jutsu e +12% Probabilità Critico per la prossima partita.',
          icon: '💊',
          cost: 550,
          color: 0xF87171,
          onBuy: () => {
            if (SaveSystem.getNextRunBuffs().militaryPill) return false;
            SaveSystem.setNextRunBuff('militaryPill', true);
            return true;
          },
        },
        {
          id: 'magnet_charm',
          category: 'ramen',
          name: 'Amuleto Magnetico di Tenten',
          desc: activeBuffs.magnetAmulet ? '✓ GIÀ ATTIVO PER LA PROSSIMA RUN' : '+90px Raggio di Raccolta Globi Chakra per tutta la prossima run.',
          icon: '🧲',
          cost: 350,
          color: 0xA78BFA,
          onBuy: () => {
            if (SaveSystem.getNextRunBuffs().magnetAmulet) return false;
            SaveSystem.setNextRunBuff('magnetAmulet', true);
            return true;
          },
        },
      ];
    }
  }

  private renderItems(): void {
    this.listContainer.removeChildren();
    const profile = SaveSystem.getProfile();
    this.ryoText.text = `💰 ¥ ${profile.ryo.toLocaleString()}`;

    const items = this.getItemsForTab();
    const itemW = 830;
    const itemH = 80;
    const navItems: NavigatableItem[] = [];

    items.forEach((item, i) => {
      const canAfford = profile.ryo >= item.cost;
      const isAlreadyActive = item.desc.includes('GIÀ ATTIVO');

      const card = new Container();
      card.y = i * (itemH + 12);

      const cardBg = new Graphics();
      cardBg.roundRect(0, 0, itemW, itemH, 12);
      cardBg.fill({ color: isAlreadyActive ? 0x064E3B : 0x1E293B, alpha: 0.85 });
      cardBg.stroke({ color: isAlreadyActive ? 0x10B981 : (canAfford ? item.color : 0x475569), width: 1.5 });
      card.addChild(cardBg);

      // Icon
      const ic = textLabel(item.icon, 28);
      ic.x = 20;
      ic.y = 22;
      card.addChild(ic);

      // Name & Description
      const name = textLabel(item.name, 15, isAlreadyActive ? 0xA7F3D0 : 0xFFFFFF, true);
      name.x = 72;
      name.y = 16;
      card.addChild(name);

      const desc = textLabel(item.desc, 12, isAlreadyActive ? 0x6EE7B7 : 0x94A3B8);
      desc.x = 72;
      desc.y = 44;
      card.addChild(desc);

      // Buy Button
      const btn = new Container();
      btn.x = itemW - 170;
      btn.y = 18;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, 150, 44, 8);
      btnBg.fill({ color: isAlreadyActive ? 0x047857 : (canAfford ? 0xF59E0B : 0x334155) });
      btn.addChild(btnBg);

      const btnTxt = isAlreadyActive ? '✓ ACQUISTATO' : `ACQUISTA\n¥ ${item.cost}`;
      const btnLabel = textLabel(btnTxt, 11, canAfford && !isAlreadyActive ? 0x000000 : 0xffffff, true);
      btnLabel.anchor.set(0.5);
      btnLabel.x = 75;
      btnLabel.y = 22;
      const buyAction = () => {
        if (canAfford && !isAlreadyActive) {
          if (SaveSystem.spendRyo(item.cost)) {
            const success = item.onBuy();
            if (success) {
              audioManager.playSFX('collect_ryo');
              this.showToast(`✓ Acquistato: ${item.name}!`);
              this.renderItems();
            }
          }
        }
      };

      if (canAfford && !isAlreadyActive) {
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', buyAction);
      }

      navItems.push({ container: card, onSelect: buyAction });
      card.addChild(btn);
      this.listContainer.addChild(card);
    });

    GamepadMenuNavigator.get()?.updateItems(navItems);
  }

  private showToast(msg: string): void {
    this.toastContainer.removeChildren();
    const bg = new Graphics();
    const txt = textLabel(msg, 13, 0xffffff, true);
    txt.anchor.set(0.5);
    bg.roundRect(-txt.width / 2 - 16, -16, txt.width + 32, 32, 16);
    bg.fill({ color: 0x10B981, alpha: 0.95 });
    this.toastContainer.addChild(bg);
    this.toastContainer.addChild(txt);

    setTimeout(() => {
      this.toastContainer.removeChildren();
    }, 2500);
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.renderItems();
    this.container.visible = true;
    GamepadMenuNavigator.get()?.pushContext({
      id: 'shop_modal',
      items: [],
      selectedIndex: 0,
      onCancel: () => this.hide(),
      onTabPrev: () => {
        this.currentTab = 'tenten';
        this.renderItems();
      },
      onTabNext: () => {
        this.currentTab = 'ichiraku';
        this.renderItems();
      },
    });
    this.renderItems();
  }

  hide(): void {
    this.container.visible = false;
    GamepadMenuNavigator.get()?.popContext('shop_modal');
    if (this.onCloseCallback) this.onCloseCallback();
  }
}

