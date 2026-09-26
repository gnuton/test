/**
 * Tabletop Nexus - Table Customizer Modal
 */

import React from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { TableConfig } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: TableConfig;
  onUpdateConfig: (config: Partial<TableConfig>) => void;
}

const FELT_COLORS = [
  { name: 'Casino Green', hex: '#15803d' },
  { name: 'Deep Forest', hex: '#1c4234' },
  { name: 'Royal Blue', hex: '#1e3a8a' },
  { name: 'Velvet Crimson', hex: '#881337' },
  { name: 'Midnight Charcoal', hex: '#1e293b' },
  { name: 'Royal Amethyst', hex: '#581c87' },
];

const WOOD_COLORS = [
  { name: 'Mahogany', hex: '#3d2516' },
  { name: 'Dark Oak', hex: '#26170d' },
  { name: 'Cherry', hex: '#4c1d13' },
  { name: 'Obsidian Black', hex: '#0f172a' },
];

export const TableCustomizerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Table & Physics Settings</h2>
              <p className="text-xs text-slate-400">Synced across all connected players</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Table Shape */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Table Shape</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rectangular', label: 'Rectangular' },
                { id: 'oval', label: 'Oval / Poker' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUpdateConfig({ shape: s.id as any })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                    config.shape === s.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{s.label}</span>
                  {config.shape === s.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Felt Color */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Felt Color</label>
            <div className="grid grid-cols-3 gap-2">
              {FELT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => onUpdateConfig({ feltColor: c.hex })}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition ${
                    config.feltColor === c.hex
                      ? 'border-emerald-500 bg-slate-800 text-white'
                      : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wood Rim Finish */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Wood Finish</label>
            <div className="grid grid-cols-2 gap-2">
              {WOOD_COLORS.map((w) => (
                <button
                  key={w.hex}
                  onClick={() => onUpdateConfig({ woodColor: w.hex })}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition ${
                    config.woodColor === w.hex
                      ? 'border-emerald-500 bg-slate-800 text-white'
                      : 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: w.hex }}
                  />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Rim Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Containment Rims</span>
              <span className="text-[11px] text-slate-400">Prevents dice and chips from rolling off table</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ hasRim: !config.hasRim })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                config.hasRim ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
            </button>
          </div>

          {/* Server Physics Gravity */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Server Gravity (m/s²)</label>
              <span className="text-xs font-mono text-emerald-400 font-bold">{config.gravity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={config.gravity}
              onChange={(e) => onUpdateConfig({ gravity: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Moon (2.0)</span>
              <span>Earth (9.8)</span>
              <span>Heavy (20.0)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
