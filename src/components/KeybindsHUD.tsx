/**
 * Tabletop Nexus - Complete Tabletop Simulator Hotkeys & Controls HUD
 * Implements kb.tabletopsimulator.com/player-guides/controls/
 */

import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

export const KeybindsHUD: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-5 right-5 z-20 pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden text-xs text-slate-300 transition-all duration-300 max-w-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3.5 py-2 font-semibold text-slate-200 hover:text-white transition w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>TTS Controls & Hotkeys</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-1.5 border-t border-slate-800/80 text-[11px] max-h-80 overflow-y-auto">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Tools (Grab, Draw, Ruler...):</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-400">F1 - F10</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Box Select (Marquee):</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-300">Left Drag Table</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Multi-Select Toggle:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-300">Shift + Click</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Select All / Deselect:</span>
              <span className="text-[10px] font-mono text-slate-300">Ctrl+A / Esc</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Group / Stack (Decks & Chips):</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">G</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Pick Up Card to Hand:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">H</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Context Menu:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Right Click</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Lock / Pin Piece in Place:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">L</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Blindfold Mode:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">B</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Inspect / Zoom Magnify:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Alt (Hold)</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Deal N Cards:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">1 - 9</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Roll Dice / Shuffle:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">R</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Flip Over:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">F</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Rotate Piece:</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Q</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">E</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Camera Bookmarks:</span>
              <span className="text-[10px] font-mono text-slate-300">Ctrl+1..4 (Save), Shift+1..4 (Load)</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Orbit 3D Camera:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Right Drag</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Pan Camera:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Middle / Shift+Right</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Ping Table:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Tab / P</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
