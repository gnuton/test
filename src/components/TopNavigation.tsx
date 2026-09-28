/**
 * Tabletop Nexus - Top Navigation Header
 * Authentic Tabletop Simulator Look & Feel (Games, Objects, Music, Notebook, Options, Undo, Flip Table, Degree Snap, Player Seating)
 */

import React, { useState } from 'react';
import {
  Users,
  Check,
  Volume2,
  VolumeX,
  Sliders,
  Layers,
  Camera,
  Share2,
  RefreshCw,
  Eye,
  EyeOff,
  BookOpen,
  Save,
  Sparkles,
  Terminal,
  Shield,
  Clock,
  Music,
  Globe,
  Undo2,
  Redo2,
  Flame,
  Plus,
  Server,
  ChevronDown
} from 'lucide-react';
import { PlayerPresence } from '../lib/tabletop/types.js';

interface Props {
  roomId: string;
  onSwitchRoom: (newRoomId: string) => void;
  players: PlayerPresence[];
  localPlayerId: string;
  localPlayerName?: string;
  localPlayerColor?: string;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPresets: () => void;
  onOpenCustomizer: () => void;
  onOpenDocs: () => void;
  onOpenNotebook: () => void;
  onOpenSaveLoad: () => void;
  onOpenCustomAsset: () => void;
  onOpenScriptConsole: () => void;
  onOpenHostAdmin: () => void;
  onOpenClock: () => void;
  onOpenJukebox: () => void;
  onOpenTablet: () => void;
  onOpenSpawner: () => void;
  onOpenLobby: () => void;
  onOpenColorModal: () => void;
  onToggleBlindfold: () => void;
  isBlindfolded: boolean;
  isAdmin: boolean;
  onSetCameraPreset: (preset: 'top_down' | 'seat_north' | 'seat_south' | 'free') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onFlipTable: () => void;
  degreeSnap: number;
  onSetDegreeSnap: (deg: number) => void;
}

