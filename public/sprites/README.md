# 🥷 NarutoSurvivor — Guida agli Sprite & Naming Convention

Questa cartella raccoglie tutti gli asset grafici per personaggi, nemici, boss e ritratti di **NarutoSurvivor**.
Il motore di gioco supporta il **caricamento dinamico automatico**:
- Se un'immagine è presente nella cartella corretta con il nome corretto, viene caricata e renderizzata a schermo.
- Se l'immagine non è ancora presente, il gioco utilizza automaticamente il rendering procedurale in pixel-art come **fallback sicuro**, senza generare errori o crash.

---

## 📁 Struttura delle Cartelle

```text
public/sprites/
├── raw_sheets/   -> Fogli di sprite completi / Sprite Sheet originali (GBA/NDS/Custom con sfondi uniformi)
├── characters/   -> Sprite di gioco per tutti i ninja giocabili e alleati (con trasparenza)
├── portraits/    -> Ritratti del volto/busto (Schermata selezione, Roster, HUD)
├── enemies/      -> Sprite dei nemici comuni durante le ondate
├── bosses/       -> Sprite dei boss dei portali dimensionali (Fase 1 e Fase 2)
└── vfx/          -> Texture opzionali per proiettili e tecniche speciali
```

---

## 📐 Specifiche Tecniche & Formato

- **Formato raccomandato**: PNG a 32-bit con sfondo trasparente (`.png`). Supportati anche `.webp` e `.svg`.
- **Risoluzioni consigliate**:
  - **Personaggi in-game (`characters/`)**:
    - Pixel Art classica: `32x32` o `48x48` px
    - HD / Alta Risoluzione: `64x64` o `128x128` px
    - L'ancoraggio (pivot) è centrato alla base dei piedi. Il gioco gestisce automaticamente il flip orizzontale quando il ninja corre verso sinistra o destra.
  - **Ritratti (`portraits/`)**:
    - `64x64` px o `128x128` px quadrati (primo piano del viso o busto con coprifronte).
  - **Nemici (`enemies/`)**:
    - `32x32` px (Zetsu, ninja traditori)
    - `48x48` px (Anbu corrotti)
    - `64x64` px (Evocazioni grandi)
  - **Boss (`bosses/`)**:
    - `64x64` px o `96x96` px (Kisame, Itachi, Pain)
    - `128x128` px o `160x160` px (Jūbi / Dieci Code)

---

## 🏷️ Naming Convention Ufficiale

Il nome del file deve corrispondere esattamente all'**`ID` dell'entità in snake_case (tutto minuscolo con underscore)** seguito da `.png`.

### 1. Personaggi Giocabili (`public/sprites/characters/`)
Formato: `<character_id>.png`

#### Esempi Principali:
- `naruto_genin.png` (Naruto Uzumaki - Genin)
- `sasuke_genin.png` (Sasuke Uchiha - Genin)
- `sakura_genin.png` (Sakura Haruno - Genin)
- `kakashi_sharingan.png` (Kakashi Hatake - Sharingan)
- `naruto_sage.png` (Naruto - Modalità Eremitica)
- `itachi_akatsuki.png` (Itachi Uchiha - Akatsuki)
- `rock_lee.png` (Rock Lee - Loto Primario)
- `gaara_chunin.png` (Gaara del Deserto)
- `minato_namikaze.png` (Minato Namikaze - Lampo Giallo)
- `jiraiya_sannin.png` (Jiraiya - Sannin Leggendario)
- `tsunade_sannin.png` (Tsunade - Quinto Hokage)
- `orochimaru_sannin.png` (Orochimaru - Sannin del Serpente)
- `pain_tendo.png` (Pain - Mondo Deva)
- `naruto_six_paths.png` (Naruto - Sei Vie)
- `sasuke_rinnegan.png` (Sasuke - Rinnegan Supremo)
- `madara_six_paths.png` (Madara - Eremita delle Sei Vie)
- `might_guy_night.png` (Might Guy - Drago Notturno delle 8 Porte)

*(Per la lista completa dei 90+ shinobi vedi la sezione sotto)*

---

### 2. Ritratti / Avatar (`public/sprites/portraits/`)
Formato: `<character_id>.png` (stesso identico ID dei personaggi)

