import { Application } from 'pixi.js';
import { GAME_CONFIG } from './config/gameConfig';
import { MainMenuScreen, type MainMenuCallbacks } from './ui/MainMenu';
import { CharacterSelectScreen } from './ui/CharacterSelect';
import { GameScene } from './scenes/GameScene';
import { GachaModal } from './ui/GachaModal';
import { UpgradesModal } from './ui/UpgradesModal';
import { ShopModal } from './ui/ShopModal';
import { MissionsModal } from './ui/MissionsModal';
import { BagModal } from './ui/BagModal';
import { SettingsModal } from './ui/SettingsModal';
import { GenericInfoModal } from './ui/GenericInfoModal';
import { GamepadMenuNavigator } from './controls/GamepadMenuNavigator';
import { SaveSystem } from './systems/saveSystem';
import type { Character } from './types/character';

// ============================================================
//  NarutoSurvivor — Application Bootstrap (PokéSurvivor Style)
// ============================================================

async function main(): Promise<void> {
  const app = new Application();

  await app.init({
    width:            GAME_CONFIG.WIDTH,
    height:           GAME_CONFIG.HEIGHT,
    backgroundColor:  0x0A0F0D,
    antialias:        true,
    resolution:       window.devicePixelRatio || 1,
    autoDensity:      true,
  });

  // Mount canvas
  document.getElementById('app')!.appendChild(app.canvas);

  const W = GAME_CONFIG.WIDTH;
  const H = GAME_CONFIG.HEIGHT;

  // Initialize Global Gamepad Menu Navigator
  new GamepadMenuNavigator(app);

  // ── Screens & Modals ─────────────────────────────────────────
  const mainMenu      = new MainMenuScreen(app);
  const selectScreen  = new CharacterSelectScreen(app);
  const gameScene     = new GameScene(app);
  const gachaModal    = new GachaModal(app.stage, W, H);
  const upgradesModal = new UpgradesModal(app.stage, W, H);
  const shopModal     = new ShopModal(app.stage, W, H);
  const missionsModal = new MissionsModal(app.stage, W, H);
  const bagModal      = new BagModal(app.stage, W, H);
  const settingsModal = new SettingsModal(app.stage, W, H);
  const infoModal     = new GenericInfoModal(app.stage, W, H);

  // Initial state: hide character select and sub-screens
  selectScreen.hide();

  // ── Flow: Start Game ─────────────────────────────────────────
  const startPlay = (character: Character) => {
    mainMenu.hide();
    selectScreen.hide();
    const currentRank = SaveSystem.getCharacterRank(character.id, character.baseRank);
    const fragments = SaveSystem.getFragments(character.id);
    gameScene.start({
      character,
      rank: currentRank,
      fragments,
    });
  };

  // ── Return to Menu from Game Over ────────────────────────────
  gameScene.setOnReturnToMenu(() => {
    mainMenu.show(menuCallbacks);
  });

  // ── Return to Menu from Character Select ─────────────────────
  selectScreen.setOnBackToMenu(() => {
    selectScreen.hide();
    mainMenu.show(menuCallbacks);
  });

  // ── PokéSurvivor Menu Callbacks ──────────────────────────────
  const menuCallbacks: MainMenuCallbacks = {
    // 1. Play (Enter the dungeon)
    onPlay: (char: Character) => {
      startPlay(char);
    },

    // 2. Pokémon (Shinobi Roster)
    onOpenRoster: () => {
      mainMenu.hide();
      selectScreen.show((char: Character) => {
        // When picked from roster, update selected character and return to main menu or play
        SaveSystem.setSelectedCharacterId(char.id);
        selectScreen.hide();
        mainMenu.show(menuCallbacks);
      });
    },

    // 3. Upgrades (Permanent talent tree)
    onOpenUpgrades: () => {
      upgradesModal.show(() => mainMenu.refreshData());
    },

    // 4. Emporio Ninja & Ichiraku Ramen (Shop)
    onOpenShop: () => {
      shopModal.show(() => mainMenu.refreshData());
    },

    // 5. Bag (Borsa Ninja)
    onOpenBag: () => {
      bagModal.show(() => mainMenu.refreshData());
    },

    // 6. Gacha (Evocazione Ninja)
    onOpenGacha: () => {
      gachaModal.show(() => mainMenu.refreshData());
    },

    // 7. Missions (Missioni & Obiettivi)
    onOpenMissions: () => {
      missionsModal.show(() => mainMenu.refreshData());
    },

    // 8. Friends (Squadra Ninja & Co-op)
    onOpenFriends: () => {
      infoModal.show({
        title: '👥 SQUADRA NINJA (TEAM / FRIENDS)',
        subtitle: 'Formazione ninja a 3 membri e sinergie della Foglia',
        color: 0x06B6D4,
        items: [
          { icon: '🍃', title: 'Team 7 Classico', desc: 'Naruto Uzumaki + Sasuke Uchiha + Sakura Haruno', extra: 'Sinergia Attiva: +15% Velocità' },
          { icon: '⚡', title: 'Guardiani del Tuono', desc: 'Kakashi Hatake + Minato Namikaze', extra: 'Sinergia: +20% Critico' },
          { icon: '👁️', title: 'Fratelli Uchiha', desc: 'Sasuke Uchiha + Itachi Uchiha', extra: 'Sinergia: Amaterasu potenziato' },
          { icon: '🌐', title: 'Modalità Co-op Multi-Shinobi', desc: 'In arrivo nella Fase 4: stanza multigiocatore online!', extra: 'Presto' },
        ],
      });
    },

    // 9. Leaderboard (Classifica Hokage)
    onOpenLeaderboard: () => {
      infoModal.show({
        title: '🏆 CLASSIFICA SHINOBI (LEADERBOARD)',
        subtitle: 'Record storici dei ninja che sono sopravvissuti più a lungo',
        color: 0xFACC15,
        items: [
          { icon: '🥇', title: '1. Minato_YellowFlash', desc: 'Tempo: 42:18 • Minato Namikaze (4★)', extra: 'Score: 1,420,000' },
          { icon: '🥈', title: '2. Itachi_CrowMaster', desc: 'Tempo: 38:45 • Itachi Uchiha (3★)', extra: 'Score: 1,180,000' },
          { icon: '🥉', title: '3. ShisuiUchiha (Tu)', desc: 'Tempo: 34:14 • Naruto Sei Vie (5★)', extra: 'Score: 980,500' },
          { icon: '🎗️', title: '4. Gaara_SandStorm', desc: 'Tempo: 31:02 • Gaara (2★)', extra: 'Score: 840,000' },
        ],
      });
    },

    // 10. Settings (Impostazioni)
    onOpenSettings: () => {
      settingsModal.show();
    },
  };

  // Launch initial Main Menu!
  mainMenu.show(menuCallbacks);
}

main().catch(console.error);
