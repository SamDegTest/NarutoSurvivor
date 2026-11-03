// ============================================================
//  NarutoSurvivor — Global Gamepad & Joystick Menu Navigator
//  Enables 100% full gamepad/joystick navigation across all menus,
//  modals, character select, stage select, squad, shop, upgrade tree,
//  level-up panels, pause overlay, and DOM modal overlays.
// ============================================================

import { Container, Graphics, Application } from 'pixi.js';
import { audioManager } from '../systems/audioManager';

export interface NavigatableItem {
  container: Container;
  onSelect: () => void;
  onBack?: () => void;
  upIndex?: number;
  downIndex?: number;
  leftIndex?: number;
  rightIndex?: number;
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

  // DOM modal navigation tracking
  private domFocusIndex = 0;
  private lastDomModal: HTMLElement | null = null;
  private prevHighlightedDomEl: HTMLElement | null = null;

  // Polling & Debounce state
  private lastNavTime = 0;
  private navCooldownMs = 170; // ms between dpad / stick moves
  private prevButtonStates: boolean[] = [];

  // Pulse animation state
  private pulsePhase = 0;

  constructor(app: Application) {
    this.app = app;
    this.focusRingLayer = new Container();
    this.focusRingLayer.eventMode = 'none';
    this.focusGlow = new Graphics();
    this.focusRingLayer.addChild(this.focusGlow);
    this.focusRingLayer.visible = false;
    app.stage.addChild(this.focusRingLayer);

    GamepadMenuNavigator.instance = this;

    // Add tick listener to app ticker for frame-accurate gamepad polling
    this.app.ticker.add(this.pollLoop, this);

    // Keyboard navigation fallback (Arrow keys, Enter, Space, Escape, Q/E)
    window.addEventListener('keydown', this.handleKeyDown);
  }

  static get(): GamepadMenuNavigator | undefined {
    return this.instance;
  }

