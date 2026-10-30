# INSTRUCTIONS.md - NarutoSurvivor Development &amp; Architecture Guide

&gt; Guida operativa, architetturale e tecnica per agenti di codice (Copilot, Cursor, Claude Code, Gemini) e sviluppatori per la realizzazione di **NarutoSurvivor**: un videogioco roguelite horde-survival top-down 2D per browser ispirato a PokéSurvivor e Vampire Survivors.

---

## 1\. VISIONE DEL PROGETTO &amp; PRINCIPI GUIDA

* **Genere**: 2D Top-Down Action Roguelite / Horde Survival.
* **Piattaforma**: Web Browser (Desktop e Mobile Friendly), gratuito e non-profit fan project.
* **Riferimento di Gameplay**: **PokéSurvivor** (browser-based, progressione cloud, co-op multiplayer fino a 4 giocatori, classifiche, assenza di pay-to-win/microtransazioni).
* **Core Loop**:  
  1. *Selezione Shinobi*: Scegli uno Shinobi sbloccato (con la sua rarità e statistiche base).
  2. *Survival Run*: Muoviti, schiva le orde crescenti di Zetsu Bianchi/Ninja Traditori, raccogli globi di Chakra (EXP) e Monete Ryo.
  3. *In-Run Level Up*: Scegli 1 tra 3 opzioni (Jutsu attivi, Strumenti Ninja passivi, Reroll). Combina elementi complementari per formare *Tecniche Combinate* (Sinergie).
  4. *Boss Fight*: Sopravvivi a orari prefissati contro membri Akatsuki o Cercoteri (Bijuu).
  5. *Meta-Progressione*: Torna al villaggio, usa i Ryo nel *Negozio di Tenten/Ichiraku* per potenziare il Chakra e usa i *Rotoli Shinobi* nel Gacha per sbloccare nuove forme e Shinobi.

---

## 2\. PILASTRI DI GAME DESIGN INDEROGABILI

### 2.1 Roster Completo e Forme

* Copertura di tutti i capitoli (Naruto Classico, Shippuden).
* Ciascuna forma/trasformazione è una carta/personaggio indipendente con proprio sprite sheet, statistiche base e Jutsu iniziale (es. `naruto_genin`, `naruto_sage`, `naruto_six_paths`; `sasuke_genin`, `sasuke_curse_mark`, `sasuke_mangekyo`, `sasuke_rinnegan`).

### 2.2 Sistema di Rarità basato sulla Lore (5 Livelli)

