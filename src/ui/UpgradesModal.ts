import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';

// ============================================================
//  NarutoSurvivor — Permanent Upgrades Modal (Albero Talenti)
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

export class UpgradesModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private listContainer!: Container;
  private ryoText!: Text;
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

    // Backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H);
    backdrop.fill({ color: 0x05070A, alpha: 0.92 });
    backdrop.eventMode = 'static';
    backdrop.on('pointerdown', () => this.hide());
    this.container.addChild(backdrop);

    // Modal box
    const modalW = 860;
    const modalH = 560;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.fill({ color: 0x111827 });
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.stroke({ color: 0x10B981, width: 2, alpha: 0.6 });
    this.container.addChild(modalBg);

    // Header
    const title = makeText('⬆  TALENTI NINJA PERMANENTI (UPGRADES)', 24, 0x10B981, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 22;
    this.container.addChild(title);

    const sub = makeText('Potenzia in modo permanente le statistiche di base di tutti i tuoi shinobi usando i Ryo', 13, 0x9CA3AF);
    sub.anchor.set(0.5, 0);
    sub.x = W / 2;
    sub.y = modalY + 56;
    this.container.addChild(sub);

    this.ryoText = makeText('', 14, 0xFBBF24, true);
    this.ryoText.anchor.set(0.5, 0);
    this.ryoText.x = W / 2;
    this.ryoText.y = modalY + 80;
    this.container.addChild(this.ryoText);

    // Close Button
    const closeBtn = new Container();
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.x = modalX + modalW - 48;
    closeBtn.y = modalY + 18;
    const closeBg = new Graphics();
    closeBg.roundRect(0, 0, 32, 32, 6);
    closeBg.fill({ color: 0x374151 });
    closeBtn.addChild(closeBg);
    const closeTxt = makeText('✕', 16, 0xFFFFFF, true);
    closeTxt.anchor.set(0.5);
    closeTxt.x = 16; closeTxt.y = 16;
    closeBtn.addChild(closeTxt);
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    this.container.addChild(closeBtn);

    // Upgrades List
    this.listContainer = new Container();
    this.listContainer.x = modalX + 40;
    this.listContainer.y = modalY + 120;
    this.container.addChild(this.listContainer);

    this.renderUpgrades();
  }

  private renderUpgrades(): void {
    this.listContainer.removeChildren();
    const profile = SaveSystem.getProfile();
    this.ryoText.text = `💰 Ryo Disponibili: ¥ ${profile.ryo.toLocaleString()}`;

    const UPGRADE_DATA = [
      {
        key: 'hpLevel' as const,
        name: 'Forza Vitale Uzumaki (HP)',
        desc: '+10% Punti Vita massimi a ogni partita',
        icon: '❤️',
        baseCost: 250,
      },
      {
        key: 'dmgLevel' as const,
        name: 'Controllo del Chakra (Danno Jutsu)',
        desc: '+8% Danno di tutti i Jutsu ed elementi',
        icon: '⚡',
        baseCost: 350,
      },
      {
        key: 'speedLevel' as const,
        name: 'Passo Istantaneo Shunshin (Velocità)',
        desc: '+5% Velocità di movimento',
        icon: '👟',
        baseCost: 300,
      },
      {
        key: 'ryoLevel' as const,
        name: 'Negoziazione delle Missioni (Ryo ×)',
        desc: '+12% Ryo guadagnati sconfiggendo i nemici',
        icon: '🪙',
        baseCost: 400,
      },
    ];

    UPGRADE_DATA.forEach((upg, i) => {
      const curLevel = profile.upgrades[upg.key] || 0;
      const cost = Math.round(upg.baseCost * Math.pow(1.5, curLevel));
      const canAfford = profile.ryo >= cost;

      const row = new Container();
      row.y = i * 92;

      const bg = new Graphics();
      bg.roundRect(0, 0, 780, 78, 12);
      bg.fill({ color: 0x1F2937 });
      bg.roundRect(0, 0, 780, 78, 12);
      bg.stroke({ color: 0x374151, width: 1.5 });
      row.addChild(bg);

      // Icon & Name
      const icon = makeText(upg.icon, 24, 0xFFFFFF);
      icon.x = 20; icon.y = 16;
      row.addChild(icon);

      const title = makeText(`${upg.name}  (Lv. ${curLevel})`, 15, 0xFFFFFF, true);
      title.x = 64; title.y = 16;
      row.addChild(title);

      const desc = makeText(upg.desc, 12, 0x9CA3AF);
      desc.x = 64; desc.y = 42;
      row.addChild(desc);

      // Upgrade Button
      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor = canAfford ? 'pointer' : 'default';
      btn.x = 620; btn.y = 18;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, 140, 42, 8);
      btnBg.fill({ color: canAfford ? 0x10B981 : 0x374151 });
      btn.addChild(btnBg);

      const btnLabel = makeText(`MIGLIORA\n¥ ${cost}`, 11, canAfford ? 0xFFFFFF : 0x9CA3AF, true);
      btnLabel.anchor.set(0.5);
      btnLabel.x = 70; btnLabel.y = 21;
      btn.addChild(btnLabel);

      btn.on('pointerdown', () => {
        if (canAfford) {
          SaveSystem.buyUpgrade(upg.key, cost);
          audioManager.playSFX('promotion');
          this.renderUpgrades();
        }
      });

      row.addChild(btn);
      this.listContainer.addChild(row);
    });
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.renderUpgrades();
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
