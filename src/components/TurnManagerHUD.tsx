/**
 * Tabletop Nexus - Turn Manager HUD
 * Implements kb.tabletopsimulator.com/host-guides/turns/
 */

import React, { useState } from 'react';
import { Play, Pause, ChevronRight, Settings, RotateCw, RotateCcw, Clock, Shield } from 'lucide-react';
import { TurnState, PlayerPresence } from '../lib/tabletop/types.js';

interface Props {
  turns: TurnState;
  players: PlayerPresence[];
  localPlayerId: string;
  isAdmin: boolean;
  onPassTurn: () => void;
  onToggleTurns: (enabled: boolean) => void;
  onSetTimer: (seconds: number) => void;
}

export const TurnManagerHUD: React.FC<Props> = ({
  turns,
  players,
  localPlayerId,
  isAdmin,
  onPassTurn,
  onToggleTurns,
  onSetTimer,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const isMyTurn = turns.enabled && turns.activePlayerId === localPlayerId;

  if (!turns.enabled && !isAdmin) {
    return null;
  }

  const activePlayer = players.find((p) => p.id === turns.activePlayerId);
  const playerName = activePlayer?.name || turns.activePlayerName || 'Player';
  const playerColor = activePlayer?.color || turns.activePlayerColor || '#38bdf8';

  const timerPercent = turns.timerSeconds > 0
    ? Math.max(0, Math.min(100, (turns.timeRemaining / turns.timerSeconds) * 100))
    : 100;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
      {/* Active Turn Banner */}
      {turns.enabled ? (
        <div
          className={`flex items-center gap-3 px-5 py-2 rounded-2xl backdrop-blur-md border shadow-2xl transition-all duration-300 ${
            isMyTurn
              ? 'bg-slate-900/95 border-amber-400 shadow-amber-500/20 ring-2 ring-amber-400/40'
              : 'bg-slate-900/80 border-slate-700/80'
          }`}
        >
          {/* Round Indicator */}
          <div className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Round {turns.round}
          </div>

          {/* Active Player */}
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40 shadow-sm"
              style={{ backgroundColor: playerColor }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                {isMyTurn ? '★ YOUR TURN' : `${playerName}'s Turn`}
              </span>
              <span className="text-[10px] text-slate-400">
                {turns.order === 'clockwise' ? 'Clockwise' : 'Counter-Clockwise'}
              </span>
            </div>
          </div>

          {/* Turn Countdown Ring / Number */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700/80">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8 -rotate-90 transform">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  className="stroke-slate-800"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  className={`transition-all duration-1000 ${
                    turns.timeRemaining <= 10 ? 'stroke-rose-500' : 'stroke-amber-400'
                  }`}
                  strokeWidth="3"
                  strokeDasharray="81.68"
                  strokeDashoffset={81.68 - (81.68 * timerPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span
                className={`absolute text-[11px] font-mono font-bold ${
                  turns.timeRemaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
                }`}
              >
                {turns.timeRemaining}s
              </span>
            </div>

            {/* Pass Turn Button */}
            <button
              onClick={onPassTurn}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                isMyTurn
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 active:scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95'
              }`}
            >
              <span>End Turn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Admin Gear */}
          {isAdmin && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Turn Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Disabled turns banner for Host */
        isAdmin && (
          <button
            onClick={() => onToggleTurns(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white shadow-xl transition"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Enable Turns System</span>
          </button>
        )
      )}

      {/* Admin Turn Settings Dropdown */}
      {showSettings && isAdmin && turns.enabled && (
        <div className="mt-2 w-72 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-white text-xs flex flex-col gap-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between font-bold text-slate-200 pb-1.5 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Turn Order Settings
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Turn Timer Duration</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[30, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onSetTimer(sec)}
                  className={`py-1 rounded-lg border font-semibold transition ${
                    turns.timerSeconds === sec
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onToggleTurns(false)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition text-xs font-semibold"
            >
              Disable Turns
            </button>
            <button
              onClick={onPassTurn}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition text-xs"
            >
              Force Next Turn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
