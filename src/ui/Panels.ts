import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { renderStars } from '../systems/promotionSystem';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import type { StarRank } from '../types/character';

// ============================================================
//  NarutoSurvivor — Level Up Upgrade Panel
// ============================================================

export interface UpgradeOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  apply: (stats: UpgradeTarget) => void;
  color: number;
  type?: 'stat' | 'new_jutsu' | 'jutsu_level' | 'ninja_tool' | 'synergy_evolution';
  tag?: string;
  isSynergy?: boolean;
  levelText?: string;
}

export interface UpgradeTarget {
  hp: number;
  maxHp: number;
  jutsudmg: number;
  movespeed: number;
  collectradius: number;
  critchance: number;
  critdmg: number;
  defense: number;
  ryomultiplier: number;
  chakraorbmultiplier: number;
  jutsuCooldownMult: number; // < 1 = faster
}

// Pool of possible upgrades
export const UPGRADE_POOL: UpgradeOption[] = [
  {
    id: 'hp_up',
    icon: '❤️',
    title: 'Vitalità del Ninja',
    description: '+30% HP massimo e cura istantanea del 20%',
    color: 0xEF4444,
    apply: t => {
      const bonus = t.maxHp * 0.30;
      t.maxHp += bonus;
      t.hp = Math.min(t.hp + t.maxHp * 0.20, t.maxHp);
    },
  },
  {
    id: 'dmg_up',
    icon: '⚡',
    title: 'Chakra Concentrato',
    description: '+25% Danno Jutsu',
    color: 0xF97316,
    apply: t => { t.jutsudmg *= 1.25; },
  },
  {
    id: 'speed_up',
    icon: '💨',
    title: 'Velocità del Vento',
    description: '+20% Velocità di Movimento',
    color: 0x86EFAC,
    apply: t => { t.movespeed *= 1.20; },
  },
  {
    id: 'cooldown_down',
    icon: '🌀',
    title: 'Flusso del Chakra',
    description: '-20% Cooldown Jutsu',
    color: 0x60A5FA,
    apply: t => { t.jutsuCooldownMult = Math.max(0.3, t.jutsuCooldownMult * 0.80); },
  },
  {
    id: 'crit_up',
    icon: '💥',
    title: 'Occhio del Predatore',
    description: '+12% Probabilità Critico',
    color: 0xFBBF24,
    apply: t => { t.critchance = Math.min(0.80, t.critchance + 0.12); },
  },
  {
    id: 'crit_dmg_up',
    icon: '🔥',
    title: 'Colpo Letale',
    description: '+40% Danno Critico',
    color: 0xFDE68A,
    apply: t => { t.critdmg *= 1.40; },
  },
  {
    id: 'collect_up',
    icon: '◉',
    title: 'Attrattore di Chakra',
    description: '+60px Raggio Raccolta Orb Chakra',
    color: 0x22D3EE,
    apply: t => { t.collectradius += 60; },
  },
  {
    id: 'defense_up',
    icon: '🛡️',
    title: 'Corpo di Pietra',
    description: '+20 Riduzione Danno Flat',
    color: 0x9CA3AF,
    apply: t => { t.defense += 20; },
  },
  {
    id: 'ryo_up',
    icon: '¥',
    title: 'Mercante di Konoha',
    description: '+50% Moltiplicatore Ryo',
    color: 0xFBBF24,
    apply: t => { t.ryomultiplier *= 1.50; },
  },
  {
    id: 'orb_up',
    icon: '✨',
    title: 'Chakra Potenziato',
    description: '+40% Valore Orb Chakra',
    color: 0xA78BFA,
    apply: t => { t.chakraorbmultiplier *= 1.40; },
  },
  {
    id: 'heal',
    icon: '💚',
    title: 'Tecnica di Guarigione',
    description: 'Recupera 40% degli HP mancanti',
    color: 0x22C55E,
    apply: t => { t.hp = Math.min(t.maxHp, t.hp + (t.maxHp - t.hp) * 0.40); },
  },
  {
    id: 'dmg_crit_combo',
    icon: '🌟',
    title: 'Jutsu Segreto',
    description: '+15% DMG e +8% Critico',
    color: 0xE879F9,
    apply: t => { t.jutsudmg *= 1.15; t.critchance = Math.min(0.80, t.critchance + 0.08); },
  },
];

