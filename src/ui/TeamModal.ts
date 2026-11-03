// ============================================================
//  NarutoSurvivor — Team & Shinobi Squad Modal (Friends / Team)
//  Select your allied companion ninja to assist you in runs
// ============================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { ROSTER, getCharacterById } from '../data/roster';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { GamepadMenuNavigator, type NavigatableItem } from '../controls/GamepadMenuNavigator';
import { buildPlayerSprite } from '../rendering/SpriteFactory';
import { createNarutoIcon } from '../rendering/IconManager';
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

export interface TeamSynergy {
  title: string;
  iconKey: string;
  description: string;
  statBonusText: string;
}

export function computeTeamSynergy(leader: Character, support: Character): TeamSynergy {
  const lId = leader.id.toLowerCase();
  const sId = support.id.toLowerCase();

  const isTeam7 = (lId.includes('naruto') || lId.includes('sasuke') || lId.includes('sakura') || lId.includes('kakashi')) &&
                  (sId.includes('naruto') || sId.includes('sasuke') || sId.includes('sakura') || sId.includes('kakashi'));

  if (isTeam7 && lId !== sId) {
    return {
      title: 'Legame del Team 7 di Konoha',
      iconKey: 'team_7',
      description: 'Lavoro di squadra perfetto ereditato dagli insegnamenti del Terzo Hokage e di Kakashi.',
      statBonusText: '+15% Velocità di Movimento • +10% HP Massimi',
    };
  }

  const isUchiha = (lId.includes('sasuke') || lId.includes('itachi') || lId.includes('shisui') || lId.includes('madara') || lId.includes('obito')) &&
                   (sId.includes('sasuke') || sId.includes('itachi') || sId.includes('shisui') || sId.includes('madara') || sId.includes('obito'));

  if (isUchiha && lId !== sId) {
    return {
      title: 'Occhi del Destino (Clan Uchiha)',
      iconKey: 'uchiha',
      description: 'La risonanza del Mangekyō Sharingan eleva la ferocia dei colpi letali.',
      statBonusText: '+20% Moltiplicatore Danno Critico • Amaterasu assist',
    };
  }

  const isSannin = (lId.includes('jiraiya') || lId.includes('tsunade') || lId.includes('orochimaru')) &&
                   (sId.includes('jiraiya') || sId.includes('tsunade') || sId.includes('orochimaru'));

  if (isSannin && lId !== sId) {
    return {
      title: 'I Tre Ninja Leggendari (Sannin)',
      iconKey: 'sannin',
      description: 'La saggezza e la potenza dei tre discepoli di Hiruzen Sarutobi.',
      statBonusText: '+25% Danno Jutsu • Cura Medica periodica',
    };
  }

  const isKage = (lId.includes('hokage') || lId.includes('minato') || lId.includes('hashirama') || lId.includes('tobirama') || lId.includes('hiruzen') || lId.includes('tsunade') || lId.includes('gaara')) &&
                 (sId.includes('hokage') || sId.includes('minato') || sId.includes('hashirama') || sId.includes('tobirama') || sId.includes('hiruzen') || sId.includes('tsunade') || sId.includes('gaara'));

  if (isKage && lId !== sId) {
    return {
      title: 'Volontà dei Kage',
      iconKey: 'kage',
      description: 'I leader dei grandi villaggi guidano la linea del fronte con carisma ineguagliabile.',
      statBonusText: '-15% Cooldown di tutte le Tecniche • +15% Difesa',
    };
  }

  return {
    title: 'Legame Shinobi della Foglia',
    iconKey: 'leaf',
    description: 'Due compagni che combattono spalla a spalla proteggendosi a vicenda contro le orde nemiche.',
    statBonusText: '+10% Danno Jutsu • Fuoco di supporto alleato in battaglia',
  };
}

