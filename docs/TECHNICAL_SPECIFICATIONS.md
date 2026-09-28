# Tabletop Simulator - Technical Specifications Document (PRD & Software Architecture)

> **Documento Tecnico di Specifiche & Architettura Software**  
> **Ruolo**: Senior Technical Product Manager & Lead Software Architect  
> **Riferimento Video**: [Learn How to Use Tabletop Simulator - A Tutorial (Meeple Mountain)](https://youtu.be/2e33yiHHEes?is=jbNuuzqyVMD5W4WR)  
> **Target**: Claude Code, Cursor, GitHub Copilot, Lead Developers & 3D Web Engineers  

---

![Tabletop Simulator Cover](/screenshots/00_tabletop_simulator_cover.jpg)
*(Fonte: Meeple Mountain - "Learn How to Use Tabletop Simulator")*

---

## 1. Obiettivo del Progetto & Panoramica Generale

### 1.1 Mission e Core Concept
L'obiettivo è progettare e implementare un simulatore universale per giochi da tavolo (*Tabletop Sandbox Virtuale 3D*) accessibile via browser o client nativo, che replichi l'esperienza tattile, fisica e sociale del gioco dal vivo attorno a un tavolo fisico. 

A differenza dei videogiochi rigidi con regole hard-coded, il sistema adotta una filosofia **Physics-First Sandbox**:
- Il motore **non impone regole arbitrarie** a priori; fornisce invece gli strumenti fisici (carte, dadi, fiches, miniature, pedine, orologi, blocco appunti, gizmo di disegno) per permettere ai giocatori di manipolare qualsiasi componente liberamente.
- Supporta sia sessioni **Single Player / Hotseat** sia sessioni **Multiplayer Server-Authoritative** in tempo reale con gestione dei ruoli, zone riservate (*Fog of War / Private Hand*) e permessi.

---

## 2. Stack Tecnologico & Dipendenze Richieste

### 2.1 Architettura Client (Frontend 3D & UI)
- **Runtime & Bundler**: TypeScript 5.x, React 19 / 18, Vite.
- **3D Engine**: Three.js (@types/three) o Babylon.js per il rendering di mesh, ombre dinamiche, texture PBR e shader personalizzati (feltro tavolo, carte lucide, plastica dadi).
- **Physics Engine**: Cannon-es / Rapier.js (WebAssembly per prestazioni a 60 FPS con collisioni rigide, attrito, inerzia e restituzione).
- **Styling & UI Overlay**: Tailwind CSS, Lucide React (per icone di toolbar, menu contestuali, dialogs).
- **Audio Synthesizer / Web Audio API**: Suoni fisici tridimensionali (lancio dadi, sfoglio carte, impilamento fiches, table flip).

### 2.2 Architettura Server (Multiplayer & Networking)
- **Runtime**: Node.js con Express & TypeScript (`tsx`).
- **Real-Time Transport**: WebSocket (`ws`) o WebRTC DataChannels per sincronizzazione fisica a bassa latenza (20-30 tick/s con interpolazione predittiva client-side).
- **State Store**: InMemory Room Manager con serializzazione delta per snapshot e rollback (Time Machine Undo/Redo).

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "cannon-es": "^0.20.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "ws": "^8.18.0",
    "canvas-confetti": "^1.9.4"
  }
}
```

---

## 3. Requisiti Funzionali Dettagliati

### 3.1 Gestione Sessioni, Lobby e Modalità di Gioco
![Multiplayer Lobby Setup](/screenshots/01_2m49s_how_to_create_a_multiplayer_game.jpg)
![Single Player Mode](/screenshots/03_4m43s_single_player.jpg)
![Classic Games & Presets](/screenshots/04_5m02s_paid_games.jpg)

- **Multiplayer Hosting**:
  - Creazione stanza con Server Name, Password protetta, Max Players (2-10 giocatori).
  - Modalità Server: Pubblica (Server Browser), Solo Amici o Connessione Diretta (IP/Porta o Room Code univoco a 6 caratteri).
- **Single Player & Hotseat**:
  - Modalità in solitaria con possibilità di cambiare colore attivo localmente per testare prototipi a turni.
- **Presets & Libreria Giochi**:
  - Caricamento di preset classici integrati: Scacchi, Dama, Poker / Texas Hold'em, Backgammon, Solitario, Blackjack, Mahjong.

---

### 3.2 Sistema Giocatori, Colori, Squadre e Zone Riservate
![Player Colors and Teams](/screenshots/05_6m37s_teams.jpg)

- **Postazioni a Colori**:
  - 10 colori standard disponibili attorno al tavolo: Bianco, Rosso, Blu, Verde, Giallo, Arancione, Viola, Rosa, Nero (Game Master / Host), Grigio (Spettatore passivo).
  - L'host può promuovere giocatori ad Amministratore o retrocedere a Spettatore.
- **Private Hand Zone (Mano Privata)**:
  - Ogni postazione possiede un'area delimitata sul bordo del tavolo.
  - Le carte portate in quest'area entrano nell'interfaccia docked (*Player Hand HUD*): il proprietario vede le facce delle carte, mentre gli altri giocatori vedono solo il dorso oscurato (*Fog of War*).
- **Blindfold (Benda per gli Occhi)**:
  - Tasto rapido `B`: oscura completamente la visuale del giocatore durante fasi segrete di setup o decisioni nascoste.

---

### 3.3 Ambiente, Tavoli e Customizzazione
![Change Table and Environments](/screenshots/06_8m05s_change_the_table.jpg)

- **Geometria del Tavolo**:
  - Rettangolare (classico legno o panno verde), Rotondo, Esagonale / Ottagonale, Tavolo da Poker con poggia-braccia imbottito.
- **Superficie Personalizzata**:
  - Possibilità di caricare un'immagine personalizzata URL per il feltro del tavolo (griglie per wargame, tabelloni personalizzati).
- **Skybox / Ambienti 3D**:
  - Sfondi selezionabili: Museo d'arte, Bosco, Stanza in legno, Tunnel futuristico, Spazio cosmico.

---

### 3.4 Sistema Telecamera & Navigazione Spaziale
![Camera Controls](/screenshots/07_9m03s_camera_controls.jpg)
![Pan Table](/screenshots/08_9m42s_pan_the_table.jpg)

- **Orbita & Rotazione**: Tasto destro del mouse premuto + trascinamento per orbitare la visuale attorno al punto focale centrale.
- **Pan Spaziale**: Tasto centrale (Mouse Wheel click) o tasti `W`, `A`, `S`, `D` per traslare la telecamera sul piano XZ del tavolo.
- **Zoom Continuo**: Rotella del mouse per avvicinarsi o allontanarsi con limiti di clipping min/max.
- **Top-Down 2D View**: Tasto `Space` o pulsante HUD per passare istantaneamente alla visuale zenitale a 90° perpendicolare al tavolo.
- **Camera Bookmarks**: `Ctrl + 1..9` per salvare posizioni di visuale e `1..9` per richiamarle con transizione fluida (lerp).

---

### 3.5 Meccaniche Fisiche & Interazione Oggetti
![Dice Rolling & Physics](/screenshots/12_17m25s_dice.jpg)
![Object Spawner & Components](/screenshots/13_18m41s_object_menu.jpg)
![Card Rotation & Stacking](/screenshots/14_25m05s_rotate_card.jpg)

- **Sollevamento e Lancio (Grab & Throw)**:
  - Click sinistro per agganciare un oggetto e sollevarlo ad altezza di navigazione.
  - Rilascio con velocità del mouse per imprimere forza vettoriale e rotazione fisica.
- **Rotazione Incrementale**:
  - Tasti `Q` ed `E` ruotano l'oggetto di un angolo prefissato (15°, 30°, 45°, 90°, configurabile tramite *Degree Snap*).
- **Capovolgimento (Flip)**:
  - Tasto `F`: inverte l'orientamento alto/basso di una carta, pedina o tessera (180° sull'asse X/Z).
- **Raggruppamento & Mazzi (Stacking / Grouping)**:
  - Tasto `G`: raggruppa carte o fiches selezionate creando un mazzo o una pila ordinata.
  - Rilascio di una carta sopra un mazzo: assorbimento automatico con animazione e suono di inserimento.
- **Mescolamento (Shuffle & Roll)**:
  - Tasto `R` su un mazzo: mescolamento casuale dell'array di carte.
  - Tasto `R` su dadi: agitazione fisica nello spazio e rilascio casuale.
- **Distribuzione Rapida (Dealing)**:
  - Tasti numerici `1`..`9` premuti col cursore sopra un mazzo: distribuisce N carte a ciascuna mano dei giocatori presenti o al cursore.
- **Selezione Multipla (Marquee Selection & Multi-drag)**:
  - Drag su area vuota per generare un rettangolo di selezione trasparente.
  - `Shift + Click` per aggiungere/rimuovere elementi dalla selezione.
  - Movimento coerente di tutto il gruppo selezionato preservando le distanze relative.
- **Ispezione ad Alta Risoluzione**:
  - Pressione del tasto `Alt` su qualsiasi elemento per mostrare un pop-up 2D ingrandito a pieno schermo.
- **Blocco Oggetti (Lock)**:
  - Tasto `L`: fissa un oggetto nello spazio rendendolo statico/inattaccabile dalla fisica (es. tabelloni di gioco o scenari).

---

### 3.6 Strumenti di Gioco, Comunicazione & Accessori
![Text Chat & Commands](/screenshots/09_10m23s_text_chat.jpg)
![Notebook Tool](/screenshots/10_11m31s_text_tool.jpg)
![Draw Menu & Joints](/screenshots/11_11m50s_draw_menu.jpg)
![Table Flip Physics](/screenshots/15_30m36s_table_flip.jpg)

- **Chat Testuale & Comandi Slash**:
  - Chat globale con messaggi di log colorati per ogni giocatore.
  - Comandi integrati: `/roll 2d6+3`, `/me <azione>`, `/w <colore> <messaggio>` (sussurro privato).
- **Blocco Appunti (Notebook)**:
  - Schede per regole generali e note condivise.
  - Schede private per ciascun colore (visibili solo a quel colore o all'Host/GM).
- **Turn Manager & Orologio Digitale**:
  - Tracciamento automatico del turno attivo, cronometro/timer a scalare, pulsante "Passa Turno".
- **Strumenti di Disegno & Grid Gizmo**:
  - Penna vettoriale sul tavolo con colori selezionabili e gomma per cancellare.
  - Metro a nastro 3D per misurare distanze in pollici/centimetri (fondamentale per wargame come Warhammer o D&D).
  - Giunti fisici: *Fixed Joint*, *Hinge Joint*, *Spring Joint*.
- **Table Flip & Undo Time Machine**:
  - Pulsante rosso di "Ribaltamento del Tavolo": applica un impulso violento al tavolo scagliando tutti gli oggetti in aria con simulazione caotica.
  - Pulsante di Undo / Rewind temporale: ripristina la cronologia esatta di posizione e rotazione di tutti gli oggetti pre-ribaltamento.

---

## 4. Architettura dei Dati & Flusso Logico

### 4.1 Schema Dati Entità (`TabletopState`)

```typescript
// Definizione stato del componente sul tavolo
export type PieceType = 'card' | 'deck' | 'die' | 'chip' | 'token' | 'board' | 'miniature';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface TabletopPiece {
  id: string;
  type: PieceType;
  name: string;
  position: Vector3D;
  rotation: Quaternion4D;
  velocity?: Vector3D;
  isLocked: boolean;
  color?: string;
  metadata: {
    suit?: '♠' | '♥' | '♦' | '♣';
    rank?: string;
    value?: number;
    faceUp?: boolean;
    textureUrl?: string;
    backUrl?: string;
    sides?: number; // per dadi (4, 6, 8, 10, 12, 20)
    cardIds?: string[]; // se è un deck impilato
  };
}

