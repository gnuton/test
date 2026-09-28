/**
 * Tabletop Nexus - Action Toolbar (Iconic TTS mechanics)
 */

import React, { useState } from 'react';
import {
  Dices,
  Plus,
  RefreshCw,
  Ruler,
  MapPin,
  Layers,
  MessageSquare,
  Shuffle,
  CreditCard
} from 'lucide-react';

interface Props {
  onRollAllDice: () => void;
  onShuffleDeck: () => void;
  onDealCards: (count: number) => void;
  onResetTable: () => void;
  onToggleRuler: () => boolean;
  isRulerActive: boolean;
  onPing: () => void;
  onOpenSpawner: () => void;
  onToggleChat: () => void;
  unreadCount?: number;
  onOpenDeckSearch?: () => void;
}

export const ActionToolbar: React.FC<Props> = ({
  onRollAllDice,
  onShuffleDeck,
  onDealCards,
  onResetTable,
  onToggleRuler,
  isRulerActive,
  onPing,
  onOpenSpawner,
  onToggleChat,
  unreadCount = 0,
  onOpenDeckSearch,
}) => {
  const [showCardsDropdown, setShowCardsDropdown] = useState(false);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl">
      {/* 1. Spawner */}
      <button
        onClick={onOpenSpawner}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
      >
        <Plus className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">Spawn</span>
      </button>

      {/* 2. Roll All Dice */}
      <button
        onClick={onRollAllDice}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
        title="Roll all dice on table (Hotkey: R)"
      >
        <Dices className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">Roll All</span>
      </button>

      {/* 3. Cards & Deck Popover */}
      <div className="relative">
        <button
          onClick={() => setShowCardsDropdown(!showCardsDropdown)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            showCardsDropdown
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
          title="Cards & Deck Controls"
        >
          <CreditCard className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Cards</span>
        </button>

        {showCardsDropdown && (
          <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl space-y-1 text-xs">
            {onOpenDeckSearch && (
              <button
                onClick={() => {
                  onOpenDeckSearch();
                  setShowCardsDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Search / Sift Deck</span>
              </button>
            )}
            <button
              onClick={() => {
                onShuffleDeck();
                setShowCardsDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-400" />
              <span>Shuffle Deck</span>
            </button>
            <button
              onClick={() => {
                onDealCards(1);
                setShowCardsDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deal 1 Card</span>
            </button>
            <button
              onClick={() => {
                onDealCards(5);
                setShowCardsDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Deal 5 Cards (Poker)</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Measuring Tape Ruler */}
      <button
        onClick={onToggleRuler}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
          isRulerActive
            ? 'bg-sky-500 text-white ring-2 ring-sky-400/50'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
        }`}
        title="Measuring Tape Tool (Hotkey: Tab)"
      >
        <Ruler className="w-4 h-4 text-sky-400" />
        <span className="hidden md:inline">Ruler</span>
      </button>

      {/* 5. Ping */}
      <button
        onClick={onPing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
        title="Ping Table Location (Hotkey: P)"
      >
        <MapPin className="w-4 h-4 text-cyan-400" />
        <span className="hidden md:inline">Ping</span>
      </button>

      {/* 6. Reset Table */}
      <button
        onClick={onResetTable}
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shadow-sm"
        title="Reset & Recall Table Pieces"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* 7. Chat Toggle */}
      <button
        onClick={onToggleChat}
        className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
        title="Open Table Chat & Action Log"
      >
        <MessageSquare className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