  /** Push a new navigation context (e.g. opened a modal) */
  pushContext(context: NavContext): void {
    if (this.currentContext && this.currentContext.id !== context.id) {
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
        Math.max(0, this.currentContext.selectedIndex),
        this.currentContext.items.length - 1,
      );
      this.focusRingLayer.visible = true;
      this.bringRingToFront();
      this.updateFocusGlow();
    } else {
      this.focusRingLayer.visible = false;
    }
  }

  updateItems(items: NavigatableItem[]): void {
    if (!this.currentContext) return;
    this.currentContext.items = items;
    if (items.length > 0) {
      this.currentContext.selectedIndex = Math.min(
        Math.max(0, this.currentContext.selectedIndex),
        items.length - 1,
      );
      this.focusRingLayer.visible = true;
      this.bringRingToFront();
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

  public getContextId(): string | undefined {
    return this.currentContext?.id;
  }

  private bringRingToFront(): void {
    if (this.focusRingLayer.parent !== this.app.stage) {
      this.app.stage.addChild(this.focusRingLayer);
    } else {
      const lastIdx = this.app.stage.children.length - 1;
      if (this.app.stage.getChildIndex(this.focusRingLayer) !== lastIdx) {
        this.app.stage.setChildIndex(this.focusRingLayer, lastIdx);
      }
    }
  }

  // ── Frame Ticker Loop ─────────────────────────────────────

  private pollLoop = (ticker: { deltaTime: number }): void => {
    this.pulsePhase += (ticker.deltaTime || 1) * 0.08;

    // Check if an HTML DOM modal overlay is currently open
    const domModal = this.getActiveDomModal();
    if (domModal) {
      this.focusRingLayer.visible = false;
      this.pollDomModalGamepad(domModal);
      return;
    } else if (this.prevHighlightedDomEl) {
      this.clearDomHighlight();
    }

    // Otherwise navigate PixiJS canvas contexts
    if (this.currentContext && this.currentContext.items.length > 0) {
      this.bringRingToFront();
      this.updateFocusGlow();
      this.pollPixiGamepad();
    } else {
      this.focusRingLayer.visible = false;
    }
  };

  // ── DOM Modal Overlays Navigation (Multiplayer, Bingo Book) ──

  private getActiveDomModal(): HTMLElement | null {
    const ids = ['multiplayer-modal-overlay', 'bingo-book-modal'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && window.getComputedStyle(el).display !== 'none') {
        return el;
      }
    }
    return null;
  }

  private getFocusableDomElements(modal: HTMLElement): HTMLElement[] {
    const selector = 'button, input, select, [role="button"], a[href]';
    return Array.from(modal.querySelectorAll<HTMLElement>(selector))
      .filter(el => {
        if (el.hasAttribute('disabled')) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
      });
  }

  private pollDomModalGamepad(modal: HTMLElement): void {
    if (this.lastDomModal !== modal) {
      this.lastDomModal = modal;
      this.domFocusIndex = 0;
    }

    const items = this.getFocusableDomElements(modal);
    if (items.length === 0) return;

    if (this.domFocusIndex >= items.length) {
      this.domFocusIndex = 0;
    }

    this.highlightDomElement(items[this.domFocusIndex]);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) {
      if (p && p.connected) { pad = p; break; }
    }
    if (!pad) return;

    const now = performance.now();
    const DEADZONE = 0.40;
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;

    const dUp    = pad.buttons[12]?.pressed || axisY < -DEADZONE;
    const dDown  = pad.buttons[13]?.pressed || axisY > DEADZONE;
    const dLeft  = pad.buttons[14]?.pressed || axisX < -DEADZONE;
    const dRight = pad.buttons[15]?.pressed || axisX > DEADZONE;

    if (now - this.lastNavTime > this.navCooldownMs) {
      let moved = false;
      if (dUp || dLeft) {
        this.domFocusIndex = (this.domFocusIndex - 1 + items.length) % items.length;
        moved = true;
      } else if (dDown || dRight) {
        this.domFocusIndex = (this.domFocusIndex + 1) % items.length;
        moved = true;
      }

      if (moved) {
        this.lastNavTime = now;
        audioManager.playSFX('button_click');
        this.highlightDomElement(items[this.domFocusIndex]);
      }
    }

    // Action A (Button 0): Click
    const btnA = pad.buttons[0]?.pressed ?? false;
    if (btnA && !this.prevButtonStates[0]) {
      audioManager.playSFX('button_click');
      const cur = items[this.domFocusIndex];
      if (cur) {
        cur.click();
        cur.focus();
      }
    }
    this.prevButtonStates[0] = btnA;

    // Cancel B (Button 1): Close Modal
    const btnB = pad.buttons[1]?.pressed ?? false;
    if (btnB && !this.prevButtonStates[1]) {
      audioManager.playSFX('button_click');
      const closeBtn = modal.querySelector<HTMLElement>('button[id*="close"], button[class*="close"], [data-close], button:has(span:contains("✕"))');
      if (closeBtn) {
        closeBtn.click();
      } else {
        // Dispatch Escape
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      }
    }
    this.prevButtonStates[1] = btnB;

    // Bumpers L1/R1: Cycle tabs
    const btnL1 = pad.buttons[4]?.pressed ?? false;
    const btnR1 = pad.buttons[5]?.pressed ?? false;
    if ((btnL1 && !this.prevButtonStates[4]) || (btnR1 && !this.prevButtonStates[5])) {
      const tabButtons = items.filter(el => el.classList.contains('tab-btn') || el.dataset.tab !== undefined);
      if (tabButtons.length > 1) {
        const curTabIdx = tabButtons.indexOf(items[this.domFocusIndex]);
        const delta = btnR1 ? 1 : -1;
        const nextTabIdx = (Math.max(0, curTabIdx) + delta + tabButtons.length) % tabButtons.length;
        tabButtons[nextTabIdx].click();
        this.domFocusIndex = items.indexOf(tabButtons[nextTabIdx]);
        audioManager.playSFX('button_click');
      }
    }
    this.prevButtonStates[4] = btnL1;
    this.prevButtonStates[5] = btnR1;
  }

  private highlightDomElement(el: HTMLElement): void {
    if (this.prevHighlightedDomEl && this.prevHighlightedDomEl !== el) {
      this.clearDomHighlight();
    }
    this.prevHighlightedDomEl = el;
    el.style.outline = '3px solid #FBBF24';
    el.style.outlineOffset = '2px';
    el.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.85)';
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  private clearDomHighlight(): void {
    if (this.prevHighlightedDomEl) {
      this.prevHighlightedDomEl.style.outline = '';
      this.prevHighlightedDomEl.style.outlineOffset = '';
      this.prevHighlightedDomEl.style.boxShadow = '';
      this.prevHighlightedDomEl = null;
    }
  }

  // ── PixiJS Canvas Context Gamepad Polling ──────────────────

  private pollPixiGamepad(): void {
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

    if (now - this.lastNavTime > this.navCooldownMs) {
      let moved = false;
      const curItem = ctx.items[ctx.selectedIndex];

      if (dUp) {
        if (curItem?.upIndex !== undefined) {
          ctx.selectedIndex = curItem.upIndex;
          moved = true;
        } else {
          const cols = ctx.columns || 1;
          if (ctx.selectedIndex - cols >= 0) {
            ctx.selectedIndex -= cols;
            moved = true;
          }
        }
      } else if (dDown) {
        if (curItem?.downIndex !== undefined) {
          ctx.selectedIndex = curItem.downIndex;
          moved = true;
        } else {
          const cols = ctx.columns || 1;
          if (ctx.selectedIndex + cols < ctx.items.length) {
            ctx.selectedIndex += cols;
            moved = true;
          }
        }
      } else if (dLeft) {
        if (curItem?.leftIndex !== undefined) {
          ctx.selectedIndex = curItem.leftIndex;
          moved = true;
        } else {
          const cols = ctx.columns || 1;
          if (cols > 1 && ctx.selectedIndex % cols > 0) {
            ctx.selectedIndex -= 1;
            moved = true;
          } else if (ctx.onTabPrev) {
            ctx.onTabPrev();
            moved = true;
          }
        }
      } else if (dRight) {
        if (curItem?.rightIndex !== undefined) {
          ctx.selectedIndex = curItem.rightIndex;
          moved = true;
        } else {
          const cols = ctx.columns || 1;
          if (cols > 1 && ctx.selectedIndex % cols < cols - 1 && ctx.selectedIndex + 1 < ctx.items.length) {
            ctx.selectedIndex += 1;
            moved = true;
          } else if (ctx.onTabNext) {
            ctx.onTabNext();
            moved = true;
          }
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
  }

  // ── Keyboard Fallback Handler ─────────────────────────────

  private handleKeyDown = (e: KeyboardEvent): void => {
    // If typing in an HTML text input, don't hijack keys
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
    ) {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
      } else {
        return;
      }
    }

    const domModal = this.getActiveDomModal();
    if (domModal) {
      const items = this.getFocusableDomElements(domModal);
      if (items.length === 0) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.domFocusIndex = (this.domFocusIndex - 1 + items.length) % items.length;
        audioManager.playSFX('button_click');
        this.highlightDomElement(items[this.domFocusIndex]);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.domFocusIndex = (this.domFocusIndex + 1) % items.length;
        audioManager.playSFX('button_click');
        this.highlightDomElement(items[this.domFocusIndex]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audioManager.playSFX('button_click');
        items[this.domFocusIndex]?.click();
      }
      return;
    }

    if (!this.currentContext || this.currentContext.items.length === 0) return;
    const ctx = this.currentContext;
    const curItem = ctx.items[ctx.selectedIndex];
    const cols = ctx.columns || 1;
    let moved = false;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (curItem?.upIndex !== undefined) {
        ctx.selectedIndex = curItem.upIndex;
        moved = true;
      } else if (ctx.selectedIndex - cols >= 0) {
        ctx.selectedIndex -= cols;
        moved = true;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (curItem?.downIndex !== undefined) {
        ctx.selectedIndex = curItem.downIndex;
        moved = true;
      } else if (ctx.selectedIndex + cols < ctx.items.length) {
        ctx.selectedIndex += cols;
        moved = true;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (curItem?.leftIndex !== undefined) {
        ctx.selectedIndex = curItem.leftIndex;
        moved = true;
      } else if (cols > 1 && ctx.selectedIndex % cols > 0) {
        ctx.selectedIndex -= 1;
        moved = true;
      } else if (ctx.onTabPrev) {
        ctx.onTabPrev();
        moved = true;
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (curItem?.rightIndex !== undefined) {
        ctx.selectedIndex = curItem.rightIndex;
        moved = true;
      } else if (cols > 1 && ctx.selectedIndex % cols < cols - 1 && ctx.selectedIndex + 1 < ctx.items.length) {
        ctx.selectedIndex += 1;
        moved = true;
      } else if (ctx.onTabNext) {
        ctx.onTabNext();
        moved = true;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = ctx.items[ctx.selectedIndex];
      if (item) {
        audioManager.playSFX('button_click');
        item.onSelect();
      }
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      if (ctx.onCancel) {
        e.preventDefault();
        audioManager.playSFX('button_click');
        ctx.onCancel();
      }
    } else if (e.key === 'q' || e.key === 'Q') {
      if (ctx.onTabPrev) {
        e.preventDefault();
        audioManager.playSFX('button_click');
        ctx.onTabPrev();
      }
    } else if (e.key === 'e' || e.key === 'E') {
      if (ctx.onTabNext) {
        e.preventDefault();
        audioManager.playSFX('button_click');
        ctx.onTabNext();
      }
    }

    if (moved) {
      audioManager.playSFX('button_click');
      this.updateFocusGlow();
    }
  };

  // ── Render Dynamic Golden Focus Ring ──────────────────────

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
    if (bounds.width <= 0 || bounds.height <= 0) {
      this.focusRingLayer.visible = false;
      return;
    }

    const pulse = 0.8 + 0.2 * Math.sin(this.pulsePhase);

    this.focusGlow.clear();

    // Outer golden pulsing halo
    this.focusGlow.roundRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10, 12);
    this.focusGlow.stroke({ color: 0xFBBF24, width: 3, alpha: pulse });

    // Inner vibrant glow
    this.focusGlow.roundRect(bounds.x - 8, bounds.y - 8, bounds.width + 16, bounds.height + 16, 15);
    this.focusGlow.stroke({ color: 0xF59E0B, width: 1.5, alpha: 0.45 * pulse });

    this.focusRingLayer.visible = true;
  }
}