Esempi:
- `naruto_genin.png`
- `sasuke_genin.png`
- `kakashi_sharingan.png`
- `itachi_akatsuki.png`
- `gaara_chunin.png`

---

### 3. Nemici Comuni (`public/sprites/enemies/`)
Formato: `<enemy_type>.png`

- `zetsu.png` -> Zetsu Bianco (fanteria base veloce)
- `traitor_ninja.png` -> Ninja Rinnegato / Traditore (combattente corpo a corpo)
- `anbu_corrupt.png` -> Ninja Anbu Corrotto (maschera e katana, attacco rapido)
- `summon.png` -> Evocazione Nemica Gigante (tank ad alta salute)

---

### 4. Boss dei Portali Spazio-Temporali (`public/sprites/bosses/`)
Formato: `<boss_id>.png` per la Fase 1, e facoltativamente `<boss_id>_phase2.png` per la Fase 2!

- **Kisame Hoshigaki**:
  - `kisame.png` (Fase 1: Kisame con Samehada sguainata)
  - `kisame_phase2.png` (Fase 2: Fusione squalo con Samehada)
- **Itachi Uchiha**:
  - `itachi.png` (Fase 1: Mantello Akatsuki e Sharingan)
  - `itachi_phase2.png` (Fase 2: Gabbia toracica del Susanoo dorata/rossa)
- **Pain Tendo**:
  - `pain_tendo.png` (Fase 1: Corpo Deva con piercing neri di chakra)
  - `pain_tendo_phase2.png` (Fase 2: Fluttuazione aerea con Chibaku Tensei)
- **Jūbi (Dieci Code)**:
  - `ten_tails.png` (Fase 1: Colosso primordiale a dieci code con occhio del Rinne Sharingan)
  - `ten_tails_phase2.png` (Fase 2: Forma evoluta eretta con bocca a fiore di chakra)

---

## 📜 Elenco Completo degli ID dei Personaggi

Di seguito l'elenco esatto di tutti i personaggi registrati nel Roster di gioco:

### Genin & Compagni di Konoha
- `naruto_genin` (Naruto Genin)
- `sasuke_genin` (Sasuke Genin)
- `sakura_genin` (Sakura Genin)
- `rock_lee` (Rock Lee)
- `shikamaru_genin` (Shikamaru Nara)
- `choji_genin` (Choji Akimichi)
- `ino_genin` (Ino Yamanaka)
- `neji_genin` (Neji Hyuga)
- `hinata_genin` (Hinata Hyuga)
- `kiba_genin` (Kiba Inuzuka)
- `shino_genin` (Shino Aburame)
- `tenten_genin` (Tenten)
- `temari_genin` (Temari)
- `kankuro_genin` (Kankuro)
- `haku_genin` (Haku)
- `konohamaru_genin` (Konohamaru Sarutobi)
- `teuchi_ramen` (Teuchi Ichiraku)
- `udon_moegi` (Udon & Moegi)
- `dosu_kinuta` (Dosu Kinuta)
- `zaku_abumi` (Zaku Abumi)
- `kin_tsuchi` (Kin Tsuchi)
- `mizuki` (Mizuki)
- `nawaki` (Nawaki Senju)

### Chunin & Ninja Esperti
- `gaara_chunin` (Gaara del Deserto)
- `sai_shippuden` (Sai)
- `yamato_shippuden` (Yamato)
- `iruka_sensei` (Iruka Umino)
- `anko_mitarashi` (Anko Mitarashi)
- `shizune` (Shizune)
- `hayate_gekko` (Hayate Gekko)
- `suigetsu_hozuki` (Suigetsu Hozuki)
- `karin_uzumaki` (Karin Uzumaki)
- `jugo` (Jugo del Sigillo Maledetto)
- `ebisu_sensei` (Ebisu)
- `kotetsu_izumo` (Kotetsu Hagane)
- `izumo_kamizuki` (Izumo Kamizuki)
- `jirobo` (Jirobo)
- `kidomaru` (Kidomaru)
- `sakon_ukon` (Sakon & Ukon)
- `tayuya` (Tayuya del Flauto)
- `kushina_uzumaki` (Kushina Uzumaki)
- `genma_shiranui` (Genma Shiranui)
- `baki_suna` (Baki)
- `omoi_kumo` (Omoi)
- `karui_kumo` (Karui)

