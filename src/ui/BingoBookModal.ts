// ============================================================
//  NarutoSurvivor — Libro Bingo (Ninja Bingo Book & Jutsu Codex)
//  Complete Encyclopedia of Shinobi, Jutsu Evolutions, and Bosses
// ============================================================

import { ROSTER } from '../data/roster';
import { CANONICAL_JUTSU_CATALOG } from '../data/jutsuCatalog';
import { BOSS_CONFIGS } from '../entities/bosses';
import { SaveSystem } from '../systems/saveSystem';
import { audioManager } from '../systems/audioManager';

export class BingoBookModal {
  private overlay: HTMLElement;
  private activeTab: 'shinobi' | 'jutsu' | 'bosses' = 'shinobi';
  private searchFilter = '';
  private elementFilter = 'ALL';

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'bingo-book-modal';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(10, 8, 20, 0.90);
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

  show(): void {
    this.render();
    this.overlay.style.display = 'flex';
    audioManager.playSFX('button_click');
  }

  close(): void {
    this.overlay.style.display = 'none';
    audioManager.playSFX('button_click');
  }

  private render(): void {
    const profile = SaveSystem.getProfile();
    const unlockedCount = profile.unlockedCharacterIds.length;
    const totalShinobi = ROSTER.length;

    this.overlay.innerHTML = `
      <div style="
        background: linear-gradient(145deg, #18142a, #0b0917);
        border: 2px solid #ca8a04;
        box-shadow: 0 0 35px rgba(202, 138, 4, 0.35);
        border-radius: 16px;
        width: 860px;
        max-width: 95vw;
        height: 600px;
        max-height: 92vh;
        padding: 24px;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 28px;">📖</span>
            <div>
              <h2 style="margin: 0; font-size: 22px; font-weight: 800; background: linear-gradient(90deg, #fde047, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                LIBRO BINGO & ROTOLO DELLE TECNICHE
              </h2>
              <div style="font-size: 12px; color: #94a3b8;">
                Enciclopedia Shinobi • Sbloccati: <b>${unlockedCount}/${totalShinobi}</b> (${Math.round((unlockedCount/totalShinobi)*100)}%)
              </div>
            </div>
          </div>
          <button id="bb-btn-close" style="background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer;">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 10px;">
          <button id="bb-tab-shinobi" style="
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
            background: ${this.activeTab === 'shinobi' ? 'linear-gradient(90deg, #ca8a04, #eab308)' : 'rgba(255,255,255,0.06)'};
            color: ${this.activeTab === 'shinobi' ? '#000' : '#cbd5e1'};
          ">
            🥋 Roster Shinobi (${totalShinobi})
          </button>
          <button id="bb-tab-jutsu" style="
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
            background: ${this.activeTab === 'jutsu' ? 'linear-gradient(90deg, #2563eb, #38bdf8)' : 'rgba(255,255,255,0.06)'};
            color: ${this.activeTab === 'jutsu' ? '#000' : '#cbd5e1'};
          ">
            🌀 Tecniche & Evoluzioni Plus (+) (${CANONICAL_JUTSU_CATALOG.length})
          </button>
          <button id="bb-tab-bosses" style="
            flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
            background: ${this.activeTab === 'bosses' ? 'linear-gradient(90deg, #dc2626, #f87171)' : 'rgba(255,255,255,0.06)'};
            color: ${this.activeTab === 'bosses' ? '#000' : '#cbd5e1'};
          ">
            👹 Boss Leggendari & Portali (4)
          </button>
        </div>

        <!-- Content Area -->
        <div id="bb-content" style="flex: 1; overflow-y: auto; padding-right: 6px;">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    document.getElementById('bb-btn-close')?.addEventListener('click', () => this.close());

    document.getElementById('bb-tab-shinobi')?.addEventListener('click', () => {
      this.activeTab = 'shinobi';
      audioManager.playSFX('button_click');
      this.render();
    });

    document.getElementById('bb-tab-jutsu')?.addEventListener('click', () => {
      this.activeTab = 'jutsu';
      audioManager.playSFX('button_click');
      this.render();
    });

    document.getElementById('bb-tab-bosses')?.addEventListener('click', () => {
      this.activeTab = 'bosses';
      audioManager.playSFX('button_click');
      this.render();
    });

    this.bindFilters();
  }

  private renderTabContent(): string {
    if (this.activeTab === 'shinobi') return this.renderShinobiTab();
    if (this.activeTab === 'jutsu') return this.renderJutsuTab();
    return this.renderBossesTab();
  }

  private renderShinobiTab(): string {
    const list = ROSTER.filter(c => {
      const matchSearch = c.nameIT.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
                          c.form.toLowerCase().includes(this.searchFilter.toLowerCase());
      const matchElem = this.elementFilter === 'ALL' || c.element.includes(this.elementFilter as any);
      return matchSearch && matchElem;
    });

    return `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Filters -->
        <div style="display: flex; gap: 10px; align-items: center;">
          <input id="bb-search-input" type="text" placeholder="Cerca shinobi..." value="${this.searchFilter}" style="
            flex: 1; padding: 8px 12px; border-radius: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; font-size: 13px;
          ">
          <select id="bb-elem-select" style="padding: 8px 12px; border-radius: 6px; background: #0f172a; border: 1px solid #475569; color: #fff; font-size: 13px;">
            <option value="ALL" ${this.elementFilter === 'ALL' ? 'selected' : ''}>Tutti gli Elementi</option>
            <option value="Fuuton" ${this.elementFilter === 'Fuuton' ? 'selected' : ''}>Vento (Fūton)</option>
            <option value="Raiton" ${this.elementFilter === 'Raiton' ? 'selected' : ''}>Fulmine (Raiton)</option>
            <option value="Katon" ${this.elementFilter === 'Katon' ? 'selected' : ''}>Fuoco (Katon)</option>
            <option value="Suiton" ${this.elementFilter === 'Suiton' ? 'selected' : ''}>Acqua (Suiton)</option>
            <option value="Doton" ${this.elementFilter === 'Doton' ? 'selected' : ''}>Terra (Doton)</option>
          </select>
        </div>

        <!-- Grid of Shinobi -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
          ${list.map(c => {
            const isUnlocked = SaveSystem.isCharacterUnlocked(c.id);
            const stars = '★'.repeat(c.baseRank) + '☆'.repeat(5 - c.baseRank);
            return `
              <div style="
                background: ${isUnlocked ? 'rgba(30, 27, 50, 0.75)' : 'rgba(15, 23, 42, 0.45)'};
                border: 1px solid ${isUnlocked ? '#38bdf8' : '#334155'};
                border-radius: 10px; padding: 12px;
                opacity: ${isUnlocked ? '1' : '0.6'};
                display: flex; flex-direction: column; gap: 6px;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold; font-size: 14px; color: ${isUnlocked ? '#fff' : '#94a3b8'};">${c.nameIT}</span>
                  <span style="color: #f59e0b; font-size: 12px;">${stars}</span>
                </div>
                <div style="font-size: 11px; color: #94a3b8;">${c.form} • ${c.arc}</div>
                <div style="font-size: 11px; color: #38bdf8;">🌀 Mossa: <b>${c.jutsuSlot.nameIT}</b></div>
                <div style="font-size: 10px; color: #cbd5e1; line-height: 1.3; margin-top: 4px; font-style: italic;">
                  "${c.loreDescription ? c.loreDescription.slice(0, 90) + '…' : 'Shinobi del Villaggio della Foglia'}"
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderJutsuTab(): string {
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px;">
        ${CANONICAL_JUTSU_CATALOG.map(j => {
          return `
            <div style="
              background: rgba(30, 27, 50, 0.75); border: 1px solid #6366f1; border-radius: 10px; padding: 14px;
              display: flex; flex-direction: column; gap: 8px;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 20px;">${j.icon}</span>
                  <span style="font-weight: bold; font-size: 15px; color: #fff;">${j.nameIT}</span>
                </div>
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(99,102,241,0.25); color: #818cf8; border: 1px solid #6366f1;">
                  ${j.element} • Danno ×${j.baseDmgCoeff}
                </span>
              </div>
              <div style="font-size: 11px; color: #94a3b8;">${j.description}</div>
              
              <!-- Plus Evolution Box -->
              <div style="
                background: rgba(245, 158, 11, 0.12); border: 1px solid #f59e0b; border-radius: 8px; padding: 10px;
                margin-top: 4px; display: flex; flex-direction: column; gap: 4px;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px; font-weight: bold; color: #fde047;">✦ FORMA PLUS (+): ${j.plusEvolution.nameIT}</span>
                  <span style="font-size: 10px; color: #f59e0b;">Cooldown ×${j.plusEvolution.cooldownMultiplier}</span>
                </div>
                <div style="font-size: 11px; color: #fef08a;">${j.plusEvolution.description}</div>
                <div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">
                  🔒 <b>Requisito di Sblocco:</b> Livello 5 + 1 potenziamento ${j.evolutionReq.statName}.
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderBossesTab(): string {
    const bosses = Object.values(BOSS_CONFIGS);

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: rgba(220, 38, 38, 0.12); border: 1px solid #dc2626; border-radius: 10px; padding: 12px; font-size: 12px; color: #fca5a5; text-align: center;">
          🌀 <b>Meccanica dei Portali:</b> I Boss leggendari appaiono solo tramite i Portali Spazio-Temporali che si aprono ogni 3-4 minuti. Il portale dura 60 secondi prima di collassare!
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          ${bosses.map(b => {
            return `
              <div style="
                background: rgba(30, 27, 50, 0.75); border: 1px solid #f43f5e; border-radius: 12px; padding: 16px;
                display: flex; flex-direction: column; gap: 8px;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold; font-size: 16px; color: #fda4af;">${b.nameIT}</span>
                  <span style="font-size: 11px; color: #94a3b8;">${b.nameJP}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: #cbd5e1; margin-top: 4px;">
                  <div>❤️ Salute Base: <b>${b.hpBase.toLocaleString()} HP</b></div>
                  <div>⚔️ Danno Colpo: <b>${b.damage}</b></div>
                  <div>⚡ Attacco Speciale: <b>${b.specialAttackDamage} AoE</b></div>
                  <div>✦ Frammenti Drop: <b>+${b.fragments}</b></div>
                </div>
                <div style="font-size: 11px; color: #e2e8f0; line-height: 1.4; margin-top: 6px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;">
                  🔥 <b>Fase 2:</b> Entra in forma risvegliata al ${(b.phase2HpPercent * 100)}% di salute con velocità aumentata e raffiche di proiettili a ventaglio!
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private bindFilters(): void {
    const sInput = document.getElementById('bb-search-input') as HTMLInputElement;
    sInput?.addEventListener('input', () => {
      this.searchFilter = sInput.value;
      const content = document.getElementById('bb-content');
      if (content) content.innerHTML = this.renderTabContent();
    });

    const eSelect = document.getElementById('bb-elem-select') as HTMLSelectElement;
    eSelect?.addEventListener('change', () => {
      this.elementFilter = eSelect.value;
      const content = document.getElementById('bb-content');
      if (content) content.innerHTML = this.renderTabContent();
    });
  }
}