export const TopNavigation: React.FC<Props> = ({
  roomId,
  onSwitchRoom,
  players,
  localPlayerId,
  localPlayerName = 'Player',
  localPlayerColor = '#ef4444',
  isConnected,
  soundEnabled,
  onToggleSound,
  onOpenPresets,
  onOpenCustomizer,
  onOpenDocs,
  onOpenNotebook,
  onOpenSaveLoad,
  onOpenCustomAsset,
  onOpenScriptConsole,
  onOpenHostAdmin,
  onOpenClock,
  onOpenJukebox,
  onOpenTablet,
  onOpenSpawner,
  onOpenLobby,
  onOpenColorModal,
  onToggleBlindfold,
  isBlindfolded,
  isAdmin,
  onSetCameraPreset,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = false,
  onFlipTable,
  degreeSnap,
  onSetDegreeSnap,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [tableFlipConfirm, setTableFlipConfirm] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFlipTable = () => {
    if (!tableFlipConfirm) {
      setTableFlipConfirm(true);
      setTimeout(() => setTableFlipConfirm(false), 3000);
      return;
    }
    setTableFlipConfirm(false);
    onFlipTable();
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none select-none">
        {/* Left: Brand Logo & Room Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-xs text-white shadow-sm">
              🎲
            </div>
            <span className="font-black text-xs tracking-tight text-white hidden sm:inline">
              Tabletop<span className="text-emerald-400">Simulator</span>
            </span>
          </div>

          {/* Room Pill & Multiplayer Host */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs shadow-lg">
            <span className="text-slate-400 hidden sm:inline">Room:</span>
            <span className="font-bold text-emerald-400 font-mono">{roomId}</span>
            <button
              onClick={onOpenLobby}
              className="p-1 hover:text-white text-slate-400 transition ml-0.5 rounded hover:bg-slate-800"
              title="Multiplayer Server Setup (Screenshot 01)"
            >
              <Server className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1 hover:text-white text-slate-400 transition rounded hover:bg-slate-800"
              title="Copy Room Link"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Center: Authentic Tabletop Simulator Top Menu Bar */}
        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-2xl shadow-2xl pointer-events-auto">
          {/* 1. Games Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowGamesMenu(!showGamesMenu);
                setShowOptionsMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
              title="Game Presets & Saves"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Games</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showGamesMenu && (
              <div className="absolute top-full mt-1.5 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl space-y-1 text-xs z-50">
                <button
                  onClick={() => {
                    onOpenPresets();
                    setShowGamesMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Classic Games / Presets</span>
                </button>
                <button
                  onClick={() => {
                    onOpenSaveLoad();
                    setShowGamesMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Save className="w-3.5 h-3.5 text-blue-400" />
                  <span>Save / Load Game</span>
                </button>
                <button
                  onClick={() => {
                    onOpenLobby();
                    setShowGamesMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left border-t border-slate-800 mt-1 pt-1"
                >
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  <span>Multiplayer Host & Lobby</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Objects Menu */}
          <button
            onClick={onOpenSpawner}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
            title="Spawn Components, Cards, Dice, Chips"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Objects</span>
          </button>

          {/* 3. Music */}
          <button
            onClick={onOpenJukebox}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
            title="Music & Jukebox"
          >
            <Music className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden md:inline">Music</span>
          </button>

          {/* 4. Notebook */}
          <button
            onClick={onOpenNotebook}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
            title="Notebook & Rules"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Notebook</span>
          </button>

          {/* 5. Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowOptionsMenu(!showOptionsMenu);
                setShowGamesMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
              title="Table, Environment & Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Options</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showOptionsMenu && (
              <div className="absolute top-full mt-1.5 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl space-y-1 text-xs z-50">
                <button
                  onClick={() => {
                    onOpenCustomizer();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Table & Environment</span>
                </button>
                <button
                  onClick={() => {
                    onOpenClock();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Digital Clock / Timer</span>
                </button>
                <button
                  onClick={() => {
                    onOpenTablet();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span>Virtual Web Tablet</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCustomAsset();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Assets Import</span>
                </button>
                <button
                  onClick={() => {
                    onOpenScriptConsole();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Script & API Console</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      onOpenHostAdmin();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-300 hover:bg-slate-800 hover:text-white transition text-left border-t border-slate-800 mt-1 pt-1"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Host Permissions</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* 6. Undo & Redo (Time Machine) */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition"
            title="Undo Last Action (Ctrl + Z)"
          >
            <Undo2 className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition"
            title="Redo Action (Ctrl + Y)"
          >
            <Redo2 className="w-4 h-4 text-sky-400" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          {/* 7. Iconic FLIP TABLE Button */}
          <button
            onClick={handleFlipTable}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wide uppercase transition shadow-md ${
              tableFlipConfirm
                ? 'bg-rose-500 text-white animate-bounce'
                : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white'
            }`}
            title="Flip Table (Rage Quit physics simulation - use Undo to restore!)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {tableFlipConfirm ? 'Confirm Flip!' : 'Flip Table'}
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-1 border-l border-slate-700 ml-1 pl-1.5">
            {/* 8. Rotation Degree Snap Selector */}
            <span className="text-[10px] font-bold text-slate-400">Rot:</span>
            {[15, 30, 45, 90].map((deg) => (
              <button
                key={deg}
                onClick={() => onSetDegreeSnap(deg)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  degreeSnap === deg
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={`Rotate Snap ${deg}° (Hotkeys: Q / E)`}
              >
                {deg}°
              </button>
            ))}

            <div className="w-[1px] h-4 bg-slate-700 mx-1" />

            {/* Top-Down & 3D camera quick switch */}
            <button
              onClick={() => onSetCameraPreset('top_down')}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Top-Down 2D View (Space)"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetCameraPreset('free')}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Orbit 3D Camera"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Active Players, Player Color Badge, Sound, Blindfold */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Player Seating / Color Circle (Click to open PlayerColorModal - Screenshot 05) */}
          <button
            onClick={onOpenColorModal}
            className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg hover:border-slate-500 transition group"
            title="Change Player Color & Seat (Teams Dialog)"
          >
            <div
              className="w-4 h-4 rounded-full border border-white/60 shadow-sm transition-transform group-hover:scale-110"
              style={{ backgroundColor: localPlayerColor }}
            />
            <span className="font-bold text-xs text-white hidden md:inline">{localPlayerName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
          </button>

          {/* Active Players Pill */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2 py-1.5 rounded-xl text-xs shadow-lg">
            <span
              className={`w-2 h-2 rounded-full mr-1 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Users className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-white text-[11px]">{players.length}</span>
          </div>

          {/* Blindfold Mode ('B' Hotkey) */}
          <button
            onClick={onToggleBlindfold}
            className={`p-2 bg-slate-900/90 backdrop-blur-md border rounded-xl shadow-lg transition ${
              isBlindfolded
                ? 'border-rose-500 text-rose-400 bg-rose-500/20 animate-pulse'
                : 'border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
            title="Blindfold Mode (Press 'B')"
          >
            {isBlindfolded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={onToggleSound}
            className={`p-2 bg-slate-900/90 backdrop-blur-md border rounded-xl shadow-lg transition ${
              soundEnabled
                ? 'border-slate-700/80 text-emerald-400 hover:text-emerald-300 hover:border-slate-600'
                : 'border-rose-900/50 text-rose-400 hover:text-rose-300'
            }`}
            title={soundEnabled ? 'Mute Table Audio' : 'Unmute Table Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>
    </>
  );
};
