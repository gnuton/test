/**
 * Tabletop Nexus - Standard Game Presets
 */

import { TabletopPieceData, TableConfig } from './types.js';

export function getPresetTableConfig(presetName: string): TableConfig {
  const baseGrid = {
    enabled: false,
    type: 'square' as const,
    size: 1.5,
    snap: false,
    color: '#38bdf8',
    opacity: 0.3,
  };

  switch (presetName) {
    case 'blackjack':
      return {
        shape: 'rectangular',
        width: 16,
        length: 22,
        height: 2.0,
        feltColor: '#0f5132',
        woodColor: '#2b1a0d',
        hasRim: true,
        gravity: 9.81,
        environment: 'penthouse',
        grid: { ...baseGrid },
      };
    case 'solitaire':
      return {
        shape: 'rectangular',
        width: 16,
        length: 22,
        height: 2.0,
        feltColor: '#1e3a5f',
        woodColor: '#172554',
        hasRim: true,
        gravity: 9.81,
        environment: 'studio',
        grid: { ...baseGrid },
      };
    case 'freecell':
      return {
        shape: 'rectangular',
        width: 18,
        length: 24,
        height: 2.0,
        feltColor: '#064e3b',
        woodColor: '#1c1917',
        hasRim: true,
        gravity: 9.81,
        environment: 'studio',
        grid: { ...baseGrid },
      };
    case 'poker':
      return {
        shape: 'oval',
        width: 14,
        length: 22,
        height: 2.0,
        feltColor: '#105634',
        woodColor: '#3a2010',
        hasRim: true,
        gravity: 9.81,
        environment: 'penthouse',
        grid: { ...baseGrid },
      };
    case 'chess':
      return {
        shape: 'rectangular',
        width: 16,
        length: 16,
        height: 2.0,
        feltColor: '#2b231c',
        woodColor: '#18120c',
        hasRim: true,
        gravity: 9.81,
        environment: 'tavern',
        grid: { ...baseGrid, enabled: true, size: 1.4 },
      };
    case 'dice_arena':
      return {
        shape: 'rectangular',
        width: 15,
        length: 15,
        height: 2.0,
        feltColor: '#6d1822',
        woodColor: '#2c140e',
        hasRim: true,
        gravity: 9.81,
        environment: 'space',
        grid: { ...baseGrid },
      };
    case 'dungeon':
      return {
        shape: 'rectangular',
        width: 20,
        length: 26,
        height: 2.0,
        feltColor: '#1f2937',
        woodColor: '#111827',
        hasRim: true,
        gravity: 9.81,
        environment: 'tavern',
        grid: { ...baseGrid, enabled: true, size: 1.5, snap: true },
      };
    case 'dominoes':
      return {
        shape: 'rectangular',
        width: 16,
        length: 20,
        height: 2.0,
        feltColor: '#064e3b',
        woodColor: '#27170e',
        hasRim: true,
        gravity: 9.81,
        environment: 'studio',
        grid: { ...baseGrid },
      };
    case 'boardgame':
    case 'sandbox':
    default:
      return {
        shape: 'rectangular',
        width: 16,
        length: 22,
        height: 2.0,
        feltColor: '#1c4234',
        woodColor: '#3d2516',
        hasRim: true,
        gravity: 9.81,
        environment: 'studio',
        grid: { ...baseGrid },
      };
  }
}

