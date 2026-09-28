/**
 * Tabletop Nexus - Alt Key Card & Piece Inspect HUD
 */

import React from 'react';
import { TabletopPieceData } from '../lib/tabletop/types.js';

interface Props {
  inspectedPiece: TabletopPieceData | null;
}

export const CardInspectModal: React.FC<Props> = ({ inspectedPiece }) => {
  if (!inspectedPiece) return null;

  const isCard = inspectedPiece.type === 'card' || inspectedPiece.type === 'card_deck';
  const label = inspectedPiece.label || inspectedPiece.name;
  const isRed = label.includes('♥') || label.includes('♦') || inspectedPiece.secondaryColor === '#dc2626';

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-slate-100 max-w-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/80 px-2.5 py-0.5 rounded-full">
          Alt-Key Zoom Magnify
        </span>

        {isCard ? (
          <div className="w-56 h-80 rounded-2xl bg-white border-4 border-slate-200 shadow-2xl p-5 flex flex-col justify-between text-slate-900 select-none">
            <div className="flex justify-between items-start">
              <span className={`text-4xl font-extrabold ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                {label}
              </span>
              <span className="text-sm font-bold text-slate-400">TABLETOP NEXUS</span>
            </div>

            <div className={`text-7xl font-black text-center my-auto ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
              {label.slice(-1) || '♠'}
            </div>

            <div className="flex justify-between items-end rotate-180">
              <span className={`text-4xl font-extrabold ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                {label}
              </span>
            </div>
          </div>
        ) : inspectedPiece.imageUrl ? (
          <div className="w-64 h-64 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl">
            <img src={inspectedPiece.imageUrl} alt={inspectedPiece.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-56 h-56 rounded-2xl bg-slate-850 border border-slate-700 flex flex-col items-center justify-center p-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center text-white font-black text-2xl shadow-lg"
              style={{ backgroundColor: inspectedPiece.color || '#3b82f6' }}
            >
              {inspectedPiece.value !== undefined ? inspectedPiece.value : inspectedPiece.name[0]}
            </div>
            <h3 className="font-bold text-base text-white">{inspectedPiece.name}</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase font-mono">{inspectedPiece.type.replace('_', ' ')}</p>
          </div>
        )}

        <div className="text-center">
          <div className="text-sm font-bold text-white">{inspectedPiece.name}</div>
          <div className="text-[11px] text-slate-400">
            {inspectedPiece.isLocked ? '🔒 Locked (Press L to unlock)' : '🔓 Unlocked (Press L to lock)'}
          </div>
        </div>
      </div>
    </div>
  );
};