export class TeamModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private onCloseCallback?: () => void;
  private rosterGrid!: Container;

  constructor(parentStage: Container, W: number, H: number) {
    this.W = W;
    this.H = H;
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = 'static';
    parentStage.addChild(this.container);
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.container.removeChildren();
    this.container.visible = true;

    const W = this.W;
    const H = this.H;

    // Dark backdrop
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x060912, alpha: 0.94 });
    bg.eventMode = 'static';
    this.container.addChild(bg);

    const MODAL_W = Math.min(880, W - 40);
    const MODAL_H = Math.min(580, H - 40);
    const modalX = (W - MODAL_W) / 2;
    const modalY = (H - MODAL_H) / 2;

    const modal = new Container();
    modal.x = modalX;
    modal.y = modalY;
    this.container.addChild(modal);

    const modalBg = new Graphics();
    modalBg.roundRect(0, 0, MODAL_W, MODAL_H, 20);
    modalBg.fill({ color: 0x0F172A });
    modalBg.stroke({ color: 0x06B6D4, width: 2.5, alpha: 0.85 });
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

    // Title
    const titleBox = new Container();
    const tIcon = createNarutoIcon('team', 26);
    tIcon.x = -240; tIcon.y = 12;
    const title = textLabel('FORMAZIONE SQUADRA SHINOBI (TEAM & COMPAGNO)', 20, 0x06B6D4, true);
    title.anchor.set(0.5, 0);
    titleBox.addChild(tIcon, title);
    titleBox.x = MODAL_W / 2;
    titleBox.y = 20;
    modal.addChild(titleBox);

    const sub = textLabel(
      'Scegli il tuo Compagno di Squadra: combatterà al tuo fianco nell\'arena sferrando tecniche e potenziando le tue statistiche!',
      12,
      0x94A3B8,
    );
    sub.anchor.set(0.5, 0);
    sub.x = MODAL_W / 2;
    sub.y = 48;
    modal.addChild(sub);

    this.renderTeamDisplay(modal, MODAL_W, MODAL_H);
  }

  private renderTeamDisplay(modal: Container, MODAL_W: number, MODAL_H: number): void {
    const profile = SaveSystem.getProfile();
    const leader = getCharacterById(profile.selectedCharacterId) || ROSTER[0];
    const supportId = SaveSystem.getSupportCharacterId();
    const support = getCharacterById(supportId) || ROSTER[1];

    const synergy = computeTeamSynergy(leader, support);

    // Top Duo Frame
    const duoBox = new Graphics();
    duoBox.roundRect(24, 76, MODAL_W - 48, 140, 14);
    duoBox.fill({ color: 0x1E293B, alpha: 0.8 });
    duoBox.stroke({ color: 0x334155, width: 1.5 });
    modal.addChild(duoBox);

    // Leader Card (Left)
    const leaderCard = new Container();
    leaderCard.x = 44; leaderCard.y = 90;
    const lSprite = buildPlayerSprite(leader);
    lSprite.x = 35; lSprite.y = 35;
    lSprite.scale.set(1.4);
    leaderCard.addChild(lSprite);

    const lBadge = textLabel('★ LEADER (TU)', 10, 0xFACC15, true);
    lBadge.x = 80; lBadge.y = 12;
    leaderCard.addChild(lBadge);

    const lName = textLabel(leader.nameIT, 14, 0xFFFFFF, true);
    lName.x = 80; lName.y = 28;
    leaderCard.addChild(lName);

    const lJutsuText = leader.jutsuSlot.nameIT.length > 20 ? leader.jutsuSlot.nameIT.slice(0, 18) + '…' : leader.jutsuSlot.nameIT;
    const lJutsu = textLabel(`Tecnica: ${lJutsuText}`, 11, 0x38BDF8);
    lJutsu.x = 80; lJutsu.y = 48;
    leaderCard.addChild(lJutsu);
    modal.addChild(leaderCard);

    // Center VS / Synergy Link
    const linkContainer = new Container();
    linkContainer.x = MODAL_W / 2;
    linkContainer.y = 92;

    const synIcon = createNarutoIcon(synergy.iconKey, 24);
    synIcon.x = -110; synIcon.y = 12;
    const synBadge = textLabel(synergy.title, 13, 0x06B6D4, true);
    synBadge.x = -92;
    synBadge.y = 4;
    linkContainer.addChild(synIcon, synBadge);

    const synDesc = textLabel(synergy.statBonusText, 11, 0xFDE047, true);
    synDesc.anchor.set(0.5, 0);
    synDesc.y = 26;
    linkContainer.addChild(synDesc);

    const synExtra = textLabel(synergy.description, 10, 0x94A3B8);
    synExtra.style.wordWrap = true;
    synExtra.style.wordWrapWidth = 260;
    synExtra.style.align = 'center';
    synExtra.anchor.set(0.5, 0);
    synExtra.y = 46;
    linkContainer.addChild(synExtra);

    modal.addChild(linkContainer);

    // Support Card (Right)
    const supportCard = new Container();
    supportCard.x = MODAL_W - 270; supportCard.y = 90;
    const sSprite = buildPlayerSprite(support);
    sSprite.x = 35; sSprite.y = 35;
    sSprite.scale.set(1.4);
    supportCard.addChild(sSprite);

    const sBadge = textLabel('★ COMPAGNO ASSIST', 10, 0x34D399, true);
    sBadge.x = 80; sBadge.y = 12;
    supportCard.addChild(sBadge);

    const sName = textLabel(support.nameIT, 14, 0xFFFFFF, true);
    sName.x = 80; sName.y = 28;
    supportCard.addChild(sName);

    const sJutsuText = support.jutsuSlot.nameIT.length > 20 ? support.jutsuSlot.nameIT.slice(0, 18) + '…' : support.jutsuSlot.nameIT;
    const sJutsu = textLabel(`Attacco: ${sJutsuText}`, 11, 0x34D399);
    sJutsu.x = 80; sJutsu.y = 48;
    supportCard.addChild(sJutsu);
    modal.addChild(supportCard);

    // Section header for roster selection
    const rosterTitle = textLabel('Scegli il Compagno di Squadra tra i tuoi Shinobi Sbloccati:', 13, 0xE2E8F0, true);
    rosterTitle.x = 24;
    rosterTitle.y = 232;
    modal.addChild(rosterTitle);

    // Roster grid container
    this.rosterGrid = new Container();
    this.rosterGrid.x = 24;
    this.rosterGrid.y = 260;
    modal.addChild(this.rosterGrid);

    // Render unlocked shinobi cards (excluding current leader)
    const unlockedIds = profile.unlockedCharacterIds;
    const available = ROSTER.filter(c => unlockedIds.includes(c.id) && c.id !== leader.id);

    const itemW = (MODAL_W - 48 - 30) / 4;
    const itemH = 68;

    const navItems: NavigatableItem[] = [];

    available.slice(0, 8).forEach((char, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const ix = col * (itemW + 10);
      const iy = row * (itemH + 10);

      const isCurrentSupport = char.id === support.id;

      const card = new Container();
      card.x = ix; card.y = iy;
      card.eventMode = 'static';
      card.cursor = 'pointer';

      const bg = new Graphics();
      bg.roundRect(0, 0, itemW, itemH, 10);
      bg.fill({ color: isCurrentSupport ? 0x064E3B : 0x1E293B });
      bg.stroke({ color: isCurrentSupport ? 0x10B981 : 0x334155, width: isCurrentSupport ? 2 : 1 });
      card.addChild(bg);

      // Mini sprite
      const miniSprite = buildPlayerSprite(char);
      miniSprite.x = 22; miniSprite.y = 34;
      miniSprite.scale.set(0.9);
      card.addChild(miniSprite);

      const cName = textLabel(char.nameIT, 11, isCurrentSupport ? 0x34D399 : 0xFFFFFF, true);
      cName.x = 48; cName.y = 10;
      card.addChild(cName);

      const cJutsu = textLabel(char.jutsuSlot.nameIT, 9, 0x94A3B8);
      cJutsu.x = 48; cJutsu.y = 26;
      card.addChild(cJutsu);

      const cBtnTxt = textLabel(isCurrentSupport ? '✓ IN SQUADRA' : 'SCHIERA ➔', 9, isCurrentSupport ? 0x34D399 : 0xFACC15, true);
      cBtnTxt.x = 48; cBtnTxt.y = 44;
      card.addChild(cBtnTxt);

      const onSelectCard = () => {
        audioManager.playSFX('button_click');
        SaveSystem.setSupportCharacterId(char.id);
        modal.removeChildren();
        const mBg = new Graphics();
        mBg.roundRect(0, 0, MODAL_W, MODAL_H, 20);
        mBg.fill({ color: 0x0F172A });
        mBg.stroke({ color: 0x06B6D4, width: 2.5, alpha: 0.85 });
        modal.addChild(mBg);

        const closeB = new Container();
        closeB.eventMode = 'static';
        closeB.cursor = 'pointer';
        closeB.x = MODAL_W - 44; closeB.y = 16;
        const cBg = new Graphics();
        cBg.roundRect(0, 0, 30, 30, 8);
        cBg.fill({ color: 0x1E293B });
        cBg.stroke({ color: 0x475569, width: 1 });
        closeB.addChild(cBg);
        const cTxt = textLabel('✕', 14, 0x94A3B8, true);
        cTxt.anchor.set(0.5);
        cTxt.x = 15; cTxt.y = 15;
        closeB.addChild(cTxt);
        closeB.on('pointerdown', () => this.hide());
        modal.addChild(closeB);

        const titBox = new Container();
        const tIc = createNarutoIcon('team', 26);
        tIc.x = -240; tIc.y = 12;
        const tit = textLabel('FORMAZIONE SQUADRA SHINOBI (TEAM & COMPAGNO)', 20, 0x06B6D4, true);
        tit.anchor.set(0.5, 0);
        titBox.addChild(tIc, tit);
        titBox.x = MODAL_W / 2; titBox.y = 20;
        modal.addChild(titBox);

        const s = textLabel('Scegli il tuo Compagno di Squadra: combatterà al tuo fianco nell\'arena sferrando tecniche e potenziando le tue statistiche!', 12, 0x94A3B8);
        s.anchor.set(0.5, 0);
        s.x = MODAL_W / 2; s.y = 48;
        modal.addChild(s);

        this.renderTeamDisplay(modal, MODAL_W, MODAL_H);
      };

      card.on('pointerdown', onSelectCard);
      this.rosterGrid.addChild(card);
      navItems.push({ container: card, onSelect: onSelectCard });
    });

    // Confirm & Done Button
    const okBtn = new Container();
    okBtn.eventMode = 'static';
    okBtn.cursor = 'pointer';
    okBtn.x = MODAL_W / 2 - 120;
    okBtn.y = MODAL_H - 60;
    const okBg = new Graphics();
    okBg.roundRect(0, 0, 240, 42, 10);
    okBg.fill({ color: 0x0284C7 });
    okBg.stroke({ color: 0x38BDF8, width: 1.5 });
    okBtn.addChild(okBg);
    const okTxt = textLabel('✓ CONFERMA FORMAZIONE', 13, 0xFFFFFF, true);
    okTxt.anchor.set(0.5);
    okTxt.x = 120; okTxt.y = 21;
    okBtn.addChild(okTxt);
    const onConfirm = () => {
      audioManager.playSFX('button_click');
      this.hide();
      this.onCloseCallback?.();
    };
    okBtn.on('pointerdown', onConfirm);
    modal.addChild(okBtn);

    navItems.push({ container: okBtn, onSelect: onConfirm });

    GamepadMenuNavigator.get()?.pushContext({
      id: 'team_modal',
      items: navItems,
      selectedIndex: 0,
      columns: 4,
      onCancel: () => this.hide(),
    });
  }

  hide(): void {
    GamepadMenuNavigator.get()?.popContext('team_modal');
    this.container.visible = false;
  }
}
