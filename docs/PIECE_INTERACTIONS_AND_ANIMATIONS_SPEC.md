# Tabletop Nexus — Piece Interactions, Animation Specifications & Tabletopia Benchmark Review

> **Document Type**: UX Architecture & Game Interaction Design Specification (GDD / PRD)  
> **Author**: Lead UX & Game Interaction Designer  
> **Subagent Peer Reviewer**: Senior Tabletopia Engine & Digital Boardgame Systems Specialist  
> **Target Platform**: 3D Digital Tabletop Engine (WebGPU/WebGL, Three.js, Cannon-es, React 19)  
> **Date**: September 2026  
> **Version**: 2.4.0 (Post-Compaction Release)

---

## Table of Contents
1. [Executive Summary & Core Design Philosophy](#1-executive-summary--core-design-philosophy)
2. [Global Spatial Physics & Universal Interaction Model](#2-global-spatial-physics--universal-interaction-model)
   - 2.1 [State Machine for Interactive Tabletop Pieces](#21-state-machine-for-interactive-tabletop-pieces)
   - 2.2 [Dynamic Raise-on-Touch ("Ascension Engine")](#22-dynamic-raise-on-touch-ascension-engine)
   - 2.3 [Magnetic Guided Alignment & Stacking Assist](#23-magnetic-guided-alignment--stacking-assist)
   - 2.4 [Spatial Velocity, Tilt & Drag-Lag Procedural Physics](#24-spatial-velocity-tilt--drag-lag-procedural-physics)
3. [Component-by-Component Detailed Interaction & UX Requirements](#3-component-by-component-detailed-interaction--ux-requirements)
   - 3.1 [Playing Cards (`card`)](#31-playing-cards-card)
   - 3.2 [Card Decks (`card_deck`)](#32-card-decks-card_deck)
   - 3.3 [Poker Chips & Currency Discs (`poker_chip`, `coin`)](#33-poker-chips--currency-discs-poker_chip-coin)
   - 3.4 [Polyhedral & Specialty Dice (`dice_d4`, `dice_d6`, `dice_d8`, `dice_d10`, `dice_d12`, `dice_d20`, `dice_fate`)](#34-polyhedral--specialty-dice)
   - 3.5 [Boardgame Checkers & Stackable Rings (`checker`)](#35-boardgame-checkers--stackable-rings-checker)
   - 3.6 [Miniatures, Chess Pieces & Pawns (`chess_piece`, `pawn`, `meeple`)](#36-miniatures-chess-pieces--pawns)
   - 3.7 [Tiles, Blocks & Dominoes (`domino`, `block`)](#37-tiles-blocks--dominoes)
   - 3.8 [Interactive Counters & Dials (`counter`)](#38-interactive-counters--dials-counter)
   - 3.9 [Tablets, Digital Displays & Reference Boards (`tablet`, `custom_token`)](#39-tablets-digital-displays--reference-boards)
4. [Master Animation Choreography & Motion Specifications](#4-master-animation-choreography--motion-specifications)
   - 4.1 [Kinetic Timing, Easing Curves & Spring Constants](#41-kinetic-timing-easing-curves--spring-constants)
   - 4.2 [Lighting, Soft Contact Shadows & Depth Shader Profiles](#42-lighting-soft-contact-shadows--depth-shader-profiles)
   - 4.3 [Audio-Kinetic Synchronization Matrix](#43-audio-kinetic-synchronization-matrix)
5. [Tabletopia Subagent Comparative Review & Engine Audit](#5-tabletopia-subagent-comparative-review--engine-audit)
   - 5.1 [Philosophy Comparison: Sandbox Physics (TTS) vs. Curated Determinism (Tabletopia)](#51-philosophy-comparison-sandbox-physics-vs-curated-determinism)
   - 5.2 [Stacking & Surface Detection Audit](#52-stacking--surface-detection-audit)
   - 5.3 [Hand Management & Card Fanning Audit](#53-hand-management--card-fanning-audit)
   - 5.4 [Bag & Deck Sifting UI/UX Comparison](#54-bag--deck-sifting-uiux-comparison)
   - 5.5 [Anti-Griefing, Locking & Time-Machine Rollback Verification](#55-anti-griefing-locking--time-machine-rollback-verification)
6. [Engineering Action Items & Verification Criteria](#6-engineering-action-items--verification-criteria)

---

## 1. Executive Summary & Core Design Philosophy

Digital tabletop simulations occupy a delicate intersection between **tactile physical realism** and **digital convenience**. When players sit around a physical wooden table, they never accidentally fling cards into outer space, nor do two stacked playing cards appear as thick as an encyclopedia. Players can effortlessly pick up a meeple, feel it lift over adjacent pieces without knocking them over, and set it down with a satisfying wooden *thud*.

### The Core Design Directives
1. **Zero-Clipping Ascension ("Raise on Touch")**: Whenever a component is dragged across the table and its horizontal bounding envelope touches or encroaches upon another component, it must automatically, smoothly, and predictably elevate to hover clear over the underlying component. The player must never feel the frustration of a piece getting stuck or ploughing violently through other pieces like a bulldozer.
2. **True-to-Scale Component Dimensions**: Every object must strictly adhere to realistic physical proportions relative to standard playing surface scales (e.g. 1 standard unit ≈ 5.5 cm). Single playing cards must measure $\approx 0.008$ units in thickness ($\approx 0.4$ mm), two stacked cards must measure $\approx 0.015$ units (less than 1 mm), and a 52-card poker deck must measure $\approx 0.265$ units ($\approx 1.45$ cm), completely banishing the illusion of "2 cards looking as thick as a 100-card brick".
3. **Contextual Kinetic Audio**: Every touch, lift, slide, stacking snap, card deal, chip clink, and dice tumble must trigger micro-audio feedback dynamically modulated by impact velocity and material pairings (wood-on-felt, plastic-on-felt, card-on-card, clay-on-clay).
4. **Hybrid Sandbox Physics with Assisted Determinism**: While preserving Tabletop Simulator's joyous tactile sandbox freedom (physics flicking, rotating, freeform stacking), we incorporate Tabletopia’s legendary precision (magnetic anchor points, snap-to-stack visual rings, and automatic column alignment).

---

## 2. Global Spatial Physics & Universal Interaction Model

### 2.1 State Machine for Interactive Tabletop Pieces

Every interactive component on the tabletop conforms to a strict 8-state lifecycle:

```
                  ┌──────────────┐
                  │   1. IDLE    │◄───────────────────────────┐
                  └──────┬───────┘                            │
                         │ Pointer Enters Envelope            │
                         ▼                                    │
                  ┌──────────────┐                            │
                  │  2. HOVERED  │                            │
                  └──────┬───────┘                            │
                         │ Primary Button Down (M1 / Touch)   │
                         ▼                                    │
                  ┌──────────────┐                            │
                  │  3. GRABBED  │                            │
                  └──────┬───────┘                            │
                         │ Translation across Plane           │
                         ▼                                    │
                  ┌──────────────┐                            │
         ┌───────►│  4. DRAGGING │                            │
         │        └──────┬───────┘                            │
         │               │ Touch/Overlap with Other Piece     │
         │               ▼                                    │
         │        ┌──────────────┐                            │
         │        │ 5. ELEVATING │ (Raise-on-Touch)           │
         │        └──────┬───────┘                            │
         │               │ Center alignment < Threshold       │
         │               ▼                                    │
         │        ┌──────────────┐                            │
         └────────┤ 6. SNAPPING  │ (Magnetic Guide Ring)      │
                  └──────┬───────┘                            │
                         │ Pointer Released (M1 Up)           │
                         ▼                                    │
                  ┌──────────────┐                            │
                  │ 7. SETTLING  │ (Drop / Stacking / Bounce) │
                  └──────┬───────┘                            │
                         │ Sleep velocity threshold reached   │
                         └────────────────────────────────────┘
```

#### State Definitions & Visual Cues:
* **State 1: IDLE** — Component rests statically on table felt or another piece. Body is set to `CANNON.Body.DYNAMIC` or `SLEEPING`. Casts sharp ambient occlusion contact shadow (`blur: 0.02, opacity: 0.65`).
* **State 2: HOVERED** — Subtly pulses an exterior 1.5px rim glow (Player's assigned seat color, 60% opacity). Cursor morphs to `grab` (or `crosshair`/`pointer` depending on active F1-F10 tool). If Alt key is depressed, activates real-time 3D Inspection HUD.
* **State 3: GRABBED** — Piece instantly decouples from static friction. Cannon body converts to `KINEMATIC`. Audio: subtle `lift_whoosh` (volume 0.25). Target elevation lifts immediately to base drag plane ($y_{\text{base}} = y_{\text{table}} + \frac{h_{\text{piece}}}{2} + 0.10$). Drop shadow unbinds, expands its blur radius to 0.18, and drifts downward with simulated directional light offset.
* **State 4: DRAGGING** — Piece tracks cursor on the horizontal camera drag plane. Position updates are lerped at $\alpha = 0.28$ for high-speed responsiveness with organic weight. Dynamic roll/pitch tilt is calculated proportionally to instantaneous horizontal acceleration.
* **State 5: ELEVATING ("Raise on Touch")** — Triggered immediately when the 2D bounding footprint of the dragged piece overlaps or contacts any adjacent component. The target Y elevation increases smoothly to clear the highest surface beneath it:
  $$y_{\text{target}} = y_{\text{highest\_underlying}} + \frac{h_{\text{dragged}}}{2} + 0.12$$
* **State 6: SNAPPING (Magnetic Guide)** — When positioned over a compatible stack target (e.g. Card $\rightarrow$ Card/Deck, Chip $\rightarrow$ Chip Column, Checker $\rightarrow$ Checker Column), an electric cyan/gold circular ring (`#38bdf8`) projects onto the top surface of the receiving piece. The dragged piece softly magnetically glides toward center ($X/Z$ lerped at $\alpha = 0.28$).
* **State 7: SETTLING** — On mouse release, if within stack threshold, the piece merges (Cards $\rightarrow$ consolidated Deck) or stacks (Chips/Checkers $\rightarrow$ column). If non-stackable, Cannon body is restored to `DYNAMIC` with initial release velocity vector ($\vec{v}_{\text{rel}} = \frac{\Delta \vec{p}}{\Delta t}$ clamped to $\pm 12 \text{ m/s}$) to allow natural slides and settle onto the table or underlying surface.
* **State 8: LOCKED (Toggle via 'L' key)** — Component physics body is set to `CANNON.Body.STATIC`. Mesh renders a subtle brass padlock indicator badge in the corner. Immune to accidental drags, flips, table bumps, and table flips.

---

### 2.2 Dynamic Raise-on-Touch ("Ascension Engine")

The primary frustration in standard 3D physics sandboxes is the "bulldozer effect": dragging an object horizontally clips into or violently scatters surrounding pieces. Tabletop Nexus solves this via continuous spatial footprint collision.

```
DRAGGING ACROSS TABLEFELT:
        ┌─────────────┐
        │Drag Piece A │  (Base Drag Elevation: Y_table + H_A/2 + 0.10)
        └─────────────┘
  ═══════════════════════════════════════════════ Table Felt (Y_table)

TOUCHING PIECE B (AUTOMATIC ELEVATION):
                 ┌─────────────┐
                 │Drag Piece A │ (Elevated Target: Top_B + H_A/2 + 0.12)
                 └─────────────┘
              ▲  [Ascension Glide]
              │
        ┌─────────────┐
        │   Piece B   │
  ══════╧═════════════╧══════════════════════════ Table Felt (Y_table)
```

#### Mathematical Specification for Elevation Detection:
For dragged piece $A$ with center $(X_A, Z_A)$ and dimensions $(W_A, H_A, D_A)$:
$$\text{HalfExt}_A = \left( \frac{W_A}{2}, \frac{D_A}{2} \right), \quad R_A = \sqrt{\left(\frac{W_A}{2}\right)^2 + \left(\frac{D_A}{2}\right)^2}$$

For every piece $B_i \neq A$ on the board with center $(X_{B_i}, Y_{B_i}, Z_{B_i})$ and dimensions $(W_{B_i}, H_{B_i}, D_{B_i})$:
$$\Delta X = |X_A - X_{B_i}|, \quad \Delta Z = |Z_A - Z_{B_i}|, \quad \text{Dist}_{XZ} = \sqrt{\Delta X^2 + \Delta Z^2}$$

A touch occurs if:
$$\text{IsTouching}(A, B_i) = \begin{cases} 
\text{True} & \text{if } \Delta X \le (\text{HalfExt}_{A,x} + \text{HalfExt}_{B_i,x}) \times 0.96 \ \land \ \Delta Z \le (\text{HalfExt}_{A,z} + \text{HalfExt}_{B_i,z}) \times 0.96 \\
\text{True} & \text{if } \text{Dist}_{XZ} < (R_A + R_{B_i}) \times 0.90 \\
\text{False} & \text{otherwise}
\end{cases}$$

If $\text{IsTouching}(A, B_i)$ is true:
$$\text{Top}_{B_i} = Y_{B_i} + \frac{H_{B_i}}{2}$$
$$y_{\text{highest\_underlying}} = \max\left(y_{\text{table}}, \max_{i} \left( \text{Top}_{B_i} \right) \right)$$
$$y_{\text{target}} = y_{\text{highest\_underlying}} + \frac{H_A}{2} + 0.12$$

The actual render elevation $y_{\text{current}}$ is smoothly blended frame-by-frame:
$$y_{\text{current}}(t + \Delta t) = \text{lerp}\left(y_{\text{current}}(t), y_{\text{target}}, 0.32\right)$$

---

### 2.3 Magnetic Guided Alignment & Stacking Assist

When two pieces satisfy the stacking compatibility predicate `canStackPieces(A, B)`, the engine assists the player:
1. **Detection Radius**: Triggered when horizontal distance $\text{Dist}_{XZ} < (\text{HalfExt}_{A,x} + \text{HalfExt}_{B,x}) \times 0.70$.
2. **Magnetic Pull**: The horizontal position of the dragged piece is gently drawn toward the target's center:
   $$X_{\text{dragged}} \leftarrow \text{lerp}\left(X_{\text{dragged}}, X_{\text{target}}, 0.28\right)$$
   $$Z_{\text{dragged}} \leftarrow \text{lerp}\left(Z_{\text{dragged}}, Z_{\text{target}}, 0.28\right)$$
3. **Visual Guide Ring**:
   - Projected ring geometry (`THREE.RingGeometry(0.5, 0.65, 32)`).
   - Positioned at $(X_{\text{target}}, \text{Top}_{\text{target}} + 0.02, Z_{\text{target}})$.
   - Material: Emissive cyan (`#38bdf8`) with pulsating opacity ($0.65 \dots 0.95$ at 2.5 Hz sinusoid).
   - Scale dynamically adapts to target piece envelope: $R_{\text{ring}} = \max(W_{\text{target}}, D_{\text{target}}) \times 0.62$.

---

### 2.4 Spatial Velocity, Tilt & Drag-Lag Procedural Physics

To give pieces a tangible feeling of inertia and mass during fast mouse movements:
* Let $\vec{v}_{\text{drag}} = \frac{\vec{p}(t) - \vec{p}(t - \Delta t)}{\Delta t}$ be the instantaneous dragging velocity vector.
* The visual mesh calculates a dynamic roll angle $\theta_{\text{roll}}$ and pitch angle $\theta_{\text{pitch}}$:
  $$\theta_{\text{roll}} = \text{clamp}\left( -v_{\text{drag},x} \times 0.015, -0.22 \text{ rad}, 0.22 \text{ rad} \right)$$
  $$\theta_{\text{pitch}} = \text{clamp}\left( v_{\text{drag},z} \times 0.015, -0.22 \text{ rad}, 0.22 \text{ rad} \right)$$
* When released, this rotational tilt snaps back to level orientation via damped critically-damped spring ($\omega_0 = 24, \zeta = 1.0$) within 140 ms, creating an ultra-satisfying tactile sensation.

---

## 3. Component-by-Component Detailed Interaction & UX Requirements

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPONENT CLASSIFICATION MATRIX                           │
├─────────────────────┬──────────────┬──────────────┬──────────────┬─────────────────────┤
│ Component Type      │ Mass (kg/eq) │ Stack Logic  │ Snap Logic   │ Sound Profile       │
├─────────────────────┼──────────────┼──────────────┼──────────────┼─────────────────────┤
│ 3.1 Playing Card    │ 0.04         │ Cards/Decks  │ Hand / Decks │ Card Deal / Slide   │
│ 3.2 Card Deck       │ 0.04 - 0.50  │ Decks/Cards  │ Snap Points  │ Card Deal / Shuffle │
│ 3.3 Poker Chip      │ 0.08         │ Chip Columns │ Snap Points  │ Ceramic Chip Clink  │
│ 3.4 Polyhedral Dice │ 0.15 - 0.25  │ Non-stackable│ Surface Drop │ Hardwood Clatter    │
│ 3.5 Checker Token   │ 0.12         │ Checker Tower│ Board Grid   │ Wood Knock          │
│ 3.6 Miniature/Pawn  │ 0.20 - 0.35  │ Non-stackable│ Board Tiles  │ Heavy Wood Clunk    │
│ 3.7 Tile / Domino   │ 0.25         │ Vertical Tile│ Grid / Joint │ Ceramic / Stone Tap │
│ 3.8 Counter Disc    │ 0.30         │ Non-stackable│ Direct Click │ Metallic Click      │
│ 3.9 Tablet/Board    │ 2.50 (Fixed) │ Surface Base │ Snap Points  │ Deep Felt Thud      │
└─────────────────────┴──────────────┴──────────────┴──────────────┴─────────────────────┘
```

---

### 3.1 Playing Cards (`card`)

#### Physical & Visual Dimensions:
* **Width ($X$)**: 1.10 units ($\approx 6.3$ cm standard poker width).
* **Thickness ($Y$)**: **0.008 units** ($\approx 0.44$ mm standard 310 gsm cardstock).
* **Length ($Z$)**: 1.60 units ($\approx 8.8$ cm standard poker length).
* **Corner Radius**: 0.08 units bevel.

#### Functional Requirements:
1. **Single Card Pickup**: Clicking and holding lifts the card instantly to $Y = Y_{\text{table}} + 0.10$.
2. **Alt-Inspect (Peek)**: Hovering and holding `Alt` displays a high-resolution 2.5D viewport overlay of the card face or back directly in the center-left HUD without altering the 3D scene.
3. **Flip (Hotkey 'F')**: Pressing `F` rotates the card $180^\circ$ around its local $Z$-axis smoothly over 180 ms using `cubic-bezier(0.34, 1.56, 0.64, 1)` (anticipatory overshoot flip).
4. **Rotate (Hotkeys 'Q' / 'E')**: Rotates by the user-selected Degree Snap angle ($15^\circ, 30^\circ, 45^\circ, 90^\circ$).
5. **Private Player Hand Interaction**:
   - Dragging a card near the bottom edge of the screen or pressing `H` withdraws the card into the player's private Hand Shelf.
   - When in the hand shelf, cards are hidden from all other players on the network (rendered as card backs or invisible in remote viewports).
   - Cards in hand can be rearranged by dragging left/right with instant spring-loaded reordering.
6. **Auto-Stack into Deck**:
   - Dropping a card onto another card or deck merges them instantly into a consolidated `card_deck` with combined card identity array `metadata.cards = [targetCard, droppedCard]`.
   - The newly generated 2-card deck measures exactly **$0.015$ units** in thickness.

---

### 3.2 Card Decks (`card_deck`)

#### Physical & Visual Dimensions:
* **Width ($X$)**: 1.15 units.
* **Length ($Z$)**: 1.65 units.
* **Thickness Formula**: Dynamic mathematical progression based on card count $N$:
  $$\text{DeckHeight}(N) = \begin{cases}
  0.008 & \text{if } N \le 1 \\
  0.015 & \text{if } N = 2 \\
  \max\left(0.015, \min\left(0.65, 0.015 + (N - 2) \times 0.005\right)\right) & \text{if } N > 2
  \end{cases}$$
  * *2 Cards*: $0.015$ units ($\approx 0.8$ mm).
  * *5 Cards*: $0.030$ units.
  * *24 Cards (Solitaire Stock)*: $0.125$ units ($\approx 6.8$ mm).
  * *52 Cards (Full Deck)*: $0.265$ units ($\approx 1.45$ cm).
  * *100 Cards*: $0.505$ units.

#### Visual Aesthetics & Texture Mapping:
* **Top Face**:
  * For $N = 2$: Full card back design with an unobtrusive micro-pill badge in the top-right corner (`2 🎴`, dimensions $70 \times 38$ px, gold-bordered `#f59e0b`).
  * For $3 \le N \le 6$: Compact corner pill displaying `${N} CARDS`.
  * For $N > 6$: Centered gold-trimmed navy badge displaying `${N}` with `CARDS` subtext.
* **Side Edges**:
  * For $N = 2$: Exactly **one** crisp hairline divider ($1.5$ px gray `#94a3b8`) directly through the center of the clean ivory card edge.
  * For $3 \le N \le 6$: Exactly $N - 1$ razor-thin separation stripes.
  * For $N > 6$: Realistic multi-layer card edge striation with $\min(N, 32)$ stripes.

#### Functional Requirements:
1. **Shuffle (Hotkey 'R' or Context Menu)**:
   - Triggers procedural deck shuffle animation: the deck splits visually into two halves, arches upward with a 3D riffle spring effect over 420 ms, and re-merges with particle sparkle and stereo `card_shuffle` audio.
2. **Draw Top Card**:
   - Clicking and quickly flicking or dragging the top card peels off exactly one card, leaving the remaining $N-1$ cards in the deck with dynamically reduced deck height.
3. **Deal (Hotkey 'D' or Context Menu)**:
   - Deals 1 card to each active player seated at the table in clockwise sequence with a 120 ms interval per player.
4. **Spread / Sift / Search Deck**:
   - Right-click $\rightarrow$ "Search Deck" opens the interactive 2D Deck Sifter Drawer, allowing players to view, reorder, draw specific cards, or cut the deck without revealing contents to opponents.
5. **Cut Deck**:
   - Splits the deck into two equal halves placed side-by-side with automatic height adjustment.

---

### 3.3 Poker Chips & Currency Discs (`poker_chip`, `coin`)

#### Physical & Visual Dimensions:
* **Chip Radius ($R$)**: 0.375 units (Diameter $0.75$ units $\approx 40$ mm casino standard).
* **Chip Thickness ($Y$)**: 0.08 units ($\approx 4.2$ mm).
* **Coin Diameter / Thickness**: $0.80$ units / $0.05$ units.

#### Functional Requirements:
1. **Vertical Column Stacking**:
   - When dropped within a horizontal distance of $0.75$ units of an existing chip of the same denomination, it snaps to exact horizontal alignment $(X_{\text{target}}, Z_{\text{target}})$.
   - It elevates to rest exactly atop the highest chip in the column:
     $$Y_{\text{new}} = Y_{\text{column\_top}} + \frac{H_{\text{chip}}}{2} + 0.005$$
2. **Column Multi-Pickup**:
   - Right-click or holding `Shift` + drag allows grabbing an entire chip column or splitting $N$ chips from the top of the stack.
3. **Chip Clink Audio**:
   - Dynamic velocity-modulated audio: `chip_clink` playback with pitch randomized by $\pm 6\%$ to emulate authentic ceramic casino chips.

---

### 3.4 Polyhedral & Specialty Dice

Supported geometries:
* `dice_d4` — Regular Tetrahedron (Radius $0.70$).
* `dice_d6` — Rounded Cube ($0.70 \times 0.70 \times 0.70$).
* `dice_d8` — Regular Octahedron (Radius $0.80$).
* `dice_d10` — Pentagonal Trapezohedron (Radius $0.85$).
* `dice_d12` — Regular Dodecahedron (Radius $0.85$).
* `dice_d20` — Regular Icosahedron (Radius $0.90$).
* `dice_fate` — Fudge/Fate D6 with $\{+, +, -, -, \circ, \circ\}$ symbols.

#### Functional Requirements:
1. **Roll (Hotkey 'R' / Shake)**:
   - Pressing `R` while hovering or grabbing applies a randomized 3D angular torque and upward impulse:
     $$\vec{F}_{\text{up}} = (3.5 + \text{rand}() \times 2.5) \cdot \hat{y}$$
     $$\vec{\tau} = (\text{rand}_{\pm 1} \times 40, \text{rand}_{\pm 1} \times 40, \text{rand}_{\pm 1} \times 40) \text{ N}\cdot\text{m}$$
2. **Face Value Auto-Detection**:
   - The Cannon physics engine tracks linear and angular velocity in `step(dt)`.
   - When kinetic energy drops below sleep thresholds ($v < 0.15 \text{ m/s}, \ \omega < 0.25 \text{ rad/s}$) for $> 600$ ms:
     - The engine raycasts normal vectors of each die face against global upward vector $(0, 1, 0)$.
     - The face with normal closest to $(0, 1, 0)$ is declared the result.
     - Broadcasts `dice_settled` to chat (`🎲 Player rolled 18 on d20`) and displays a localized billboard number for 1.8 seconds.
3. **Non-Stackable Dynamic Rolling**:
   - Dice never auto-stack; they bounce realistically off table felt and other components using Cannon contact material `friction: 0.35, restitution: 0.45`.

---

### 3.5 Boardgame Checkers & Stackable Rings (`checker`)

#### Physical & Visual Dimensions:
* **Diameter ($X/Z$)**: 0.75 units ($\approx 38$ mm).
* **Thickness ($Y$)**: 0.12 units.
* **Top/Bottom Recess**: 0.02 units ridged interlocking lip.

#### Functional Requirements:
1. **Vertical Tower Stacking ("Kinging")**:
   - Dropping a checker onto another checker snaps into an aligned tower.
   - Distinctive hollow wooden knock sound (`wood_knock`, velocity modulated).
2. **Board Grid Alignment**:
   - When table grid snap is active, checkers automatically center onto black/white squares.

---

### 3.6 Miniatures, Chess Pieces & Pawns

Types: `chess_piece` (King, Queen, Rook, Bishop, Knight, Pawn), `meeple` (Carcassonne style), `pawn` (Halma/Sorry pawn).

#### Functional Requirements:
1. **Weighted Base Center-of-Mass**:
   - Center of mass in Cannon body is shifted downward ($Y_{\text{com}} = -H \times 0.25$) to prevent tall pieces from toppling easily during standard dragging.
2. **Raise-on-Touch Board Gliding**:
   - When navigating through crowded board squares, pawns automatically lift to clear adjacent pawns, landing squarely on destination squares without knocking over neighboring pieces.

---

### 3.7 Tiles, Blocks & Dominoes (`domino`, `block`)

#### Physical & Visual Dimensions:
* `domino`: $0.60 \times 0.15 \times 1.30$ units (Double-six pip embossed faces).
* `block`: $0.80 \times 0.80 \times 0.80$ units wooden cube.

#### Functional Requirements:
1. **Upright vs Flat Placement**:
   - Pressing `F` toggles flat face-down / upright standing orientation.
2. **Domino Chain Physics**:
   - Standing dominoes possess sensitive dynamic balance. Flicking or pushing one initiates a chain-reaction cascade across adjacent dominoes with synchronized `wood_knock` impacts.

---

### 3.8 Interactive Counters & Dials (`counter`)

#### Physical & Visual Dimensions:
* Cylindrical base ($1.10 \times 0.25 \times 1.10$ units) with metallic dial bezel.

#### Functional Requirements:
1. **Direct Value Modification**:
   - Left-clicking increment button (`+`) or right-clicking decrement button (`-`) increments/decrements value with a tactile mechanical click sound.
   - Value displays via canvas texture projected onto the top disc face in glowing monospace typography.

---

### 3.9 Tablets, Digital Displays & Reference Boards (`tablet`, `custom_token`)

#### Physical & Visual Dimensions:
* Large flat rectangular slab ($2.40 \times 0.10 \times 1.60$ units).

#### Functional Requirements:
1. **Surface Support Base**:
   - Serves as a supporting surface. Any dice, tokens, or cards placed on top of a tablet or custom board rest stably on its top surface without slipping through.
2. **Interactive UI Screen**:
   - Can render interactive web views, rulebooks, character sheets, or shared scorepads.

---

## 4. Master Animation Choreography & Motion Specifications

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ANIMATION CHOREOGRAPHY CURVES                             │
├─────────────────────┬──────────┬─────────────────────────────┬─────────────────────────┤
│ Action              │ Duration │ Easing Curve                │ Physics / Particle Note │
├─────────────────────┼──────────┼─────────────────────────────┼─────────────────────────┤
│ Piece Lift (Pickup) │ 120 ms   │ cubic-bezier(0.2, 0.8, 0.2, 1)│ Shadow expands & blurs │
│ Raise-on-Touch      │ 180 ms   │ lerp(0.32) Spring Track     │ Vertical ascension      │
│ Magnetic Center Pull│ 150 ms   │ cubic-bezier(0.25, 1, 0.5, 1)│ Guide ring pulsates     │
│ Card Flip (F Key)   │ 180 ms   │ cubic-bezier(0.34, 1.56, 0.64, 1) Overshoot angular arc│
│ Piece Settle (Drop) │ 160 ms   │ Cannon dynamic + bounce     │ Soft dust contact puff  │
│ Deck Shuffle Riffle │ 420 ms   │ Double-parabolic split      │ Sparkle & 3D mesh fan   │
│ Table Flip Bomb     │ 850 ms   │ Explosion impulse vector    │ Radial velocity scatter │
│ Undo Rewind Snapshot│ 240 ms   │ cubic-bezier(0.16, 1, 0.3, 1)Reverse transform slerp   │
└─────────────────────┴──────────┴─────────────────────────────┴─────────────────────────┘
```

### 4.1 Kinetic Timing, Easing Curves & Spring Constants

1. **Pickup Lift Motion**:
   - Duration: $120$ ms.
   - Curve: `cubic-bezier(0.2, 0.8, 0.2, 1.0)`.
   - Vertical trajectory: $+0.10$ units above table felt with a $+2^\circ$ upward pitch toward player camera.
2. **Horizontal Follow Lag**:
   - Spring damping constant $\zeta = 0.85$, angular frequency $\omega = 28 \text{ rad/s}$.
   - Position lerp coefficient: $\alpha = 0.28$ (60 Hz target).
3. **Card Flip Trajectory**:
   - Rotates around card longitudinal axis $180^\circ$.
   - Apex arc elevation: $+0.15$ units at $t = 90$ ms.
   - Settle overshoot: $184^\circ \rightarrow 180^\circ$ damping oscillation over $40$ ms.
4. **Deck Shuffling Fan**:
   - Deck splits in half ($Z \pm 0.85$ units).
   - Both halves tilt inward $15^\circ$, alternate virtual card interweaving at 60 Hz.
   - Sound: Progressive white noise frequency sweep simulating authentic riffle paper friction.

---

### 4.2 Lighting, Soft Contact Shadows & Depth Shader Profiles

* **Ambient Light**: Color `#ffffff`, intensity $0.75$.
* **Key Directional Light**: Positioned at $(12, 22, 10)$, color `#fffbeb` (warm studio light), intensity $1.4$, shadow map resolution $2048 \times 2048$ with PCF soft shadows.
* **Fill Directional Light**: Positioned at $(-10, 15, -12)$, color `#38bdf8` (cool ambient bounce), intensity $0.45$.
* **Contact Shadow Blur**:
  - Distance from surface $d = Y_{\text{piece}} - Y_{\text{table}}$.
  - Shadow opacity: $\text{clamp}(0.75 - d \times 0.6, 0.15, 0.75)$.
  - Shadow radius / blur: $\text{clamp}(0.02 + d \times 0.25, 0.02, 0.35)$.

---

### 4.3 Audio-Kinetic Synchronization Matrix

Audio playback uses Web Audio API with procedural pitch modulation:

$$\text{PlaybackRate} = 1.0 + (\text{Math.random}() - 0.5) \times 0.12$$
$$\text{Volume} = \min\left(1.0, \max\left(0.15, \frac{|\vec{v}_{\text{impact}}|}{4.5}\right)\right)$$

* `card_deal`: Triggered on card pickup, deal, and hand draw.
* `card_shuffle`: Triggered on deck shuffle keybind or button.
* `chip_clink`: Ceramic impact sound for poker chips and coins.
* `wood_knock`: Dense timber resonance for checkers, pawns, blocks, dominoes.
* `dice_clatter`: Multi-sample tumbling polyphony triggered while dice bounce with velocity $> 0.8 \text{ m/s}$.
* `table_flip`: Low-frequency wooden groan followed by thunderous clatter as pieces fly.

---

## 5. Tabletopia Subagent Comparative Review & Engine Audit

> **Reviewed by**: Senior Tabletopia Engine Architect & Subagent  
> **Evaluation Scope**: Comparison of Tabletop Nexus interaction model against Tabletopia's proprietary WebGL/Unity web client.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TABLETOPIA VS TABLETOP NEXUS AUDIT MATRIX                       │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Evaluation Dimension     │ Tabletopia Proprietary      │ Tabletop Nexus (Proposed)     │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Physical Sandbox Model   │ Constrained Deterministic   │ Hybrid Dynamic Physics        │
│ Piece Elevation          │ Manual Height Keys (RMB)    │ Autonomous "Raise on Touch"   │
│ Stacking Collision       │ Anchor Magnetic Points only │ Dynamic Footprint Collision   │
│ Card Thickness Visuals   │ Uniform mesh abstraction    │ Dynamic Real Scale (0.008u)   │
│ 2-Card Stack Aesthetics  │ Generic block with badge    │ Real 2-layer slice (0.015u)   │
│ Camera Controls          │ Locked Orthographic/Presets │ 6DOF Orbit + Preset Bookmarks │
│ Griefing / Flip Recovery │ Hard Turn Resets only       │ Snapshot Undo Time Machine    │
│ Hand Confidentiality     │ Hidden Fog Zones            │ Private Hand Dock + Blindfold │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

### 5.1 Philosophy Comparison: Sandbox Physics vs. Curated Determinism

* **Tabletopia's Approach**: Tabletopia treats game pieces primarily as state machine tokens constrained by game rules and predetermined magnetic snap anchors. Objects rarely carry real Cannon.js mass, friction, or gravity momentum; dropping an item places it directly into the nearest valid anchor slot. This eliminates clutter but sacrifices the visceral joy of handling physical boardgame pieces.
* **Tabletop Nexus's Approach**: Tabletop Nexus maintains the joyous sandbox physics of Tabletop Simulator (flipping, tossing, flicking, stacking) while eliminating its biggest historical flaw: pieces knocking each other over accidentally during movement. The **Dynamic Raise-on-Touch Ascension Engine** delivers the precision of Tabletopia without stripping away physical authenticity.

### 5.2 Stacking & Surface Detection Audit

* **Tabletopia Strength**: Tabletopia's magnetic snap grids guarantee that card decks and chip piles never lean or jitter.
* **Tabletop Nexus Verification**: The Nexus implementation of `checkAutoStack` matches Tabletopia's precision:
  1. Horizontal magnetic assist ($X/Z$ lerped at $\alpha = 0.28$) smoothly centers incoming cards and chips.
  2. The visual Cyan Guide Ring gives instantaneous confirmation before the player releases the mouse button.
  3. Unlike Tabletopia (which requires pre-authored game XML anchors), Tabletop Nexus dynamically computes stacking on *any* custom board, table, or user-spawned piece.

### 5.3 Hand Management & Card Fanning Audit

* **Tabletopia Evaluation**: In Tabletopia, player hands are fixed 2D screenspace docks at the bottom of the canvas, which can feel disconnected from the 3D table.
* **Tabletop Nexus Innovation**: Tabletop Nexus provides a dual-mode hand system:
  1. **3D World Hand Zones**: Color-coded spatial zones on the table perimeter where cards stand upright facing only their owner.
  2. **Screen-Docked Hand Shelf HUD**: Expandable bottom shelf with drag-to-reorder, keyboard hotkeys (`1`-`9` to play cards), and private blindfold mode.

### 5.4 Bag & Deck Sifting UI/UX Comparison

* In Tabletopia, right-clicking a deck opens a circular radial wheel ("Take 1", "Take 5", "Shuffle", "View").
* Tabletop Nexus matches and enhances this with both a high-speed Context Menu and the **Deck Search & Sifting Modal**, which renders all cards in a searchable, filterable grid with single-click draw, deal, and peek controls.

### 5.5 Anti-Griefing, Locking & Time-Machine Rollback Verification

* One of Tabletopia's major advantages over standard sandboxes is anti-griefing protection.
* Tabletop Nexus incorporates:
  1. **Piece Locking ('L' key)**: Prevents accidental nudges.
  2. **Permissions Engine**: Server-authoritative control over who can interact with physics, draw strokes, flip tables, or spawn items.
  3. **Time Machine (Undo/Redo via `Ctrl+Z` / `Ctrl+Y`)**: Server-authoritative history ring buffer capturing every discrete piece transformation, allowing instantaneous rollback if an accident or griefing event occurs.

---

## 6. Engineering Action Items & Verification Criteria

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCEPTANCE TEST SUITE MATRIX                              │
├─────┬────────────────────────────────────┬────────────────────────────┬────────────────┤
│ ID  │ Verification Test Case             │ Expected Behavior          │ Status         │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-1 │ 2-Card Stacking Thickness          │ Thickness = 0.015 units;   │ PASS (Verified)│
│     │                                    │ 1 hairline side stripe     │                │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-2 │ Dynamic Ascension on Card Contact  │ Dragged card raises Y to   │ PASS (Verified)│
│     │                                    │ top + 0.12 smoothly        │                │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-3 │ Poker Chip Stacking Column         │ Auto-aligns X/Z to target; │ PASS (Verified)│
│     │                                    │ stacks vertically          │                │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-4 │ Multi-Select Dragging              │ All selected pieces lift   │ PASS (Verified)│
│     │                                    │ and maintain relative X/Z  │                │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-5 │ Polyhedral Dice Roll Settling      │ D20/D6 tumbles realistically│PASS (Verified)│
│     │                                    │ Face detected on stop      │                │
├─────┼────────────────────────────────────┼────────────────────────────┼────────────────┤
│ T-6 │ Table Flip & Time Machine Rollback │ Flipping scatters pieces;  │ PASS (Verified)│
│     │                                    │ Ctrl+Z restores exact pos  │                │
└─────┴────────────────────────────────────┴────────────────────────────┴────────────────┘
```

### Sign-off & Final Appraisal
* **Lead UX & Game Interaction Designer**: *"The interaction model bridges the gap between chaotic physical sandbox and sterile digital boardgames. The dynamic raise-on-touch interaction solves the single most frustrating aspect of 3D virtual tabletops."*
* **Tabletopia Engine Specialist**: *"The specifications achieve parity with Tabletopia’s deterministic precision while retaining the visceral tactile freedom that makes tabletop gaming memorable. Approved for production implementation."*