1. **1★ Comune (Genin / Base)**: Statistiche base ridotte, costo di potenziamento basso, alta frequenza gacha. Fornisce utility passive di farming (+EXP, +Drop Ryo).
2. **2★ Rara (Chūnin / Specialisti)**: Statistiche bilanciate, passive di crowd-control o mobility uniche.
3. **3★ Epica (Jōnin d'Elite / Akatsuki / Kage)**: Statistiche elevate, 2 abilità innate, ampi attacchi ad area (AoE).
4. **4★ Leggendaria (Forme Avanzate / Jinchūriki)**: Statistiche d'impatto elevatissime, abilità di trasformazione temporanea.
5. **5★ Mitica (Forme Divine / Sei Vie / Otsutsuki)**: Aure passive ad area permanente, Jutsu supremi devastanti.
* **Meccanica Frammenti**: Ottenendo duplicati nel Gacha, i personaggi 1★-2★ possono essere promossi fino a 5★ con moltiplicatori percentuali, evitando l'obsolescenza dei ninja base.

### 2.3 Fedeltà Canonica ai Jutsu &amp; Sinergie Elementali

* Solo tecniche e strumenti realmente visti nell'opera.
* **Sinergie Elementali (Tecniche Combinate)**: Raggiunto il livello massimo di un Jutsu attivo e possedendo il relativo strumento/elemento passivo, l'abilità evolve liberando uno slot o fondendosi in una mossa superiore (es. *Fuoco + Vento = Vampa Infernale*, *Chidori + Lama Ninja = Chidori Nagashi*).

### 2.4 Coerenza Visiva (Pixel Art Uniforme)

* Rigorosa uniformità nello stile degli sprite (16-bit / 32-bit derivati da titoli come *Jump Ultimate Stars*, *Shinobi Rumble*, *Ninja Council 2*).
* Proporzioni e bounding box standardizzati (32x32 o 48x48 pixel).

---

## 3\. STACK TECNOLOGICO RACCOMANDATO

* **Frontend / Game Engine**: HTML5 Canvas con **Phaser 3** (consigliato per robustezza 2D, gestione sprite sheet, arcade physics e particle system) oppure **PixiJS** \+ loop custom.
* **Framework UI / Meta-Game**: React o Vue o Svelte (per menu principale, profilo, negozio, gacha, chat co-op e leaderboard) sovrapposto al Canvas di gioco.
* **Linguaggio**: TypeScript (strict mode) per garantire la tipizzazione sicura di abilità, entità e sinergie.
* **Bundler &amp; Build Tool**: Vite (avvio istantaneo e HMR).
* **Backend &amp; Cloud (Multiplayer/Salvataggi)**:  
  * *Auth &amp; Cloud Save*: Firebase Auth + Firestore, Supabase o Appwrite (salvataggio inventario, roster e statistiche).
  * *Multiplayer Co-op (4 giocatori)*: Server Node.js con **Colyseus** o **Socket.io** (gestione stanze, sincronizzazione posizioni, HP e boss aggro con interpolazione client).

---

## 4\. ARCHITETTURA MODULARE DEL CODICE

La struttura delle cartelle deve rispettare la separazione netta tra motore di gioco (in-run) e meta-progressione:

```
narutosurvivor/
├── public/
│   ├── assets/
│   │   ├── sprites/          # Sprite sheets (personaggi, nemici, boss)
│   │   ├── icons/            # Icone Jutsu, oggetti passivi, UI
│   │   ├── maps/             # Tileset (Foresta della Morte, Valle della Fine, Konoha)
│   │   └── audio/            # SFX e BGM retro 16-bit
│   └── favicon.ico
├── src/
│   ├── engine/               # Logica in-run (Phaser / Canvas)
│   │   ├── scenes/           # BootScene, PreloadScene, GameScene, GameOverScene
│   │   ├── entities/         # Player, Enemy, Boss, Projectile, DropItem
│   │   ├── systems/          # SpawnerSystem, CollisionSystem, ExperienceSystem
│   │   └── controls/         # InputHandler (WASD, Mouse, Virtual Joystick)
│   ├── data/                 # Modelli dati statici e bilanciamento
│   │   ├── characters.ts     # Configurazione completa Roster, Forme e Rarità
│   │   ├── jutsu.ts          # Catalogo Jutsu attivi
│   │   ├── passives.ts       # Strumenti Ninja passivi
│   │   ├── synergies.ts      # Matrice delle Tecniche Combinate
│   │   └── maps.ts           # Configurazione stage, ondate e boss timer
│   ├── ui/                   # Interfaccia grafica (Menu, HUD, Modali)
│   │   ├── components/       # HUD in-game, LevelUpModal, DamageNumbers
│   │   ├── gacha/            # SummonScreen (Rotoli Shinobi, animazioni evocazione)
│   │   ├── shop/             # Negozio di Tenten / Allenamento Chakra
│   │   └── leaderboard/      # Tabella classifiche globali
│   ├── services/             # Comunicazione esterna
│   │   ├── authService.ts    # Gestione account e salvataggi Cloud
│   │   ├── storageService.ts # LocalStorage fallback per gioco offline
│   │   └── networkService.ts # Client WebSocket per Co-op fino a 4 giocatori
│   ├── types/                # Definizioni TypeScript condivise
│   ├── main.ts               # Entry point dell'applicazione
│   └── App.vue / App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts

```

---

## 5\. SCHEMI DATI FONDAMENTALI (TYPESCRIPT)

Ogni implementatore deve conformarsi a queste interfacce per garantire coerenza tra dati e logica:

### 5.1 Definizione Personaggio

```
export type Rarity = '1_COMMON' | '2_RARE' | '3_EPIC' | '4_LEGENDARY' | '5_MYTHIC';

export interface CharacterConfig {
  id: string;                    // es. 'naruto_sage'
  name: string;                  // es. 'Naruto Uzumaki'
  form: string;                  // es. 'Modalità Eremita'
  rarity: Rarity;
  baseStats: {
    maxHp: number;
    speed: number;
    chakraRegen: number;
    attackMultiplier: number;
    defenseMultiplier: number;
  };
  initialJutsuId: string;        // es. 'rasengan_base'
  passiveUtility?: {
    type: 'EXP_BONUS' | 'RYO_BONUS' | 'COOLDOWN_REDUCTION';
    value: number;
  };
  spriteConfig: {
    sheetPath: string;
    frameWidth: number;
    frameHeight: number;
    animations: {
      idle: { frames: number[]; frameRate: number };
      run: { frames: number[]; frameRate: number };
      cast: { frames: number[]; frameRate: number };
      hit: { frames: number[]; frameRate: number };
    };
  };
}

```

### 5.2 Definizione Jutsu &amp; Sinergie

```
export type ChakraNature = 'FIRE' | 'WIND' | 'LIGHTNING' | 'EARTH' | 'WATER' | 'TAIJUTSU' | 'YIN_YANG';

export interface Jutsu {
  id: string;
  name: string;
  nature: ChakraNature;
  maxLevel: number;
  description: string;
  baseDamage: number;
  cooldownMs: number;
  areaOfEffect: number;
  projectileSpeed?: number;
  iconPath: string;
}

export interface SynergyRecipe {
  id: string;
  resultJutsuId: string;          // Jutsu combinato risultante
  requiredActiveJutsuId: string;  // Jutsu attivo al livello massimo
  requiredPassiveToolId: string;  // Strumento/Passiva necessaria
}

```

---

## 6\. REQUISITI PER IL GAMEPLAY &amp; CONTROLLI

1. **Movimento &amp; Mira**:  
  * PC: Supporto WASD / Frecce direzionali. Mira automatica verso il bersaglio nemico più vicino con opzione di override tramite puntatore mouse.
  * Mobile: Virtual Joystick su schermo sensibile al touch.
2. **Ciclo di Spawn &amp; Difficoltà**:  
  * Gestione delle ondate scandite da timer di stage (minuto 0-3 nemici deboli, minuto 5 mini-boss, minuto 15/30 Boss Finale).
  * Utilizzo rigoroso di un **Object Pooling System** per proiettili, particelle e nemici, garantendo oltre 60 FPS con centinaia di sprite a schermo.
3. **Multiplayer Co-op (4 Giocatori)**:  
  * Sincronizzazione a stati autoritativi leggeri con interpolazione per le posizioni degli altri 3 giocatori.
  * Riconoscimento condiviso dei boss con scale proporzionale degli HP in base al numero di giocatori in stanza.

---

## 7\. LINEE GUIDA PER L'AGENTE AI DURANTE LA CODIFICA

Quando generi codice per questo progetto:

1. **Non inventare mai Jutsu o forme non canoniche**: Fai riferimento solo all'anime/manga di Naruto.
2. **Priorità alle performance**: Evita instanziazioni continue di oggetti nel loop `update()`; usa sempre i pool di memoria per proiettili e nemici.
3. **Modularità e Testabilità**: Separa la logica matematica di danno/collisione dalla grafica Phaser/Canvas.
4. **Resilienza Offline**: Implementa sempre una sincronizzazione a due vie: le run e i progressi devono salvarsi in `localStorage` se il giocatore non è autenticato o se il server cloud non risponde.