/**
 * Tabletop Nexus - Top Navigation Header
 */

import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sliders,
  Code,
  Layers,
  Camera,
  Share2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { PlayerPresence } from '../lib/tabletop/types.js';

interface Props {
  roomId: string;
  onSwitchRoom: (newRoomId: string) => void;
  players: PlayerPresence[];
  localPlayerId: string;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPresets: () => void;
  onOpenCustomizer: () => void;
  onOpenDocs: () => void;
  onSetCameraPreset: (preset: 'top_down' | 'seat_north' | 'seat_south' | 'free') => void;
}

export const TopNavigation: React.FC<Props> = ({
  roomId,
  onSwitchRoom,
  players,
  localPlayerId,
  isConnected,
  soundEnabled,
  onToggleSound,
  onOpenPresets,
  onOpenCustomizer,
  onOpenDocs,
  onSetCameraPreset,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomInput, setNewRoomInput] = useState('');
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomInput.trim()) {
      onSwitchRoom(newRoomInput.trim().toLowerCase());
      setShowRoomModal(false);
      setNewRoomInput('');
    }
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none">
        {/* Left: Brand Logo & Room Switcher */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-lg">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow-sm">
              TN
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white hidden sm:inline">
              Tabletop<span className="text-emerald-400">Nexus</span>
            </span>
          </div>

          {/* Room Pill */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs shadow-lg">
            <span className="text-slate-400">Room:</span>
            <span className="font-bold text-emerald-400 font-mono">{roomId}</span>
            <button
              onClick={() => setShowRoomModal(true)}
              className="p-1 hover:text-white text-slate-400 transition"
              title="Change Room"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1 hover:text-white text-slate-400 transition ml-0.5"
              title="Copy Room Link"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Center: Camera Presets */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1 rounded-xl shadow-lg pointer-events-auto">
          {[
            { id: 'free', label: 'Orbit 3D', icon: Camera },
            { id: 'top_down', label: 'Top-Down', icon: Eye },
            { id: 'seat_south', label: 'Seat 1', icon: Users },
            { id: 'seat_north', label: 'Seat 2', icon: Users },
          ].map((cam) => {
            const Icon = cam.icon;
            return (
              <button
                key={cam.id}
                onClick={() => onSetCameraPreset(cam.id as any)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{cam.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions, Connected Players, Presets, Settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Active Players List */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 px-2.5 py-1.5 rounded-xl text-xs shadow-lg">
            <span
              className={`w-2 h-2 rounded-full mr-1 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-white ml-0.5">{players.length}</span>
            <div className="flex -space-x-1.5 ml-1">
              {players.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: p.color || '#3b82f6' }}
                  title={`${p.name}${p.id === localPlayerId ? ' (You)' : ''}`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Presets Button */}
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white shadow-lg transition"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Games</span>
          </button>

          {/* Table Customizer Button */}
          <button
            onClick={onOpenCustomizer}
            className="p-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white shadow-lg transition"
            title="Table & Physics Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={onToggleSound}
            className={`p-2 bg-slate-900/90 backdrop-blur-md border rounded-xl shadow-lg transition ${
              soundEnabled
                ? 'border-slate-800/80 text-emerald-400 hover:text-emerald-300'
                : 'border-rose-900/50 text-rose-400 hover:text-rose-300'
            }`}
            title={soundEnabled ? 'Mute Table Audio' : 'Unmute Table Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Embed / SDK Library Docs */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition"
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Embed SDK</span>
          </button>
        </div>
      </header>

      {/* Switch Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold text-white mb-1">Switch or Join Multiplayer Room</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter any room name. Players in the same room will share the exact same table and server physics.
            </p>
            <form onSubmit={handleRoomSubmit} className="space-y-3">
              <input
                type="text"
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                placeholder="e.g. friday-poker, game-night-1"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
