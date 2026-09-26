/**
 * Tabletop Nexus - Standard Game Presets
 */

import { TabletopPieceData, TableConfig } from './types.js';

export function getPresetTableConfig(presetName: string): TableConfig {
  switch (presetName) {
    case 'poker':
      return {
        shape: 'oval',
        width: 14,
        length: 22,
        height: 2.0,
        feltColor: '#105634', // Classic casino green
        woodColor: '#3a2010',
        hasRim: true,
        gravity: 9.81,
      };
    case 'chess':
      return {
        shape: 'rectangular',
        width: 16,
        length: 16,
        height: 2.0,
        feltColor: '#2b231c', // Dark chess table
        woodColor: '#18120c',
        hasRim: true,
        gravity: 9.81,
      };
    case 'dice_arena':
      return {
        shape: 'rectangular',
        width: 15,
        length: 15,
        height: 2.0,
        feltColor: '#6d1822', // Velvet red dice arena
        woodColor: '#2c140e',
        hasRim: true,
        gravity: 9.81,
      };
    case 'boardgame':
    case 'sandbox':
    default:
      return {
        shape: 'rectangular',
        width: 16,
        length: 22,
        height: 2.0,
        feltColor: '#1c4234', // Classic forest green
        woodColor: '#3d2516',
        hasRim: true,
        gravity: 9.81,
      };
  }
}

export function getPresetPieces(presetName: string, tableHeight: number = 2.0): TabletopPieceData[] {
  const pieces: TabletopPieceData[] = [];
  const y = tableHeight + 0.3;

  switch (presetName) {
    case 'poker': {
      // Deck of cards at center-left
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

      // Sample dealt cards
      const dealtCards = [
        { label: 'A♠', color: '#ffffff', x: -1.2, z: 1.5, suit: '♠' },
        { label: 'K♠', color: '#ffffff', x: 0.0, z: 1.5, suit: '♠' },
        { label: 'Q♠', color: '#ffffff', x: 1.2, z: 1.5, suit: '♠' },
        { label: 'J♠', color: '#ffffff', x: 2.4, z: 1.5, suit: '♠' },
        { label: '10♠', color: '#ffffff', x: 3.6, z: 1.5, suit: '♠' },
      ];
      dealtCards.forEach((c, idx) => {
        pieces.push({
          id: `card-dealt-${idx}`,
          type: 'card',
          name: `Card ${c.label}`,
          position: { x: c.x, y: y + idx * 0.03, z: c.z },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.04,
          label: c.label,
          color: '#ffffff',
          secondaryColor: '#dc2626',
        });
      });

      // Dealer Button
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

      // Stacks of chips: $1 White, $5 Red, $25 Green, $100 Black, $500 Purple
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
      // 8x8 standard chess layout
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const backRankWhite = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
      const backRankBlack = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];

      const step = 1.1;
      const startX = -((7 * step) / 2);

      // White Pieces (Z = +4 to +3)
      backRankWhite.forEach((pieceName, i) => {
        pieces.push({
          id: `chess-w-${pieceName.toLowerCase()}-${i}`,
          type: 'chess_piece',
          name: `White ${pieceName}`,
          position: { x: startX + i * step, y: y, z: 3.85 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.15,
          color: '#f8fafc',
          label: pieceName[0],
          metadata: { side: 'white', role: pieceName },
        });
      });
      for (let i = 0; i < 8; i++) {
        pieces.push({
          id: `chess-w-pawn-${i}`,
          type: 'chess_piece',
          name: `White Pawn ${files[i]}`,
          position: { x: startX + i * step, y: y, z: 2.75 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          mass: 0.12,
          color: '#f8fafc',
          label: 'P',
          metadata: { side: 'white', role: 'Pawn' },
        });
      }

      // Black Pieces (Z = -4 to -3)
      backRankBlack.forEach((pieceName, i) => {
        pieces.push({
          id: `chess-b-${pieceName.toLowerCase()}-${i}`,
          type: 'chess_piece',
          name: `Black ${pieceName}`,
          position: { x: startX + i * step, y: y, z: -3.85 },
          rotation: { x: 0, y: 1, z: 0, w: 0 },
          mass: 0.15,
          color: '#1e293b',
          label: pieceName[0],
          metadata: { side: 'black', role: pieceName },
        });
      });
      for (let i = 0; i < 8; i++) {
        pieces.push({
          id: `chess-b-pawn-${i}`,
          type: 'chess_piece',
          name: `Black Pawn ${files[i]}`,
          position: { x: startX + i * step, y: y, z: -2.75 },
          rotation: { x: 0, y: 1, z: 0, w: 0 },
          mass: 0.12,
          color: '#1e293b',
          label: 'P',
          metadata: { side: 'black', role: 'Pawn' },
        });
      }
      break;
    }

    case 'dice_arena': {
      // Polyhedral set + multiple D6 dice
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

      // Extra Yahtzee / Farkle 5 D6 set in center
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

    case 'boardgame':
    case 'sandbox':
    default: {
      // Meeples
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

      // Pawns
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

      // Card Deck
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

      // 2 Hand Cards
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

      // Dice
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

      // Dominoes
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
