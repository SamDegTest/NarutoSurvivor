// ============================================================
//  NarutoSurvivor — Global Gamepad & Joystick Menu Navigator
//  Enables 100% full gamepad/joystick navigation across all menus,
//  modals, character select, shop, upgrade tree, and level-up choices.
// ============================================================

import { Container, Graphics, Application } from 'pixi.js';
import { audioManager } from '../systems/audioManager';

export interface NavigatableItem {
  container: Container;
  onSelect: () => void;
  onBack?: () => void;
}

export interface NavContext {
  id: string;
  items: NavigatableItem[];
  columns?: number;
  selectedIndex: number;
  onCancel?: () => void;
  onTabPrev?: () => void;
  onTabNext?: () => void;
}

export class GamepadMenuNavigator {
  private static instance?: GamepadMenuNavigator;
  private readonly app: Application;
  private readonly focusRingLayer: Container;
  private readonly focusGlow: Graphics;

  private currentContext: NavContext | null = null;
  private contextStack: NavContext[] = [];

  // Polling & Debounce state
  private lastNavTime = 0;
  private navCooldownMs = 180; // ms between dpad / stick moves
  private prevButtonStates: boolean[] = [];

  constructor(app: Application) {
    this.app = app;
    this.focusRingLayer = new Container();
    this.focusGlow = new Graphics();
    this.focusRingLayer.addChild(this.focusGlow);
    this.focusRingLayer.visible = false;
    app.stage.addChild(this.focusRingLayer);

    GamepadMenuNavigator.instance = this;

    // Add tick listener to app ticker for frame-accurate gamepad polling
    this.app.ticker.add(this.pollGamepad, this);
  }

  static get(): GamepadMenuNavigator | undefined {
    return this.instance;
  }

  /** Push a new navigation context (e.g. opened a modal) */
  pushContext(context: NavContext): void {
    if (this.currentContext) {
      this.contextStack.push(this.currentContext);
    }
    this.setContext(context);
  }

  /** Pop the current context (e.g. closed a modal) */
  popContext(id?: string): void {
    if (id && this.currentContext && this.currentContext.id !== id) {
      // not current context, remove from stack if present
      this.contextStack = this.contextStack.filter(c => c.id !== id);
      return;
    }

    if (this.contextStack.length > 0) {
      const prev = this.contextStack.pop()!;
      this.setContext(prev);
    } else {
      this.currentContext = null;
      this.focusRingLayer.visible = false;
    }
  }

  setContext(context: NavContext): void {
    this.currentContext = context;
    if (this.currentContext.items.length > 0) {
      this.currentContext.selectedIndex = Math.min(
        this.currentContext.selectedIndex,
        this.currentContext.items.length - 1,
      );
      this.focusRingLayer.visible = true;
      this.updateFocusGlow();
    } else {
      this.focusRingLayer.visible = false;
    }
  }

  updateItems(items: NavigatableItem[]): void {
    if (!this.currentContext) return;
    this.currentContext.items = items;
    if (items.length > 0) {
      this.currentContext.selectedIndex = Math.min(this.currentContext.selectedIndex, items.length - 1);
      this.focusRingLayer.visible = true;
      this.updateFocusGlow();
    } else {
      this.focusRingLayer.visible = false;
    }
  }

  clearContext(): void {
    this.currentContext = null;
    this.contextStack = [];
    this.focusRingLayer.visible = false;
  }