function pickRandom3(): UpgradeOption[] {
  const pool = [...UPGRADE_POOL];
  const chosen: UpgradeOption[] = [];
  while (chosen.length < 3 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(i, 1)[0]);
  }
  return chosen;
}

const FONT = GAME_CONFIG.FONT_FAMILY;

function label(txt: string, size: number, color = 0xffffff, bold = false): Text {
  return new Text({
    text: txt,
    style: new TextStyle({ fontFamily: FONT, fontSize: size, fill: color, fontWeight: bold ? '700' : '400' }),
  });
}

export class LevelUpPanel {
  private readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private onChoose!: (opt: UpgradeOption) => void;

  constructor(stage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    stage.addChild(this.container);
  }

  show(level: number, onChoose: (opt: UpgradeOption) => void, customOptions?: UpgradeOption[]): void {
    this.onChoose = onChoose;
    this.container.removeChildren();
    this.container.visible = true;

    const W = this.W;
    const H = this.H;
    const options = (customOptions && customOptions.length > 0) ? customOptions : pickRandom3();

    // Dim overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.82 });
    this.container.addChild(overlay);

    // Title
    const hasSynergy = options.some(o => o.isSynergy);
    const titleText = hasSynergy
      ? `✨ LIVELLO ${level} — RISVEGLIO SINERGIA DISPONIBILE! ✨`
      : `⬆ LIVELLO ${level} — Scegli un Potenziamento`;
    const title = label(titleText, 25, hasSynergy ? 0xFBBF24 : 0xF97316, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = H * 0.10;
    this.container.addChild(title);

    // Subtitle
    const subText = hasSynergy
      ? 'La combinazione dei tuoi elementi ha sbloccato una Tecnica Segreta!'
      : 'Evolvi il tuo arsenale ninja per dominare il campo di battaglia';
    const sub = label(subText, 14, 0x9CA3AF);
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = H * 0.10 + 36;
    this.container.addChild(sub);

    // Cards
    const CARD_W = 250;
    const CARD_H = 220;
    const GAP    = 24;
    const totalW = options.length * CARD_W + (options.length - 1) * GAP;
    const startX = (W - totalW) / 2;
    const cardY  = H / 2 - CARD_H / 2 + 15;

    const navCards: NavigatableItem[] = [];

    options.forEach((opt, i) => {
      const card = this.buildCard(opt, CARD_W, CARD_H);
      card.x = startX + i * (CARD_W + GAP);
      card.y = cardY;
      this.container.addChild(card);
      navCards.push({ container: card, onSelect: () => this.choose(opt) });
    });

    GamepadMenuNavigator.get()?.pushContext({
      id: 'level_up_panel',
      items: navCards,
      columns: 3,
      selectedIndex: 0,
    });

    // Tip
    const tip = label('🎮 Joystick: Sposta focus  •  [ A ]: Seleziona  •  Tastiera: 1, 2, 3', 12, 0x6B7280);
    tip.anchor.set(0.5, 1);
    tip.x = W / 2;
    tip.y = H - 24;
    this.container.addChild(tip);

    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (idx >= 0 && idx < options.length) {
        window.removeEventListener('keydown', onKey);
        this.choose(options[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  private buildCard(opt: UpgradeOption, W: number, H: number): Container {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'pointer';

    const isSyn = !!opt.isSynergy;
    const borderColor = isSyn ? 0xFBBF24 : opt.color;
    const borderWidth = isSyn ? 3 : 2;

    const bg = new Graphics();
    bg.roundRect(0, 0, W, H, 14);
    bg.fill({ color: isSyn ? 0x1A1429 : 0x111827 });
    bg.stroke({ color: borderColor, width: borderWidth, alpha: isSyn ? 1 : 0.75 });
    card.addChild(bg);

    // Top Tag Badge
    if (opt.tag || isSyn) {
      const tagText = isSyn ? '★ SINERGIA ELEMENTALE ★' : opt.tag!;
      const tagBg = new Graphics();
      tagBg.roundRect(W / 2 - 80, -10, 160, 20, 10);
      tagBg.fill({ color: isSyn ? 0x78350F : 0x1F2937 });
      tagBg.stroke({ color: isSyn ? 0xFBBF24 : opt.color, width: 1.5 });
      card.addChild(tagBg);

      const tagLbl = label(tagText, 9, isSyn ? 0xFDE68A : 0xE5E7EB, true);
      tagLbl.anchor.set(0.5);
      tagLbl.x = W / 2;
      tagLbl.y = 0;
      card.addChild(tagLbl);
    }

    // Level Badge if present
    if (opt.levelText) {
      const lvlLbl = label(opt.levelText, 11, opt.color, true);
      lvlLbl.anchor.set(1, 0);
      lvlLbl.x = W - 14;
      lvlLbl.y = 12;
      card.addChild(lvlLbl);
    }

    // Icon
    const icon = label(opt.icon, isSyn ? 46 : 40);
    icon.anchor.set(0.5, 0);
    icon.x = W / 2;
    icon.y = 20;
    card.addChild(icon);

    // Title
    const title = label(opt.title, 14, isSyn ? 0xFDE68A : opt.color, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = 78;
    card.addChild(title);

    // Description (word-wrap)
    const desc = new Text({
      text: opt.description,
      style: new TextStyle({
        fontFamily: FONT, fontSize: 11, fill: isSyn ? 0xFEF08A : 0xD1D5DB,
        wordWrap: true, wordWrapWidth: W - 24, align: 'center',
      }),
    });
    desc.anchor.set(0.5, 0);
    desc.x = W / 2;
    desc.y = 102;
    card.addChild(desc);

    // Select button bar
    const bar = new Graphics();
    bar.roundRect(20, H - 34, W - 40, 22, 8);
    bar.fill({ color: isSyn ? 0xF59E0B : opt.color });
    card.addChild(bar);
    const btnText = isSyn ? 'SBLOCCA SINERGIA' : 'SELEZIONA';
    const selectLbl = label(btnText, 10, isSyn ? 0x000000 : 0x000000, true);
    selectLbl.anchor.set(0.5);
    selectLbl.x = W / 2;
    selectLbl.y = H - 23;
    card.addChild(selectLbl);

    card.on('pointerover', () => {
      bg.clear();
      bg.roundRect(0, 0, W, H, 14);
      bg.fill({ color: isSyn ? 0x2A1B3D : 0x1F2937 });
      bg.stroke({ color: isSyn ? 0xFDE047 : opt.color, width: isSyn ? 4 : 3 });
      card.scale.set(1.04);
    });
    card.on('pointerout', () => {
      bg.clear();
      bg.roundRect(0, 0, W, H, 14);
      bg.fill({ color: isSyn ? 0x1A1429 : 0x111827 });
      bg.stroke({ color: borderColor, width: borderWidth, alpha: isSyn ? 1 : 0.75 });
      card.scale.set(1.0);
    });

    card.on('pointertap', () => this.choose(opt));

    return card;
  }

  private choose(opt: UpgradeOption): void {
    GamepadMenuNavigator.get()?.popContext('level_up_panel');
    this.container.visible = false;
    if (this.onChoose) this.onChoose(opt);
  }

  get isVisible(): boolean { return this.container.visible; }
}

// ============================================================
//  NarutoSurvivor — Fragment Promotion UI Panel
// ============================================================

export class PromotionPanel {
  private readonly container: Container;
  private readonly W: number;
  private readonly H: number;

  constructor(stage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    stage.addChild(this.container);
  }

  show(
    charName: string,
    currentRank: StarRank,
    fragments: number,
    costToNextRank: number,
    onPromote: () => void,
    onClose: () => void,
  ): void {
    this.container.removeChildren();
    this.container.visible = true;

    const W = this.W;
    const H = this.H;

    // Overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.82 });
    overlay.eventMode = 'static';
    overlay.on('pointertap', () => { this.hide(); onClose(); });
    this.container.addChild(overlay);

    // Panel
    const panelW = 440;
    const panelH = 320;
    const panel = new Graphics();
    panel.roundRect((W - panelW) / 2, (H - panelH) / 2, panelW, panelH, 18);
    panel.fill({ color: 0x0F172A });
    panel.stroke({ color: 0xFBBF24, width: 2 });
    panel.eventMode = 'static';
    panel.on('pointertap', e => e.stopPropagation());
    this.container.addChild(panel);

    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    const title = label('⬛ PROMOZIONE FRAMMENTI', 20, 0xFBBF24, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = py + 24;
    this.container.addChild(title);

    const charLabel = label(charName, 18, 0xffffff, true);
    charLabel.anchor.set(0.5, 0);
    charLabel.x = W / 2;
    charLabel.y = py + 58;
    this.container.addChild(charLabel);

    const rankNow = renderStars(currentRank);
    const rankNext = currentRank < 5 ? renderStars((currentRank + 1) as StarRank) : '✦ MAX';
    const rankTxt = label(`${rankNow}  →  ${rankNext}`, 22, 0xFBBF24, true);
    rankTxt.anchor.set(0.5, 0);
    rankTxt.x = W / 2;
    rankTxt.y = py + 90;
    this.container.addChild(rankTxt);

    const fragTxt = label(
      `Frammenti posseduti: ${fragments}  /  Costo: ${costToNextRank}`,
      15,
      fragments >= costToNextRank ? 0x22C55E : 0xEF4444,
    );
    fragTxt.anchor.set(0.5, 0);
    fragTxt.x = W / 2;
    fragTxt.y = py + 142;
    this.container.addChild(fragTxt);

    // Fragment bar
    const barW = panelW - 80;
    const pct  = Math.min(1, fragments / Math.max(1, costToNextRank));
    const barBg = new Graphics();
    barBg.roundRect(px + 40, py + 172, barW, 14, 7);
    barBg.fill({ color: 0x1f1f1f });
    this.container.addChild(barBg);
    const barFill = new Graphics();
    barFill.roundRect(px + 40, py + 172, barW * pct, 14, 7);
    barFill.fill({ color: 0xFBBF24 });
    this.container.addChild(barFill);

    // Promote button
    const canPromote = fragments >= costToNextRank && currentRank < 5;
    const btnColor   = canPromote ? 0xFBBF24 : 0x374151;
    const btnLblColor = canPromote ? 0x000000 : 0x6B7280;

    const btn = new Graphics();
    btn.roundRect(px + 80, py + 210, panelW - 160, 44, 12);
    btn.fill({ color: btnColor });
    btn.eventMode = canPromote ? 'static' : 'none';
    btn.cursor = canPromote ? 'pointer' : 'default';
    if (canPromote) {
      btn.on('pointertap', () => { this.hide(); onPromote(); });
    }
    this.container.addChild(btn);

    const btnLbl = label(
      canPromote ? '✦ PROMUOVI ORA' : 'Frammenti Insufficienti',
      15, btnLblColor, true,
    );
    btnLbl.anchor.set(0.5);
    btnLbl.x = W / 2;
    btnLbl.y = py + 232;
    this.container.addChild(btnLbl);

    // Close hint
    const closeTxt = label('ESC o clicca fuori per chiudere', 11, 0x4B5563);
    closeTxt.anchor.set(0.5, 1);
    closeTxt.x = W / 2;
    closeTxt.y = py + panelH - 12;
    this.container.addChild(closeTxt);
  }

  hide(): void { this.container.visible = false; }
  get isVisible(): boolean { return this.container.visible; }
}

// ============================================================
//  NarutoSurvivor — Boss Warning Banner
// ============================================================

export class BossWarningBanner {
  private readonly container: Container;
  private timer = 0;
  private readonly duration = 3.0;

  constructor(stage: Container, W: number, H: number) {
    this.container = new Container();
    this.container.visible = false;

    const bg = new Graphics();
    bg.rect(0, H / 2 - 50, W, 100);
    bg.fill({ color: 0x7F1D1D, alpha: 0.90 });
    this.container.addChild(bg);

    const txt = new Text({
      text: '⚠ ATTENZIONE — BOSS IN ARRIVO ⚠',
      style: new TextStyle({
        fontFamily: GAME_CONFIG.FONT_FAMILY,
        fontSize: 32,
        fill: 0xFCA5A5,
        fontWeight: '900',
        dropShadow: { color: 0, blur: 8, alpha: 1, distance: 0 },
      }),
    });
    txt.anchor.set(0.5);
    txt.x = W / 2;
    txt.y = H / 2;
    this.container.addChild(txt);

    stage.addChild(this.container);
  }

  trigger(bossName: string): void {
    this.container.visible = true;
    this.timer = this.duration;
    // Update text
    const txt = this.container.children[1] as Text;
    txt.text = `⚠  ${bossName.toUpperCase()}  SI AVVICINA  ⚠`;
  }

  update(dt: number): void {
    if (!this.container.visible) return;
    this.timer -= dt;
    this.container.alpha = Math.min(1, this.timer / 0.4);
    if (this.timer <= 0) this.container.visible = false;
  }
}
