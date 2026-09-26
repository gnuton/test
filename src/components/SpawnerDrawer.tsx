/**
 * Tabletop Nexus - Piece Spawner Drawer
 */

import React, { useState } from 'react';
import {
  X,
  Plus,
  Dices,
  Layers,
  Sparkles,
  Crown,
  Box,
  Palette
} from 'lucide-react';
import { TabletopPieceData, PieceShapeType } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSpawnPiece: (piece: Partial<TabletopPieceData> & { type: PieceShapeType }) => void;
  onSpawnBatch: (pieces: Array<Partial<TabletopPieceData> & { type: PieceShapeType }>) => void;
  tableHeight: number;
}

export const SpawnerDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onSpawnPiece,
  onSpawnBatch,
  tableHeight,
}) => {
  const [activeCategory, setActiveCategory] = useState<'dice' | 'cards' | 'chips' | 'miniatures' | 'blocks'>('dice');
  const [selectedColor, setSelectedColor] = useState('#ef4444');

  if (!isOpen) return null;

  const colorPalette = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'White', hex: '#f8fafc' },
    { name: 'Dark Slate', hex: '#1e293b' },
  ];

  const spawnPieceAtCenter = (type: PieceShapeType, label?: string, customColor?: string) => {
    onSpawnPiece({
      type,
      name: `${type}`,
      color: customColor || selectedColor,
      label,
      position: {
        x: (Math.random() - 0.5) * 3,
        y: tableHeight + 1.2,
        z: (Math.random() - 0.5) * 3,
      },
      rotation: {
        x: (Math.random() - 0.5) * 0.2,
        y: Math.random() * Math.PI,
        z: 0,
        w: 1,
      },
    });
  };

  const spawnChipStack = (value: number, count: number = 5, color: string) => {
    const stack: Array<Partial<TabletopPieceData> & { type: PieceShapeType }> = [];
    const baseX = (Math.random() - 0.5) * 4;
    const baseZ = (Math.random() - 0.5) * 4;

    for (let i = 0; i < count; i++) {
      stack.push({
        type: 'poker_chip',
        name: `$${value} Chip`,
        value,
        label: `$${value}`,
        color,
        secondaryColor: '#ffffff',
        position: { x: baseX, y: tableHeight + 0.3 + i * 0.14, z: baseZ },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
    }
    onSpawnBatch(stack);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Piece Spawner</h2>
            <p className="text-[11px] text-slate-400">Add dynamic 3D game items to table</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Color Selection Bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" /> Piece Color
          </span>
          <span className="text-[11px] font-mono text-slate-400">{selectedColor}</span>
        </div>
        <div className="flex gap-2">
          {colorPalette.map((c) => (
            <button
              key={c.hex}
              onClick={() => setSelectedColor(c.hex)}
              className={`w-7 h-7 rounded-full border transition-all ${
                selectedColor === c.hex
                  ? 'ring-2 ring-emerald-500 scale-110 border-white'
                  : 'border-slate-700 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-900/50 text-[11px]">
        {[
          { id: 'dice', label: 'Dice', icon: Dices },
          { id: 'cards', label: 'Cards', icon: Layers },
          { id: 'chips', label: 'Chips', icon: Sparkles },
          { id: 'miniatures', label: 'Pieces', icon: Crown },
          { id: 'blocks', label: 'Tiles', icon: Box },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`py-2.5 flex flex-col items-center gap-1 transition ${
                isActive
                  ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-800/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeCategory === 'dice' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Polyhedral Dice Set</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { type: 'dice_d6', label: 'D6 Classic', sides: 6 },
                { type: 'dice_d20', label: 'D20 Icosahedron', sides: 20 },
                { type: 'dice_d4', label: 'D4 Pyramid', sides: 4 },
                { type: 'dice_d8', label: 'D8 Octahedron', sides: 8 },
                { type: 'dice_d10', label: 'D10 Trapezohedron', sides: 10 },
                { type: 'dice_d12', label: 'D12 Dodecahedron', sides: 12 },
              ].map((d) => (
                <button
                  key={d.type}
                  onClick={() => spawnPieceAtCenter(d.type as any, `${d.sides}`)}
                  className="p-3 rounded-xl border border-slate-800 hover:border-emerald-500/70 bg-slate-800/40 hover:bg-slate-800 transition flex items-center justify-between text-left group"
                >
                  <div>
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition block">
                      {d.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{d.sides} faces</span>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  ['dice_d4', 'dice_d6', 'dice_d8', 'dice_d10', 'dice_d12', 'dice_d20'].forEach((t, i) => {
                    setTimeout(() => spawnPieceAtCenter(t as any), i * 60);
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
              >
                <Dices className="w-4 h-4" />
                Spawn Full 7-Piece RPG Dice Set
              </button>
            </div>
          </div>
        )}

        {activeCategory === 'cards' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Card Items</h3>
            <div className="space-y-2">
              <button
                onClick={() =>
                  onSpawnPiece({
                    type: 'card_deck',
                    name: '52-Card Deck',
                    label: '52 CARDS',
                    color: selectedColor,
                    position: { x: 0, y: tableHeight + 1.2, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                  })
                }
                className="w-full p-3 rounded-xl border border-slate-800 hover:border-emerald-500/70 bg-slate-800/40 hover:bg-slate-800 transition flex items-center justify-between text-left group"
              >
                <div>
                  <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition block">
                    Full 52-Card Playing Deck
                  </span>
                  <span className="text-[10px] text-slate-400">Can be shuffled, flipped, and dealt</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                {['A♠', 'K♥', 'Q♦', 'J♣', '10♠', '7♥'].map((cardLabel) => (
                  <button
                    key={cardLabel}
                    onClick={() => spawnPieceAtCenter('card', cardLabel, '#ffffff')}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500 bg-slate-800/40 hover:bg-slate-800 text-left transition flex items-center justify-between"
                  >
                    <span className="font-bold text-xs text-white">{cardLabel}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">+1</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'chips' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Casino Poker Chips</h3>
            <div className="space-y-2">
              {[
                { val: 1, label: '$1 White', hex: '#f8fafc' },
                { val: 5, label: '$5 Red', hex: '#dc2626' },
                { val: 25, label: '$25 Green', hex: '#16a34a' },
                { val: 100, label: '$100 Black', hex: '#0f172a' },
                { val: 500, label: '$500 Purple', hex: '#9333ea' },
              ].map((chip) => (
                <div
                  key={chip.val}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: chip.hex }}
                    />
                    <span className="text-xs font-bold text-white">{chip.label}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => spawnPieceAtCenter('poker_chip', `$${chip.val}`, chip.hex)}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-white text-[11px] font-semibold transition"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => spawnChipStack(chip.val, 5, chip.hex)}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-white text-[11px] font-semibold transition"
                    >
                      Stack (5)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'miniatures' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pawns, Meeples & Chess</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'meeple', label: 'Meeple' },
                { type: 'pawn', label: 'Board Pawn' },
                { type: 'chess_piece', label: 'Chess King', labelText: 'K' },
                { type: 'chess_piece', label: 'Chess Queen', labelText: 'Q' },
                { type: 'chess_piece', label: 'Chess Knight', labelText: 'N' },
                { type: 'chess_piece', label: 'Chess Pawn', labelText: 'P' },
              ].map((p, idx) => (
                <button
                  key={`${p.type}-${idx}`}
                  onClick={() => spawnPieceAtCenter(p.type as any, p.labelText)}
                  className="p-3 rounded-xl border border-slate-800 hover:border-emerald-500 bg-slate-800/40 hover:bg-slate-800 text-left transition flex items-center justify-between group"
                >
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                    {p.label}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'blocks' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dominoes & Custom Blocks</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'domino', label: 'Domino [6|6]' },
                { type: 'domino', label: 'Domino [5|4]' },
                { type: 'checker', label: 'Checker Disc' },
                { type: 'block', label: 'Wooden Cube' },
              ].map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => spawnPieceAtCenter(b.type as any, b.label)}
                  className="p-3 rounded-xl border border-slate-800 hover:border-emerald-500 bg-slate-800/40 hover:bg-slate-800 text-left transition flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-white">{b.label}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
