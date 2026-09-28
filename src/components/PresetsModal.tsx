/**
 * Tabletop Nexus - Game Presets Modal
 */

import React from 'react';
import { X, Dices, Crown, Layers, Sparkles, Check, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: string;
  onSelectPreset: (presetName: string) => void;
  onClearTable: () => void;
}

export const PresetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentPreset,
  onSelectPreset,
  onClearTable,
}) => {
  if (!isOpen) return null;

  const presets = [
    {
      id: 'blackjack',
      name: 'Blackjack (21) Casino',
      desc: 'Dealer shoe deck, dealer upcard/hole card, player betting circles, stackable chips, and interactive hit/stand game controls.',
      icon: Sparkles,
      color: 'from-emerald-600 to-green-700',
      pieces: '52-Card Shoe Deck, Dealer Hand, Player Hand, $5-$100 Chips',
    },
    {
      id: 'solitaire',
      name: 'Klondike Solitaire',
      desc: 'Full 7-column cascading tableau, 4 foundation piles, draw stock deck and waste pile for classic single-player cards.',
      icon: Layers,
      color: 'from-blue-600 to-cyan-700',
      pieces: '7 Tableau Columns, 4 Foundation Spots, Stock Deck',
    },
    {
      id: 'freecell',
      name: 'FreeCell Solitaire',
      desc: 'All 52 cards face-up in 8 cascading tableau columns, 4 open free cells, and 4 suit foundation piles.',
      icon: Layers,
      color: 'from-emerald-600 to-teal-700',
      pieces: '8 Cascading Columns (52 cards face-up), 4 Free Cells, 4 Foundations',
    },
    {
      id: 'poker',
      name: 'Texas Hold\'em Poker',
      desc: 'Classic oval felt table, standard 52-card deck, community cards, dealer button, and 30 stackable $1-$500 chips.',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-600',
      pieces: '52-Card Deck, $1, $5, $25, $100, $500 Chips, Dealer Button',
    },
    {
      id: 'boardgame',
      name: 'Board Game Sandbox',
      desc: 'Versatile playground with colorful meeples, pawns, polyhedral dice, cards, and dominoes.',
      icon: Layers,
      color: 'from-emerald-500 to-teal-600',
      pieces: 'Meeples, Pawns, D6, D20, Deck, Cards, Dominoes',
    },
    {
      id: 'chess',
      name: 'Classic Chess Match',
      desc: 'Full standard 32-piece tournament chess set with White and Black armies aligned on the board.',
      icon: Crown,
      color: 'from-blue-600 to-indigo-700',
      pieces: 'King, Queen, Rooks, Bishops, Knights, Pawns (32 pieces)',
    },
    {
      id: 'dice_arena',
      name: 'Dice Arena / TTRPG',
      desc: 'Polyhedral D&D dice set (D4, D6, D8, D10, D12, D20) plus a 5-die Farkle/Yahtzee roller setup.',
      icon: Dices,
      color: 'from-rose-500 to-red-700',
      pieces: 'D4, D6, D8, D10, D12, D20 + 5 White D6s',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Game Presets</h2>
              <p className="text-xs text-slate-400">Instantly configure table & pieces for standard tabletop games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = currentPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset.id);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-4 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{preset.name}</h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{preset.desc}</p>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    <span className="text-slate-500">Includes: </span>
                    {preset.pieces}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Clean Slate Option */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                onClearTable();
                onClose();
              }}
              className="w-full p-3 rounded-xl border border-dashed border-rose-900/50 hover:border-rose-600/70 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 transition flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Clear Table (Empty Sandbox)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
