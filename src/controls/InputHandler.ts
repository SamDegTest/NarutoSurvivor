// ============================================================
//  NarutoSurvivor — Unified InputHandler
//  Supports: Keyboard (WASD/Arrows), Gamepad API, Touch (Virtual Joystick)
// ============================================================

export type InputSource = 'keyboard' | 'gamepad' | 'touch';

/** Normalised movement vector (range −1…1 on each axis) */
export interface MoveVector {
  x: number;
  y: number;
}

// ── Gamepad axis/button deadzone ─────────────────────────────
const DEADZONE = 0.18;

// ── Button mappings (Standard Gamepad Layout) ─────────────────
// https://w3c.github.io/gamepad/#remapping
const PAD_BTN_PAUSE  = 9;  // Start / Options
// PAD_BTN_ACTION = 0 reserved for future ability button

/** Clamp a value to [−1, 1] and apply deadzone */
function applyDeadzone(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : Math.sign(v) * (Math.abs(v) - DEADZONE) / (1 - DEADZONE);
}

// ============================================================
//  InputHandler
// ============================================================

export class InputHandler {
  // ── State ──────────────────────────────────────────────────
  private keys = new Set<string>();
  private _touchVec: MoveVector = { x: 0, y: 0 };
  private _lastSource: InputSource = 'keyboard';

  // Gamepad polling (runs every tick via update())
  private _padPausePressed = false;
  private _padPausePrev    = false;
  private _padL1Prev       = false;
  private _padR1Prev       = false;

  // External callbacks
  onPause?: () => void;
  onMute?:  () => void;
  onSelectSlot?: (slotIndex: number) => void;
  onCycleSlot?:  (direction: -1 | 1) => void;

  constructor() {
    // ── Keyboard ───────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this._lastSource = 'keyboard';

      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        this.onSelectSlot?.(idx);
      } else if (e.code === 'KeyQ') {
        this.onCycleSlot?.(-1);
      } else if (e.code === 'KeyE') {
        this.onCycleSlot?.(1);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // ── Gamepad connected/disconnected ──────────────────────
    window.addEventListener('gamepadconnected',    (e) => {
      console.log(`[InputHandler] Gamepad connesso: ${(e as GamepadEvent).gamepad.id}`);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`[InputHandler] Gamepad disconnesso: ${(e as GamepadEvent).gamepad.id}`);
    });
  }

  // ── Called from VirtualJoystick ──────────────────────────
  setTouchVec(x: number, y: number): void {
    this._touchVec.x = x;
    this._touchVec.y = y;
    if (x !== 0 || y !== 0) this._lastSource = 'touch';
  }

  // ── Tick update (call once per frame) ────────────────────
  update(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;

      // Any axis/button activity → flag as gamepad input
      const lx = applyDeadzone(pad.axes[0] ?? 0);
      const ly = applyDeadzone(pad.axes[1] ?? 0);
      if (Math.abs(lx) > 0 || Math.abs(ly) > 0) {
        this._lastSource = 'gamepad';
      }

      // Pause button (rising edge)
      this._padPausePressed = pad.buttons[PAD_BTN_PAUSE]?.pressed ?? false;
      if (this._padPausePressed && !this._padPausePrev) {
        this.onPause?.();
      }
      this._padPausePrev = this._padPausePressed;

      // Bumper buttons for cycle slot (L1 = 4, R1 = 5)
      const l1 = pad.buttons[4]?.pressed ?? false;
      const r1 = pad.buttons[5]?.pressed ?? false;
      if (l1 && !this._padL1Prev) {
        this.onCycleSlot?.(-1);
      }
      if (r1 && !this._padR1Prev) {
        this.onCycleSlot?.(1);
      }
      this._padL1Prev = l1;
      this._padR1Prev = r1;
    }
  }

  // ── Movement vector ──────────────────────────────────────
  get moveX(): number {
    // 1. Keyboard
    const kbLeft  = (this.keys.has('ArrowLeft')  || this.keys.has('KeyA')) ? -1 : 0;
    const kbRight = (this.keys.has('ArrowRight') || this.keys.has('KeyD')) ?  1 : 0;
    const kb = kbLeft + kbRight;
    if (kb !== 0) return kb;

    // 2. Gamepad (first connected pad, left stick or D-pad)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const lx = applyDeadzone(pad.axes[0] ?? 0);
      if (lx !== 0) return lx;
      // D-pad buttons (indices 14 = left, 15 = right)
      const dLeft  = pad.buttons[14]?.pressed ? -1 : 0;
      const dRight = pad.buttons[15]?.pressed ?  1 : 0;
      if (dLeft !== 0 || dRight !== 0) return dLeft + dRight;
    }

    // 3. Touch virtual joystick
    return this._touchVec.x;
  }

  get moveY(): number {
    // 1. Keyboard
    const kbUp   = (this.keys.has('ArrowUp')   || this.keys.has('KeyW')) ? -1 : 0;
    const kbDown = (this.keys.has('ArrowDown')  || this.keys.has('KeyS')) ?  1 : 0;
    const kb = kbUp + kbDown;
    if (kb !== 0) return kb;

    // 2. Gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ly = applyDeadzone(pad.axes[1] ?? 0);
      if (ly !== 0) return ly;
      // D-pad buttons (indices 12 = up, 13 = down)
      const dUp   = pad.buttons[12]?.pressed ? -1 : 0;
      const dDown = pad.buttons[13]?.pressed ?  1 : 0;
      if (dUp !== 0 || dDown !== 0) return dUp + dDown;
    }

    // 3. Touch
    return this._touchVec.y;
  }

  get moveVec(): MoveVector { return { x: this.moveX, y: this.moveY }; }

  get lastSource(): InputSource { return this._lastSource; }

  isDown(...codes: string[]): boolean {
    return codes.some(c => this.keys.has(c));
  }

  /** Returns true if any gamepad is currently connected */
  get hasGamepad(): boolean {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return pads.some(p => p !== null);
  }
}
