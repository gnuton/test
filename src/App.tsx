/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TabletopClient } from './lib/tabletop/client/TabletopClient.js';
import { PlayerPresence, TableConfig, ChatMessage } from './lib/tabletop/types.js';
import { TopNavigation } from './components/TopNavigation.js';
import { ActionToolbar } from './components/ActionToolbar.js';
import { SpawnerDrawer } from './components/SpawnerDrawer.js';
import { PresetsModal } from './components/PresetsModal.js';
import { TableCustomizerModal } from './components/TableCustomizerModal.js';
import { LibraryDocsModal } from './components/LibraryDocsModal.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { KeybindsHUD } from './components/KeybindsHUD.js';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<TabletopClient | null>(null);

  // Room & Player State
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || 'general';
    }
    return 'general';
  });

  const [playerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tt_player_name');
      if (stored) return stored;
      const names = ['Gandalf', 'Merlin', 'Neo', 'Aragorn', 'Ripley', 'Trinity', 'Frodo', 'Katniss', 'Vader'];
      const chosen = names[Math.floor(Math.random() * names.length)];
      localStorage.setItem('tt_player_name', chosen);
      return chosen;
    }
    return 'Player';
  });

  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Table Configuration & Presets
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    shape: 'rectangular',
    width: 16,
    length: 22,
    height: 2.0,
    feltColor: '#1c4234',
    woodColor: '#3d2516',
    hasRim: true,
    gravity: 9.81,
  });
  const [currentPreset, setCurrentPreset] = useState<string>('boardgame');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);

  // Modals & Drawers
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSpawnerOpen, setIsSpawnerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Dice Roll Settlement Floating Alert
  const [diceNotification, setDiceNotification] = useState<{
    text: string;
    value: number;
    type: string;
    key: number;
  } | null>(null);

  // Initialize Tabletop Client on Mount
  useEffect(() => {
    if (!containerRef.current) return;

    const client = new TabletopClient({
      container: containerRef.current,
      roomId,
      playerName,
      soundEnabled,
    });
    clientRef.current = client;

    // Listen to network & state events
    client.on('connection:open', () => setIsConnected(true));
    client.on('connection:close', () => setIsConnected(false));

    client.on('init', (data: any) => {
      setLocalPlayerId(data.playerId);
      setPlayers(data.players);
      setIsConnected(true);
    });

    client.on('player:joined', (player: PlayerPresence) => {
      setPlayers((prev) => [...prev.filter((p) => p.id !== player.id), player]);
    });

    client.on('player:left', (playerId: string) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    client.on('player:updated', (player: PlayerPresence) => {
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
    });

    client.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setUnreadCount((c) => c + 1);
      }
    });

    client.on('table:config', (cfg: TableConfig) => {
      setTableConfig({ ...cfg });
    });

    client.on('ruler:toggled', ({ active }) => {
      setIsRulerActive(active);
    });

    client.on('dice:settled', (e: any) => {
      const typeLabel = e.diceType.replace('dice_', '').toUpperCase();
      const text = `${e.rollerName || 'Someone'} rolled [ ${e.value} ] on ${typeLabel}`;
      setDiceNotification({
        text,
        value: e.value,
        type: typeLabel,
        key: Date.now(),
      });
      setTimeout(() => setDiceNotification(null), 3500);
    });

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [roomId]);

  // Sync sound settings
  useEffect(() => {
    if (clientRef.current) {
      clientRef.current.audio.enabled = soundEnabled;
    }
  }, [soundEnabled]);

  const handleSwitchRoom = (newRoom: string) => {
    if (newRoom === roomId) return;
    setRoomId(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Navigation */}
      <TopNavigation
        roomId={roomId}
        onSwitchRoom={handleSwitchRoom}
        players={players}
        localPlayerId={localPlayerId}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onSetCameraPreset={(preset) => clientRef.current?.renderer.setCameraPreset(preset)}
      />

      {/* Floating Dice Rolled Notification */}
      {diceNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-amber-500/50 shadow-2xl text-white">
            <span className="text-xl">🎲</span>
            <div>
              <div className="text-xs text-amber-300 font-semibold">{diceNotification.text}</div>
              {diceNotification.type === 'D20' && diceNotification.value === 20 && (
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  ★ NATURAL 20! CRITICAL HIT! ★
                </span>
              )}
              {diceNotification.type === 'D20' && diceNotification.value === 1 && (
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  ☠ CRITICAL FAILURE! ☠
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-300 font-mono text-sm shadow">
              {diceNotification.value}
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <ActionToolbar
        onFlipTable={() => clientRef.current?.flipTable(1.4)}
        onRollAllDice={() => clientRef.current?.rollAllDice()}
        onShuffleDeck={() => clientRef.current?.shuffleDeck()}
        onDealCards={(count) => clientRef.current?.dealCards(count)}
        onResetTable={() => clientRef.current?.resetTable()}
        onToggleRuler={() => {
          const active = clientRef.current?.toggleRuler() || false;
          setIsRulerActive(active);
          return active;
        }}
        isRulerActive={isRulerActive}
        onPing={() => {
          clientRef.current?.ping({ x: 0, y: tableConfig.height + 0.1, z: 0 });
        }}
        onOpenSpawner={() => setIsSpawnerOpen(true)}
        onToggleChat={handleToggleChat}
        unreadCount={unreadCount}
      />

      {/* Controls HUD */}
      <KeybindsHUD />

      {/* Drawers & Modals */}
      <SpawnerDrawer
        isOpen={isSpawnerOpen}
        onClose={() => setIsSpawnerOpen(false)}
        onSpawnPiece={(piece) => clientRef.current?.spawnPiece(piece)}
        onSpawnBatch={(pieces) => clientRef.current?.spawnBatch(pieces)}
        tableHeight={tableConfig.height}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentPreset={currentPreset}
        onSelectPreset={(p) => {
          setCurrentPreset(p);
          clientRef.current?.loadPreset(p);
        }}
        onClearTable={() => clientRef.current?.clearPieces()}
      />

      <TableCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={tableConfig}
        onUpdateConfig={(cfg) => {
          setTableConfig((prev) => ({ ...prev, ...cfg }));
          clientRef.current?.updateTableConfig(cfg);
        }}
      />

      <LibraryDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={(txt) => clientRef.current?.sendChat(txt)}
        localPlayerId={localPlayerId}
      />
    </div>
  );
}
