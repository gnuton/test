/**
 * Tabletop Nexus - Right-Click Context Menu
 * Contextual actions for Cards, Decks, Poker Chips, Dice, and Table
 */

import React, { useEffect, useRef } from 'react';
import {
  Layers,
  Hand,
  FlipHorizontal,
  Shuffle,
  Scissors,
  SplitSquareVertical,
  Search,
  Lock,
  Trash2,
  Plus,
  Dices,
  Copy,
} from 'lucide-react';
import { TabletopPieceData } from '../lib/tabletop/types.js';

export interface ContextMenuInfo {
  pieceId?: string;
  pieceData?: TabletopPieceData;
  screenX: number;
  screenY: number;
}

interface Props {
  info: ContextMenuInfo | null;
  onClose: () => void;
  onDrawCard?: (deckId: string) => void;
  onTakeToHand?: (piece: TabletopPieceData) => void;
  onFlipPiece?: (pieceId: string) => void;
  onShuffleDeck?: (pieceId: string) => void;
  onCutDeck?: (pieceId: string) => void;
  onSpreadDeck?: (pieceId: string) => void;
  onOpenDeckSearch?: (piece: TabletopPieceData) => void;
  onGroupPieces?: () => void;
  onToggleLock?: (pieceId: string) => void;
  onDeletePiece?: (pieceId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onSpawnDeck?: () => void;
}

export const ContextMenu: React.FC<Props> = ({
  info,
  onClose,
  onDrawCard,
  onTakeToHand,
  onFlipPiece,
  onShuffleDeck,
  onCutDeck,
  onSpreadDeck,
  onOpenDeckSearch,
  onGroupPieces,
  onToggleLock,
  onDeletePiece,
  onSelectAll,
  onClearSelection,
  onSpawnDeck,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!info) return null;

  const { pieceId, pieceData, screenX, screenY } = info;
  const isCard = pieceData?.type === 'card';
  const isDeck = pieceData?.type === 'card_deck';
  const isChip = pieceData?.type === 'poker_chip';
  const isDice = pieceData?.type.startsWith('dice_');

  // Keep menu on screen
  const menuWidth = 220;
  const menuHeight = 280;
  const left = Math.min(screenX, window.innerWidth - menuWidth - 10);
  const top = Math.min(screenY, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left, top }}
      className="fixed z-50 w-56 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden py-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Title */}
      <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider flex items-center justify-between">
        <span className="truncate">{pieceData?.name || 'Table Context'}</span>
        {pieceData?.isLocked && <span className="text-amber-400 font-mono">LOCKED</span>}
      </div>

      <div className="py-1 space-y-0.5">
        {/* Deck specific actions */}
        {isDeck && pieceId && (
          <>
            <button
              onClick={() => {
                onDrawCard?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Draw 1 Card</span>
            </button>

            <button
              onClick={() => {
                if (pieceData) onTakeToHand?.(pieceData);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Hand className="w-4 h-4 text-amber-400" />
              <span>Take to Hand (H)</span>
            </button>

            <button
              onClick={() => {
                onShuffleDeck?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Shuffle className="w-4 h-4 text-sky-400" />
              <span>Shuffle Deck (R)</span>
            </button>

            <button
              onClick={() => {
                onCutDeck?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Scissors className="w-4 h-4 text-purple-400" />
              <span>Cut Deck</span>
            </button>

            <button
              onClick={() => {
                onSpreadDeck?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <SplitSquareVertical className="w-4 h-4 text-indigo-400" />
              <span>Spread Cards</span>
            </button>

            <button
              onClick={() => {
                if (pieceData) onOpenDeckSearch?.(pieceData);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>Search Deck...</span>
            </button>
            <div className="w-full h-px bg-slate-800 my-1" />
          </>
        )}

        {/* Card actions */}
        {isCard && pieceData && (
          <>
            <button
              onClick={() => {
                onTakeToHand?.(pieceData);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Hand className="w-4 h-4 text-amber-400" />
              <span>Take to Hand (H)</span>
            </button>
          </>
        )}

        {/* Piece General Actions (Flip, Group, Lock, Delete) */}
        {pieceId && (
          <>
            <button
              onClick={() => {
                onFlipPiece?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <FlipHorizontal className="w-4 h-4 text-indigo-400" />
              <span>Flip Face (F)</span>
            </button>

            <button
              onClick={() => {
                onGroupPieces?.();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Stack / Group (G)</span>
            </button>

            <button
              onClick={() => {
                onToggleLock?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{pieceData?.isLocked ? 'Unlock (L)' : 'Lock / Pin (L)'}</span>
            </button>

            <button
              onClick={() => {
                onDeletePiece?.(pieceId);
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-500/20 text-rose-300 hover:text-white text-left transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </>
        )}

        {/* Table Click (no piece clicked) */}
        {!pieceId && (
          <>
            <button
              onClick={() => {
                onSelectAll?.();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Select All (Ctrl+A)</span>
            </button>

            <button
              onClick={() => {
                onClearSelection?.();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <span>✕ Clear Selection (Esc)</span>
            </button>

            <div className="w-full h-px bg-slate-800 my-1" />

            <button
              onClick={() => {
                onSpawnDeck?.();
                onClose();
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-left transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Spawn 52-Card Deck</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
