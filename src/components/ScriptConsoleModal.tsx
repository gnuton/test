/**
 * Tabletop Nexus - In-Game Scripting & Macro Automation Console
 */

import React, { useState } from 'react';
import { Terminal, Play, X, Zap, Check } from 'lucide-react';
import { TabletopClient } from '../lib/tabletop/client/TabletopClient.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: TabletopClient | null;
}

export const ScriptConsoleModal: React.FC<Props> = ({ isOpen, onClose, client }) => {
  const [scriptCode, setScriptCode] = useState(`// Tabletop Nexus Script Console
// Quick automation macros:
Tabletop.rollAll();
Tabletop.dealCards(2);
Tabletop.notify("Round starting!");`);

  const [outputLog, setOutputLog] = useState<string[]>(['Console ready. Run JavaScript automation commands.']);

  if (!isOpen) return null;

  const handleRun = () => {
    if (!client) return;

    try {
      // Safe sandbox exposing Tabletop API
      const Tabletop = {
        rollAll: () => client.rollAllDice(),
        roll: (id: string) => client.rollDice(id),
        dealCards: (count: number) => client.dealCards(count),
        shuffle: () => client.shuffleDeck(),
        flipTable: () => client.flipTable(1.4),
        reset: () => client.resetTable(),
        clear: () => client.clearPieces(),
        clearDrawings: () => client.clearDrawings(),
        notify: (msg: string) => client.sendChat(`[AUTOMATION] ${msg}`),
        spawnDice: (sides: number = 20) =>
          client.spawnPiece({
            type: sides === 20 ? 'dice_d20' : 'dice_d6',
            color: '#dc2626',
            position: { x: 0, y: 3, z: 0 },
          }),
      };

      const runner = new Function('Tabletop', scriptCode);
      runner(Tabletop);

      setOutputLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Executed successfully.`]);
    } catch (err: any) {
      setOutputLog((prev) => [...prev, `[Error] ${err.message}`]);
    }
  };

  const macros = [
    { label: 'Deal 2 to All', code: 'Tabletop.dealCards(2); Tabletop.notify("Dealt 2 cards to each player.");' },
    { label: 'Roll All Polyhedrals', code: 'Tabletop.rollAll(); Tabletop.notify("Rolling all dice on the table!");' },
    { label: 'Shuffle & Clean Table', code: 'Tabletop.shuffle(); Tabletop.clearDrawings();' },
    { label: 'Spawn RPG Dice Set', code: 'Tabletop.spawnDice(20); Tabletop.spawnDice(6);' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">TTS Automation & Script Console</h2>
              <p className="text-[11px] text-slate-400">Execute table automation scripts and game macros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Macro Buttons */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Macros:
          </span>
          {macros.map((m) => (
            <button
              key={m.label}
              onClick={() => {
                setScriptCode(m.code);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap transition"
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-950/90 font-mono text-xs">
          <textarea
            value={scriptCode}
            onChange={(e) => setScriptCode(e.target.value)}
            className="flex-1 p-5 bg-transparent text-emerald-300 outline-none resize-none leading-relaxed"
          />

          {/* Output log */}
          <div className="h-28 border-t border-slate-800 bg-slate-950 p-3 overflow-y-auto text-[11px] text-slate-400 space-y-1">
            {outputLog.map((log, i) => (
              <div key={i} className="leading-snug">{log}</div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Available: Tabletop.rollAll(), .dealCards(), .shuffle(), .flipTable()</span>
          <button
            onClick={handleRun}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute Script</span>
          </button>
        </div>
      </div>
    </div>
  );
};
