/**
 * Tabletop Nexus - Host Administration & Server Settings Modal
 * Implements kb.tabletopsimulator.com/host-guides/
 */

import React from 'react';
import {
  X,
  Shield,
  Users,
  EyeOff,
  UserX,
  Crown,
  Flame,
  Plus,
  Trash2,
  Paintbrush,
  Move,
  Settings,
  Sliders,
  Check
} from 'lucide-react';
import { HostPermissions, PlayerPresence, TableConfig } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  permissions: HostPermissions;
  players: PlayerPresence[];
  localPlayerId: string;
  tableConfig: TableConfig;
  onUpdatePermissions: (perms: Partial<HostPermissions>) => void;
  onPromotePlayer: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onToggleBlindfold: (playerId: string) => void;
  onUpdateConfig: (cfg: Partial<TableConfig>) => void;
}

export const HostAdminModal: React.FC<Props> = ({
  isOpen,
  onClose,
  permissions,
  players,
  localPlayerId,
  tableConfig,
  onUpdatePermissions,
  onPromotePlayer,
  onKickPlayer,
  onToggleBlindfold,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Host & Server Administration</h2>
              <p className="text-xs text-slate-400">
                Manage player permissions, host controls, blindfolds, and physics engine mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Permissions Matrix */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            Player Permissions Matrix
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { key: 'tableFlip', label: 'Allow Table Flip', icon: Flame, desc: 'Rage flip tabletop' },
              { key: 'spawnObjects', label: 'Allow Spawning', icon: Plus, desc: 'Spawn pieces & dice' },
              { key: 'deleteObjects', label: 'Allow Deletion', icon: Trash2, desc: 'Clear/remove items' },
              { key: 'drawTools', label: 'Vector Paint', icon: Paintbrush, desc: 'Draw on table felt' },
              { key: 'physicsInteract', label: 'Physics Grabs', icon: Move, desc: 'Move & throw items' },
              { key: 'changeSettings', label: 'Table Customizer', icon: Sliders, desc: 'Change felt & shape' },
            ].map(({ key, label, icon: Icon, desc }) => {
              const enabled = (permissions as any)[key];
              return (
                <button
                  key={key}
                  onClick={() => onUpdatePermissions({ [key]: !enabled })}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    enabled
                      ? 'bg-slate-800/80 border-amber-500/40 hover:border-amber-500 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-4 h-4 ${enabled ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        enabled ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                      }`}
                    >
                      {enabled && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{label}</div>
                    <div className="text-[10px] text-slate-400">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Connected Players Management */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Connected Players ({players.length})
          </h3>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-800 divide-y divide-slate-800">
            {players.map((player) => (
              <div
                key={player.id}
                className="p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full ring-2 ring-white/30 flex items-center justify-center font-bold text-white shadow-sm"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      {player.name}
                      {player.id === localPlayerId && (
                        <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                      )}
                      {player.isAdmin && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          <Crown className="w-2.5 h-2.5" />
                          ADMIN
                        </span>
                      )}
                      {player.isBlindfolded && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                          BLINDFOLDED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">Seat {player.seatIndex + 1}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Blindfold Toggle */}
                  <button
                    onClick={() => onToggleBlindfold(player.id)}
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition ${
                      player.isBlindfolded
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={player.isBlindfolded ? 'Remove Blindfold' : 'Blindfold Player'}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{player.isBlindfolded ? 'Unblindfold' : 'Blindfold'}</span>
                  </button>

                  {/* Promote / Demote */}
                  {player.id !== localPlayerId && (
                    <button
                      onClick={() => onPromotePlayer(player.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                      title={player.isAdmin ? 'Demote Player' : 'Promote to Admin'}
                    >
                      <Crown className={`w-3.5 h-3.5 ${player.isAdmin ? 'text-amber-400' : ''}`} />
                    </button>
                  )}

                  {/* Kick Player */}
                  {player.id !== localPlayerId && (
                    <button
                      onClick={() => onKickPlayer(player.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition"
                      title="Kick Player"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Physics Settings & Gravity */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Physics & Gravity Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-300">Gravity</span>
                <span className="font-mono text-emerald-400">{tableConfig.gravity.toFixed(1)} m/s²</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={tableConfig.gravity}
                onChange={(e) => onUpdateConfig({ gravity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Zero-G (0)</span>
                <span>Moon (1.6)</span>
                <span>Earth (9.8)</span>
                <span>Jupiter (24)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Physics Simulation Mode
              </label>
              <div className="grid grid-cols-3 gap-1">
                {['full', 'semi-persistent', 'locked'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateConfig({ physicsMode: mode as any })}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold capitalize transition ${
                      (tableConfig.physicsMode || 'semi-persistent') === mode
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {mode.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