### Jonin, Akatsuki & Maestri
- `kakashi_sharingan` (Kakashi Hatake)
- `might_guy` (Might Guy)
- `asuma_sarutobi` (Asuma Sarutobi)
- `kurenai_yuhi` (Kurenai Yuhi)
- `itachi_akatsuki` (Itachi Uchiha)
- `kisame_hoshigaki` (Kisame Hoshigaki)
- `deidara_akatsuki` (Deidara)
- `sasori_akatsuki` (Sasori della Sabbia Rossa)
- `hidan_akatsuki` (Hidan del Culto di Jashin)
- `kakuzu_akatsuki` (Kakuzu delle 5 Maschere)
- `konan_akatsuki` (Konan dell'Origami d'Angelo)
- `zabuza_momochi` (Zabuza Momochi)
- `kimimaro` (Kimimaro Kaguya)
- `chiyo_baasama` (Vecchia Chiyo)
- `darui_kumo` (Darui del Lampo Nero)
- `shisui_uchiha` (Shisui del Teletrasporto)
- `danzo_shimura` (Danzo Shimura)
- `kabuto_yakushi` (Kabuto Yakushi)
- `zetsu_akatsuki` (Zetsu Nero e Bianco)
- `hanzo_salamander` (Hanzo delle Salamandre)
- `mifune_samurai` (Generale Mifune)
- `yugito_nii` (Yugito Nii - Nibi)
- `yagura_karatachi` (Yagura - Sanbi)
- `roshi_jinchuriki` (Roshi - Yonbi)
- `utakata_jinchuriki` (Utakata - Rokubi)
- `fuu_jinchuriki` (Fuu - Nanabi)
- `sakumo_hatake` (Zanna Bianca della Foglia)

### Sannin, Kage & Shinobi Leggendari
- `minato_namikaze` (Minato Namikaze - Lampo Giallo)
- `jiraiya_sannin` (Jiraiya il Sannin dei Rospi)
- `tsunade_sannin` (Tsunade la Principessa Lumaca)
- `orochimaru_sannin` (Orochimaru il Sannin dei Serpenti)
- `hashirama_senju` (Hashirama Senju - Dio dei Ninja)
- `tobirama_senju` (Tobirama Senju - Secondo Hokage)
- `hiruzen_sarutobi` (Hiruzen Sarutobi - Terzo Hokage)
- `killer_bee` (Killer Bee - Hachibi)
- `raikage_ay` (Quarto Raikage Ay)
- `onoki_tsuchikage` (Onoki della Roccia Volante)
- `mei_terumi` (Mei Terumi - Quinto Mizukage)
- `pain_tendo` (Pain - Sei Vie di Samsara)
- `naruto_sage` (Naruto Eremita dei Rospi)
- `sasuke_ms` (Sasuke Mangekyō Sharingan)
- `mu_tsuchikage` (Mu - Secondo Tsuchikage)
- `gengetsu_mizukage` (Gengetsu Hozuki)
- `raikage_third` (Terzo Raikage della Lancia Fulminea)
- `rasa_kazekage` (Rasa - Quarto Kazekage)
- `gaara_kazekage` (Gaara - Quinto Kazekage)
- `kabuto_sage` (Kabuto Eremita dei Draghi)
- `itachi_susanoo` (Itachi Susanoo con Spada Totsuka)
- `kakashi_dms` (Kakashi Doppio Mangekyō Sharingan)

### Dei Ninja & Livello Sei Vie
- `naruto_six_paths` (Naruto Modalità Eremita delle Sei Vie)
- `sasuke_rinnegan` (Sasuke Rinnegan Supremo)
- `madara_six_paths` (Madara Eremita delle Sei Vie)
- `obito_six_paths` (Obito Jinchūriki del Dieci Code)
- `might_guy_night` (Guy della Notte - 8 Porte)
- `kaguya_otsutsuki` (Kaguya Otsutsuki - Progenitrice del Chakra)
- `hagoromo_otsutsuki` (Eremita delle Sei Vie - Hagoromo)
- `hamura_otsutsuki` (Hamura Otsutsuki)
- `indra_otsutsuki` (Indra Otsutsuki)
- `asura_otsutsuki` (Asura Otsutsuki)
- `toneri_otsutsuki` (Toneri Otsutsuki - Tenseigan)
- `momoshiki_otsutsuki` (Momoshiki Otsutsuki Risvegliato)

