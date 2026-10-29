import { Container, Graphics, Text, TextStyle } from 'pixi.js';

// ============================================================
//  NarutoSurvivor — Generic Themed Info Modal
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

export interface InfoModalContent {
  title: string;
  subtitle: string;
  color: number;
  items: Array<{ title: string; desc: string; extra?: string; icon?: string }>;
}

export class GenericInfoModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
  private titleText!: Text;
  private subtitleText!: Text;
  private itemsContainer!: Container;
  private modalBg!: Graphics;

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

    // Modal
    const modalW = 820;
    const modalH = 540;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    this.modalBg = new Graphics();
    this.modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    this.modalBg.fill({ color: 0x111827 });
    this.modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    this.modalBg.stroke({ color: 0x38BDF8, width: 2, alpha: 0.6 });
    this.container.addChild(this.modalBg);

    this.titleText = makeText('', 22, 0xFBBF24, true);
    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = W / 2;
    this.titleText.y = modalY + 22;
    this.container.addChild(this.titleText);

    this.subtitleText = makeText('', 13, 0x94A3B8);
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.x = W / 2;
    this.subtitleText.y = modalY + 54;
    this.container.addChild(this.subtitleText);

    // Close button
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

    // Items list
    this.itemsContainer = new Container();
    this.itemsContainer.x = modalX + 36;
    this.itemsContainer.y = modalY + 95;
    this.container.addChild(this.itemsContainer);
  }

  show(content: InfoModalContent): void {
    this.titleText.text = content.title;
    this.titleText.style.fill = content.color;
    this.subtitleText.text = content.subtitle;

    this.itemsContainer.removeChildren();
    content.items.forEach((item, i) => {
      const row = new Container();
      row.y = i * 78;

      const bg = new Graphics();
      bg.roundRect(0, 0, 748, 66, 10);
      bg.fill({ color: 0x1F2937 });
      bg.roundRect(0, 0, 748, 66, 10);
      bg.stroke({ color: 0x374151, width: 1 });
      row.addChild(bg);

      if (item.icon) {
        const ic = makeText(item.icon, 22, 0xFFFFFF);
        ic.x = 18; ic.y = 14;
        row.addChild(ic);
      }

      const t = makeText(item.title, 14, 0xFFFFFF, true);
      t.x = item.icon ? 56 : 20;
      t.y = 14;
      row.addChild(t);

      const d = makeText(item.desc, 12, 0x9CA3AF);
      d.x = item.icon ? 56 : 20;
      d.y = 36;
      row.addChild(d);

      if (item.extra) {
        const e = makeText(item.extra, 12, content.color, true);
        e.anchor.set(1, 0.5);
        e.x = 728;
        e.y = 33;
        row.addChild(e);
      }

      this.itemsContainer.addChild(row);
    });

    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }
}
