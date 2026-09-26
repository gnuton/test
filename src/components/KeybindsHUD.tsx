/**
 * Tabletop Nexus - Keybinds & Controls Helper HUD
 */

import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

export const KeybindsHUD: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-5 right-5 z-20 pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden text-xs text-slate-300 transition-all duration-300">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3.5 py-2 font-semibold text-slate-200 hover:text-white transition w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Controls & Shortcuts</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {isExpanded && (
          <div className="px-3.5 pb-3 pt-1 space-y-1.5 border-t border-slate-800/80 text-[11px]">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Grab & Throw:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Left Drag</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Orbit Camera:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Right Drag</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Pan Camera:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Middle / Shift+Right</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Zoom:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Scroll Wheel</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Rotate Piece:</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Q</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">E</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Flip Over:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">F</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Roll Dice:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">R</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Measure Ruler:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">Tab</kbd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Ping Table:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-white">P</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
