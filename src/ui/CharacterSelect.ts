import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ROSTER } from '../data/roster';
import { renderStars } from '../systems/promotionSystem';
import { audioManager } from '../systems/audioManager';
import { SaveSystem } from '../systems/saveSystem';
import { GachaModal } from './GachaModal';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import type { Character, StarRank, ElementalAffinity } from '../types/character';

// ============================================================
//  NarutoSurvivor — Shinobi Roster & Character Selection Screen
//  Featuring Advanced Search, Multi-Filter, Sorting & Pagination
// ============================================================

const RARITY_COLORS: Record<number, number> = {
  1: 0x9CA3AF, // Genin — Silver
  2: 0x22C55E, // Chūnin — Green
  3: 0x3B82F6, // Jōnin — Blue
  4: 0xA855F7, // Leggendari — Purple
  5: 0xF59E0B, // Sei Vie — Gold
};

const ELEMENT_COLORS: Record<string, number> = {
  Katon: 0xEF4444,
  Fuuton: 0x10B981,
  Raiton: 0x38BDF8,
  Doton: 0xD97706,
  Suiton: 0x3B82F6,
  Yang: 0xF59E0B,
  Yin: 0x8B5CF6,
  YinYang: 0xEC4899,
  SixPaths: 0xFBBF24,
  Jinton: 0x14B8A6,
  Mokuton: 0x15803D,
  Hyoton: 0x06B6D4,
  Shakuton: 0xF97316,
  Yoton: 0xEA580C,
  Bakuton: 0xE11D48,
  Ranton: 0x6366F1,
  SenjutsuNatural: 0x10B981,
  SenjutsuTailed: 0xF43F5E,
  None: 0x9CA3AF,
};

type SortMode = 'RANK_DESC' | 'RANK_ASC' | 'NAME_ASC' | 'HP_DESC' | 'DMG_DESC' | 'SPEED_DESC';

const SORT_OPTIONS: Array<{ id: SortMode; label: string }> = [
  { id: 'RANK_DESC',  label: 'Rarità (5★ ➔ 1★)' },
  { id: 'RANK_ASC',   label: 'Rarità (1★ ➔ 5★)' },
  { id: 'NAME_ASC',   label: 'Nome (A ➔ Z)' },
  { id: 'HP_DESC',    label: 'Punti Vita (HP)' },
  { id: 'DMG_DESC',   label: 'Danno Jutsu' },
  { id: 'SPEED_DESC', label: 'Velocità' },
];

const QUICK_TAGS: Array<{ label: string; query: string }> = [
  { label: '🔥 Uchiha', query: 'uchiha' },
  { label: '🍃 Hokage', query: 'hokage' },
  { label: '☁️ Akatsuki', query: 'akatsuki' },
  { label: '🦊 Jinchūriki', query: 'jinchūriki' },
  { label: '🐍 Sannin', query: 'sannin' },
  { label: '⚔️ Spadaccini', query: 'spadaccini' },
  { label: '🎵 Suono', query: 'suono' },
  { label: '🍜 Ichiraku', query: 'ichiraku' },
];

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

export class CharacterSelectScreen {
  readonly container: Container;
  private readonly app: Application;
  private readonly W: number;
  private readonly H: number;
  private onSelect!: (char: Character) => void;
  private onBackToMenu?: () => void;

  // UI Layers
  private topBarLayer!: Container;
  private quickTagsLayer!: Container;
  private filtersLayer!: Container;
  private cardsLayer!: Container;
  private paginationLayer!: Container;
  private gachaModal: GachaModal;
  private currencyBarText!: Text;

  // Filter & Search State
  private searchQuery: string = '';
  private activeStatusFilter: 'ALL' | 'UNLOCKED' | 'LOCKED' = 'ALL';
  private activeRankFilter: StarRank | null = null;
  private activeElementFilter: string | null = null;
  private sortModeIndex: number = 0;
  private currentPage: number = 0;
  private readonly PAGE_SIZE: number = 10; // 5 columns x 2 rows

  // HTML Search Overlay
  private searchWrapperEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private currentCardNavItems: NavigatableItem[] = [];

  setOnBackToMenu(cb: () => void): void {
    this.onBackToMenu = cb;
  }

  constructor(app: Application) {
    this.app = app;
    this.W = app.screen.width;
    this.H = app.screen.height;
    this.container = new Container();
    this.container.eventMode = 'static';

    this.buildBaseCanvas();
    this.initHTMLSearch();
    app.stage.addChild(this.container);

    // Gacha modal on top of select screen
    this.gachaModal = new GachaModal(app.stage, this.W, this.H);

    // Keyboard navigation
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.container.visible) return;