export interface PlayerHand {
  playerId: string;
  color: string;
  cards: TabletopPiece[];
}

export interface RoomState {
  roomId: string;
  roomName: string;
  tableType: 'rectangular' | 'round' | 'hexagonal' | 'poker';
  tableTexture: string;
  environmentSkybox: string;
  activeTurnPlayerId: string;
  turnTimerSeconds: number;
  pieces: Record<string, TabletopPiece>;
  hands: Record<string, PlayerHand>;
  historySnapshots: Record<string, TabletopPiece>[]; // Stack per Undo/Redo
}
```

### 4.2 Flusso Operativo Real-Time (Diagramma Sequenza)

```
[Giocatore A (Client)]        [Server Autoritativo]         [Giocatore B (Client)]
         |                              |                             |
         |--- GrabPiece(id, pos) ------>|                             |
         |                              |--- BroadcastPieceMove ----->| (Interpolazione)
         |                              |                             |
         |--- FlipPiece(id) ----------->|                             |
         |                              |--- SyncPieceState --------->| (Visualizza dorso/faccia)
         |                              |                             |
         |--- MoveToHand(cardId) ------>|                             |
         |                              |-- PrivateUpdate (Player A)->| (Mostra faccia a A)
         |                              |-- PublicUpdate (Player B) ->| (Mostra solo carta oscurata a B)
         |                              |                             |
         |--- TableFlip() ------------->|                             |
         |                              |-- TriggerPhysicsImpulse --->| (Fisica locale esplosiva)
         |                              |                             |
         |--- RequestUndo() ----------->|                             |
         |                              |-- RestoreSnapshot --------->| (Riposizionamento esatto)
