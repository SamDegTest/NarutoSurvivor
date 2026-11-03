// ============================================================
//  NarutoSurvivor — Multiplayer & Co-op Lobby Modal
//  Allows Local 2-Player Co-op and WebRTC P2P Online Shinobi Rooms
// ============================================================

import { ROSTER } from '../data/roster';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';
import { multiplayerManager, type MultiplayerMode } from '../network/MultiplayerManager';
import type { Character } from '../types/character';

export interface MultiplayerLaunchConfig {
  mode: MultiplayerMode;
  p1Character: Character;
  p2Character: Character;
  roomCode?: string;
}

export class MultiplayerModal {
  private overlay: HTMLElement;
  private onLaunchCallback?: (config: MultiplayerLaunchConfig) => void;

  private activeTab: 'local' | 'online' = 'local';
  private selectedP1: Character;
  private selectedP2: Character;
  private currentRoomCode = '';
  private isHosting = false;

  constructor(onLaunch?: (config: MultiplayerLaunchConfig) => void) {
    this.onLaunchCallback = onLaunch;
    const unlocked = ROSTER.filter(c => SaveSystem.isCharacterUnlocked(c.id));
    this.selectedP1 = unlocked[0] ?? ROSTER[0];
    this.selectedP2 = unlocked[1] ?? ROSTER[1] ?? unlocked[0];

    this.overlay = document.createElement('div');
    this.overlay.id = 'multiplayer-modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(10, 8, 20, 0.88);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #fff;
    `;
    document.body.appendChild(this.overlay);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
        this.close();
      }
    });
  }

  show(onLaunch?: (config: MultiplayerLaunchConfig) => void): void {
    if (onLaunch) this.onLaunchCallback = onLaunch;
    this.currentRoomCode = multiplayerManager.generateRoomCode();
    this.render();
    this.overlay.style.display = 'flex';
    audioManager.playSFX('button_click');
  }

  close(): void {
    this.overlay.style.display = 'none';
    if (this.isHosting) {
      multiplayerManager.disconnect();
      this.isHosting = false;
    }
    audioManager.playSFX('button_click');
  }

  private render(): void {
    const unlocked = ROSTER.filter(c => SaveSystem.isCharacterUnlocked(c.id));

    this.overlay.innerHTML = `
      <div style="
        background: linear-gradient(145deg, #18142a, #0d0a1a);
        border: 2px solid #6366f1;
        box-shadow: 0 0 35px rgba(99, 102, 241, 0.35);
        border-radius: 16px;
        width: 760px;
        max-width: 95vw;
        max-height: 90vh;
        overflow-y: auto;
        padding: 24px;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 18px;
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/icons/menu_multiplayer.jpg" style="width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #facc15; object-fit: cover;" alt="Multiplayer" />
            <div>
              <h2 style="margin: 0; font-size: 22px; font-weight: 800; background: linear-gradient(90deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                MODALITÀ MULTIPLAYER & CO-OP SHINOBI
              </h2>
              <div style="font-size: 12px; color: #94a3b8;">Combatti fianco a fianco contro le orde di nemici e i Boss</div>
            </div>
          </div>
          <button id="mp-btn-close" style="background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer;">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 10px;">
          <button id="mp-tab-local" style="
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
            background: ${this.activeTab === 'local' ? 'linear-gradient(90deg, #4f46e5, #7c3aed)' : 'transparent'};
            color: ${this.activeTab === 'local' ? '#fff' : '#94a3b8'};
          ">
            <img src="/icons/menu_team.jpg" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" />
            Co-op Locale (1 PC • Stessa Tastiera)
          </button>
          <button id="mp-tab-online" style="
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
            background: ${this.activeTab === 'online' ? 'linear-gradient(90deg, #4f46e5, #7c3aed)' : 'transparent'};
            color: ${this.activeTab === 'online' ? '#fff' : '#94a3b8'};
          ">
            <img src="/icons/chakra_orb.svg" style="width: 18px; height: 18px; border-radius: 50%;" />
            Co-op Online (Stanza P2P Room)
          </button>
        </div>

        <!-- Tab Content -->
        <div id="mp-tab-content">
          ${this.activeTab === 'local' ? this.renderLocalTab(unlocked) : this.renderOnlineTab(unlocked)}
        </div>
      </div>
    `;

    // Wire close
    document.getElementById('mp-btn-close')?.addEventListener('click', () => this.close());

    // Wire tabs
    document.getElementById('mp-tab-local')?.addEventListener('click', () => {
      this.activeTab = 'local';
      audioManager.playSFX('button_click');
      this.render();
    });
    document.getElementById('mp-tab-online')?.addEventListener('click', () => {
      this.activeTab = 'online';
      audioManager.playSFX('button_click');
      this.render();
    });

    if (this.activeTab === 'local') {
      this.bindLocalEvents();
    } else {
      this.bindOnlineEvents();
    }
  }

  private renderLocalTab(unlocked: Character[]): string {
    return `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Character Pickers -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <!-- P1 -->
          <div style="background: rgba(30, 27, 50, 0.7); border: 1px solid #38bdf8; border-radius: 12px; padding: 14px;">
            <div style="font-size: 13px; font-weight: bold; color: #38bdf8; margin-bottom: 8px;">GIOCATORE 1 (WASD)</div>
            <select id="mp-p1-select" style="width: 100%; padding: 8px; border-radius: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; font-size: 13px;">
              ${unlocked.map(c => `<option value="${c.id}" ${c.id === this.selectedP1.id ? 'selected' : ''}>${c.nameIT} (${c.form})</option>`).join('')}
            </select>
            <div style="margin-top: 10px; font-size: 11px; color: #cbd5e1; line-height: 1.6;">
              • <b>Movimento:</b> Tasti W, A, S, D<br>
              • <b>Abilità:</b> Tasti [1..4] o Click<br>
              • <b>Risveglio:</b> Barra Spaziatrice
            </div>
          </div>

          <!-- P2 -->
          <div style="background: rgba(30, 27, 50, 0.7); border: 1px solid #f43f5e; border-radius: 12px; padding: 14px;">
            <div style="font-size: 13px; font-weight: bold; color: #f43f5e; margin-bottom: 8px;">GIOCATORE 2 (FRECCE)</div>
            <select id="mp-p2-select" style="width: 100%; padding: 8px; border-radius: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; font-size: 13px;">
              ${unlocked.map(c => `<option value="${c.id}" ${c.id === this.selectedP2.id ? 'selected' : ''}>${c.nameIT} (${c.form})</option>`).join('')}
            </select>
            <div style="margin-top: 10px; font-size: 11px; color: #cbd5e1; line-height: 1.6;">
              • <b>Movimento:</b> Frecce Direzionali (↑, ↓, ←, →)<br>
              • <b>Abilità:</b> Fuoco automatico assistito<br>
              • <b>Risveglio:</b> Invio (Enter) o Numpad 0
            </div>
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; border-radius: 10px; padding: 12px; font-size: 12px; color: #a7f3d0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <img src="/icons/stat_hp.svg" style="width: 16px; height: 16px;" />
          <div><b>Modalità Alleanza Shinobi:</b> Entrambi i ninja combattono insieme nello stesso schermo, condividendo il supporto e le ricompense!</div>
        </div>

        <button id="mp-btn-start-local" style="
          padding: 14px; border: none; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer;
          background: linear-gradient(90deg, #10b981, #059669); color: #fff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          transition: transform 0.1s;
        ">
          AVVIA MISSIONE CO-OP LOCALE (2 GIOCATORI)
        </button>
      </div>
    `;
  }

  private renderOnlineTab(unlocked: Character[]): string {
    return `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Character Picker -->
        <div>
          <label style="font-size: 12px; color: #94a3b8; font-weight: bold;">IL TUO SHINOBI:</label>
          <select id="mp-online-char" style="width: 100%; padding: 8px; border-radius: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; font-size: 13px; margin-top: 4px;">
            ${unlocked.map(c => `<option value="${c.id}" ${c.id === this.selectedP1.id ? 'selected' : ''}>${c.nameIT} (${c.form})</option>`).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <!-- Host Room -->
          <div style="background: rgba(30, 27, 50, 0.7); border: 1px solid #818cf8; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 14px; font-weight: bold; color: #818cf8;">CREA STANZA (HOST)</div>
            <div style="font-size: 11px; color: #cbd5e1;">Genera un codice stanza e invialo al tuo amico per giocare insieme in P2P WebRTC:</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input id="mp-room-code-display" readonly value="${this.currentRoomCode}" style="flex: 1; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 1px; background: #0f172a; border: 1px solid #6366f1; border-radius: 6px; color: #fde047;">
              <button id="mp-btn-copy-code" style="padding: 8px 12px; border: none; border-radius: 6px; background: #4f46e5; color: #fff; cursor: pointer; font-size: 12px;">Copia</button>
            </div>
            <button id="mp-btn-start-host" style="
              margin-top: auto; padding: 10px; border: none; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;
              background: linear-gradient(90deg, #6366f1, #4f46e5); color: #fff;
            ">
              ${this.isHosting ? 'In attesa dell\'alleato...' : 'CREA STANZA HOST'}
            </button>
          </div>

          <!-- Join Room -->
          <div style="background: rgba(30, 27, 50, 0.7); border: 1px solid #c084fc; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 14px; font-weight: bold; color: #c084fc;">UNISCITI A STANZA</div>
            <div style="font-size: 11px; color: #cbd5e1;">Inserisci il codice fornito dall'Host per collegarti alla missione:</div>
            <input id="mp-join-code-input" placeholder="Es. KONOHA-7421" style="padding: 8px; text-align: center; font-weight: bold; font-size: 14px; letter-spacing: 1px; background: #0f172a; border: 1px solid #c084fc; border-radius: 6px; color: #fff;">
            <button id="mp-btn-join-room" style="
              margin-top: auto; padding: 10px; border: none; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;
              background: linear-gradient(90deg, #9333ea, #7e22ce); color: #fff;
            ">
              UNISCITI ALLA STANZA
            </button>
          </div>
        </div>

        <div id="mp-online-status" style="font-size: 12px; text-align: center; color: #94a3b8; min-height: 20px;"></div>
      </div>
    `;
  }

  private bindLocalEvents(): void {
    const p1Sel = document.getElementById('mp-p1-select') as HTMLSelectElement;
    const p2Sel = document.getElementById('mp-p2-select') as HTMLSelectElement;

    p1Sel?.addEventListener('change', () => {
      const c = ROSTER.find(ch => ch.id === p1Sel.value);
      if (c) this.selectedP1 = c;
    });

    p2Sel?.addEventListener('change', () => {
      const c = ROSTER.find(ch => ch.id === p2Sel.value);
      if (c) this.selectedP2 = c;
    });

    document.getElementById('mp-btn-start-local')?.addEventListener('click', () => {
      audioManager.playSFX('button_click');
      this.close();
      if (this.onLaunchCallback) {
        this.onLaunchCallback({
          mode: 'local_coop',
          p1Character: this.selectedP1,
          p2Character: this.selectedP2,
        });
      }
    });
  }

  private bindOnlineEvents(): void {
    const charSel = document.getElementById('mp-online-char') as HTMLSelectElement;
    charSel?.addEventListener('change', () => {
      const c = ROSTER.find(ch => ch.id === charSel.value);
      if (c) this.selectedP1 = c;
    });

    const copyBtn = document.getElementById('mp-btn-copy-code');
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.currentRoomCode);
      copyBtn.innerText = 'Copiato!';
      setTimeout(() => { if (copyBtn) copyBtn.innerText = 'Copia'; }, 1500);
      audioManager.playSFX('button_click');
    });

    const hostBtn = document.getElementById('mp-btn-start-host');
    const statusDiv = document.getElementById('mp-online-status');

    hostBtn?.addEventListener('click', async () => {
      if (this.isHosting) return;
      this.isHosting = true;
      hostBtn.innerText = 'Connessione al server P2P...';
      if (statusDiv) statusDiv.innerHTML = 'Connessione in corso... Condividi il codice con il tuo amico!';

      await multiplayerManager.hostRoom(this.currentRoomCode, this.selectedP1);
      hostBtn.innerText = 'In ascolto (Codice Attivo)';
      if (statusDiv) statusDiv.innerHTML = `Stanza aperta! In attesa di un alleato su <b>${this.currentRoomCode}</b>...`;

      multiplayerManager.onConnected = (remoteName, charId) => {
        const partner = ROSTER.find(c => c.id === charId) ?? ROSTER[1];
        if (statusDiv) statusDiv.innerHTML = `Alleato Connesso: <b>${remoteName}</b>! Avvio missione...`;
        audioManager.playSFX('promotion');
        setTimeout(() => {
          this.close();
          if (this.onLaunchCallback) {
            this.onLaunchCallback({
              mode: 'online_host',
              p1Character: this.selectedP1,
              p2Character: partner,
              roomCode: this.currentRoomCode,
            });
          }
        }, 1200);
      };
    });

    const joinBtn = document.getElementById('mp-btn-join-room');
    const joinInput = document.getElementById('mp-join-code-input') as HTMLInputElement;

    joinBtn?.addEventListener('click', async () => {
      const code = joinInput.value.trim().toUpperCase();
      if (!code) {
        if (statusDiv) statusDiv.innerHTML = '⚠ Inserisci un codice stanza valido!';
        return;
      }
      joinBtn.innerText = '⏳ Connessione alla stanza...';
      if (statusDiv) statusDiv.innerHTML = `Tentativo di connessione alla stanza ${code}...`;

      const ok = await multiplayerManager.joinRoom(code, this.selectedP1);
      if (ok) {
        if (statusDiv) statusDiv.innerHTML = `✅ Connesso all'Host! Avvio missione Co-op...`;
        audioManager.playSFX('promotion');
        setTimeout(() => {
          this.close();
          if (this.onLaunchCallback) {
            this.onLaunchCallback({
              mode: 'online_client',
              p1Character: this.selectedP1,
              p2Character: this.selectedP2,
              roomCode: code,
            });
          }
        }, 1200);
      } else {
        joinBtn.innerText = 'UNISCITI ALLA STANZA';
        if (statusDiv) statusDiv.innerHTML = '❌ Impossibile connettersi alla stanza. Verifica il codice.';
      }
    });
  }
}