  private pollGamepad = (): void => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) {
      if (p && p.connected) { pad = p; break; }
    }
    if (!pad || !this.currentContext || this.currentContext.items.length === 0) return;

    const now = performance.now();
    const ctx = this.currentContext;

    // ── Analog Stick & D-Pad axes ────────────────────────────
    const DEADZONE = 0.40;
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;

    // D-Pad buttons: 12=Up, 13=Down, 14=Left, 15=Right
    const dUp    = pad.buttons[12]?.pressed || axisY < -DEADZONE;
    const dDown  = pad.buttons[13]?.pressed || axisY > DEADZONE;
    const dLeft  = pad.buttons[14]?.pressed || axisX < -DEADZONE;
    const dRight = pad.buttons[15]?.pressed || axisX > DEADZONE;

    const cols = ctx.columns || 1;

    if (now - this.lastNavTime > this.navCooldownMs) {
      let moved = false;
      const count = ctx.items.length;

      if (dUp) {
        if (ctx.selectedIndex - cols >= 0) {
          ctx.selectedIndex -= cols;
          moved = true;
        }
      } else if (dDown) {
        if (ctx.selectedIndex + cols < count) {
          ctx.selectedIndex += cols;
          moved = true;
        }
      } else if (dLeft) {
        if (cols > 1 && ctx.selectedIndex % cols > 0) {
          ctx.selectedIndex -= 1;
          moved = true;
        } else if (ctx.onTabPrev) {
          ctx.onTabPrev();
          moved = true;
        }
      } else if (dRight) {
        if (cols > 1 && ctx.selectedIndex % cols < cols - 1 && ctx.selectedIndex + 1 < count) {
          ctx.selectedIndex += 1;
          moved = true;
        } else if (ctx.onTabNext) {
          ctx.onTabNext();
          moved = true;
        }
      }

      if (moved) {
        this.lastNavTime = now;
        audioManager.playSFX('button_click');
        this.updateFocusGlow();
      }
    }

    // ── Action Buttons ───────────────────────────────────────
    // Button 0 (A / Cross): Select
    const btnA = pad.buttons[0]?.pressed ?? false;
    if (btnA && !this.prevButtonStates[0]) {
      const item = ctx.items[ctx.selectedIndex];
      if (item) {
        audioManager.playSFX('button_click');
        item.onSelect();
      }
    }
    this.prevButtonStates[0] = btnA;

    // Button 1 (B / Circle): Cancel / Back
    const btnB = pad.buttons[1]?.pressed ?? false;
    if (btnB && !this.prevButtonStates[1]) {
      if (ctx.onCancel) {
        audioManager.playSFX('button_click');
        ctx.onCancel();
      }
    }
    this.prevButtonStates[1] = btnB;

    // Bumpers: L1 (Button 4) / R1 (Button 5) for Tab navigation
    const btnL1 = pad.buttons[4]?.pressed ?? false;
    if (btnL1 && !this.prevButtonStates[4]) {
      if (ctx.onTabPrev) {
        audioManager.playSFX('button_click');
        ctx.onTabPrev();
      }
    }
    this.prevButtonStates[4] = btnL1;

    const btnR1 = pad.buttons[5]?.pressed ?? false;
    if (btnR1 && !this.prevButtonStates[5]) {
      if (ctx.onTabNext) {
        audioManager.playSFX('button_click');
        ctx.onTabNext();
      }
    }
    this.prevButtonStates[5] = btnR1;
  };

  private updateFocusGlow(): void {
    if (!this.currentContext || this.currentContext.items.length === 0) {
      this.focusRingLayer.visible = false;
      return;
    }

    const item = this.currentContext.items[this.currentContext.selectedIndex];
    if (!item || !item.container || !item.container.visible) {
      this.focusRingLayer.visible = false;
      return;
    }

    // Get bounds in stage coordinate space
    const bounds = item.container.getBounds();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    this.focusGlow.clear();

    // Outer golden pulsing halo
    this.focusGlow.roundRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8, 12);
    this.focusGlow.stroke({ color: 0xFBBF24, width: 3, alpha: 0.95 });

    // Inner subtle glow
    this.focusGlow.roundRect(bounds.x - 7, bounds.y - 7, bounds.width + 14, bounds.height + 14, 15);
    this.focusGlow.stroke({ color: 0xF59E0B, width: 1.5, alpha: 0.45 });

    this.focusRingLayer.visible = true;
  }
}