    // If typing in search box, only handle Escape
    if (document.activeElement === this.searchInputEl) {
      if (e.key === 'Escape') {
        this.searchInputEl?.blur();
        if (this.searchQuery.length > 0) {
          this.setSearchQuery('');
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.changePage(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.changePage(1);
    } else if (e.key === 'Escape') {
      if (this.onBackToMenu) {
        audioManager.playSFX('button_click');
        this.onBackToMenu();
      }
    }
  };

  private handleResize = (): void => {
    if (this.container.visible) {
      this.updateSearchInputPosition();
    }
  };

  private buildBaseCanvas(): void {
    const W = this.W;
    const H = this.H;

    // ── Deep Ninja Navy / Obsidian Background ───────────────
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x070B11 });
    this.container.addChild(bg);

    // ── Subtle Tactical Grid ─────────────────────────────────
    const grid = new Graphics();
    for (let x = 0; x < W; x += 48) {
      grid.moveTo(x, 0); grid.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 48) {
      grid.moveTo(0, y); grid.lineTo(W, y);
    }
    grid.stroke({ color: 0x0F172A, width: 1, alpha: 0.6 });
    this.container.addChild(grid);

    // ── Glow Orbs in Corners ─────────────────────────────────
    const glow = new Graphics();
    glow.circle(120, 100, 220);
    glow.fill({ color: 0x1E3A8A, alpha: 0.12 });
    glow.circle(W - 140, 200, 260);
    glow.fill({ color: 0x6B21A8, alpha: 0.10 });
    this.container.addChild(glow);

    // ── Top Bar Layer ────────────────────────────────────────
    this.topBarLayer = new Container();
    this.container.addChild(this.topBarLayer);

    // Back to Menu Button
    const backBtn = new Container();
    backBtn.eventMode = 'static';
    backBtn.cursor = 'pointer';
    backBtn.x = 24;
    backBtn.y = 12;
    const bBg = new Graphics();
    bBg.roundRect(0, 0, 120, 32, 8);
    bBg.fill({ color: 0x1E293B });
    bBg.stroke({ color: 0x475569, width: 1.5 });
    backBtn.addChild(bBg);
    const bTxt = makeText('◀ MENU', 11, 0xFFFFFF, true);
    bTxt.anchor.set(0.5);
    bTxt.x = 60; bTxt.y = 16;
    backBtn.addChild(bTxt);
    backBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      if (this.onBackToMenu) this.onBackToMenu();
    });
    this.topBarLayer.addChild(backBtn);

    // Main Header Title
    const title = makeText('NARUTO SURVIVOR — SHINOBI', 26, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 8;
    this.topBarLayer.addChild(title);

    const sub = makeText('Scegli il tuo Ninja per la Battaglia • 106 Shinobi Canonici dall’Anime di Naruto', 11, 0x94A3B8);
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = 36;
    this.topBarLayer.addChild(sub);

    // Top Right Currency Badge & Gacha Shortcut
    this.currencyBarText = makeText('', 11, 0xFFFFFF, true);
    this.currencyBarText.anchor.set(1, 0.5);
    this.currencyBarText.x = W - 180;
    this.currencyBarText.y = 28;
    this.topBarLayer.addChild(this.currencyBarText);

    const gachaBtn = new Container();
    gachaBtn.eventMode = 'static';
    gachaBtn.cursor = 'pointer';
    gachaBtn.x = W - 165;
    gachaBtn.y = 12;
    const gBg = new Graphics();
    gBg.roundRect(0, 0, 140, 32, 8);
    gBg.fill({ color: 0x7C3AED });
    gBg.stroke({ color: 0xC084FC, width: 1.5 });
    gachaBtn.addChild(gBg);
    const gTxt = makeText('📜 EVOCA (GACHA)', 11, 0xFFFFFF, true);
    gTxt.anchor.set(0.5);
    gTxt.x = 70; gTxt.y = 16;
    gachaBtn.addChild(gTxt);
    gachaBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.gachaModal.show(() => this.refreshUI());
    });
    this.topBarLayer.addChild(gachaBtn);

    // ── Quick Faction Tags Layer (Row 1) ───────────────────────
    this.quickTagsLayer = new Container();
    this.container.addChild(this.quickTagsLayer);

    // ── Multi-Filter Layer (Row 2) ─────────────────────────────
    this.filtersLayer = new Container();
    this.container.addChild(this.filtersLayer);

    // ── Cards Layer (2 rows x 5 cols = 10 cards) ───────────────
    this.cardsLayer = new Container();
    this.container.addChild(this.cardsLayer);

    // ── Pagination Layer (Bottom controls) ─────────────────────
    this.paginationLayer = new Container();
    this.container.addChild(this.paginationLayer);

    // ── Bottom Controls & Hint Bar ────────────────────────────
    const hint = makeText(
      'Frecce ◀ / ▶ per sfogliare le pagine  •  Clicca su un ninja sbloccato per sceglierlo  •  Clicca su un ninja bloccato per evocarlo nel Gacha',
      11,
      0x64748B,
    );
    hint.anchor.set(0.5, 1);
    hint.x = W / 2;
    hint.y = H - 8;
    this.container.addChild(hint);
  }

  // ── HTML Search Bar Overlay ──────────────────────────────────
  private initHTMLSearch(): void {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    // Check if already created
    let wrapper = document.getElementById('shinobi-search-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'shinobi-search-wrapper';
      wrapper.style.position = 'absolute';
      wrapper.style.zIndex = '50';
      wrapper.style.display = 'none';
      wrapper.style.alignItems = 'center';
      wrapper.style.boxSizing = 'border-box';

      const icon = document.createElement('span');
      icon.innerHTML = '🔍';
      icon.style.position = 'absolute';
      icon.style.left = '12px';
      icon.style.fontSize = '14px';
      icon.style.pointerEvents = 'none';
      icon.style.opacity = '0.7';

      const input = document.createElement('input');
      input.id = 'shinobi-search-input';
      input.type = 'text';
      input.placeholder = 'Cerca ninja (es. Naruto, Itachi, Gaara, Sasuke, Minato...)';
      input.style.width = '100%';
      input.style.height = '100%';
      input.style.background = 'rgba(15, 23, 42, 0.90)';
      input.style.border = '1px solid rgba(96, 165, 250, 0.4)';
      input.style.borderRadius = '8px';
      input.style.color = '#FFFFFF';
      input.style.fontFamily = "'Outfit', sans-serif";
      input.style.fontSize = '12px';
      input.style.padding = '0 32px 0 34px';
      input.style.outline = 'none';
      input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      input.style.transition = 'border-color 0.2s, box-shadow 0.2s';

      input.addEventListener('focus', () => {
        input.style.borderColor = '#60A5FA';
        input.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.4)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'rgba(96, 165, 250, 0.4)';
        input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      });

      input.addEventListener('input', () => {
        this.searchQuery = input.value.trim();
        this.currentPage = 0;
        this.renderQuickTags();
        this.renderCards();
        this.renderPagination();
      });

      const clearBtn = document.createElement('button');
      clearBtn.innerHTML = '✕';
      clearBtn.title = 'Cancella ricerca';
      clearBtn.style.position = 'absolute';
      clearBtn.style.right = '8px';
      clearBtn.style.background = 'transparent';
      clearBtn.style.border = 'none';
      clearBtn.style.color = '#94A3B8';
      clearBtn.style.fontSize = '12px';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.padding = '4px 6px';
      clearBtn.style.lineHeight = '1';

      clearBtn.addEventListener('click', () => {
        input.value = '';
        this.searchQuery = '';
        this.currentPage = 0;
        input.focus();
        this.renderQuickTags();
        this.renderCards();
        this.renderPagination();
      });

      wrapper.appendChild(icon);
      wrapper.appendChild(input);
      wrapper.appendChild(clearBtn);
      appEl.appendChild(wrapper);

      this.searchInputEl = input;
      this.searchWrapperEl = wrapper;
    } else {
      this.searchWrapperEl = wrapper;
      this.searchInputEl = document.getElementById('shinobi-search-input') as HTMLInputElement;
    }
  }

  private updateSearchInputPosition(): void {
    if (!this.searchWrapperEl) return;
    const canvas = this.app.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.W;
    const scaleY = rect.height / this.H;

    // Desired virtual rect: X=24, Y=56, W=320, H=32
    const vx = 24;
    const vy = 56;
    const vw = 320;
    const vh = 32;

    this.searchWrapperEl.style.left = `${vx * scaleX}px`;
    this.searchWrapperEl.style.top = `${vy * scaleY}px`;
    this.searchWrapperEl.style.width = `${vw * scaleX}px`;
    this.searchWrapperEl.style.height = `${vh * scaleY}px`;
  }

  private setSearchQuery(q: string): void {
    this.searchQuery = q.trim();
    if (this.searchInputEl) {
      this.searchInputEl.value = this.searchQuery;
    }
    this.currentPage = 0;
    this.renderQuickTags();
    this.renderCards();
    this.renderPagination();
  }

  // ── Multi-Filter / Search Computation ────────────────────────
  private getFilteredRoster(): Character[] {
    const profile = SaveSystem.getProfile();
    const unlockedSet = new Set(profile.unlockedCharacterIds);
    const q = this.searchQuery.toLowerCase().trim();

    let list = ROSTER.filter(char => {
      // 1. Status Filter
      const isUnlocked = unlockedSet.has(char.id) || !!char.unlockedByDefault;
      if (this.activeStatusFilter === 'UNLOCKED' && !isUnlocked) return false;
      if (this.activeStatusFilter === 'LOCKED' && isUnlocked) return false;

      // 2. Rank Filter
      if (this.activeRankFilter !== null && char.baseRank !== this.activeRankFilter) {
        return false;
      }

      // 3. Element Filter
      if (this.activeElementFilter !== null) {
        if (this.activeElementFilter === 'YinYang') {
          const matchesYY = char.element.some(el => ['Yin', 'Yang', 'YinYang', 'SixPaths'].includes(el));
          if (!matchesYY) return false;
        } else {
          if (!char.element.includes(this.activeElementFilter as ElementalAffinity)) {
            return false;
          }
        }
      }

      // 4. Text Search Query
      if (q.length > 0) {
        const matchNameIT = char.nameIT.toLowerCase().includes(q);
        const matchNameJP = char.nameJP.toLowerCase().includes(q);
        const matchForm   = char.form.toLowerCase().includes(q);
        const matchArc    = char.arc.toLowerCase().includes(q);
        const matchJutsu  = char.jutsuSlot.nameIT.toLowerCase().includes(q);
        const matchElem   = char.element.some(el => el.toLowerCase().includes(q));

        // Canonical Tag Aliases
        let matchSpecial = false;
        if (q === 'uchiha' && (char.id.includes('uchiha') || char.nameIT.toLowerCase().includes('uchiha') || char.form.toLowerCase().includes('mangekyō') || char.form.toLowerCase().includes('sharingan') || char.form.toLowerCase().includes('rinnegan') || char.form.toLowerCase().includes('susano'))) {
          matchSpecial = true;
        } else if (q === 'hokage' && (char.nameIT.toLowerCase().includes('hokage') || char.form.toLowerCase().includes('hokage') || char.loreDescription.toLowerCase().includes('hokage'))) {
          matchSpecial = true;
        } else if (q === 'akatsuki' && (char.id.includes('akatsuki') || char.form.toLowerCase().includes('akatsuki') || char.arc.toLowerCase().includes('akatsuki') || char.loreDescription.toLowerCase().includes('akatsuki'))) {
          matchSpecial = true;
        } else if ((q === 'jinchūriki' || q === 'jinchuriki') && (char.form.toLowerCase().includes('portante') || char.loreDescription.toLowerCase().includes('jinchūriki') || char.loreDescription.toLowerCase().includes('code') || char.element.includes('SenjutsuTailed'))) {
          matchSpecial = true;
        } else if (q === 'sannin' && (char.nameIT.toLowerCase().includes('jiraiya') || char.nameIT.toLowerCase().includes('tsunade') || char.nameIT.toLowerCase().includes('orochimaru'))) {
          matchSpecial = true;
        } else if (q === 'spadaccini' && (char.id.includes('zabuza') || char.id.includes('kisame') || char.id.includes('suigetsu') || char.id.includes('omoi') || char.id.includes('mifune') || char.id.includes('sakumo'))) {
          matchSpecial = true;
        } else if (q === 'suono' && (char.form.toLowerCase().includes('suono') || char.id.includes('dosu') || char.id.includes('zaku') || char.id.includes('kin_tsuchi') || char.id.includes('jirobo') || char.id.includes('kidomaru') || char.id.includes('sakon') || char.id.includes('tayuya') || char.id.includes('kimimaro'))) {
          matchSpecial = true;
        } else if ((q === 'ichiraku' || q === 'ramen') && char.id.includes('teuchi')) {
          matchSpecial = true;
        }

        if (!matchNameIT && !matchNameJP && !matchForm && !matchArc && !matchJutsu && !matchElem && !matchSpecial) {
          return false;
        }
      }

      return true;
    });

    // 5. Sorting
    const sortId = SORT_OPTIONS[this.sortModeIndex].id;
    list = list.slice().sort((a, b) => {
      switch (sortId) {
        case 'RANK_DESC':
          if (b.baseRank !== a.baseRank) return b.baseRank - a.baseRank;
          return a.nameIT.localeCompare(b.nameIT);
        case 'RANK_ASC':
          if (a.baseRank !== b.baseRank) return a.baseRank - b.baseRank;
          return a.nameIT.localeCompare(b.nameIT);
        case 'NAME_ASC':
          return a.nameIT.localeCompare(b.nameIT);
        case 'HP_DESC':
          return b.baseStats.hp - a.baseStats.hp;
        case 'DMG_DESC':
          return b.baseStats.jutsudmg - a.baseStats.jutsudmg;
        case 'SPEED_DESC':
          return b.baseStats.movespeed - a.baseStats.movespeed;
        default:
          return 0;
      }
    });

    return list;
  }

  // ── Render Quick Presets Row (Row 1, Y = 56) ──────────────────
  private renderQuickTags(): void {
    this.quickTagsLayer.removeChildren();

    const startX = 360;
    const tagY = 56;
    const tagH = 32;
    const gap = 8;
    let currentX = startX;

    QUICK_TAGS.forEach(tag => {
      const isSelected = this.searchQuery === tag.query;
      const tagW = tag.label.length * 7.5 + 24;

      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, tagW, tagH, 6);
      bg.fill({ color: isSelected ? 0x2563EB : 0x1E293B });
      bg.stroke({ color: isSelected ? 0x60A5FA : 0x334155, width: 1.2 });
      btn.addChild(bg);

      const txt = makeText(tag.label, 11, isSelected ? 0xFFFFFF : 0xCBD5E1, isSelected);
      txt.anchor.set(0.5);
      txt.x = tagW / 2;
      txt.y = tagH / 2;
      btn.addChild(txt);

      btn.x = currentX;
      btn.y = tagY;

      btn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        if (isSelected) {
          this.setSearchQuery('');
        } else {
          this.setSearchQuery(tag.query);
        }
      });

      this.quickTagsLayer.addChild(btn);
      currentX += tagW + gap;
    });

    // Reset All Filters Button on far right
    const resetBtn = new Container();
    resetBtn.eventMode = 'static';
    resetBtn.cursor = 'pointer';
    const rW = 95;
    const rBg = new Graphics();
    rBg.roundRect(0, 0, rW, tagH, 6);
    rBg.fill({ color: 0x374151 });
    rBg.stroke({ color: 0x6B7280, width: 1.2 });
    resetBtn.addChild(rBg);

    const rTxt = makeText('🔄 Reset', 11, 0xF9FAFB, true);
    rTxt.anchor.set(0.5);
    rTxt.x = rW / 2;
    rTxt.y = tagH / 2;
    resetBtn.addChild(rTxt);

    resetBtn.x = this.W - 24 - rW;
    resetBtn.y = tagY;

    resetBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.activeStatusFilter = 'ALL';
      this.activeRankFilter = null;
      this.activeElementFilter = null;
      this.sortModeIndex = 0;
      this.currentPage = 0;
      this.setSearchQuery('');
      this.refreshUI();
    });

    this.quickTagsLayer.addChild(resetBtn);
  }

  // ── Render Filters Row (Row 2, Y = 96) ────────────────────────
  private renderFilters(): void {
    this.filtersLayer.removeChildren();

    const profile = SaveSystem.getProfile();
    const unlockedCount = profile.unlockedCharacterIds.length;
    const lockedCount = ROSTER.length - unlockedCount;

    // ── 1. Status Filter Tabs (X = 24) ──────────────────────────
    const statusTabs: Array<{ id: 'ALL' | 'UNLOCKED' | 'LOCKED'; label: string }> = [
      { id: 'ALL',      label: `TUTTI (${ROSTER.length})` },
      { id: 'UNLOCKED', label: `✅ SBLOCCATI (${unlockedCount})` },
      { id: 'LOCKED',   label: `🔒 DA SBLOCCARE (${lockedCount})` },
    ];

    let statusX = 24;
    const tabH = 30;

    statusTabs.forEach(tab => {
      const isSelected = this.activeStatusFilter === tab.id;
      const tabW = tab.label.length * 6.8 + 20;

      const tCont = new Container();
      tCont.eventMode = 'static';
      tCont.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, tabW, tabH, 6);
      bg.fill({ color: isSelected ? 0x059669 : 0x1E293B });
      bg.stroke({ color: isSelected ? 0x34D399 : 0x334155, width: 1.2 });
      tCont.addChild(bg);

      const label = makeText(tab.label, 10.5, isSelected ? 0xFFFFFF : 0x94A3B8, isSelected);
      label.anchor.set(0.5);
      label.x = tabW / 2;
      label.y = tabH / 2;
      tCont.addChild(label);

      tCont.x = statusX;
      tCont.y = 96;

      tCont.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.activeStatusFilter = tab.id;
        this.currentPage = 0;
        this.renderFilters();
        this.renderCards();
        this.renderPagination();
      });

      this.filtersLayer.addChild(tCont);
      statusX += tabW + 6;
    });

    // ── 2. Rank Filter Tabs (X = 415) ───────────────────────────
    const rankTabs: Array<{ rank: StarRank | null; label: string }> = [
      { rank: null, label: 'GRADO: TUTTI' },
      { rank: 1,    label: '1★ Genin' },
      { rank: 2,    label: '2★ Chūnin' },
      { rank: 3,    label: '3★ Jōnin' },
      { rank: 4,    label: '4★ Kage' },
      { rank: 5,    label: '5★ Sei Vie' },
    ];

    let rankX = statusX + 16;
    rankTabs.forEach(tab => {
      const isSelected = this.activeRankFilter === tab.rank;
      const tabW = tab.label.length * 6.5 + 16;

      const tCont = new Container();
      tCont.eventMode = 'static';
      tCont.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, tabW, tabH, 6);
      bg.fill({ color: isSelected ? 0x2563EB : 0x1E293B });
      bg.stroke({ color: isSelected ? 0x60A5FA : 0x334155, width: 1.2 });
      tCont.addChild(bg);

      const label = makeText(tab.label, 10.5, isSelected ? 0xFFFFFF : 0x94A3B8, isSelected);
      label.anchor.set(0.5);
      label.x = tabW / 2;
      label.y = tabH / 2;
      tCont.addChild(label);

      tCont.x = rankX;
      tCont.y = 96;

      tCont.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.activeRankFilter = tab.rank;
        this.currentPage = 0;
        this.renderFilters();
        this.renderCards();
        this.renderPagination();
      });

      this.filtersLayer.addChild(tCont);
      rankX += tabW + 6;
    });

    // ── 3. Element Pills (X ~ 880) ──────────────────────────────
    const elements = [
      { id: null,      label: 'Tutti', emoji: '☯' },
      { id: 'Katon',   label: 'Fuoco', emoji: '🔥' },
      { id: 'Fuuton',  label: 'Vento', emoji: '🍃' },
      { id: 'Raiton',  label: 'Fulmine', emoji: '⚡' },
      { id: 'Doton',   label: 'Terra', emoji: '🪨' },
      { id: 'Suiton',  label: 'Acqua', emoji: '🌊' },
      { id: 'YinYang', label: 'Divino', emoji: '✨' },
    ];

    let elemX = rankX + 16;
    elements.forEach(el => {
      const isSelected = this.activeElementFilter === el.id;
      const tabW = 34;

      const eCont = new Container();
      eCont.eventMode = 'static';
      eCont.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, tabW, tabH, 6);
      bg.fill({ color: isSelected ? 0xD97706 : 0x1E293B });
      bg.stroke({ color: isSelected ? 0xFBBF24 : 0x334155, width: 1.2 });
      eCont.addChild(bg);

      const label = makeText(el.emoji, 12, isSelected ? 0xFFFFFF : 0xCBD5E1);
      label.anchor.set(0.5);
      label.x = tabW / 2;
      label.y = tabH / 2;
      eCont.addChild(label);

      eCont.x = elemX;
      eCont.y = 96;

      eCont.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.activeElementFilter = isSelected ? null : el.id;
        this.currentPage = 0;
        this.renderFilters();
        this.renderCards();
        this.renderPagination();
      });

      this.filtersLayer.addChild(eCont);
      elemX += tabW + 5;
    });

    // ── 4. Sort Selector on Far Right ───────────────────────────
    const sortCont = new Container();
    sortCont.eventMode = 'static';
    sortCont.cursor = 'pointer';
    const sortW = 150;
    const sortBg = new Graphics();
    sortBg.roundRect(0, 0, sortW, tabH, 6);
    sortBg.fill({ color: 0x1E293B });
    sortBg.stroke({ color: 0x475569, width: 1.2 });
    sortCont.addChild(sortBg);

    const sortLabel = makeText(`🔽 ${SORT_OPTIONS[this.sortModeIndex].label}`, 10.5, 0xFBBF24, true);
    sortLabel.anchor.set(0.5);
    sortLabel.x = sortW / 2;
    sortLabel.y = tabH / 2;
    sortCont.addChild(sortLabel);

    sortCont.x = this.W - 24 - sortW;
    sortCont.y = 96;

    sortCont.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.sortModeIndex = (this.sortModeIndex + 1) % SORT_OPTIONS.length;
      this.currentPage = 0;
      this.renderFilters();
      this.renderCards();
      this.renderPagination();
    });

    this.filtersLayer.addChild(sortCont);
  }

  // ── Render 10-Card Grid (Row 0: Y=142, Row 1: Y=392) ──────────
  private renderCards(): void {
    this.cardsLayer.removeChildren();

    const filtered = this.getFilteredRoster();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
    if (this.currentPage >= totalPages) {
      this.currentPage = totalPages - 1;
    }

    if (filtered.length === 0) {
      // Empty State
      const emptyCont = new Container();
      const emptyMsg = makeText('Nessuno Shinobi trovato con questi filtri!', 18, 0x94A3B8, true);
      emptyMsg.anchor.set(0.5);
      emptyMsg.x = this.W / 2;
      emptyMsg.y = 280;
      emptyCont.addChild(emptyMsg);

      const subMsg = makeText('Prova a cercare un nome diverso o premi Reset per mostrare tutti i 106 ninja.', 13, 0x64748B);
      subMsg.anchor.set(0.5);
      subMsg.x = this.W / 2;
      subMsg.y = 312;
      emptyCont.addChild(subMsg);

      const rBtn = new Container();
      rBtn.eventMode = 'static';
      rBtn.cursor = 'pointer';
      const bW = 160;
      const bH = 36;
      const bBg = new Graphics();
      bBg.roundRect(0, 0, bW, bH, 8);
      bBg.fill({ color: 0x2563EB });
      rBtn.addChild(bBg);
      const bTxt = makeText('🔄 Resetta Filtri', 12, 0xFFFFFF, true);
      bTxt.anchor.set(0.5);
      bTxt.x = bW / 2;
      bTxt.y = bH / 2;
      rBtn.addChild(bTxt);
      rBtn.x = (this.W - bW) / 2;
      rBtn.y = 345;
      rBtn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.activeStatusFilter = 'ALL';
        this.activeRankFilter = null;
        this.activeElementFilter = null;
        this.setSearchQuery('');
        this.refreshUI();
      });
      emptyCont.addChild(rBtn);

      this.cardsLayer.addChild(emptyCont);
      return;
    }

    const startIdx = this.currentPage * this.PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + this.PAGE_SIZE);

    const cols = 5;
    const CARD_W = 230;
    const CARD_H = 236;
    const GAP_X = 18;
    const GAP_Y = 14;
    const totalW = cols * CARD_W + (cols - 1) * GAP_X; // 1222px
    const startX = (this.W - totalW) / 2;
    const startY = 142;

    const selectedCharId = SaveSystem.getSelectedCharacterId();
    this.currentCardNavItems = [];

    pageItems.forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isSelected = char.id === selectedCharId;
      const card = this.buildCompactCard(char, CARD_W, CARD_H, isSelected);
      card.x = startX + col * (CARD_W + GAP_X);
      card.y = startY + row * (CARD_H + GAP_Y);
      this.cardsLayer.addChild(card);

      this.currentCardNavItems.push({
        container: card,
        onSelect: () => {
          audioManager.playSFX('button_click');
          if (SaveSystem.isCharacterUnlocked(char.id)) {
            SaveSystem.setSelectedCharacterId(char.id);
            if (this.onSelect) this.onSelect(char);
          } else {
            this.gachaModal.show(() => this.refreshUI());
          }
        },
      });
    });

    GamepadMenuNavigator.get()?.updateItems(this.currentCardNavItems);
  }

  // ── Build Single Card ────────────────────────────────────────
  private buildCompactCard(
    char: Character,
    W: number,
    H: number,
    isSelectedChar: boolean,
  ): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const isUnlocked = SaveSystem.isCharacterUnlocked(char.id);
    const rarityColor = RARITY_COLORS[char.baseRank] ?? 0xFFFFFF;

    // Background Container
    const bg = new Graphics();
    bg.roundRect(0, 0, W, H, 10);
    bg.fill({ color: isUnlocked ? (isSelectedChar ? 0x13251A : 0x111827) : 0x0B0F19 });
    bg.stroke({
      color: isSelectedChar ? 0xFBBF24 : (isUnlocked ? rarityColor : 0x374151),
      width: isSelectedChar ? 2.2 : (isUnlocked ? 1.6 : 1),
      alpha: isSelectedChar ? 1 : (isUnlocked ? 0.75 : 0.35),
    });
    card.addChild(bg);

    // Avatar Circle
    const avatar = new Graphics();
    avatar.circle(36, 36, 22);
    avatar.fill({ color: isUnlocked ? char.assets.color : 0x334155 });
    // Headband Accent
    avatar.rect(18, 33, 36, 6);
    avatar.fill({ color: 0xFFFFFF, alpha: isUnlocked ? 0.35 : 0.08 });
    card.addChild(avatar);

    // Stars
    const stars = makeText(renderStars(char.baseRank), 11, isUnlocked ? rarityColor : 0x64748B, true);
    stars.x = 66;
    stars.y = 11;
    card.addChild(stars);

    // Name (truncated if very long)
    const displayName = char.nameIT.length > 20 ? char.nameIT.slice(0, 19) + '…' : char.nameIT;
    const name = makeText(displayName, 11.5, isUnlocked ? 0xFFFFFF : 0x94A3B8, true);
    name.x = 66;
    name.y = 26;
    card.addChild(name);

    // Form / Arc
    const formTxt = char.form.length > 24 ? char.form.slice(0, 23) + '…' : char.form;
    const form = makeText(formTxt, 9, 0x64748B);
    form.x = 66;
    form.y = 43;
    card.addChild(form);

    // Divider Line
    const div = new Graphics();
    div.rect(12, 65, W - 24, 1);
    div.fill({ color: 0x1F2937 });
    card.addChild(div);

    // Element Badges
    char.element.slice(0, 2).forEach((el, ei) => {
      const eColor = ELEMENT_COLORS[el] ?? 0x6B7280;
      const badge = new Container();
      const bBg = new Graphics();
      bBg.roundRect(0, 0, 52, 17, 4);
      bBg.fill({ color: eColor, alpha: isUnlocked ? 0.20 : 0.08 });
      bBg.stroke({ color: eColor, width: 1, alpha: isUnlocked ? 0.8 : 0.3 });
      badge.addChild(bBg);
      const bTxt = makeText(el, 8, isUnlocked ? eColor : 0x64748B, true);
      bTxt.anchor.set(0.5);
      bTxt.x = 26; bTxt.y = 8.5;
      badge.addChild(bTxt);
      badge.x = 12 + ei * 56;
      badge.y = 72;
      card.addChild(badge);
    });

    // Stats Row
    const hpTxt = makeText(`HP: ${char.baseStats.hp}`, 9.5, isUnlocked ? 0x22C55E : 0x64748B, isUnlocked);
    hpTxt.x = 12;
    hpTxt.y = 96;
    card.addChild(hpTxt);

    const dmgTxt = makeText(`DMG: ×${char.baseStats.jutsudmg.toFixed(2)}`, 9.5, isUnlocked ? 0xF97316 : 0x64748B, isUnlocked);
    dmgTxt.anchor.set(0.5, 0);
    dmgTxt.x = W / 2;
    dmgTxt.y = 96;
    card.addChild(dmgTxt);

    const spdTxt = makeText(`SPD: ${char.baseStats.movespeed}`, 9.5, isUnlocked ? 0x38BDF8 : 0x64748B, isUnlocked);
    spdTxt.anchor.set(1, 0);
    spdTxt.x = W - 12;
    spdTxt.y = 96;
    card.addChild(spdTxt);

    // Signature Jutsu Pill
    const jutsuBg = new Graphics();
    jutsuBg.roundRect(12, 116, W - 24, 22, 5);
    jutsuBg.fill({ color: 0x1E293B, alpha: isUnlocked ? 1 : 0.5 });
    card.addChild(jutsuBg);

    const jutsuDisplayName = char.jutsuSlot.nameIT.length > 25
      ? char.jutsuSlot.nameIT.slice(0, 24) + '…'
      : char.jutsuSlot.nameIT;
    const jutsuLabel = makeText(`⚡ ${jutsuDisplayName}`, 9, isUnlocked ? 0xC084FC : 0x64748B);
    jutsuLabel.x = 18;
    jutsuLabel.y = 120;
    card.addChild(jutsuLabel);

    if (isUnlocked) {
      // Fragments Count
      const frags = SaveSystem.getFragments(char.id);
      const fragTxt = makeText(`✦ Frammenti: ${frags}`, 9, 0x38BDF8);
      fragTxt.x = 12;
      fragTxt.y = 148;
      card.addChild(fragTxt);

      // Economy bonuses
      const ecoTxt = makeText(
        `Ryo ×${char.baseStats.ryomultiplier.toFixed(2)} • Chakra ×${char.baseStats.chakraorbmultiplier.toFixed(2)}`,
        8.5,
        0x94A3B8,
      );
      ecoTxt.x = 12;
      ecoTxt.y = 168;
      card.addChild(ecoTxt);

      // Action Button
      const btn = new Graphics();
      btn.roundRect(12, H - 32, W - 24, 24, 6);
      btn.fill({ color: isSelectedChar ? 0x10B981 : rarityColor });
      card.addChild(btn);

      const btnLabel = makeText(
        isSelectedChar ? '✔ IN USO' : 'SELEZIONA',
        10.5,
        isSelectedChar ? 0xFFFFFF : 0x000000,
        true,
      );
      btnLabel.anchor.set(0.5);
      btnLabel.x = W / 2;
      btnLabel.y = H - 20;
      card.addChild(btnLabel);

      card.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        SaveSystem.setSelectedCharacterId(char.id);
        if (this.onSelect) this.onSelect(char);
      });
    } else {
      // Locked Overlay
      const lockOverlay = new Graphics();
      lockOverlay.roundRect(0, 0, W, H, 10);
      lockOverlay.fill({ color: 0x000000, alpha: 0.52 });
      card.addChild(lockOverlay);

      const lockHint = makeText('Sblocca con i Rotoli Ninja', 9, 0x94A3B8);
      lockHint.anchor.set(0.5);
      lockHint.x = W / 2;
      lockHint.y = 160;
      card.addChild(lockHint);

      const lockBadge = new Graphics();
      lockBadge.roundRect(12, H - 32, W - 24, 24, 6);
      lockBadge.fill({ color: 0x7C3AED });
      lockBadge.stroke({ color: 0xC084FC, width: 1.2 });
      card.addChild(lockBadge);

      const lockTxt = makeText('📜 SBLOCCA (Gacha)', 10, 0xFFFFFF, true);
      lockTxt.anchor.set(0.5);
      lockTxt.x = W / 2;
      lockTxt.y = H - 20;
      card.addChild(lockTxt);

      card.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.gachaModal.show(() => this.refreshUI());
      });
    }

    return card;
  }

  // ── Render Pagination Controls (Y = 644) ──────────────────────
  private renderPagination(): void {
    this.paginationLayer.removeChildren();

    const filtered = this.getFilteredRoster();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
    const current = Math.min(this.currentPage, totalPages - 1);

    const py = 646;

    // Previous Button
    const prevBtn = new Container();
    prevBtn.eventMode = 'static';
    prevBtn.cursor = current > 0 ? 'pointer' : 'default';
    const pbBg = new Graphics();
    pbBg.roundRect(0, 0, 130, 32, 6);
    pbBg.fill({ color: current > 0 ? 0x1E293B : 0x0F172A });
    pbBg.stroke({ color: current > 0 ? 0x475569 : 0x1E293B, width: 1.2 });
    prevBtn.addChild(pbBg);
    const pbTxt = makeText('◀ PRECEDENTE', 11, current > 0 ? 0xFFFFFF : 0x475569, true);
    pbTxt.anchor.set(0.5);
    pbTxt.x = 65; pbTxt.y = 16;
    prevBtn.addChild(pbTxt);
    prevBtn.x = 24;
    prevBtn.y = py;
    if (current > 0) {
      prevBtn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.changePage(-1);
      });
    }
    this.paginationLayer.addChild(prevBtn);

    // Next Button
    const nextBtn = new Container();
    nextBtn.eventMode = 'static';
    nextBtn.cursor = current < totalPages - 1 ? 'pointer' : 'default';
    const nbBg = new Graphics();
    nbBg.roundRect(0, 0, 130, 32, 6);
    nbBg.fill({ color: current < totalPages - 1 ? 0x1E293B : 0x0F172A });
    nbBg.stroke({ color: current < totalPages - 1 ? 0x475569 : 0x1E293B, width: 1.2 });
    nextBtn.addChild(nbBg);
    const nbTxt = makeText('SUCCESSIVA ▶', 11, current < totalPages - 1 ? 0xFFFFFF : 0x475569, true);
    nbTxt.anchor.set(0.5);
    nbTxt.x = 65; nbTxt.y = 16;
    nextBtn.addChild(nbTxt);
    nextBtn.x = this.W - 24 - 130;
    nextBtn.y = py;
    if (current < totalPages - 1) {
      nextBtn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        this.changePage(1);
      });
    }
    this.paginationLayer.addChild(nextBtn);

    // Center Page Numbers & Total Info
    const startIdx = filtered.length > 0 ? current * this.PAGE_SIZE + 1 : 0;
    const endIdx = Math.min((current + 1) * this.PAGE_SIZE, filtered.length);
    const infoText = makeText(
      `Pagina ${current + 1} di ${totalPages}  •  Mostrati ${startIdx}-${endIdx} di ${filtered.length} Shinobi`,
      11.5,
      0xFBBF24,
      true,
    );
    infoText.anchor.set(0.5);
    infoText.x = this.W / 2;
    infoText.y = py + 16;
    this.paginationLayer.addChild(infoText);
  }

  private changePage(delta: number): void {
    const filtered = this.getFilteredRoster();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
    const next = this.currentPage + delta;
    if (next >= 0 && next < totalPages) {
      this.currentPage = next;
      this.renderCards();
      this.renderPagination();
    }
  }

  private updateHeaderCurrency(): void {
    const profile = SaveSystem.getProfile();
    this.currencyBarText.text = `📜 Rotoli: ${profile.scrolls}   •   💰 Ryo: ¥ ${profile.ryo.toLocaleString()}`;
  }

  refreshUI(): void {
    this.updateHeaderCurrency();
    this.renderQuickTags();
    this.renderFilters();
    this.renderCards();
    this.renderPagination();
  }

  show(onSelect: (char: Character) => void): void {
    this.onSelect = onSelect;
    this.container.visible = true;

    if (this.searchWrapperEl) {
      this.searchWrapperEl.style.display = 'flex';
      this.updateSearchInputPosition();
    }

    this.refreshUI();

    GamepadMenuNavigator.get()?.pushContext({
      id: 'character_select',
      items: this.currentCardNavItems,
      columns: 5,
      selectedIndex: 0,
      onCancel: () => {
        if (this.onBackToMenu) this.onBackToMenu();
      },
      onTabPrev: () => this.changePage(-1),
      onTabNext: () => this.changePage(1),
    });
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('character_select');
    this.container.visible = false;
    if (this.searchWrapperEl) {
      this.searchWrapperEl.style.display = 'none';
      if (this.searchInputEl) {
        this.searchInputEl.blur();
      }
    }
  }
}
