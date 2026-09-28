/**
 * Tabletop Nexus - Player Color & Teams Selection Modal
 * Replicates Tabletop Simulator Player Seating & Teams Dialog (Screenshot 05 - 6:37)
 */

import React from 'react';
import { X, Crown, Eye, Check, Shield } from 'lucide-react';
import { PlayerPresence } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (colorHex: string, colorName: string) => void;
  players: PlayerPresence[];
  localPlayerId: string;
}

export const SEAT_COLORS = [
  { name: 'White', hex: '#f8fafc', text: '#0f172a', border: '#cbd5e1' },
  { name: 'Red', hex: '#ef4444', text: '#ffffff', border: '#b91c1c' },
  { name: 'Orange', hex: '#f97316', text: '#ffffff', border: '#c2410c' },
  { name: 'Yellow', hex: '#eab308', text: '#0f172a', border: '#a16207' },
  { name: 'Green', hex: '#22c55e', text: '#ffffff', border: '#15803d' },
  { name: 'Teal', hex: '#14b8a6', text: '#ffffff', border: '#0f766e' },
  { name: 'Blue', hex: '#3b82f6', text: '#ffffff', border: '#1d4ed8' },
  { name: 'Purple', hex: '#a855f7', text: '#ffffff', border: '#7e22ce' },
  { name: 'Pink', hex: '#ec4899', text: '#ffffff', border: '#be185d' },
];

export const SPECIAL_SEATS = [
  { name: 'Black (Game Master)', hex: '#1e293b', text: '#f8fafc', icon: Crown, desc: 'Full administrative control' },
  { name: 'Grey (Spectator)', hex: '#64748b', text: '#f8fafc', icon: Eye, desc: 'Passive observer mode' },
];

export const PlayerColorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  players,
  localPlayerId,
}) => {
  if (!isOpen) return null;

  const getOccupant = (hex: string) => {
    return players.find((p) => p.color?.toLowerCase() === hex.toLowerCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Select Player Color & Seat</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  TTS Teams
                </span>
              </h2>
              <p className="text-xs text-slate-400">Choose your table position, hand color, and role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Tabletop Seating Layout */}
        <div className="p-6 space-y-6">
          {/* Table Representation */}
          <div className="relative w-full h-44 bg-gradient-to-b from-emerald-950/70 to-emerald-900/60 border-4 border-amber-900/80 rounded-3xl p-4 flex items-center justify-center shadow-inner">
            <div className="text-center pointer-events-none">
              <span className="text-xs font-black tracking-wider uppercase text-emerald-400/80">Table Center</span>
              <p className="text-[10px] text-emerald-300/50">Click any seat circle to sit</p>
            </div>

            {/* Top Row Seats */}
            <div className="absolute -top-4 left-0 right-0 flex justify-around px-6">
              {SEAT_COLORS.slice(0, 4).map((seat) => {
                const isCurrent = currentColor.toLowerCase() === seat.hex.toLowerCase();
                const occupant = getOccupant(seat.hex);
                return (
                  <button
                    key={seat.name}
                    onClick={() => {
                      onSelectColor(seat.hex, seat.name);
                      onClose();
                    }}
                    className={`group relative w-9 h-9 rounded-full border-2 shadow-lg transition-transform hover:scale-110 flex items-center justify-center`}
                    style={{ backgroundColor: seat.hex, borderColor: isCurrent ? '#38bdf8' : seat.border }}
                    title={`${seat.name}${occupant ? ` (${occupant.name})` : ' (Available)'}`}
                  >
                    {isCurrent && <Check className="w-4 h-4" style={{ color: seat.text }} />}
                    {occupant && !isCurrent && (
                      <span className="text-[10px] font-bold" style={{ color: seat.text }}>
                        {occupant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Tooltip */}
                    <div className="absolute -bottom-7 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30 pointer-events-none">
                      {seat.name} {occupant ? `• ${occupant.name}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row Seats */}
            <div className="absolute -bottom-4 left-0 right-0 flex justify-around px-6">
              {SEAT_COLORS.slice(4).map((seat) => {
                const isCurrent = currentColor.toLowerCase() === seat.hex.toLowerCase();
                const occupant = getOccupant(seat.hex);
                return (
                  <button
                    key={seat.name}
                    onClick={() => {
                      onSelectColor(seat.hex, seat.name);
                      onClose();
                    }}
                    className={`group relative w-9 h-9 rounded-full border-2 shadow-lg transition-transform hover:scale-110 flex items-center justify-center`}
                    style={{ backgroundColor: seat.hex, borderColor: isCurrent ? '#38bdf8' : seat.border }}
                    title={`${seat.name}${occupant ? ` (${occupant.name})` : ' (Available)'}`}
                  >
                    {isCurrent && <Check className="w-4 h-4" style={{ color: seat.text }} />}
                    {occupant && !isCurrent && (
                      <span className="text-[10px] font-bold" style={{ color: seat.text }}>
                        {occupant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Tooltip */}
                    <div className="absolute -top-7 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30 pointer-events-none">
                      {seat.name} {occupant ? `• ${occupant.name}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Administrative Seats (Game Master & Spectator) */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Special Roles & Privileges:</span>
            <div className="grid grid-cols-2 gap-3">
              {SPECIAL_SEATS.map((spec) => {
                const Icon = spec.icon;
                const isCurrent = currentColor.toLowerCase() === spec.hex.toLowerCase();
                return (
                  <button
                    key={spec.name}
                    onClick={() => {
                      onSelectColor(spec.hex, spec.name);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition text-left ${
                      isCurrent
                        ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
                      style={{ backgroundColor: spec.hex, borderColor: '#475569' }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{spec.name}</span>
                        {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400">{spec.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
