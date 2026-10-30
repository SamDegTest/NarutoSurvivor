import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { ROSTER, getCharacterById } from '../data/roster';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { renderStars } from '../systems/promotionSystem';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import type { Character } from '../types/character';

// ============================================================
//  NarutoSurvivor — PokéSurvivor-style Main Menu
// ============================================================

function makeText(text: string, fontSize: number, fill: number, bold = false): Text {
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

export interface MainMenuCallbacks {
  onPlay: (char: Character) => void;
  onOpenRoster: () => void;
  onOpenUpgrades: () => void;
  onOpenGacha: () => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onOpenBag: () => void;
  onOpenMissions: () => void;
  onOpenFriends: () => void;
  onOpenLeaderboard: () => void;
}

export class MainMenuScreen {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private callbacks!: MainMenuCallbacks;

  // Dynamic elements
  private ryoPillText!: Text;
  private scrollsPillText!: Text;
  private profilePillText!: Text;
  private showcaseCard!: Container;
  private showcaseAvatar!: Graphics;
  private showcaseName!: Text;
  private showcaseTags!: Container;
  private runsStatsText!: Text;
  private killsStatsText!: Text;
  private leafParticles: Array<{ g: Graphics; x: number; y: number; vx: number; vy: number; rot: number; rotSpeed: number }> = [];

  constructor(app: Application) {
    this.W = app.screen.width;
    this.H = app.screen.height;
    this.container = new Container();
    this.container.eventMode = 'static';

    this.buildBackground();
    this.buildTopBar();
    this.buildCenterShowcase();
    this.buildRightSidebar();
    this.buildStatsPanel();
    this.buildFooter();

    app.stage.addChild(this.container);

    // Particle tick
    app.ticker.add((ticker) => {
      if (!this.container.visible) return;
      this.updateParticles(ticker.deltaMS / 1000);
    });
  }

  // ── Background (Lush Konoha Grassy Field with Trees & Leaf Drift) ─

  private buildBackground(): void {
    const W = this.W;
    const H = this.H;

    // Rich grassy base
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x2A5826 }); // Deep ninja forest green
    this.container.addChild(bg);

    // Dirt trail (like PokéSurvivor's path)
    const path = new Graphics();
    path.moveTo(W * 0.45, 0);
    path.bezierCurveTo(W * 0.52, H * 0.3, W * 0.40, H * 0.7, W * 0.48, H);
    path.lineTo(W * 0.65, H);
    path.bezierCurveTo(W * 0.58, H * 0.7, W * 0.70, H * 0.3, W * 0.62, 0);
    path.closePath();
    path.fill({ color: 0x6E563B, alpha: 0.55 });
    this.container.addChild(path);

    // Decorative foliage & grass clumps
    const flora = new Graphics();
    for (let i = 0; i < 45; i++) {
      const gx = (i * 97) % (W - 360);
      const gy = (i * 71) % H;
      flora.circle(gx, gy, 8 + (i % 6));
      flora.fill({ color: 0x1B4318, alpha: 0.4 });
      flora.rect(gx - 2, gy - 12, 4, 10);
      flora.fill({ color: 0x3E7D38, alpha: 0.6 });
    }
    // Trees on left border
    for (let ty = 30; ty < H; ty += 110) {
      flora.circle(25, ty, 38);
      flora.fill({ color: 0x183715, alpha: 0.85 });
      flora.circle(25, ty - 8, 28);
      flora.fill({ color: 0x255221, alpha: 0.9 });
    }
    this.container.addChild(flora);

    // Leaf / Blossom drifting particles (Konoha no Ha)
    for (let p = 0; p < 25; p++) {
      const g = new Graphics();
      const isBlossom = p % 2 === 0;
      g.ellipse(0, 0, 5, 2.5);
      g.fill({ color: isBlossom ? 0xF472B6 : 0x86EFAC, alpha: 0.75 });
      this.container.addChild(g);
      this.leafParticles.push({
        g,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 20 + Math.random() * 35,
        vy: 15 + Math.random() * 25,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
      });
    }
  }

  private updateParticles(dt: number): void {
    const W = this.W;
    const H = this.H;
    for (const p of this.leafParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      if (p.x > W) p.x = -20;
      if (p.y > H) p.y = -20;
      p.g.x = p.x;
      p.g.y = p.y;
      p.g.rotation = p.rot;
    }
  }

  // ── Top Bar ──────────────────────────────────────────────────────

  private buildTopBar(): void {
    const topBar = new Container();
    topBar.y = 12;

    // 1. Ryo currency pill (🪙 7,975)
    const ryoPill = new Container();
    ryoPill.x = 360;
    const ryoBg = new Graphics();
    ryoBg.roundRect(0, 0, 105, 32, 16);
    ryoBg.fill({ color: 0x0F172A, alpha: 0.85 });
    ryoBg.roundRect(0, 0, 105, 32, 16);
    ryoBg.stroke({ color: 0x334155, width: 1.5 });
    ryoPill.addChild(ryoBg);
    this.ryoPillText = makeText('🪙 7,975', 12, 0xFBBF24, true);
    this.ryoPillText.anchor.set(0.5);
    this.ryoPillText.x = 52;
    this.ryoPillText.y = 16;
    ryoPill.addChild(this.ryoPillText);
    topBar.addChild(ryoPill);

    // 2. Scrolls pill (🎫 43  🎟️ 7)
    const scrollsPill = new Container();
    scrollsPill.x = 475;
    const scBg = new Graphics();
    scBg.roundRect(0, 0, 115, 32, 16);
    scBg.fill({ color: 0x0F172A, alpha: 0.85 });
    scBg.roundRect(0, 0, 115, 32, 16);
    scBg.stroke({ color: 0x334155, width: 1.5 });
    scrollsPill.addChild(scBg);
    this.scrollsPillText = makeText('📜 43  🔖 7', 12, 0x38BDF8, true);
    this.scrollsPillText.anchor.set(0.5);
    this.scrollsPillText.x = 57;
    this.scrollsPillText.y = 16;
    scrollsPill.addChild(this.scrollsPillText);
    topBar.addChild(scrollsPill);

    // 3. Player Profile pill (👑 ShisuiUo...)
    const profilePill = new Container();
    profilePill.x = 600;
    const prBg = new Graphics();
    prBg.roundRect(0, 0, 140, 32, 16);
    prBg.fill({ color: 0x0F172A, alpha: 0.85 });
    prBg.roundRect(0, 0, 140, 32, 16);
    prBg.stroke({ color: 0xF59E0B, width: 1.5 });
    profilePill.addChild(prBg);
    this.profilePillText = makeText('👑 ShisuiUo...', 12, 0xFBBF24, true);
    this.profilePillText.anchor.set(0.5);
    this.profilePillText.x = 70;
    this.profilePillText.y = 16;
    profilePill.addChild(this.profilePillText);
    topBar.addChild(profilePill);

    // 4. Quick icon buttons: 💾 🗂️ ▶️ 💛 🔊 ⛶ ⚙️ Log out
    const icons: Array<{ label: string; action: () => void }> = [
      { label: '💾', action: () => audioManager.playSFX('button_click') },
      { label: '🗂️', action: () => this.callbacks?.onOpenMissions() },
      { label: '▶️', action: () => window.open('https://github.com', '_blank') },
      { label: '💛', action: () => audioManager.playSFX('button_click') },
      { label: '🔊', action: () => audioManager.toggle() },
      {
        label: '⛶',
        action: () => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        },
      },
      { label: '⚙️', action: () => this.callbacks?.onOpenSettings() },
    ];

    let iconX = 750;
    icons.forEach((ic) => {
      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.x = iconX;
      const bBg = new Graphics();
      bBg.roundRect(0, 0, 32, 32, 8);
      bBg.fill({ color: 0x1E293B, alpha: 0.85 });
      bBg.roundRect(0, 0, 32, 32, 8);
      bBg.stroke({ color: 0x475569, width: 1 });
      btn.addChild(bBg);

      const txt = makeText(ic.label, 14, 0xFFFFFF);
      txt.anchor.set(0.5);
      txt.x = 16; txt.y = 16;
      btn.addChild(txt);

      btn.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        ic.action();
      });
      topBar.addChild(btn);
      iconX += 38;
    });

    // "Log out" pill button
    const logoutBtn = new Container();
    logoutBtn.eventMode = 'static';
    logoutBtn.cursor = 'pointer';
    logoutBtn.x = iconX + 4;
    const loBg = new Graphics();
    loBg.roundRect(0, 0, 72, 32, 8);
    loBg.fill({ color: 0x1E293B, alpha: 0.85 });
    loBg.roundRect(0, 0, 72, 32, 8);
    loBg.stroke({ color: 0x475569, width: 1 });
    logoutBtn.addChild(loBg);
    const loTxt = makeText('Log out', 11, 0x94A3B8, true);
    loTxt.anchor.set(0.5);
    loTxt.x = 36; loTxt.y = 16;
    logoutBtn.addChild(loTxt);
    logoutBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      alert('Arrivederci Shinobi! Sessione salvata localmente.');
    });
    topBar.addChild(logoutBtn);

    this.container.addChild(topBar);
  }

  // ── Center-Left Display (Logo, Speech Bubble, Event Banner, Card) ──

  private buildCenterShowcase(): void {
    const leftContainer = new Container();
    leftContainer.x = 180;
    leftContainer.y = 70;

    // Official Game Icon (Pixel Art Emblem)
    Assets.load('/logo.png').then((tex) => {
      const logoSprite = new Sprite(tex);
      logoSprite.width = 64;
      logoSprite.height = 64;
      logoSprite.x = 104;
      logoSprite.y = -6;
      leftContainer.addChild(logoSprite);
    }).catch((e) => {
      console.warn('Could not load logo icon:', e);
    });

    // Title: NarutoSurvivor (in golden 3D arcade style like PokéSurvivor)
    const titleShadow = makeText('NarutoSurvivor', 44, 0x78350F, true);
    titleShadow.x = 182; titleShadow.y = 2;
    leftContainer.addChild(titleShadow);

    const title = makeText('NarutoSurvivor', 44, 0xFBBF24, true);
    title.x = 180; title.y = 0;
    leftContainer.addChild(title);

    const subtitle = makeText('SHINOBI CHRONICLES — ROAD TO HOKAGE', 11, 0xFFFFFF, true);
    subtitle.x = 215; subtitle.y = 52;
    leftContainer.addChild(subtitle);

    // Tilted speech bubble (like "Falagon, Sekiam... room for one more?")
    const bubble = new Container();
    bubble.x = 390;
    bubble.y = 42;
    bubble.rotation = 0.08;
    const bTxt = makeText('“Dattebayo! Diventerò Hokage, costi quel che costi!”', 11, 0xFEF08A, true);
    bubble.addChild(bTxt);
    leftContainer.addChild(bubble);

    // Event countdown pill: 🎃 Esame Chūnin tra 00:58:44
    const eventPill = new Container();
    eventPill.x = 185;
    eventPill.y = 76;
    const epBg = new Graphics();
    epBg.roundRect(0, 0, 240, 26, 13);
    epBg.fill({ color: 0x9A3412, alpha: 0.9 });
    epBg.roundRect(0, 0, 240, 26, 13);
    epBg.stroke({ color: 0xFB923C, width: 1.5 });
    eventPill.addChild(epBg);
    const epTxt = makeText('🍥 Esame Chūnin tra 00:58:44', 11, 0xFFEDD5, true);
    epTxt.anchor.set(0.5);
    epTxt.x = 120; epTxt.y = 13;
    eventPill.addChild(epTxt);
    leftContainer.addChild(eventPill);

    // ── Center Showcase Card (Dark rounded box with glowing orange outline) ──
    this.showcaseCard = new Container();
    this.showcaseCard.x = 185;
    this.showcaseCard.y = 118;
    this.showcaseCard.eventMode = 'static';
    this.showcaseCard.cursor = 'pointer';

    const cardW = 240;
    const cardH = 200;

    const cBg = new Graphics();
    cBg.roundRect(0, 0, cardW, cardH, 16);
    cBg.fill({ color: 0x0F172A, alpha: 0.95 });
    cBg.roundRect(0, 0, cardW, cardH, 16);
    cBg.stroke({ color: 0xEA580C, width: 2.5 });
    this.showcaseCard.addChild(cBg);

    // Inner shadow vortex
    const vortex = new Graphics();
    vortex.circle(cardW / 2, cardH / 2, 60);
    vortex.fill({ color: 0x000000, alpha: 0.4 });
    this.showcaseCard.addChild(vortex);

    // Avatar
    this.showcaseAvatar = new Graphics();
    this.showcaseCard.addChild(this.showcaseAvatar);

    // Click hint
    const changeHint = makeText('Clicca per cambiare Shinobi', 10, 0x64748B);
    changeHint.anchor.set(0.5);
    changeHint.x = cardW / 2;
    changeHint.y = cardH - 16;
    this.showcaseCard.addChild(changeHint);

    this.showcaseCard.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      this.callbacks?.onOpenRoster();
    });
    leftContainer.addChild(this.showcaseCard);

    // Character Name below card
    this.showcaseName = makeText('', 18, 0xFFFFFF, true);
    this.showcaseName.anchor.set(0.5, 0);
    this.showcaseName.x = 185 + cardW / 2;
    this.showcaseName.y = 328;
    leftContainer.addChild(this.showcaseName);

    // Element pills container below name
    this.showcaseTags = new Container();
    this.showcaseTags.x = 185 + cardW / 2;
    this.showcaseTags.y = 356;
    leftContainer.addChild(this.showcaseTags);

    this.container.addChild(leftContainer);
  }

  // ── Right Sidebar Menu (PokéSurvivor iconic menu) ────────────────

  private buildRightSidebar(): void {
    const sidebarW = 320;
    const sidebarH = 550;
    const sidebarX = this.W - sidebarW - 24;
    const sidebarY = 60;

    const sidebar = new Container();
    sidebar.x = sidebarX;
    sidebar.y = sidebarY;

    // Glowing main panel
    const panelBg = new Graphics();
    panelBg.roundRect(0, 0, sidebarW, sidebarH, 18);
    panelBg.fill({ color: 0x1E293B, alpha: 0.92 });
    panelBg.roundRect(0, 0, sidebarW, sidebarH, 18);
    panelBg.stroke({ color: 0x38BDF8, width: 2.5 });
    sidebar.addChild(panelBg);

    // 10 Exact Menu Items from PokéSurvivor (translated to Naruto!)
    const MENU_ITEMS = [
      {
        id: 'play',
        icon: '🍥',
        title: 'Play (Gioca)',
        subtitle: 'Inizia la missione di sopravvivenza',
        color: 0xEF4444,
        action: () => {
          const profile = SaveSystem.getProfile();
          const activeChar = getCharacterById(profile.selectedCharacterId) || ROSTER[0];
          this.callbacks?.onPlay(activeChar);
        },
      },
      {
        id: 'pokemon',
        icon: '🥋',
        title: 'Shinobi (Ninja)',
        subtitle: `${SaveSystem.getProfile().unlockedCharacterIds.length} / ${ROSTER.length} sbloccati · Roster & Stelle`,
        color: 0x38BDF8,
        action: () => this.callbacks?.onOpenRoster(),
      },
      {
        id: 'upgrades',
        icon: '⬆️',
        title: 'Upgrades (Talenti)',
        subtitle: 'Potenzia ogni sessione di gioco con Ryo',
        color: 0x10B981,
        action: () => this.callbacks?.onOpenUpgrades(),
      },
      {
        id: 'shop',
        icon: '🏪',
        title: 'Emporio Ninja (Shop)',
        subtitle: 'Tonici chakra, pillole militari e rotoli',
        color: 0xF59E0B,
        action: () => this.callbacks?.onOpenShop(),
      },
      {
        id: 'bag',
        icon: '🎒',
        title: 'Borsa Ninja (Bag)',
        subtitle: 'Strumenti: Kunai, Shuriken, Tonici',
        color: 0xEA580C,
        action: () => this.callbacks?.onOpenBag(),
      },
      {
        id: 'gacha',
        icon: '📜',
        title: 'Gacha (Evocazione)',
        subtitle: 'Rotoli Ninja · Evoca nuovi Shinobi',
        color: 0xA855F7,
        action: () => this.callbacks?.onOpenGacha(),
      },
      {
        id: 'missions',
        icon: '🎖️',
        title: 'Missioni (Missions)',
        subtitle: 'Gradi D, C, B, A, S e traguardi ninja',
        color: 0xEAB308,
        action: () => this.callbacks?.onOpenMissions(),
      },
      {
        id: 'friends',
        icon: '👥',
        title: 'Squadra (Team)',
        subtitle: 'Formazione a 3 ninja e alleati',
        color: 0x06B6D4,
        action: () => this.callbacks?.onOpenFriends(),
      },
      {
        id: 'leaderboard',
        icon: '🏆',
        title: 'Classifica (Hokage)',
        subtitle: 'Chi sopravvive più a lungo',
        color: 0xFACC15,
        action: () => this.callbacks?.onOpenLeaderboard(),
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: 'Impostazioni (Settings)',
        subtitle: 'Audio, comandi, grafica e account',
        color: 0x94A3B8,
        action: () => this.callbacks?.onOpenSettings(),
      },
    ];

    const itemH = 46;
    const gap = 6;
    const startY = 16;

    MENU_ITEMS.forEach((item, i) => {
      const row = new Container();
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.y = startY + i * (itemH + gap);
      row.x = 12;

      const rBg = new Graphics();
      rBg.roundRect(0, 0, sidebarW - 24, itemH, 10);
      rBg.fill({ color: 0x0F172A, alpha: 0.65 });
      row.addChild(rBg);

      // Icon
      const icon = makeText(item.icon, 20, 0xFFFFFF);
      icon.anchor.set(0.5);
      icon.x = 24;
      icon.y = itemH / 2;
      row.addChild(icon);

      // Title
      const t = makeText(item.title, 13, item.color, true);
      t.x = 48;
      t.y = 8;
      row.addChild(t);

      // Subtitle
      const sub = makeText(item.subtitle, 9, 0x94A3B8);
      sub.x = 48;
      sub.y = 25;
      row.addChild(sub);

      // Hover effect
      row.on('pointerover', () => {
        rBg.clear();
        rBg.roundRect(0, 0, sidebarW - 24, itemH, 10);
        rBg.fill({ color: 0x2563EB, alpha: 0.35 });
        rBg.roundRect(0, 0, sidebarW - 24, itemH, 10);
        rBg.stroke({ color: item.color, width: 1.5 });
      });
      row.on('pointerout', () => {
        rBg.clear();
        rBg.roundRect(0, 0, sidebarW - 24, itemH, 10);
        rBg.fill({ color: 0x0F172A, alpha: 0.65 });
      });

      row.on('pointerdown', () => {
        audioManager.playSFX('button_click');
        item.action();
      });

      this.navItems.push({ container: row, onSelect: () => item.action() });
      sidebar.addChild(row);
    });

    this.container.addChild(sidebar);
  }

  // ── Bottom Right Stats Panel (Matches PokéSurvivor stats card) ───

  private buildStatsPanel(): void {
    const sidebarW = 320;
    const sidebarX = this.W - sidebarW - 24;
    const panelY = 622;

    const statsPanel = new Container();
    statsPanel.x = sidebarX;
    statsPanel.y = panelY;

    const bg = new Graphics();
    bg.roundRect(0, 0, sidebarW, 58, 12);
    bg.fill({ color: 0x0F172A, alpha: 0.88 });
    bg.roundRect(0, 0, sidebarW, 58, 12);
    bg.stroke({ color: 0x38BDF8, width: 1.5 });
    statsPanel.addChild(bg);

    this.runsStatsText = makeText('', 11, 0x94A3B8);
    this.runsStatsText.x = 16;
    this.runsStatsText.y = 12;
    statsPanel.addChild(this.runsStatsText);

    this.killsStatsText = makeText('', 11, 0x94A3B8);
    this.killsStatsText.x = 16;
    this.killsStatsText.y = 32;
    statsPanel.addChild(this.killsStatsText);

    this.container.addChild(statsPanel);
  }

  // ── Bottom Left Footer Notice ────────────────────────────────────

  private buildFooter(): void {
    const footerTxt = makeText(
      'Non-profit Fan project - NarutoSurvivor • Masashi Kishimoto / Shueisha • Local Save Active',
      10,
      0x64748B,
    );
    footerTxt.x = 24;
    footerTxt.y = this.H - 22;
    this.container.addChild(footerTxt);
  }

  private navItems: NavigatableItem[] = [];

  // ── Public Update / Show ────────────────────────────────────────

  show(callbacks: MainMenuCallbacks): void {
    this.callbacks = callbacks;
    this.refreshData();
    this.container.visible = true;
    GamepadMenuNavigator.get()?.setContext({
      id: 'main_menu',
      items: this.navItems,
      selectedIndex: 0,
    });
  }

  hide(): void {
    this.container.visible = false;
    GamepadMenuNavigator.get()?.popContext('main_menu');
  }

  refreshData(): void {
    const profile = SaveSystem.getProfile();

    // Top pills
    this.ryoPillText.text = `🪙 ${profile.ryo.toLocaleString()}`;
    this.scrollsPillText.text = `📜 ${profile.scrolls}  🔖 ${profile.ninjaSeals}`;
    this.profilePillText.text = `👑 ${profile.playerName.slice(0, 10)}...`;

    // Active character
    const char = getCharacterById(profile.selectedCharacterId) || ROSTER[0];
    const rank = SaveSystem.getCharacterRank(char.id, char.baseRank);

    // Showcase Avatar
    this.showcaseAvatar.clear();
    this.showcaseAvatar.circle(120, 100, 46);
    this.showcaseAvatar.fill({ color: char.assets.color });
    this.showcaseAvatar.rect(80, 94, 80, 10);
    this.showcaseAvatar.fill({ color: 0xFFFFFF, alpha: 0.35 });

    this.showcaseName.text = char.nameIT;

    // Element & Rank Pills
    this.showcaseTags.removeChildren();
    const tagValues = [
      { label: char.element[0] || 'Yang', color: 0xEF4444 },
      { label: char.jutsuSlot.category, color: 0x8B5CF6 },
      { label: renderStars(rank), color: 0xF59E0B },
    ];

    let tagX = -90;
    tagValues.forEach((t) => {
      const pill = new Container();
      const pBg = new Graphics();
      pBg.roundRect(0, 0, 56, 18, 9);
      pBg.fill({ color: t.color, alpha: 0.25 });
      pBg.roundRect(0, 0, 56, 18, 9);
      pBg.stroke({ color: t.color, width: 1 });
      pill.addChild(pBg);

      const pTxt = makeText(t.label, 9, t.color, true);
      pTxt.anchor.set(0.5);
      pTxt.x = 28; pTxt.y = 9;
      pill.addChild(pTxt);

      pill.x = tagX;
      tagX += 62;
      this.showcaseTags.addChild(pill);
    });

    // Stats panel
    const m = Math.floor(profile.bestTimeSec / 60);
    const s = profile.bestTimeSec % 60;
    const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    this.runsStatsText.text = `Partite ${profile.totalRuns} • Miglior tempo ${timeFormatted}`;
    this.killsStatsText.text = `Livello max ${profile.highestLevel} • Nemici sconfitti ${profile.enemiesDefeated.toLocaleString()}`;
  }
}
