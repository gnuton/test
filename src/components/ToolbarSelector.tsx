/**
 * Tabletop Nexus - TTS Complete Tools Selector (F1 - F10)
 * Implements kb.tabletopsimulator.com/game-tools/
 */

import React, { useState } from 'react';
import {
  Hand,
  PenTool,
  Ruler,
  Crosshair,
  Link2,
  MapPin,
  Shield,
  Type,
  Move,
  Sticker,
  Eraser,
  Trash2
} from 'lucide-react';
import { ToolMode } from '../lib/tabletop/types.js';

interface Props {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  paintColor: string;
  onSelectPaintColor: (color: string) => void;
  paintBrushSize: number;
  onSelectBrushSize: (size: number) => void;
  isErasing: boolean;
  onToggleEraser: () => void;
  onClearDrawings: () => void;
}

export const ToolbarSelector: React.FC<Props> = ({
  currentTool,
  onSelectTool,
  paintColor,
  onSelectPaintColor,
  paintBrushSize,
  onSelectBrushSize,
  isErasing,
  onToggleEraser,
  onClearDrawings,
}) => {
  const [showPaintOptions, setShowPaintOptions] = useState(false);

  const tools: Array<{ id: ToolMode; label: string; keybind: string; icon: any; color: string }> = [
    { id: 'grab', label: 'Grab & Select', keybind: 'F1', icon: Hand, color: 'hover:text-emerald-400' },
    { id: 'paint', label: 'Vector Paint', keybind: 'F2', icon: PenTool, color: 'hover:text-rose-400' },
    { id: 'ruler', label: 'Measure Tape', keybind: 'F3', icon: Ruler, color: 'hover:text-amber-400' },
    { id: 'flick', label: 'Physics Flick', keybind: 'F4', icon: Crosshair, color: 'hover:text-orange-400' },
    { id: 'joint', label: 'Joints Tool', keybind: 'F5', icon: Link2, color: 'hover:text-teal-400' },
    { id: 'snap_points', label: 'Snap Points', keybind: 'F6', icon: MapPin, color: 'hover:text-yellow-400' },
    { id: 'zones', label: 'Zones & Fog', keybind: 'F7', icon: Shield, color: 'hover:text-blue-400' },
    { id: 'text', label: '3D Text Tool', keybind: 'F8', icon: Type, color: 'hover:text-sky-400' },
    { id: 'gizmo', label: 'Transform Gizmo', keybind: 'F9', icon: Move, color: 'hover:text-purple-400' },
    { id: 'decal', label: 'Decal Stamp', keybind: 'F10', icon: Sticker, color: 'hover:text-pink-400' },
  ];

  const palette = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#8b5cf6', '#ffffff', '#000000'];

  return (
    <div className="absolute top-16 left-4 z-30 flex flex-col gap-1.5 pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl shadow-2xl flex flex-col gap-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = currentTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                onSelectTool(t.id);
                if (t.id === 'paint') setShowPaintOptions(true);
                else setShowPaintOptions(false);
              }}
              className={`relative group p-2.5 rounded-xl flex items-center justify-center transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : `text-slate-400 hover:bg-slate-800/80 ${t.color}`
              }`}
              title={`${t.label} (${t.keybind})`}
            >
              <Icon className="w-4 h-4" />
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-2xl z-50 flex items-center gap-2">
                <span>{t.label}</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-amber-400 font-mono border border-slate-700">
                  {t.keybind}
                </kbd>
              </div>
            </button>
          );
        })}
      </div>

      {/* Paint Tool Extended Options */}
      {currentTool === 'paint' && showPaintOptions && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col gap-2.5 text-xs text-slate-200 w-44 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Paint Brush</span>
            <button
              onClick={onToggleEraser}
              className={`p-1 rounded-md transition ${isErasing ? 'bg-rose-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Toggle Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onSelectPaintColor(c);
                  if (isErasing) onToggleEraser();
                }}
                className={`w-6 h-6 rounded-full border transition ${
                  paintColor === c && !isErasing ? 'scale-110 ring-2 ring-emerald-500 border-white' : 'border-slate-700'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-400">Size: {paintBrushSize}px</span>
            <input
              type="range"
              min="2"
              max="16"
              value={paintBrushSize}
              onChange={(e) => onSelectBrushSize(parseInt(e.target.value, 10))}
              className="w-20 h-1 bg-slate-800 accent-emerald-500 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={onClearDrawings}
            className="w-full py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/60 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            Erase All Drawings
          </button>
        </div>
      )}
    </div>
  );
};