export function getPresetPieces(presetName: string, tableHeight: number = 2.0): TabletopPieceData[] {
  const pieces: TabletopPieceData[] = [];
  const y = tableHeight + 0.3;

  switch (presetName) {
    case 'blackjack': {
      // 52-card standard deck in dealer shoe
      const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
      const suits = ['♠', '♥', '♦', '♣'];
      const shoeCards: string[] = [];
      for (const s of suits) {
        for (const r of ranks) {
          shoeCards.push(`${r}${s}`);
        }
      }

      pieces.push({
        id: 'bj-shoe-deck',
        type: 'card_deck',
        name: 'Blackjack Shoe (52 Cards)',
        position: { x: -4.5, y: y + 0.2, z: -2.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.4,
        color: '#dc2626',
        label: '52 CARDS',
        value: 52,
        metadata: {
          cards: shoeCards,
        },
      });

      // Dealer Hand: 1 face up (10♠), 1 face down (7♥ hole card)
      pieces.push({
        id: 'bj-dealer-1',
        type: 'card',
        name: 'Dealer Upcard: 10♠',
        position: { x: -0.7, y, z: -2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.04,
        label: '10♠',
        color: '#ffffff',
        secondaryColor: '#0f172a',
      });
      pieces.push({
        id: 'bj-dealer-hole',
        type: 'card',
        name: 'Dealer Hole Card: 7♥',
        position: { x: 0.7, y, z: -2.2 },
        rotation: { x: 0, y: 0, z: 1, w: 0 }, // Face down!
        mass: 0.04,
        label: '7♥',
        color: '#ffffff',
        secondaryColor: '#dc2626',
      });

      // Player Hand: A♦ + K♣ (Blackjack!)
      pieces.push({
        id: 'bj-player-1',
        type: 'card',
        name: 'Player Card: A♦',
        position: { x: -0.7, y, z: 2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.04,
        label: 'A♦',
        color: '#ffffff',
        secondaryColor: '#dc2626',
      });
      pieces.push({
        id: 'bj-player-2',
        type: 'card',
        name: 'Player Card: K♣',
        position: { x: 0.7, y, z: 2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.04,
        label: 'K♣',
        color: '#ffffff',
        secondaryColor: '#0f172a',
      });

      // Player Bet Box: $25 Chip stack
      for (let i = 0; i < 4; i++) {
        pieces.push({
          id: `bj-bet-chip-${i}`,
          type: 'poker_chip',
          name: '$25 Chip',
          position: { x: 0, y: y + i * 0.13, z: 0.5 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.08,
          color: '#16a34a',
          secondaryColor: '#ffffff',
          value: 25,
          label: '$25',
        });
      }

      // Bank Chip Trays
      const bjChips = [
        { val: 5, color: '#dc2626', sec: '#ffffff', x: 2.5 },
        { val: 25, color: '#16a34a', sec: '#ffffff', x: 3.5 },
        { val: 100, color: '#1e293b', sec: '#eab308', x: 4.5 },
      ];
      bjChips.forEach((d) => {
        for (let s = 0; s < 5; s++) {
          pieces.push({
            id: `bj-bank-${d.val}-${s}`,
            type: 'poker_chip',
            name: `$${d.val} Chip`,
            position: { x: d.x, y: y + s * 0.13, z: -2.5 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            mass: 0.08,
            color: d.color,
            secondaryColor: d.sec,
            value: d.val,
            label: `$${d.val}`,
          });
        }
      });
      break;
    }

    case 'solitaire': {
      // Classic Klondike Solitaire setup
      // 7 tableau columns with cards, draw deck, foundation cards
      const colCards = [
        ['K♠'],
        ['Q♥', 'J♣'],
        ['10♦', '9♠', '8♥'],
        ['7♣', '6♦', '5♠', '4♥'],
        ['3♣', '2♦', 'A♠', 'K♥', 'Q♦'],
        ['J♠', '10♥', '9♣', '8♦', '7♠', '6♥'],
        ['5♣', '4♦', '3♠', '2♥', 'A♦', 'K♣', 'Q♠'],
      ];

      colCards.forEach((cardsInCol, colIdx) => {
        const colX = -4.5 + colIdx * 1.5;
        cardsInCol.forEach((cardLabel, cardIdx) => {
          const isTop = cardIdx === cardsInCol.length - 1;
          const suit = cardLabel.slice(-1);
          const isRed = suit === '♥' || suit === '♦';
          pieces.push({
            id: `sol-col-${colIdx}-${cardIdx}`,
            type: 'card',
            name: `Card ${cardLabel}`,
            label: cardLabel,
            position: { x: colX, y: y + cardIdx * 0.008, z: -0.5 + cardIdx * 0.45 },
            // Top card is face up, undercards face down
            rotation: isTop ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 },
            mass: 0.04,
            color: '#ffffff',
            secondaryColor: isRed ? '#dc2626' : '#0f172a',
          });
        });
      });

      // Draw Stock Deck (top left)
      pieces.push({
        id: 'sol-stock-deck',
        type: 'card_deck',
        name: 'Solitaire Stock (24 Cards)',
        position: { x: -4.5, y: y + 0.2, z: -3.5 },
        rotation: { x: 0, y: 0, z: 1, w: 0 }, // Face down
        mass: 0.35,
        color: '#1e3a8a',
        label: 'STOCK (24)',
        value: 24,
      });

      // 4 Foundation markers
      const foundationSuits = ['♠', '♥', '♦', '♣'];
      foundationSuits.forEach((s, idx) => {
        const isRed = s === '♥' || s === '♦';
        pieces.push({
          id: `sol-foundation-${idx}`,
          type: 'card',
          name: `Foundation ${s}`,
          label: `[ ${s} ]`,
          position: { x: 0 + idx * 1.5, y: y, z: -3.5 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.02,
          color: '#f8fafc',
          secondaryColor: isRed ? '#dc2626' : '#0f172a',
          isLocked: true,
        });
      });
      break;
    }

    case 'freecell': {
      // Authentic FreeCell Game Setup:
      // 52 cards dealt entirely FACE-UP across 8 cascading tableau columns
      // 4 Free Cells (top-left) and 4 Foundation Piles (top-right)
      const freeCellCards: string[][] = [
        ['7♦', 'A♣', 'K♦', '8♠', '5♥', '2♣', 'J♠'],
        ['8♦', '2♠', 'Q♦', '9♣', '6♥', '3♣', 'Q♠'],
        ['9♦', '3♠', 'J♦', '10♣', '7♥', '4♣', 'K♠'],
        ['10♦', '4♠', '10♠', 'J♣', '8♥', '5♣', 'A♥'],
        ['J♥', '5♠', '9♥', 'Q♣', '9♠', '6♣'],
        ['Q♥', '6♠', '8♣', 'K♣', '10♥', '7♣'],
        ['K♥', '7♠', '2♦', 'A♦', '6♦', 'A♠'],
        ['2♥', '3♥', '4♦', '5♦', '3♦', '4♠'],
      ];

      // 1. 8 Cascading Tableau Columns (all cards face-up with staggered Z-offset)
      freeCellCards.forEach((cardsInCol, colIdx) => {
        const colX = -5.25 + colIdx * 1.5;
        cardsInCol.forEach((cardLabel, cardIdx) => {
          const suit = cardLabel.slice(-1);
          const isRed = suit === '♥' || suit === '♦';
          pieces.push({
            id: `fc-col-${colIdx}-${cardIdx}`,
            type: 'card',
            name: `Card ${cardLabel}`,
            label: cardLabel,
            position: { x: colX, y: y + cardIdx * 0.008, z: -0.8 + cardIdx * 0.42 },
            // In FreeCell, all 52 cards are face up!
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            mass: 0.04,
            color: '#ffffff',
            secondaryColor: isRed ? '#dc2626' : '#0f172a',
          });
        });
      });

      // 2. 4 Free Cells (top left)
      for (let i = 0; i < 4; i++) {
        pieces.push({
          id: `fc-freecell-${i}`,
          type: 'card',
          name: `Free Cell ${i + 1}`,
          label: '[ FREE ]',
          position: { x: -5.25 + i * 1.5, y: y, z: -3.8 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.02,
          color: '#0f291e',
          secondaryColor: '#34d399',
          isLocked: true,
        });
      }

      // 3. 4 Foundation Slots (top right: Spades, Hearts, Diamonds, Clubs)
      const suits = ['♠', '♥', '♦', '♣'];
      suits.forEach((s, idx) => {
        const isRed = s === '♥' || s === '♦';
        pieces.push({
          id: `fc-foundation-${idx}`,
          type: 'card',
          name: `Foundation ${s}`,
          label: `[ ${s} ]`,
          position: { x: 0.75 + idx * 1.5, y: y, z: -3.8 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.02,
          color: '#0f291e',
          secondaryColor: isRed ? '#f87171' : '#e2e8f0',
          isLocked: true,
        });
      });
      break;
    }

    case 'poker': {
      pieces.push({
        id: 'deck-main',
        type: 'card_deck',
        name: 'Standard 52-Card Deck',
        position: { x: -3.5, y: y + 0.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.35,
        label: '52 CARDS',
        color: '#b91c1c',
      });

      const dealtCards = [
        { label: 'A♠', color: '#ffffff', x: -1.2, z: 1.5 },
        { label: 'K♠', color: '#ffffff', x: 0.0, z: 1.5 },
        { label: 'Q♠', color: '#ffffff', x: 1.2, z: 1.5 },
        { label: 'J♠', color: '#ffffff', x: 2.4, z: 1.5 },
        { label: '10♠', color: '#ffffff', x: 3.6, z: 1.5 },
      ];
      dealtCards.forEach((c, idx) => {
        pieces.push({
          id: `card-dealt-${idx}`,
          type: 'card',
          name: `Card ${c.label}`,
          position: { x: c.x, y: y + idx * 0.008, z: c.z },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.04,
          label: c.label,
          color: '#ffffff',
          secondaryColor: '#dc2626',
        });
      });

      pieces.push({
        id: 'dealer-chip',
        type: 'poker_chip',
        name: 'Dealer Button',
        position: { x: -3.5, y: y + 0.1, z: 2.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.1,
        color: '#f8fafc',
        label: 'DEALER',
        value: 0,
      });

      // Digital Pot Counter Token (TTS 3D Counter)
      pieces.push({
        id: 'pot-counter',
        type: 'counter',
        name: 'Pot Value Counter',
        position: { x: 0, y: y + 0.1, z: -0.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        value: 350,
        label: 'POT',
        color: '#0284c7',
        isLocked: true,
      });

      const chipDenoms = [
        { val: 1, color: '#f1f5f9', sec: '#0f172a', x: -3 },
        { val: 5, color: '#dc2626', sec: '#ffffff', x: -1.5 },
        { val: 25, color: '#16a34a', sec: '#ffffff', x: 0 },
        { val: 100, color: '#1e293b', sec: '#eab308', x: 1.5 },
        { val: 500, color: '#9333ea', sec: '#ffffff', x: 3 },
      ];

      chipDenoms.forEach((d) => {
        for (let stackIndex = 0; stackIndex < 6; stackIndex++) {
          pieces.push({
            id: `chip-${d.val}-${stackIndex}`,
            type: 'poker_chip',
            name: `$${d.val} Chip`,
            position: { x: d.x, y: y + stackIndex * 0.13, z: -3 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            mass: 0.08,
            color: d.color,
            secondaryColor: d.sec,
            value: d.val,
            label: `$${d.val}`,
          });
        }
      });
      break;
    }

    case 'chess': {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const backRankWhite = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
      const backRankBlack = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];

      // Tournament Chess Board (Standard 8x8 squares + wooden coordinate notation border)
      const boardThickness = 0.08;
      const boardY = tableHeight + boardThickness / 2;
      const boardSurfaceY = tableHeight + boardThickness;
      pieces.push({
        id: 'chess-board-main',
        type: 'board',
        name: 'Tournament Chess Board',
        position: { x: 0, y: boardY, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0,
        isLocked: true,
        dimensions: { x: 9.8, y: boardThickness, z: 9.8 },
        color: '#f0d9b5',
        secondaryColor: '#b58863',
      });

      const getRoleHeight = (role: string) => {
        const r = role.toLowerCase();
        if (r.includes('king')) return 1.35;
        if (r.includes('queen')) return 1.25;
        if (r.includes('bishop')) return 1.15;
        if (r.includes('knight')) return 1.10;
        if (r.includes('rook')) return 1.05;
        return 0.95;
      };

      const step = 1.1;
      const startX = -((7 * step) / 2);

      backRankWhite.forEach((pieceName, i) => {
        const pieceH = getRoleHeight(pieceName);
        const pieceCenterY = boardSurfaceY + pieceH / 2;
        pieces.push({
          id: `chess-w-${pieceName.toLowerCase()}-${i}`,
          type: 'chess_piece',
          name: `White ${pieceName}`,
          position: { x: startX + i * step, y: pieceCenterY, z: 3.85 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.15,
          color: '#f8fafc',
          label: pieceName[0],
          dimensions: { x: 0.65, y: pieceH, z: 0.65 },
          metadata: { side: 'white', role: pieceName },
        });
      });
      for (let i = 0; i < 8; i++) {
        const pawnH = 0.95;
        const pawnCenterY = boardSurfaceY + pawnH / 2;
        pieces.push({
          id: `chess-w-pawn-${i}`,
          type: 'chess_piece',
          name: `White Pawn ${files[i]}`,
          position: { x: startX + i * step, y: pawnCenterY, z: 2.75 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.12,
          color: '#f8fafc',
          label: 'P',
          dimensions: { x: 0.65, y: pawnH, z: 0.65 },
          metadata: { side: 'white', role: 'Pawn' },
        });
      }

      backRankBlack.forEach((pieceName, i) => {
        const pieceH = getRoleHeight(pieceName);
        const pieceCenterY = boardSurfaceY + pieceH / 2;
        pieces.push({
          id: `chess-b-${pieceName.toLowerCase()}-${i}`,
          type: 'chess_piece',
          name: `Black ${pieceName}`,
          position: { x: startX + i * step, y: pieceCenterY, z: -3.85 },
          rotation: { x: 0, y: 1, z: 0, w: 0 },
          mass: 0.15,
          color: '#1e293b',
          label: pieceName[0],
          dimensions: { x: 0.65, y: pieceH, z: 0.65 },
          metadata: { side: 'black', role: pieceName },
        });
      });
      for (let i = 0; i < 8; i++) {
        const pawnH = 0.95;
        const pawnCenterY = boardSurfaceY + pawnH / 2;
        pieces.push({
          id: `chess-b-pawn-${i}`,
          type: 'chess_piece',
          name: `Black Pawn ${files[i]}`,
          position: { x: startX + i * step, y: pawnCenterY, z: -2.75 },
          rotation: { x: 0, y: 1, z: 0, w: 0 },
          mass: 0.12,
          color: '#1e293b',
          label: 'P',
          dimensions: { x: 0.65, y: pawnH, z: 0.65 },
          metadata: { side: 'black', role: 'Pawn' },
        });
      }
      break;
    }

    case 'dice_arena': {
      const diceTypes = [
        { type: 'dice_d4', name: 'D4 Pyramidal', color: '#eab308', x: -4, z: -2 },
        { type: 'dice_d6', name: 'D6 Classic Red', color: '#dc2626', x: -2, z: -2 },
        { type: 'dice_d8', name: 'D8 Octahedron', color: '#2563eb', x: 0, z: -2 },
        { type: 'dice_d10', name: 'D10 Trapezohedron', color: '#16a34a', x: 2, z: -2 },
        { type: 'dice_d12', name: 'D12 Dodecahedron', color: '#9333ea', x: 4, z: -2 },
        { type: 'dice_d20', name: 'D20 Icosahedron', color: '#ea580c', x: 0, z: 0 },
      ];

      diceTypes.forEach((d, idx) => {
        pieces.push({
          id: `dice-poly-${idx}`,
          type: d.type as any,
          name: d.name,
          position: { x: d.x, y: y + 0.3, z: d.z },
          rotation: { x: Math.random() * 0.5, y: Math.random() * 0.5, z: 0, w: 1 },
          mass: 0.2,
          color: d.color,
          value: 1,
        });
      });

      for (let i = 0; i < 5; i++) {
        pieces.push({
          id: `dice-d6-set-${i}`,
          type: 'dice_d6',
          name: `D6 White #${i + 1}`,
          position: { x: (i - 2) * 1.3, y: y + 0.3, z: 2.5 },
          rotation: { x: 0, y: Math.random() * Math.PI, z: 0, w: 1 },
          mass: 0.2,
          color: '#f8fafc',
          value: i + 1,
        });
      }
      break;
    }

    case 'dungeon': {
      // RPG Kit: dungeon figures, torches/markers, D20s, health counter tokens
      pieces.push({
        id: 'hero-paladin',
        type: 'meeple',
        name: 'Paladin Hero',
        position: { x: -3, y: y, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        color: '#3b82f6',
      });
      pieces.push({
        id: 'hero-wizard',
        type: 'meeple',
        name: 'Wizard Hero',
        position: { x: -1.5, y: y, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        color: '#8b5cf6',
      });
      pieces.push({
        id: 'monster-dragon',
        type: 'pawn',
        name: 'Red Dragon Boss',
        position: { x: 0, y: y, z: -3 },
        rotation: { x: 0, y: Math.PI, z: 0, w: 0 },
        mass: 0.6,
        color: '#dc2626',
        dimensions: { x: 1.2, y: 2.2, z: 1.2 },
      });

      // Health counters
      pieces.push({
        id: 'counter-boss-hp',
        type: 'counter',
        name: 'Dragon HP Counter',
        position: { x: 3, y: y, z: -3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        value: 120,
        label: 'HP',
        color: '#e11d48',
        isLocked: true,
      });

      // D20 dice
      pieces.push({
        id: 'dungeon-d20',
        type: 'dice_d20',
        name: 'Attack D20',
        position: { x: 0, y: y + 0.3, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.25,
        color: '#ea580c',
        value: 20,
      });
      break;
    }

    case 'dominoes': {
      // 28 Double-Six Domino Set
      let idCount = 0;
      for (let high = 0; high <= 6; high++) {
        for (let low = 0; low <= high; low++) {
          const row = high;
          const col = low;
          pieces.push({
            id: `domino-${high}-${low}`,
            type: 'domino',
            name: `Domino [${high}|${low}]`,
            position: { x: (col - 1.5) * 1.5, y: y + 0.1, z: (row - 3) * 1.8 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            mass: 0.12,
            color: '#f8fafc',
            label: `${high}:${low}`,
          });
          idCount++;
        }
      }
      break;
    }

    case 'boardgame':
    case 'sandbox':
    default: {
      const meepleColors = [
        { color: '#dc2626', name: 'Red Meeple', x: -4, z: 2 },
        { color: '#2563eb', name: 'Blue Meeple', x: -2.5, z: 2 },
        { color: '#16a34a', name: 'Green Meeple', x: 2.5, z: 2 },
        { color: '#eab308', name: 'Yellow Meeple', x: 4, z: 2 },
      ];
      meepleColors.forEach((m, idx) => {
        pieces.push({
          id: `meeple-${idx}`,
          type: 'meeple',
          name: m.name,
          position: { x: m.x, y: y, z: m.z },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.15,
          color: m.color,
        });
      });

      const pawnColors = [
        { color: '#dc2626', x: -3.5, z: 3.5 },
        { color: '#2563eb', x: -2, z: 3.5 },
        { color: '#16a34a', x: 2, z: 3.5 },
        { color: '#eab308', x: 3.5, z: 3.5 },
      ];
      pawnColors.forEach((p, idx) => {
        pieces.push({
          id: `pawn-${idx}`,
          type: 'pawn',
          name: `Pawn ${idx + 1}`,
          position: { x: p.x, y: y, z: p.z },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.12,
          color: p.color,
        });
      });

      pieces.push({
        id: 'deck-main',
        type: 'card_deck',
        name: '52-Card Deck',
        position: { x: -4, y: y + 0.2, z: -2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.35,
        color: '#1e3a8a',
        label: 'CARDS',
      });

      pieces.push({
        id: 'card-1',
        type: 'card',
        name: 'Ace of Hearts',
        position: { x: -1, y: y, z: -1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.04,
        label: 'A♥',
        color: '#ffffff',
      });
      pieces.push({
        id: 'card-2',
        type: 'card',
        name: 'King of Spades',
        position: { x: 1, y: y, z: -1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.04,
        label: 'K♠',
        color: '#ffffff',
      });

      pieces.push({
        id: 'dice-d6-1',
        type: 'dice_d6',
        name: 'D6 Red',
        position: { x: -1.5, y: y + 0.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        color: '#ef4444',
        value: 6,
      });
      pieces.push({
        id: 'dice-d6-2',
        type: 'dice_d6',
        name: 'D6 Blue',
        position: { x: 0, y: y + 0.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        color: '#3b82f6',
        value: 5,
      });
      pieces.push({
        id: 'dice-d20-1',
        type: 'dice_d20',
        name: 'D20 Emerald',
        position: { x: 1.5, y: y + 0.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.25,
        color: '#10b981',
        value: 20,
      });

      // Digital Score Counter
      pieces.push({
        id: 'counter-score-1',
        type: 'counter',
        name: 'Score Counter',
        position: { x: 0, y: y, z: 4 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0.2,
        value: 0,
        label: 'SCORE',
        color: '#059669',
      });

      for (let i = 0; i < 4; i++) {
        pieces.push({
          id: `domino-${i}`,
          type: 'domino',
          name: `Domino [${i}|${i + 2}]`,
          position: { x: 3.5, y: y, z: -2 + i * 1.5 },
          rotation: { x: 0, y: Math.PI / 2, z: 0, w: 1 },
          mass: 0.1,
          color: '#ffffff',
          label: `${i}:${i + 2}`,
        });
      }
      break;
    }
  }

  return pieces;
}
