/**
 * Tabletop Nexus - Table Customizer Modal (Environments, Grid, Physics)
 */

import React from 'react';
import { X, Sliders, Check, Grid, Compass, Moon, Sun, Sparkles } from 'lucide-react';
import { TableConfig, EnvironmentTheme } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: TableConfig;
  onUpdateConfig: (config: Partial<TableConfig>) => void;
}

const ENVIRONMENTS: Array<{ id: EnvironmentTheme; name: string; desc: string }> = [
  { id: 'studio', name: 'Dark Studio', desc: 'Minimalist slate room with studio spotlight' },
  { id: 'tavern', name: 'Cozy Tavern', desc: 'Warm oak timber & candlelit tavern atmosphere' },
  { id: 'space', name: 'Cosmic Nebula', desc: 'Deep galactic starfield and floating stardust' },
  { id: 'penthouse', name: 'City Penthouse', desc: 'Luxury high-rise skyline view' },
  { id: 'forest', name: 'Enchanted Forest', desc: 'Deep canopy with emerald moss ambience' },
];

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
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Table, Environment & Grid Settings</h2>
              <p className="text-xs text-slate-400">Synchronized in real-time across all connected players</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* 360° Panoramic Environment Theme */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>360° Environment Atmosphere</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENVIRONMENTS.map((env) => (
                <button
                  key={env.id}
                  onClick={() => onUpdateConfig({ environment: env.id })}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    config.environment === env.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500/50'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-200">{env.name}</div>
                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{env.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Grid & Snapping Controls */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Tabletop Grid & Snapping</span>
              </div>
              <button
                onClick={() =>
                  onUpdateConfig({
                    grid: { ...config.grid, enabled: !config.grid?.enabled },
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  config.grid?.enabled ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {config.grid?.enabled && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Auto-Snap Pieces on Release</span>
                  <input
                    type="checkbox"
                    checked={config.grid?.snap || false}
                    onChange={(e) =>
                      onUpdateConfig({
                        grid: { ...config.grid, snap: e.target.checked },
                      })
                    }
                    className="accent-cyan-500 rounded cursor-pointer w-4 h-4"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-[11px]">
                    <span className="text-slate-400">Grid Spacing:</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.grid?.size || 1.5}</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="3.0"
                    step="0.1"
                    value={config.grid?.size || 1.5}
                    onChange={(e) =>
                      onUpdateConfig({
                        grid: { ...config.grid, size: parseFloat(e.target.value) },
                      })
                    }
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table Shape */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Table Shape</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rectangular', label: 'Rectangular Table' },
                { id: 'oval', label: 'Oval Poker Table' },
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

          {/* Containment Rim Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Containment Rims</span>
              <span className="text-[11px] text-slate-400">Prevents dice and chips from bouncing off the edge</span>
            </div>
            <button
              onClick={() => onUpdateConfig({ hasRim: !config.hasRim })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                config.hasRim ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Server Gravity */}
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
          </div>
        </div>

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
