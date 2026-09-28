/**
 * Tabletop Nexus - Multi-Selection Floating HUD
 * Actions for manipulating multiple selected objects (Stack, Flip, Rotate, Lock, Delete)
 */

import React from 'react';
import { Layers, RotateCcw, RotateCw, Lock, Trash2, X, Hand } from 'lucide-react';
import { TabletopPieceData } from '../lib/tabletop/types.js';

interface Props {
  selectedPieceIds: string[];
  pieces: Map<string, TabletopPieceData>;
  onGroupSelected: () => void;
  onCascadeSelected?: () => void;
  onFanSelected?: () => void;
  onFlipSelected?: () => void;
  onRotateSelected: (clockwise: boolean) => void;
  onLockSelected: () => void;
  onDeleteSelected: () => void;
  onPickupToHand?: () => void;
  onClearSelection: () => void;
}

export const SelectionHUD: React.FC<Props> = ({
  selectedPieceIds,
  pieces,
  onGroupSelected,
  onCascadeSelected,
  onFanSelected,
  onFlipSelected,
  onRotateSelected,
  onLockSelected,
  onDeleteSelected,
  onPickupToHand,
  onClearSelection,
}) => {
  if (selectedPieceIds.length === 0) return null;

  const count = selectedPieceIds.length;
  const selectedPieces = selectedPieceIds.map((id) => pieces.get(id)).filter(Boolean) as TabletopPieceData[];
  const hasCards = selectedPieces.some((p) => p.type === 'card' || p.type === 'card_deck');

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-sky-500/40 shadow-2xl text-white">
        {/* Count badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 font-semibold text-xs mr-1">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>{count} {count === 1 ? 'Object' : 'Objects'} Selected</span>
        </div>

        {/* Group / Stack Button (TTS 'G' key) */}
        <button
          onClick={onGroupSelected}
          title="Stack / Group into deck or column (Hotkey: G)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow transition active:scale-95"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Stack (G)</span>
        </button>

        {/* Cascade Column (FreeCell / Solitaire style) */}
        {hasCards && count >= 2 && onCascadeSelected && (
          <button
            onClick={onCascadeSelected}
            title="Cascade cards into overlapping column (FreeCell / Solitaire tableau)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition active:scale-95"
          >
            <span>Cascade</span>
          </button>
        )}

        {/* Fan Horizontal Row */}
        {hasCards && count >= 2 && onFanSelected && (
          <button
            onClick={onFanSelected}
            title="Fan out cards horizontally (Hand / Splay layout)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition active:scale-95"
          >
            <span>Fan</span>
          </button>
        )}

        {/* Take to Hand (Hotkey: H) */}
        {hasCards && onPickupToHand && (
          <button
            onClick={onPickupToHand}
            title="Take selected card(s) to private hand (Hotkey: H)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition active:scale-95"
          >
            <Hand className="w-3.5 h-3.5 text-amber-400" />
            <span>To Hand (H)</span>
          </button>
        )}

        {/* Rotate Left (TTS 'Q' key) */}
        <button
          onClick={() => onRotateSelected(false)}
          title="Rotate 45° CCW (Hotkey: Q)"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Rotate Right (TTS 'E' key) */}
        <button
          onClick={() => onRotateSelected(true)}
          title="Rotate 45° CW (Hotkey: E)"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Lock / Unlock (TTS 'L' key) */}
        <button
          onClick={onLockSelected}
          title="Toggle Physics Lock (Hotkey: L)"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          title="Delete selected (Hotkey: Delete)"
          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 transition active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        {/* Deselect / Close (Esc) */}
        <button
          onClick={onClearSelection}
          title="Clear Selection (Esc)"
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
