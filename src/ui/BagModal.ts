import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SaveSystem, type NextRunBuffs } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';

// ============================================================
//  NarutoSurvivor — BagModal (Borsa Ninja / Tactical Inventory)
//  Complete interactive bag with items, buffs, scrolls & gamepad nav
// ============================================================

export interface BagItem {
  id: string;
  name: string;
  category: 'TOOLS' | 'CONSUMABLES' | 'SCROLLS';
  icon: string;
  count: number | string;
  rarityColor: number;
  description: string;
  effect: string;
  usable?: boolean;
  buffKey?: keyof NextRunBuffs;
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

export class BagModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private onCloseCallback?: () => void;

  private activeTab: 'ALL' | 'TOOLS' | 'CONSUMABLES' | 'SCROLLS' = 'ALL';
  private tabsContainer!: Container;
  private itemsGridContainer!: Container;
  private detailContainer!: Container;
  private currencyText!: Text;
  private selectedItemIndex: number = 0;
  private currentNavItems: NavigatableItem[] = [];

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
    backdrop.fill({ color: 0x05070A, alpha: 0.94 });
    this.container.addChild(backdrop);

    // ── Modal window ─────────────────────────────────────────
    const modalW = 1060;
    const modalH = 620;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0xEA580C, width: 2, alpha: 0.65 });
    this.container.addChild(modalBg);

    // ── Header ───────────────────────────────────────────────
    const title = makeText('🎒  BORSA NINJA & INVENTARIO TATTICO', 25, 0xF97316, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 22;
    this.container.addChild(title);

    const subtitle = makeText(
      'Equipaggiamento shinobi, strumenti da lancio, tonici curativi e pergamene antiche',
      12.5,
      0x94A3B8,
    );
    subtitle.anchor.set(0.5, 0);
    subtitle.x = W / 2;
    subtitle.y = modalY + 56;
    this.container.addChild(subtitle);

    // Currency bar
    this.currencyText = makeText('', 13, 0xFFFFFF, true);
    this.currencyText.anchor.set(0.5, 0);
    this.currencyText.x = W / 2;
    this.currencyText.y = modalY + 80;
    this.container.addChild(this.currencyText);

    // Close button (X)
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.x = modalX + modalW - 50;
    closeBtn.y = modalY + 20;

    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 36, 36, 8);
    closeBg.fill({ color: 0x334155 });
    closeBg.stroke({ color: 0x64748B, width: 1.5 });
    closeBtn.addChild(closeBg);

    const closeTxt = makeText('✕', 18, 0xFFFFFF, true);
    closeTxt.anchor.set(0.5);
    closeTxt.x = 18; closeTxt.y = 18;
    closeBtn.addChild(closeTxt);

    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.addChild(closeBtn);

    // ── Tabs Container ───────────────────────────────────────
    this.tabsContainer = new Container();
    this.tabsContainer.x = modalX + 40;
    this.tabsContainer.y = modalY + 112;
    this.container.addChild(this.tabsContainer);

    // ── Items Grid Layer ─────────────────────────────────────
    this.itemsGridContainer = new Container();
    this.itemsGridContainer.x = modalX + 40;
    this.itemsGridContainer.y = modalY + 160;
    this.container.addChild(this.itemsGridContainer);

    // ── Item Detail Side Panel ───────────────────────────────
    this.detailContainer = new Container();
    this.detailContainer.x = modalX + modalW - 360;
    this.detailContainer.y = modalY + 160;
    this.container.addChild(this.detailContainer);
  }

  private getItemsList(): BagItem[] {
    const profile = SaveSystem.getProfile();
    const buffs = profile.nextRunBuffs || {};

    const items: BagItem[] = [
      // Strumenti
      {
        id: 'kunai_minato',
        name: 'Kunai con Sigillo di Minato',
        category: 'TOOLS',
        icon: '🗡️',
        count: 'Equipaggiato',
        rarityColor: 0xF59E0B,
        description: 'Speciale kunai a tre punte con la formula della Dislocazione Istantanea incisa sull\'elsa.',
        effect: '+15% Velocità di Movimento in Battaglia',
      },
      {
        id: 'shuriken_fuma',
        name: 'Shuriken Ombra Fūma',
        category: 'TOOLS',
        icon: '🥷',
        count: 'Illimitati',
        rarityColor: 0x38BDF8,
        description: 'Lame giganti aerodinamiche pieghevoli usate dai ninja della Foglia per imboscate tattiche.',
        effect: 'Disponibile per la selezione Jutsu a inizio missione',
      },
      {
        id: 'explosive_tags',
        name: 'Carte Bomba Esplosive',
        category: 'TOOLS',
        icon: '💥',
        count: '30 unità',
        rarityColor: 0xEF4444,
        description: 'Strisce di carta contenenti chakra del fuoco sigillato pronto a deflagrare.',
        effect: '+20% Raggio di Esplosione di Katon e Tecniche Fuoco',
      },
      {
        id: 'smoke_bombs',
        name: 'Bombe Fumogene di Konoha',
        category: 'TOOLS',
        icon: '💨',
        count: '15 unità',
        rarityColor: 0x9CA3AF,
        description: 'Sferette chimiche che esplodono in fumo denso per confondere i nemici.',
        effect: 'Aumenta del 10% la probabilità di schivata',
      },
      {
        id: 'leaf_headband',
        name: 'Coprifronte di Konoha',
        category: 'TOOLS',
        icon: '🍃',
        count: 'Simbolo',
        rarityColor: 0x10B981,
        description: 'La placca metallica della Volontà del Fuoco. Aumenta la determinazione del ninja.',
        effect: '+50 Punti Vita Massimi iniziali',
      },

      // Consumabili
      {
        id: 'ramen_buff',
        name: 'Ramen Miso Chashu di Ichiraku',
        category: 'CONSUMABLES',
        icon: '🍜',
        count: buffs.ichirakuRamen ? 'Attivo (Prossima Run)' : 'Non Attivo',
        rarityColor: 0xF97316,
        description: 'La leggendaria ciotola di Teuchi che rinvigorisce ogni fibra muscolare.',
        effect: '+30% HP Massimi e +15% Velocità nella prossima partita',
        usable: !buffs.ichirakuRamen,
        buffKey: 'ichirakuRamen',
      },
      {
        id: 'military_pill',
        name: 'Pillola del Soldato (Hyorogan)',
        category: 'CONSUMABLES',
        icon: '💊',
        count: buffs.militaryPill ? 'Attivo (Prossima Run)' : 'Non Attivo',
        rarityColor: 0xEC4899,
        description: 'Composto energetico nutriente che raddoppia la potenza delle tecniche ninja.',
        effect: '+25% Danno Jutsu e +12% Critico nella prossima run',
        usable: !buffs.militaryPill,
        buffKey: 'militaryPill',
      },
      {
        id: 'chakra_tonic',
        name: 'Tonico di Chakra Puro',
        category: 'CONSUMABLES',
        icon: '🧪',
        count: buffs.chakraTonic ? 'Attivo (Prossima Run)' : 'Non Attivo',
        rarityColor: 0x06B6D4,
        description: 'Elisir distillato dai petali delle erbe del Paese del Fuoco.',
        effect: '-20% Tempo di Ricarica di tutti i Jutsu',
        usable: !buffs.chakraTonic,
        buffKey: 'chakraTonic',
      },
      {
        id: 'magnet_amulet',
        name: 'Amuleto del Magnetismo di Suna',
        category: 'CONSUMABLES',
        icon: '🧲',
        count: buffs.magnetAmulet ? 'Attivo (Prossima Run)' : 'Non Attivo',
        rarityColor: 0xA855F7,
        description: 'Talismano intriso di polvere di ferro magnetizzata.',
        effect: '+90px Raggio di attrazione automatica dei globi di Chakra',
        usable: !buffs.magnetAmulet,
        buffKey: 'magnetAmulet',
      },

      // Pergamene & Sigilli
      {
        id: 'summon_scrolls',
        name: 'Rotoli di Evocazione Shinobi',
        category: 'SCROLLS',
        icon: '📜',
        count: `${profile.scrolls} unità`,
        rarityColor: 0xFBBF24,
        description: 'Antiche pergamene sigillate utilizzabili nel Tempio Gacha per evocare nuovi shinobi.',
        effect: 'Usabili nel Gacha per sbloccare ninja 1★ - 5★',
      },
      {
        id: 'ninja_seals',
        name: 'Sigilli di Protezione delle 5 Terre',
        category: 'SCROLLS',
        icon: '🔖',
        count: `${profile.ninjaSeals} unità`,
        rarityColor: 0xA855F7,
        description: 'Talismani di fūinjutsu creati dagli anziani di Uzushio per reprimere le maledizioni.',
        effect: 'Permettono il Reroll dei potenziamenti durante la partita',
      },
    ];

    if (this.activeTab === 'ALL') return items;
    return items.filter(it => it.category === this.activeTab);
  }

  private renderTabs(): void {
    this.tabsContainer.removeChildren();

    const tabs: Array<{ id: 'ALL' | 'TOOLS' | 'CONSUMABLES' | 'SCROLLS'; label: string }> = [
      { id: 'ALL', label: '🎒 TUTTI' },
      { id: 'TOOLS', label: '🗡️ STRUMENTI NINJA' },
      { id: 'CONSUMABLES', label: '🧪 CONSUMABILI' },
      { id: 'SCROLLS', label: '📜 ROTOLI & SIGILLI' },
    ];

    let cx = 0;
    tabs.forEach(tab => {
      const isSel = this.activeTab === tab.id;
      const tw = tab.label.length * 8.5 + 24;
      const th = 34;

      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, tw, th, 8);
      bg.fill({ color: isSel ? 0xEA580C : 0x1E293B });
      bg.stroke({ color: isSel ? 0xFDBA74 : 0x334155, width: 1.5 });
      btn.addChild(bg);

      const txt = makeText(tab.label, 11.5, isSel ? 0xFFFFFF : 0x94A3B8, isSel);
      txt.anchor.set(0.5);
      txt.x = tw / 2; txt.y = th / 2;
      btn.addChild(txt);

      btn.x = cx;
      cx += tw + 12;

      btn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.activeTab = tab.id;
        this.selectedItemIndex = 0;
        this.refreshContent();
      });

      this.tabsContainer.addChild(btn);
    });
  }

  private refreshContent(): void {
    this.renderTabs();
    this.renderItemsGrid();
    this.renderDetailPanel();
    this.updateCurrency();
    this.updateGamepadContext();
  }

  private updateCurrency(): void {
    const p = SaveSystem.getProfile();
    this.currencyText.text = `💰 Ryo: ¥ ${p.ryo.toLocaleString()}   •   📜 Rotoli: ${p.scrolls}   •   🔖 Sigilli: ${p.ninjaSeals}`;
  }

  private renderItemsGrid(): void {
    this.itemsGridContainer.removeChildren();
    this.currentNavItems = [];

    const items = this.getItemsList();
    if (this.selectedItemIndex >= items.length) {
      this.selectedItemIndex = Math.max(0, items.length - 1);
    }

    const cardW = 280;
    const cardH = 88;
    const cols = 2;
    const gapX = 16;
    const gapY = 12;

    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const isSel = idx === this.selectedItemIndex;

      const card = new Container();
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.x = col * (cardW + gapX);
      card.y = row * (cardH + gapY);

      const bg = new Graphics();
      bg.roundRect(0, 0, cardW, cardH, 10);
      bg.fill({ color: isSel ? 0x1C273C : 0x111827 });
      bg.stroke({
        color: isSel ? 0xF97316 : item.rarityColor,
        width: isSel ? 2 : 1.2,
        alpha: isSel ? 1 : 0.6,
      });
      card.addChild(bg);

      // Icon container
      const iconBg = new Graphics();
      iconBg.roundRect(10, 10, 48, 68, 8);
      iconBg.fill({ color: 0x1E293B });
      card.addChild(iconBg);

      const iconTxt = makeText(item.icon, 24, 0xFFFFFF);
      iconTxt.anchor.set(0.5);
      iconTxt.x = 34; iconTxt.y = 44;
      card.addChild(iconTxt);

      // Title
      const nameTxt = makeText(
        item.name.length > 21 ? item.name.slice(0, 20) + '…' : item.name,
        11.5,
        0xFFFFFF,
        true,
      );
      nameTxt.x = 66; nameTxt.y = 12;
      card.addChild(nameTxt);

      // Count badge
      const countTxt = makeText(`${item.count}`, 10, item.rarityColor, true);
      countTxt.x = 66; countTxt.y = 32;
      card.addChild(countTxt);

      // Effect summary
      const eff = item.effect.length > 28 ? item.effect.slice(0, 27) + '…' : item.effect;
      const effectTxt = makeText(eff, 9.5, 0x94A3B8);
      effectTxt.x = 66; effectTxt.y = 52;
      card.addChild(effectTxt);

      card.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.selectedItemIndex = idx;
        this.refreshContent();
      });

      this.itemsGridContainer.addChild(card);

      this.currentNavItems.push({
        container: card,
        onSelect: () => {
          this.selectedItemIndex = idx;
          const currentItem = this.getItemsList()[idx];
          if (currentItem && currentItem.usable && currentItem.buffKey) {
            this.useItem(currentItem);
          } else {
            this.refreshContent();
          }
        },
      });
    });
  }

  private useItem(item: BagItem): void {
    if (!item.usable || !item.buffKey) return;
    const profile = SaveSystem.getProfile();
    const buffs = profile.nextRunBuffs || {};
    buffs[item.buffKey] = true;
    profile.nextRunBuffs = buffs;
    SaveSystem.saveProfile(profile);
    audioManager.playSFX('level_up');
    this.refreshContent();
  }

  private renderDetailPanel(): void {
    this.detailContainer.removeChildren();

    const items = this.getItemsList();
    const item = items[this.selectedItemIndex];
    if (!item) return;

    const panelW = 320;
    const panelH = 410;

    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 12);
    bg.fill({ color: 0x111827 });
    bg.stroke({ color: 0x334155, width: 1.5 });
    this.detailContainer.addChild(bg);

    // Header icon & name
    const iconLarge = makeText(item.icon, 44, 0xFFFFFF);
    iconLarge.anchor.set(0.5, 0);
    iconLarge.x = panelW / 2;
    iconLarge.y = 20;
    this.detailContainer.addChild(iconLarge);

    const title = makeText(item.name, 14, 0xF97316, true);
    title.anchor.set(0.5, 0);
    title.x = panelW / 2;
    title.y = 76;
    this.detailContainer.addChild(title);

    const count = makeText(`Quantità / Stato: ${item.count}`, 11, item.rarityColor, true);
    count.anchor.set(0.5, 0);
    count.x = panelW / 2;
    count.y = 100;
    this.detailContainer.addChild(count);

    // Separator
    const sep = new Graphics();
    sep.moveTo(20, 128); sep.lineTo(panelW - 20, 128);
    sep.stroke({ color: 0x1E293B, width: 1.5 });
    this.detailContainer.addChild(sep);

    // Description
    const descLabel = makeText('DESCRIZIONE TATTICA', 10, 0x64748B, true);
    descLabel.x = 20; descLabel.y = 142;
    this.detailContainer.addChild(descLabel);

    const descTxt = new Text({
      text: item.description,
      style: new TextStyle({
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: 11,
        fill: 0xCBD5E1,
        wordWrap: true,
        wordWrapWidth: panelW - 40,
        lineHeight: 16,
      }),
    });
    descTxt.x = 20; descTxt.y = 162;
    this.detailContainer.addChild(descTxt);

    // Effect
    const effLabel = makeText('EFFETTO IN BATTAGLIA', 10, 0x10B981, true);
    effLabel.x = 20; effLabel.y = 246;
    this.detailContainer.addChild(effLabel);

    const effTxt = new Text({
      text: item.effect,
      style: new TextStyle({
        fontFamily: 'Outfit, Inter, sans-serif',
        fontSize: 11.5,
        fill: 0x34D399,
        fontWeight: 'bold',
        wordWrap: true,
        wordWrapWidth: panelW - 40,
        lineHeight: 16,
      }),
    });
    effTxt.x = 20; effTxt.y = 266;
    this.detailContainer.addChild(effTxt);

    // Action button if consumable
    if (item.usable && item.buffKey) {
      const actBtn = new Container();
      actBtn.eventMode = 'static';
      actBtn.cursor = 'pointer';
      actBtn.x = 20;
      actBtn.y = panelH - 54;

      const actBg = new Graphics();
      actBg.roundRect(0, 0, panelW - 40, 38, 8);
      actBg.fill({ color: 0xEA580C });
      actBtn.addChild(actBg);

      const actTxt = makeText('⚡ ATTIVA PER PROSSIMA RUN', 11.5, 0xFFFFFF, true);
      actTxt.anchor.set(0.5);
      actTxt.x = (panelW - 40) / 2;
      actTxt.y = 19;
      actBtn.addChild(actTxt);

      actBtn.on('pointerdown', () => this.useItem(item));
      this.detailContainer.addChild(actBtn);
    }
  }

  private updateGamepadContext(): void {
    GamepadMenuNavigator.get()?.updateItems(this.currentNavItems);
  }

  private escHandler?: (e: KeyboardEvent) => void;

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.container.visible = true;
    this.selectedItemIndex = 0;
    this.refreshContent();

    GamepadMenuNavigator.get()?.pushContext({
      id: 'bag_modal',
      items: this.currentNavItems,
      columns: 2,
      selectedIndex: 0,
      onCancel: () => this.hide(),
      onTabPrev: () => {
        const tabs: Array<'ALL' | 'TOOLS' | 'CONSUMABLES' | 'SCROLLS'> = ['ALL', 'TOOLS', 'CONSUMABLES', 'SCROLLS'];
        const idx = tabs.indexOf(this.activeTab);
        this.activeTab = tabs[(idx - 1 + tabs.length) % tabs.length];
        this.selectedItemIndex = 0;
        this.refreshContent();
      },
      onTabNext: () => {
        const tabs: Array<'ALL' | 'TOOLS' | 'CONSUMABLES' | 'SCROLLS'> = ['ALL', 'TOOLS', 'CONSUMABLES', 'SCROLLS'];
        const idx = tabs.indexOf(this.activeTab);
        this.activeTab = tabs[(idx + 1) % tabs.length];
        this.selectedItemIndex = 0;
        this.refreshContent();
      },
    });

    this.escHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.hide();
    };
    window.addEventListener('keydown', this.escHandler);
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('bag_modal');
    if (this.escHandler) {
      window.removeEventListener('keydown', this.escHandler);
      this.escHandler = undefined;
    }
    this.container.visible = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
