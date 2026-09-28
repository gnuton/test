/**
 * Tabletop Nexus - Blindfold Overlay Component
 * Implements kb.tabletopsimulator.com/player-guides/blindfold/ ('B' hotkey)
 */

import React from 'react';
import { EyeOff, Eye } from 'lucide-react';

interface Props {
  isBlindfolded: boolean;
  onToggleBlindfold: () => void;
}

export const BlindfoldOverlay: React.FC<Props> = ({ isBlindfolded, onToggleBlindfold }) => {
  if (!isBlindfolded) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
        <EyeOff className="w-10 h-10 text-slate-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-slate-200 mb-2">
        Blindfold Active
      </h1>
      <p className="text-sm text-slate-400 max-w-md text-center mb-8">
        Your screen is covered while the Game Master arranges secret cards, tokens, or hidden setups.
      </p>

      <button
        onClick={onToggleBlindfold}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-sm text-slate-200 shadow-xl transition active:scale-95"
      >
        <Eye className="w-4 h-4 text-sky-400" />
        <span>Remove Blindfold (B)</span>
      </button>
    </div>
  );
};