```

---

## 5. Casi Limite, Vincoli e Gestione degli Errori

1. **Desincronizzazione Fisica Client/Server**:
   - *Risoluzione*: L'host o il server autoritativo mantiene la verità di stato. I client calcolano la fisica in previsione locale (client-side prediction) e applicano uno smooth lerp ogni 50ms verso la posizione confermata.
2. **Impilamento Eccessivo e Vibrazione Collisioni (Jittering)**:
   - *Risoluzione*: I corpi fisici impilati entrano in stato di "Sleep" (riposo) quando la velocità vettoriale scende sotto `0.01 m/s`, evitando instabilità numerica.
3. **Carte e Dadi che Cadono Oltre i Bordi del Tavolo**:
   - *Risoluzione*: Se `position.y < -5.0`, scatta un trigger di *Respawn*: l'oggetto viene teletrasportato al centro del tavolo ad altezza di sicurezza (`y = 1.0`).
4. **Protezione Anti-Griefing**:
   - L'host della stanza ha l'autorità di disabilitare il comando "Table Flip" per gli utenti non autorizzati o limitare i permessi di spostamento oggetti bloccati (`isLocked`).
5. **Caricamento Texture e Asset Esterni Falliti**:
   - In caso di URL non raggiungibile o errore CORS su texture personalizzate, il rendering fallback applica uno shader procedurale con colore neutro e dicitura "Texture Missing".

---

## 6. Istruzioni Operative Passo-Passo per l'Implementazione

### Passo 1: Setup dell'Ambiente e Scene 3D
- Configurare il canvas Three.js con camera prospettica (FOV 45°), luce direzionale con mappa ombre (ShadowMap a 2048x2048) e luce ambientale soffusa.
- Modellare la geometria del tavolo (legno e feltro) con corpo statico rigido nel motore fisico.

### Passo 2: Controller Fisico e Input Raycaster
- Implementare il Raycaster dal mouse per tracciare l'intersezione col piano e gli oggetti sollevabili.
- Creare la logica di *drag elevation*: all'aggancio del pezzo, incrementare la quota Y di 0.5 unità per consentire il sorvolo fluido di altri pezzi.

### Passo 3: Implementazione Carte e Decks
- Gestire il doppio materiale delle carte (Face Material con rank/suit e Back Material universale).
- Implementare la funzione `groupToDeck()`: quando due carte entrano nello stesso raggio di prossimità o l'utente preme `G`, le carte vengono fuse in un unico oggetto composito `Deck` con indice ordinato.
- Integrare l'ispezione con tasto `Alt` e la distribuzione rapida con tasti `1..9`.

### Passo 4: HUD Player Hands & Fog of War
- Disporre a schermo il modulo `PlayerHandHUD`: vassoio ancorato in basso con carte sfalsate e raggruppate.
- Mascherare le carte nelle mani altrui sul tavolo 3D rendendole visibili solo come dorsi senza rivelarne il valore.

### Passo 5: Dadi Poliedrici e Meccanica di Lancio
- Aggiungere modelli 3D per D4, D6, D8, D10, D12, D20 con calcolo del valore superiore al fermarsi del moto fisico (analisi del prodotto scalare tra normale della faccia e vettore Y globale `Vector3(0, 1, 0)`).

### Passo 6: Undo History & Table Flip
- Implementare il buffer circolare di snapshot dello stato (`historySnapshots`) salvato a ogni azione discreta.
- Collegare il Table Flip a un'onda d'urto fisica centrale e l'Undo al ripristino di posizione, rotazione e velocità azzerata.

---
*Specifiche redatte con successo e conformi al video tutorial YouTube `2e33yiHHEes`.*
