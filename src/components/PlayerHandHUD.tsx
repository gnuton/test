/**
 * Tabletop Nexus - Private Player Hand HUD
 * Realistic player hand shelf at bottom of viewport. Cards are private to local player.
 */

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Hand, Plus, ArrowUpRight, ArrowDownRight, Trash2, Eye } from 'lucide-react';
import { TabletopPieceData } from '../lib/tabletop/types.js';

export interface HandCard {
  id: string;
  name: string;
  label: string;
  suit: string;
  rank: string;
  isRed: boolean;
}

interface Props {
  hand: HandCard[];
  onPlayCard: (card: HandCard) => void;
  onDrawCard: () => void;
  onSortHand: (by: 'suit' | 'rank') => void;
  onClearHand: () => void;
  onInspectCard?: (card: HandCard) => void;
}

export const PlayerHandHUD: React.FC<Props> = ({
  hand,
  onPlayCard,
  onDrawCard,
  onSortHand,
  onClearHand,
  onInspectCard,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (hand.length === 0) {
    return (
      <div className="fixed bottom-3 right-5 z-30">
        <button
          onClick={onDrawCard}
          title="Draw 1 card into your private hand"
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 shadow-xl text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95 group"
        >
          <Hand className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          <span>Draw to Hand (H)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
      {/* Header Tab */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-t-xl bg-slate-900/95 border-t border-x border-slate-700/80 shadow-lg text-xs font-semibold text-slate-200">
        <div className="flex items-center gap-1.5">
          <Hand className="w-3.5 h-3.5 text-amber-400" />
          <span>Private Hand</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
            {hand.length}
          </span>
        </div>

        <div className="w-px h-3 bg-slate-700 mx-1" />

        <button
          onClick={onDrawCard}
          title="Draw 1 Card from Deck"
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Plus className="w-3 h-3 text-emerald-400" />
          <span>Draw</span>
        </button>

        <button
          onClick={() => onSortHand('rank')}
          title="Sort hand by rank"
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          Sort Rank
        </button>

        <button
          onClick={() => onSortHand('suit')}
          title="Sort hand by suit"
          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          Sort Suit
        </button>

        <button
          onClick={onClearHand}
          title="Clear all cards in hand"
          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Cards Shelf View */}
      {isExpanded && (
        <div className="w-screen max-w-4xl px-6 py-3 rounded-t-2xl bg-slate-950/90 backdrop-blur-xl border-t border-x border-slate-800 shadow-2xl overflow-x-auto flex items-center justify-center gap-2 pb-5">
          {hand.map((card, idx) => {
            const rot = (idx - (hand.length - 1) / 2) * 2;
            const yOffset = Math.abs(idx - (hand.length - 1) / 2) * 3;

            return (
              <div
                key={card.id}
                style={{
                  transform: `translateY(${yOffset}px) rotate(${rot}deg)`,
                }}
                className="group relative w-20 h-28 shrink-0 rounded-xl bg-white border border-slate-300 shadow-xl select-none cursor-pointer transition-all duration-200 hover:-translate-y-6 hover:scale-110 hover:shadow-2xl hover:z-20 hover:border-amber-400"
                onClick={() => onPlayCard(card)}
              >
                {/* Top Corner Label */}
                <div className={`absolute top-1.5 left-2 font-bold text-xs leading-none ${card.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  <div>{card.rank}</div>
                  <div className="text-sm">{card.suit}</div>
                </div>

                {/* Center Giant Suit */}
                <div className={`absolute inset-0 flex items-center justify-center text-3xl font-serif pointer-events-none ${card.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  {card.suit}
                </div>

                {/* Bottom Corner Label (Inverted) */}
                <div className={`absolute bottom-1.5 right-2 font-bold text-xs leading-none rotate-180 ${card.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  <div>{card.rank}</div>
                  <div className="text-sm">{card.suit}</div>
                </div>

                {/* Hover Play Badge */}
                <div className="absolute inset-0 rounded-xl bg-slate-900/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition p-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    Play
                  </span>
                  <span className="text-[9px] text-slate-300">Click table</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
