// ============================================================
//  NarutoSurvivor — Audio Manager
//  Uses Web Audio API (no external deps) with procedural SFX
//  + optional BGM via HTML5 Audio element
// ============================================================

export type SFXKind =
  | 'jutsu_fire'
  | 'jutsu_beam'
  | 'jutsu_omni'
  | 'enemy_hit'
  | 'enemy_die'
  | 'boss_spawn'
  | 'boss_die'
  | 'collect_orb'
  | 'collect_ryo'
  | 'level_up'
  | 'combined_activate'
  | 'player_hurt'
  | 'game_over'
  | 'promotion'
  | 'button_click'
  | 'bomb_explode'
  | 'magnet_pickup'
  | 'ramen_heal';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private bgmGain!: GainNode;
  private bgmNode: AudioBufferSourceNode | null = null;
  private enabled = true;

  private get audioCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.75;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.35;
      this.bgmGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  // ── Resume context on user gesture ────────────────────────
  resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.masterGain.gain.value = this.enabled ? 0.85 : 0;
    return this.enabled;
  }

  // ── Procedural SFX Generator ──────────────────────────────

  playSFX(kind: SFXKind): void {
    if (!this.enabled) return;
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    switch (kind) {
      case 'jutsu_fire':      this.synth_jutsuFire(ctx); break;
      case 'jutsu_beam':      this.synth_beam(ctx); break;
      case 'jutsu_omni':      this.synth_omni(ctx); break;
      case 'enemy_hit':       this.synth_hit(ctx, 220, 0.08); break;
      case 'enemy_die':       this.synth_die(ctx, 180, 0.12); break;
      case 'boss_spawn':      this.synth_bossSpawn(ctx); break;
      case 'boss_die':        this.synth_bossDie(ctx); break;
      case 'collect_orb':     this.synth_collect(ctx, 880, 0.06); break;
      case 'collect_ryo':     this.synth_collect(ctx, 1320, 0.05); break;
      case 'level_up':        this.synth_levelUp(ctx); break;
      case 'combined_activate': this.synth_combinedActivate(ctx); break;
      case 'player_hurt':     this.synth_hit(ctx, 110, 0.18); break;
      case 'game_over':       this.synth_gameOver(ctx); break;
      case 'promotion':       this.synth_promotion(ctx); break;
      case 'button_click':    this.synth_click(ctx); break;
      case 'bomb_explode':    this.synth_bombExplode(ctx); break;
      case 'magnet_pickup':   this.synth_magnet(ctx); break;
      case 'ramen_heal':      this.synth_heal(ctx); break;
    }
  }

  private synth_click(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sine', 950, t, t + 0.04, 0.12);
  }

  // ── Procedural BGM (Looping bass-line) ──────────────────

  startBGM(): void {
    if (!this.enabled) return;
    const ctx = this.audioCtx;
    this.stopBGM();
    this.bgmLoop(ctx);
  }

  stopBGM(): void {
    try { this.bgmNode?.stop(); } catch {}
    this.bgmNode = null;
  }

  // Moody 4-bar ninja-esque bass loop using Web Audio oscillators
  private bgmLoop(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const BPM = 128;
    const BEAT = 60 / BPM;
    const BAR  = BEAT * 4;
    const BARS = 4;
    const TOTAL = BAR * BARS;

    // Pattern: E1 G1 A1 C2  (minor pentatonic)
    const pattern = [
      41.2, 49.0, 55.0, 65.4,
      41.2, 49.0, 55.0, 65.4,
      36.7, 43.7, 49.0, 58.3,
      36.7, 43.7, 49.0, 55.0,
    ];

    pattern.forEach((freq, i) => {
      const t = now + i * BEAT;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 0.85);
      osc.connect(env);
      env.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + BEAT);
    });

    // Restart loop
    const restartHandle = setTimeout(() => {
      if (this.enabled) this.bgmLoop(ctx);
    }, TOTAL * 1000 - 50);

    // Store for cleanup
    this.bgmNode = { stop: () => clearTimeout(restartHandle) } as unknown as AudioBufferSourceNode;
  }

  // ── SFX synthesisers ──────────────────────────────────────

  private osc(ctx: AudioContext, type: OscillatorType, freq: number, startT: number, endT: number, vol: number): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, startT);
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.0001, endT);
    o.connect(g); g.connect(this.sfxGain);
    o.start(startT); o.stop(endT);
  }

  private noise(ctx: AudioContext, durationSec: number, vol: number, hipass = 1000): void {
    const buf = ctx.createBuffer(1, ctx.sampleRate * durationSec, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hipass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
    src.start(); src.stop(ctx.currentTime + durationSec);
  }

  private synth_jutsuFire(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sine', 440, t, t + 0.15, 0.3);
    this.osc(ctx, 'sawtooth', 220, t, t + 0.2, 0.15);
  }

  private synth_beam(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 0.3);
  }

  private synth_omni(ctx: AudioContext): void {
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      this.osc(ctx, 'sine', 300 + i * 120, t + i * 0.04, t + i * 0.04 + 0.18, 0.18);
    }
  }

  private synth_hit(ctx: AudioContext, freq: number, vol: number): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'square', freq, t, t + 0.08, vol);
    this.noise(ctx, 0.06, vol * 0.5, 2000);
  }

  private synth_die(ctx: AudioContext, freq: number, vol: number): void {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 0.4);
  }

  private synth_collect(ctx: AudioContext, freq: number, vol: number): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sine', freq, t, t + 0.10, vol);
    this.osc(ctx, 'sine', freq * 1.5, t + 0.05, t + 0.12, vol * 0.5);
  }

  private synth_levelUp(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.osc(ctx, 'sine', n, t + i * 0.10, t + i * 0.10 + 0.15, 0.25));
  }

  private synth_combinedActivate(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sawtooth', 880, t, t + 0.05, 0.3);
    this.osc(ctx, 'sine', 1760, t + 0.05, t + 0.25, 0.2);
    this.noise(ctx, 0.25, 0.15, 500);
  }

  private synth_bossSpawn(ctx: AudioContext): void {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.osc(ctx, 'sawtooth', 80 - i * 15, t + i * 0.15, t + i * 0.15 + 0.4, 0.35);
    }
    this.noise(ctx, 0.6, 0.2, 300);
  }

  private synth_bossDie(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sawtooth', 200, t, t + 0.6, 0.3);
    this.osc(ctx, 'sine', 100, t + 0.2, t + 0.8, 0.2);
    this.synth_levelUp(ctx);
  }

  private synth_gameOver(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const notes = [392, 349, 330, 294];
    notes.forEach((n, i) => this.osc(ctx, 'sawtooth', n, t + i * 0.22, t + i * 0.22 + 0.3, 0.3));
  }

  private synth_promotion(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => {
      this.osc(ctx, 'sine', n, t + i * 0.08, t + i * 0.08 + 0.22, 0.25);
      this.osc(ctx, 'triangle', n * 2, t + i * 0.08 + 0.04, t + i * 0.08 + 0.18, 0.10);
    });
    this.noise(ctx, 0.5, 0.08, 4000);
  }

  private synth_bombExplode(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.noise(ctx, 0.8, 0.45, 120);
    this.osc(ctx, 'sawtooth', 120, t, t + 0.5, 0.4);
    this.osc(ctx, 'sine', 60, t + 0.1, t + 0.7, 0.35);
  }

  private synth_magnet(ctx: AudioContext): void {
    const t = ctx.currentTime;
    this.osc(ctx, 'sine', 380, t, t + 0.12, 0.2);
    this.osc(ctx, 'sine', 640, t + 0.06, t + 0.22, 0.25);
    this.osc(ctx, 'triangle', 1100, t + 0.12, t + 0.32, 0.2);
  }

  private synth_heal(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.osc(ctx, 'sine', freq, t + idx * 0.06, t + idx * 0.06 + 0.25, 0.22);
    });
  }
}

// Singleton
export const audioManager = new AudioManager();
