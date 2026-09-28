/**
 * Tabletop Nexus - Deck Search & Sifting Modal
 * Implements kb.tabletopsimulator.com/built-in-objects/cards/ (Search Deck, Cut Deck, Spread Deck)
 */

import React, { useState } from 'react';
import { X, Search, Scissors, Layers, Shuffle, Plus, Eye } from 'lucide-react';
import { TabletopPieceData } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: TabletopPieceData | null;
  onTakeCard: (deckId: string, cardName: string) => void;
  onCutDeck: (deckId: string) => void;
  onSpreadDeck: (deckId: string) => void;
  onShuffleDeck: (deckId: string) => void;
}

export const DeckSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deck,
  onTakeCard,
  onCutDeck,
  onSpreadDeck,
  onShuffleDeck,
}) => {
  const [selectedSuit, setSelectedSuit] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen || !deck) return null;

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

  const allCards = suits.flatMap((s) => ranks.map((r) => `${r}${s}`));

  const filteredCards = allCards.filter((card) => {
    const suit = card.slice(-1);
    if (selectedSuit !== 'all' && suit !== selectedSuit) return false;
    if (searchQuery && !card.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Search Deck: {deck.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                  52 Cards
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sift through deck cards, select specific card to draw, cut, or spread on table
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: Cut, Spread, Shuffle */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => {
              onCutDeck(deck.id);
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Scissors className="w-4 h-4 text-amber-400" />
            <span>Cut Deck</span>
          </button>
          <button
            onClick={() => {
              onSpreadDeck(deck.id);
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Spread on Table</span>
          </button>
          <button
            onClick={() => {
              onShuffleDeck(deck.id);
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Shuffle className="w-4 h-4 text-emerald-400" />
            <span>Shuffle Deck</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Suit Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700">
            <button
              onClick={() => setSelectedSuit('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedSuit === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {suits.map((suit) => {
              const isRed = suit === '♥' || suit === '♦';
              return (
                <button
                  key={suit}
                  onClick={() => setSelectedSuit(suit)}
                  className={`px-2.5 py-1 rounded-lg text-sm font-black transition ${
                    selectedSuit === suit
                      ? 'bg-slate-700 text-white shadow ring-1 ring-slate-500'
                      : isRed
                      ? 'text-rose-400 hover:bg-slate-800'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {suit}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search card (e.g. A♠)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 overflow-y-auto max-h-72 p-1">
          {filteredCards.map((card) => {
            const suit = card.slice(-1);
            const isRed = suit === '♥' || suit === '♦';
            return (
              <button
                key={card}
                onClick={() => {
                  onTakeCard(deck.id, card);
                  onClose();
                }}
                className="group relative p-2.5 rounded-xl bg-white hover:bg-indigo-50 border-2 border-slate-300 hover:border-indigo-500 flex flex-col items-center justify-between h-24 shadow transition-all hover:scale-105 active:scale-95 text-slate-900"
              >
                <div
                  className={`w-full text-left font-black text-xs leading-none ${
                    isRed ? 'text-rose-600' : 'text-slate-950'
                  }`}
                >
                  {card}
                </div>
                <div
                  className={`text-2xl font-black ${
                    isRed ? 'text-rose-600' : 'text-slate-950'
                  }`}
                >
                  {suit}
                </div>
                <div
                  className={`w-full text-right font-black text-xs leading-none ${
                    isRed ? 'text-rose-600' : 'text-slate-950'
                  }`}
                >
                  {card}
                </div>

                <div className="absolute inset-0 bg-indigo-600/90 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white font-bold text-xs transition-opacity shadow-lg">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Draw</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
