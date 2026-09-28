/**
 * Tabletop Nexus - Server Lobby & Multiplayer Host Modal
 * Replicates Tabletop Simulator Multiplayer Game Setup (Screenshot 01 - 2:49)
 */

import React, { useState } from 'react';
import {
  X,
  Server,
  Lock,
  Users,
  Globe,
  Share2,
  Check,
  Shield,
  ArrowRight,
  Wifi
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
  onHostOrJoinRoom: (roomId: string, serverName?: string, password?: string) => void;
}

export const ServerLobbyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentRoomId,
  onHostOrJoinRoom,
}) => {
  const [serverName, setServerName] = useState('Tabletop Nexus Room');
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [serverType, setServerType] = useState<'public' | 'friends' | 'direct'>('public');
  const [targetRoomCode, setTargetRoomCode] = useState(currentRoomId);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoomCode.trim().toLowerCase() || 'general');
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoom = targetRoomCode.trim().toLowerCase() || 'general';
    onHostOrJoinRoom(finalRoom, serverName, password);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Multiplayer Server Setup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  TTS Lobby
                </span>
              </h2>
              <p className="text-xs text-slate-400">Configure room hosting, security, and player capacity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Server Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Server Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'public', label: 'Public', icon: Globe, desc: 'Visible in room list' },
                { id: 'friends', label: 'Friends Only', icon: Users, desc: 'Invite or code' },
                { id: 'direct', label: 'Direct Connect', icon: Wifi, desc: 'IP / Room code' },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = serverType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setServerType(t.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center ${
                      isActive
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">{t.label}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Server Name & Room Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Server Name</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="My Tabletop Room"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Room ID / Code</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={targetRoomCode}
                  onChange={(e) => setTargetRoomCode(e.target.value)}
                  placeholder="general"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition"
                  title="Copy Direct Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password & Max Players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Password (Optional)</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for open access"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Max Players</span>
                <span className="font-mono text-emerald-400">{maxPlayers} Seats</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 accent-emerald-500 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300 w-6 text-right">{maxPlayers}</span>
              </div>
            </div>
          </div>

          {/* Quick Connect Preset Rooms */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Quick Switch Lobby:</span>
            <div className="flex flex-wrap gap-1.5">
              {['general', 'poker-night', 'dnd-session', 'chess-arena', 'boardgame-club'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTargetRoomCode(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition ${
                    targetRoomCode === r
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  #{r}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
            >
              <span>Connect & Host</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
