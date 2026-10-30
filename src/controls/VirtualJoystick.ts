import { Application, Container, Graphics } from 'pixi.js';
import type { InputHandler } from './InputHandler';

// ============================================================
//  NarutoSurvivor — Virtual Joystick (Touch / On-Screen)
//  Renders two zones:
//    LEFT  half → movement stick
//    RIGHT half → future: action buttons (pause, fragment)
// ============================================================

const BASE_RADIUS  = 52;   // outer ring radius
const KNOB_RADIUS  = 24;   // movable knob radius
const MAX_DIST     = 48;   // max knob displacement from centre
const BASE_ALPHA   = 0.30;
const ACTIVE_ALPHA = 0.65;

export class VirtualJoystick {
  private readonly app: Application;
  private readonly handler: InputHandler;

  // ── Containers ──────────────────────────────────────────
  private readonly root: Container;
  private readonly base: Graphics;
  private readonly knob: Graphics;
  private readonly btnPause: Container;
  private readonly btnPauseRing: Graphics;

  // ── State ───────────────────────────────────────────────
  private startX = 0;
  private startY = 0;
  private touchId: number | null = null;

  // Reference to external pause/promotion callbacks
  onPause?:     () => void;
  onPromotion?: () => void;

  constructor(app: Application, handler: InputHandler) {
    this.app     = app;
    this.handler = handler;

    this.root = new Container();
    this.root.eventMode = 'static';

    // ── Base ring ─────────────────────────────────────────
    this.base = new Graphics();
    this.drawBase(false);

    // ── Knob ──────────────────────────────────────────────
    this.knob = new Graphics();
    this.drawKnob(false);

    this.root.addChild(this.base);
    this.root.addChild(this.knob);

    // ── Pause button (top-right of joystick zone) ─────────
    this.btnPauseRing = new Graphics();
    this.btnPause = new Container();
    this.btnPause.eventMode = 'static';
    this.btnPause.cursor = 'pointer';
    this.buildPauseButton();
    this.root.addChild(this.btnPause);

    // ── Mount & Position ──────────────────────────────────
    this.reposition();
    app.stage.addChild(this.root);

    // ── Touch events on canvas ────────────────────────────
    this.setupTouchEvents();

    // ── Handle resize ─────────────────────────────────────
    window.addEventListener('resize', () => this.reposition());
  }

  // ── Layout ──────────────────────────────────────────────

  private get W(): number { return this.app.screen.width;  }
  private get H(): number { return this.app.screen.height; }

  /** Joystick centre anchor (bottom-left quadrant) */
  private get joyX(): number { return BASE_RADIUS + 28; }
  private get joyY(): number { return this.H - BASE_RADIUS - 28; }

  private reposition(): void {
    this.base.x = this.joyX;
    this.base.y = this.joyY;
    this.knob.x = this.joyX;
    this.knob.y = this.joyY;

    // Pause button: bottom-right
    this.btnPause.x = this.W - 68;
    this.btnPause.y = this.H - 68;
  }

  // ── Drawing ─────────────────────────────────────────────

  private drawBase(active: boolean): void {
    this.base.clear();
    this.base.circle(0, 0, BASE_RADIUS);
    this.base.fill({ color: 0xffffff, alpha: active ? ACTIVE_ALPHA : BASE_ALPHA });
    this.base.circle(0, 0, BASE_RADIUS);
    this.base.stroke({ color: 0xffffff, width: 2, alpha: active ? 0.9 : 0.45 });
  }

  private drawKnob(active: boolean): void {
    this.knob.clear();
    this.knob.circle(0, 0, KNOB_RADIUS);
    this.knob.fill({ color: 0xF97316, alpha: active ? 0.90 : 0.55 });
  }

  private buildPauseButton(): void {
    this.btnPause.removeChildren();
    this.btnPauseRing.clear();
    this.btnPauseRing.circle(0, 0, 26);
    this.btnPauseRing.fill({ color: 0x1e293b, alpha: 0.75 });
    this.btnPauseRing.circle(0, 0, 26);
    this.btnPauseRing.stroke({ color: 0xF97316, width: 2, alpha: 0.8 });

    const barL = new Graphics();
    barL.rect(-8, -10, 5, 20);
    barL.fill({ color: 0xffffff, alpha: 0.85 });

    const barR = new Graphics();
    barR.rect(3, -10, 5, 20);
    barR.fill({ color: 0xffffff, alpha: 0.85 });

    this.btnPause.addChild(this.btnPauseRing);
    this.btnPause.addChild(barL);
    this.btnPause.addChild(barR);

    this.btnPause.on('pointertap', () => this.onPause?.());
    this.btnPause.on('pointerover', () => {
      this.btnPauseRing.clear();
      this.btnPauseRing.circle(0, 0, 26);
      this.btnPauseRing.fill({ color: 0xF97316, alpha: 0.55 });
    });
    this.btnPause.on('pointerout', () => {
      this.btnPauseRing.clear();
      this.btnPauseRing.circle(0, 0, 26);
      this.btnPauseRing.fill({ color: 0x1e293b, alpha: 0.75 });
      this.btnPauseRing.stroke({ color: 0xF97316, width: 2, alpha: 0.8 });
    });
  }

  // ── Touch handling ───────────────────────────────────────

  private setupTouchEvents(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        // Only capture left-half touches for joystick
        if (touch.clientX < this.W / 2 && this.touchId === null) {
          this.touchId = touch.identifier;
          this.startX  = touch.clientX;
          this.startY  = touch.clientY;
          this.base.x  = this.startX;
          this.base.y  = this.startY;
          this.knob.x  = this.startX;
          this.knob.y  = this.startY;
          this.drawBase(true);
          this.drawKnob(true);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== this.touchId) continue;
        const dx = touch.clientX - this.startX;
        const dy = touch.clientY - this.startY;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, MAX_DIST);
        const angle = Math.atan2(dy, dx);
        const kx = this.startX + Math.cos(angle) * clamped;
        const ky = this.startY + Math.sin(angle) * clamped;

        this.knob.x = kx;
        this.knob.y = ky;

        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        const strength = Math.min(dist / MAX_DIST, 1.0);
        this.handler.setTouchVec(nx * strength, ny * strength);
      }
    }, { passive: false });

    const endTouch = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== this.touchId) continue;
        this.touchId = null;
        this.handler.setTouchVec(0, 0);
        // Reset to default anchor
        this.base.x = this.joyX;
        this.base.y = this.joyY;
        this.knob.x = this.joyX;
        this.knob.y = this.joyY;
        this.drawBase(false);
        this.drawKnob(false);
      }
    };

    canvas.addEventListener('touchend',    endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
  }

  // ── Visibility ───────────────────────────────────────────

  show(): void { this.root.visible = true;  }
  hide(): void { this.root.visible = false; }

  get isVisible(): boolean { return this.root.visible; }
}
