import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { audioManager } from '../systems/audioManager';

// ============================================================
//  NarutoSurvivor — Settings Modal
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

export class SettingsModal {
  readonly container: Container;
  private readonly W: number;
  private readonly H: number;
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
    const modalW = 700;
    const modalH = 480;
    const modalX = (W - modalW) / 2;
    const modalY = (H - modalH) / 2;

    const modalBg = new Graphics();
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.fill({ color: 0x111827 });
    modalBg.roundRect(modalX, modalY, modalW, modalH, 16);
    modalBg.stroke({ color: 0x38BDF8, width: 2, alpha: 0.6 });
    this.container.addChild(modalBg);

    // Header
    const title = makeText('⚙  IMPOSTAZIONI (SETTINGS)', 24, 0x38BDF8, true);
    title.anchor.set(0.5, 0);
    title.x = W / 2;
    title.y = modalY + 24;
    this.container.addChild(title);

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

    // Settings Items
    const startY = modalY + 80;

    // 1. Controls
    const ctrlTitle = makeText('🎮 Comandi di Gioco', 16, 0xFBBF24, true);
    ctrlTitle.x = modalX + 40; ctrlTitle.y = startY;
    this.container.addChild(ctrlTitle);

    const ctrlDesc = makeText('• WASD oppure Frecce Direzionali per muoversi\n• Attacchi automatici e sinergie jutsu continue\n• Tasto [ P ] per mettere in Pausa\n• Tasto [ R ] per ricominciare a fine partita\n• Tasto [ M ] per tornare al Menu Principale', 13, 0xD1D5DB);
    ctrlDesc.x = modalX + 40; ctrlDesc.y = startY + 28;
    this.container.addChild(ctrlDesc);

    // 2. Audio
    const audioTitle = makeText('🔊 Audio & Effetti Sonori', 16, 0xFBBF24, true);
    audioTitle.x = modalX + 40; audioTitle.y = startY + 145;
    this.container.addChild(audioTitle);

    const muteBtn = new Container();
    muteBtn.eventMode = 'static';
    muteBtn.cursor = 'pointer';
    muteBtn.x = modalX + 40; muteBtn.y = startY + 175;
    const muteBg = new Graphics();
    muteBg.roundRect(0, 0, 180, 36, 8);
    muteBg.fill({ color: 0x2563EB });
    muteBtn.addChild(muteBg);
    const muteTxt = makeText('ATTIVA / DISATTIVA AUDIO', 11, 0xFFFFFF, true);
    muteTxt.anchor.set(0.5);
    muteTxt.x = 90; muteTxt.y = 18;
    muteBtn.addChild(muteTxt);
    muteBtn.on('pointerdown', () => {
      audioManager.toggle();
      audioManager.playSFX('button_click');
    });
    this.container.addChild(muteBtn);

    // 3. Fullscreen
    const fsBtn = new Container();
    fsBtn.eventMode = 'static';
    fsBtn.cursor = 'pointer';
    fsBtn.x = modalX + 240; fsBtn.y = startY + 175;
    const fsBg = new Graphics();
    fsBg.roundRect(0, 0, 180, 36, 8);
    fsBg.fill({ color: 0x475569 });
    fsBtn.addChild(fsBg);
    const fsTxt = makeText('SCHERMO INTERO (⛶)', 11, 0xFFFFFF, true);
    fsTxt.anchor.set(0.5);
    fsTxt.x = 90; fsTxt.y = 18;
    fsBtn.addChild(fsTxt);
    fsBtn.on('pointerdown', () => {
      audioManager.playSFX('button_click');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
    this.container.addChild(fsBtn);

    // 4. Save data info
    const dataTitle = makeText('💾 Dati e Salvataggi Locali', 16, 0xFBBF24, true);
    dataTitle.x = modalX + 40; dataTitle.y = startY + 235;
    this.container.addChild(dataTitle);

    const dataDesc = makeText('Il profilo, i ninja sbloccati, i frammenti e i Ryo sono sincronizzati automaticamente su localStorage.', 13, 0x9CA3AF);
    dataDesc.x = modalX + 40; dataDesc.y = startY + 265;
    this.container.addChild(dataDesc);
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
    if (this.onCloseCallback) this.onCloseCallback();
  }
}
