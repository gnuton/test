/**
 * Tabletop Nexus - Digital Clock & Stopwatch Tool
 * Implements kb.tabletopsimulator.com/built-in-objects/digital-clock/
 */

import React, { useState } from 'react';
import { X, Play, Pause, RotateCcw, Clock, Timer, Bell } from 'lucide-react';
import { ClockState } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clock: ClockState;
  onClockAction: (
    action: 'start' | 'pause' | 'reset' | 'set_mode',
    mode?: 'stopwatch' | 'countdown',
    seconds?: number
  ) => void;
}

export const DigitalClockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  clock,
  onClockAction,
}) => {
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);

  if (!isOpen) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleApplyCountdown = () => {
    const totalSecs = Math.max(1, inputMinutes * 60 + inputSeconds);
    onClockAction('set_mode', 'countdown', totalSecs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Digital Clock & Timer</h2>
              <p className="text-xs text-slate-400">Synchronized tabletop clock and stopwatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/80">
          <button
            onClick={() => onClockAction('set_mode', 'stopwatch')}
            className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              clock.mode === 'stopwatch'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-4 h-4" />
            Stopwatch (Count Up)
          </button>
          <button
            onClick={() => onClockAction('set_mode', 'countdown', 300)}
            className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              clock.mode === 'countdown'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            Countdown Timer
          </button>
        </div>

        {/* Big Digital LCD Display */}
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-950 border-2 border-slate-800 shadow-inner">
          <div
            className={`font-mono text-6xl sm:text-7xl font-black tracking-widest ${
              clock.mode === 'countdown' && clock.seconds <= 10
                ? 'text-rose-500 animate-pulse'
                : 'text-sky-400'
            }`}
          >
            {formatTime(clock.seconds)}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-2">
            {clock.running ? 'RUNNING' : 'PAUSED'} • {clock.mode.toUpperCase()}
          </div>
        </div>

        {/* Countdown Setter */}
        {clock.mode === 'countdown' && !clock.running && (
          <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">Set Time:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="99"
                value={inputMinutes}
                onChange={(e) => setInputMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono font-bold text-sm text-white"
              />
              <span className="text-xs text-slate-400">m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="59"
                value={inputSeconds}
                onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono font-bold text-sm text-white"
              />
              <span className="text-xs text-slate-400">s</span>
            </div>
            <button
              onClick={handleApplyCountdown}
              className="ml-auto px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-xs transition"
            >
              Set
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {clock.running ? (
            <button
              onClick={() => onClockAction('pause')}
              className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              <Pause className="w-5 h-5" />
              <span>Pause Clock</span>
            </button>
          ) : (
            <button
              onClick={() => onClockAction('start')}
              className="py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Clock</span>
            </button>
          )}

          <button
            onClick={() => onClockAction('reset')}
            className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
