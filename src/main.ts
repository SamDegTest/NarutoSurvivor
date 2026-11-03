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
import { GamepadMenuNavigator } from './controls/GamepadMenuNavigator';
import { preloadNarutoIcons } from './rendering/IconManager';
import { SaveSystem } from './systems/saveSystem';
import type { Character } from './types/character';

import { StageSelectModal, type StageDefinition } from './ui/StageSelectModal';
import { TeamModal } from './ui/TeamModal';
import { MultiplayerModal } from './ui/MultiplayerModal';
import { BingoBookModal } from './ui/BingoBookModal';
import { LeaderboardModal } from './ui/LeaderboardModal';

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

  // Preload authentic Naruto Anime icons
  await preloadNarutoIcons();

  const W = GAME_CONFIG.WIDTH;
  const H = GAME_CONFIG.HEIGHT;

  // Initialize Global Gamepad Menu Navigator
  new GamepadMenuNavigator(app);

  // ── Screens & Modals ─────────────────────────────────────────
  const mainMenu         = new MainMenuScreen(app);
  const selectScreen     = new CharacterSelectScreen(app);
  const gameScene        = new GameScene(app);
  const stageSelectModal = new StageSelectModal(app.stage, W, H);
  const teamModal        = new TeamModal(app.stage, W, H);
  const multiplayerModal = new MultiplayerModal();
  const bingoBookModal   = new BingoBookModal();
  const gachaModal       = new GachaModal(app.stage, W, H);
  const upgradesModal    = new UpgradesModal(app.stage, W, H);
  const shopModal        = new ShopModal(app.stage, W, H);
  const missionsModal    = new MissionsModal(app.stage, W, H);
  const bagModal         = new BagModal(app.stage, W, H);
  const settingsModal    = new SettingsModal(app.stage, W, H);
  const leaderboardModal = new LeaderboardModal(app.stage, W, H);

  // Initial state: hide character select and sub-screens
  selectScreen.hide();

  // ── Flow: Start Game ─────────────────────────────────────────
  const startPlay = (character: Character, stage?: StageDefinition) => {
    mainMenu.hide();
    selectScreen.hide();
    stageSelectModal.hide();
    const currentRank = SaveSystem.getCharacterRank(character.id, character.baseRank);
    const fragments = SaveSystem.getFragments(character.id);
    gameScene.start({
      character,
      rank: currentRank,
      fragments,
      stageId: stage?.id,
      stageBiome: stage?.biome,
      stageName: stage?.nameIT,
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
    // 1. Play (Enter the stage)
    onPlay: (char: Character) => {
      stageSelectModal.show(char, (stage) => {
        startPlay(char, stage);
      });
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

    // 8. Friends (Squadra Ninja & Compagno)
    onOpenFriends: () => {
      teamModal.show(() => mainMenu.refreshData());
    },

    // 9. Leaderboard (Classifica Hokage)
    onOpenLeaderboard: () => {
      leaderboardModal.show();
    },

    // 10. Multiplayer (Co-op 2 Giocatori)
    onOpenMultiplayer: () => {
      multiplayerModal.show((cfg) => {
        mainMenu.hide();
        selectScreen.hide();
        stageSelectModal.hide();
        const currentRank = SaveSystem.getCharacterRank(cfg.p1Character.id, cfg.p1Character.baseRank);
        const fragments = SaveSystem.getFragments(cfg.p1Character.id);
        gameScene.start({
          character: cfg.p1Character,
          rank: currentRank,
          fragments,
          multiplayerMode: cfg.mode,
          coopPartner: cfg.p2Character,
        });
      });
    },

    // 11. Libro Bingo (Codex Enciclopedia Shinobi)
    onOpenCodex: () => {
      bingoBookModal.show();
    },

    // 12. Settings (Impostazioni)
    onOpenSettings: () => {
      settingsModal.show();
    },
  };

  // Launch initial Main Menu!
  mainMenu.show(menuCallbacks);
}

main().catch(console.error);
