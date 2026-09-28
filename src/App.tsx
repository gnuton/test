/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TabletopClient } from './lib/tabletop/client/TabletopClient.js';
import {
  PlayerPresence,
  TableConfig,
  ChatMessage,
  ToolMode,
  TabletopPieceData,
  NotebookEntry,
  HostPermissions,
  TurnState,
  ClockState,
  SnapPoint,
  JointData,
  TextLabel,
  DecalData
} from './lib/tabletop/types.js';
import { TopNavigation } from './components/TopNavigation.js';
import { ActionToolbar } from './components/ActionToolbar.js';
import { ToolbarSelector } from './components/ToolbarSelector.js';
import { TurnManagerHUD } from './components/TurnManagerHUD.js';
import { HostAdminModal } from './components/HostAdminModal.js';
import { DigitalClockModal } from './components/DigitalClockModal.js';
import { AudioJukeboxModal } from './components/AudioJukeboxModal.js';
import { DeckSearchModal } from './components/DeckSearchModal.js';
import { TabletModal } from './components/TabletModal.js';
import { BlindfoldOverlay } from './components/BlindfoldOverlay.js';
import { SnapJointToolsModal } from './components/SnapJointToolsModal.js';
import { SpawnerDrawer } from './components/SpawnerDrawer.js';
import { PresetsModal } from './components/PresetsModal.js';
import { TableCustomizerModal } from './components/TableCustomizerModal.js';
import { LibraryDocsModal } from './components/LibraryDocsModal.js';
import { NotebookModal } from './components/NotebookModal.js';
import { SaveLoadModal } from './components/SaveLoadModal.js';
import { CustomAssetModal } from './components/CustomAssetModal.js';
import { ScriptConsoleModal } from './components/ScriptConsoleModal.js';
import { CardInspectModal } from './components/CardInspectModal.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { KeybindsHUD } from './components/KeybindsHUD.js';
import { SelectionHUD } from './components/SelectionHUD.js';
import { PlayerHandHUD, HandCard } from './components/PlayerHandHUD.js';
import { CardGamesHUD } from './components/CardGamesHUD.js';
import { ContextMenu, ContextMenuInfo } from './components/ContextMenu.js';
import { ServerLobbyModal } from './components/ServerLobbyModal.js';
import { PlayerColorModal } from './components/PlayerColorModal.js';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<TabletopClient | null>(null);

  // Selection & Multi-Selection State
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [boxSelect, setBoxSelect] = useState<{ x1: number; y1: number; x2: number; y2: number; active: boolean }>({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    active: false,
  });

  // Private Player Hand State
  const [playerHand, setPlayerHand] = useState<HandCard[]>([
    { id: 'start-1', name: 'Ace of Spades', label: 'A♠', suit: '♠', rank: 'A', isRed: false },
    { id: 'start-2', name: 'King of Hearts', label: 'K♥', suit: '♥', rank: 'K', isRed: true },
  ]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo | null>(null);

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
  const [notebook, setNotebook] = useState<NotebookEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Table Configuration & Tools
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    shape: 'rectangular',
    width: 16,
    length: 22,
    height: 2.0,
    feltColor: '#1c4234',
    woodColor: '#3d2516',
    hasRim: true,
    gravity: 9.81,
    environment: 'studio',
    grid: {
      enabled: false,
      type: 'square',
      size: 1.5,
      snap: false,
      color: '#38bdf8',
      opacity: 0.3,
    },
  });
  const [currentPreset, setCurrentPreset] = useState<string>('boardgame');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // TTS KB Host & Admin Features
  const [permissions, setPermissions] = useState<HostPermissions>({
    tableFlip: true,
    spawnObjects: true,
    deleteObjects: true,
    drawTools: true,
    physicsInteract: true,
    contextMenu: true,
    changeSettings: true,
  });

  // TTS KB Turns System
  const [turns, setTurns] = useState<TurnState>({
    enabled: false,
    activePlayerId: '',
    activePlayerName: '',
    activePlayerColor: '',
    round: 1,
    timerSeconds: 60,
    timerRunning: false,
    timeRemaining: 60,
    order: 'clockwise',
    playerOrder: [],
  });

  // TTS KB Digital Clock / Stopwatch
  const [clock, setClock] = useState<ClockState>({
    mode: 'stopwatch',
    running: false,
    seconds: 0,
    initialSeconds: 0,
  });

  // TTS KB Snap Points & Joints
  const [snapPoints, setSnapPoints] = useState<SnapPoint[]>([]);
  const [joints, setJoints] = useState<JointData[]>([]);
  const [textLabels, setTextLabels] = useState<TextLabel[]>([]);
  const [decals, setDecals] = useState<DecalData[]>([]);

  // TTS Tool Modes (F1 - F10)
  const [currentTool, setCurrentTool] = useState<ToolMode>('grab');
  const [paintColor, setPaintColor] = useState<string>('#ef4444');
  const [paintBrushSize, setPaintBrushSize] = useState<number>(4);
  const [isErasing, setIsErasing] = useState<boolean>(false);

  // Alt-Key Card / Token Zoom Magnify
  const [inspectedPiece, setInspectedPiece] = useState<TabletopPieceData | null>(null);

  // Modals & Drawers
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSpawnerOpen, setIsSpawnerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isCustomAssetOpen, setIsCustomAssetOpen] = useState(false);
  const [isScriptConsoleOpen, setIsScriptConsoleOpen] = useState(false);
  const [isHostAdminOpen, setIsHostAdminOpen] = useState(false);
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [isJukeboxOpen, setIsJukeboxOpen] = useState(false);
  const [isTabletOpen, setIsTabletOpen] = useState(false);
  const [isDeckSearchOpen, setIsDeckSearchOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<TabletopPieceData | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [degreeSnap, setDegreeSnap] = useState(45);
  const [canUndo, setCanUndo] = useState(true);
  const [canRedo, setCanRedo] = useState(false);
  const [localPlayerColor, setLocalPlayerColor] = useState('#ef4444');

  // Floating Dice Settled Notification
  const [diceNotification, setDiceNotification] = useState<{
    text: string;
    value: number;
    type: string;
    key: number;
  } | null>(null);

  const localPlayer = players.find((p) => p.id === localPlayerId);
  const isBlindfolded = localPlayer?.isBlindfolded || false;
  const isAdmin = localPlayer?.isAdmin || false;

  // Initialize Client
  useEffect(() => {
    if (!containerRef.current) return;

    const client = new TabletopClient({
      container: containerRef.current,
      roomId,
      playerName,
      soundEnabled,
    });
    clientRef.current = client;

    client.on('connection:open', () => setIsConnected(true));
    client.on('connection:close', () => setIsConnected(false));

    client.on('init', (data: any) => {
      setLocalPlayerId(data.playerId);
      setPlayers(data.players);
      setNotebook(data.notebook || []);
      if (data.permissions) setPermissions(data.permissions);
      if (data.turns) setTurns(data.turns);
      if (data.clock) setClock(data.clock);
      if (data.snapPoints) setSnapPoints(data.snapPoints);
      if (data.joints) setJoints(data.joints);
      if (data.textLabels) setTextLabels(data.textLabels);
      if (data.decals) setDecals(data.decals);
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

    client.on('permissions:updated', (perms: HostPermissions) => {
      setPermissions(perms);
    });

    client.on('turns:updated', (t: TurnState) => {
      setTurns(t);
    });

    client.on('clock:updated', (c: ClockState) => {
      setClock(c);
    });

    client.on('snap_points:updated', (pts: SnapPoint[]) => {
      setSnapPoints(pts);
    });

    client.on('joints:updated', (j: JointData[]) => {
      setJoints(j);
    });

    client.on('text_labels:updated', (l: TextLabel[]) => {
      setTextLabels(l);
    });

    client.on('decals:updated', (d: DecalData[]) => {
      setDecals(d);
    });

    client.on('history:changed', ({ canUndo, canRedo }: any) => {
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    });

    client.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setUnreadCount((c) => c + 1);
      }
    });

    client.on('notebook:updated', (entry: NotebookEntry) => {
      setNotebook((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = entry;
          return updated;
        }
        return [...prev, entry];
      });
    });

    client.on('table:config', (cfg: TableConfig) => {
      setTableConfig({ ...cfg });
    });

    client.on('tool:changed', (tool: ToolMode) => {
      setCurrentTool(tool);
    });

    client.on('piece:inspect', (piece: TabletopPieceData | null) => {
      setInspectedPiece(piece);
    });

    client.on('dice:settled', (e: any) => {
      if (e.diceType === 'coin') {
        const coinVal = e.value === 1 ? 'HEADS' : 'TAILS';
        setDiceNotification({
          text: `${e.rollerName || 'Someone'} flipped [ ${coinVal} ] on Coin`,
          value: e.value,
          type: 'COIN',
          key: Date.now(),
        });
      } else if (e.diceType === 'dice_fate') {
        const fateVal = e.value > 0 ? '+ (PLUS)' : e.value < 0 ? '- (MINUS)' : 'O (BLANK)';
        setDiceNotification({
          text: `${e.rollerName || 'Someone'} rolled [ ${fateVal} ] on FATE`,
          value: e.value,
          type: 'FATE',
          key: Date.now(),
        });
      } else {
        const typeLabel = e.diceType.replace('dice_', '').toUpperCase();
        const text = `${e.rollerName || 'Someone'} rolled [ ${e.value} ] on ${typeLabel}`;
        setDiceNotification({
          text,
          value: e.value,
          type: typeLabel,
          key: Date.now(),
        });
      }
      setTimeout(() => setDiceNotification(null), 3500);
    });

    client.on('selection:changed', (ids: string[]) => {
      setSelectedPieceIds(ids);
    });

    client.on('selection:box', (b: any) => {
      setBoxSelect(b);
    });

    client.on('context_menu:open', (info: ContextMenuInfo) => {
      setContextMenu(info);
    });

    client.on('hand:pickup', (piece: TabletopPieceData) => {
      if (!piece) return;
      const label = piece.label || piece.name || 'A♠';
      const suit = label.slice(-1);
      const rank = label.slice(0, -1) || 'A';
      const isRed = suit === '♥' || suit === '♦' || piece.secondaryColor === '#dc2626';

      const newCard: HandCard = {
        id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: piece.name,
        label,
        suit: ['♠', '♥', '♦', '♣'].includes(suit) ? suit : '♠',
        rank: rank || 'A',
        isRed,
      };

      setPlayerHand((prev) => [...prev, newCard]);
      if (piece.type === 'card') {
        client.removePiece(piece.id);
      }
      client.audio.playCardDeal();
    });

    // Keyboard Hotkey Listener for 'B' (Blindfold)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        client.toggleBlindfold();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      client.destroy();
      clientRef.current = null;
    };
  }, [roomId]);

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

  const handleSelectTool = (tool: ToolMode) => {
    setCurrentTool(tool);
    if (clientRef.current) {
      clientRef.current.setTool(tool);
    }
  };

  const handleToggleEraser = () => {
    const next = !isErasing;
    setIsErasing(next);
    if (clientRef.current) {
      clientRef.current.renderer.isErasing = next;
    }
  };

  const handleSelectPaintColor = (color: string) => {
    setPaintColor(color);
    if (clientRef.current) {
      clientRef.current.renderer.paintColor = color;
      clientRef.current.renderer.isErasing = false;
      setIsErasing(false);
    }
  };

  const handleSelectBrushSize = (size: number) => {
    setPaintBrushSize(size);
    if (clientRef.current) {
      clientRef.current.renderer.paintBrushSize = size;
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0);
    }
  };

  const handleOpenDeckSearch = () => {
    // Find first deck or card on table
    const deck = Array.from(clientRef.current?.pieces.values() || []).find(
      (p) => p.type === 'card_deck' || p.type === 'card'
    );
    if (deck) {
      setSelectedDeck(deck);
      setIsDeckSearchOpen(true);
    } else {
      // Spawn a deck and open search
      clientRef.current?.spawnPiece({
        type: 'card_deck',
        name: 'Playing Deck',
        position: { x: 0, y: tableConfig.height + 0.6, z: 0 },
      });
      setTimeout(() => {
        const newDeck = Array.from(clientRef.current?.pieces.values() || []).find(
          (p) => p.type === 'card_deck'
        );
        setSelectedDeck(newDeck || null);
        setIsDeckSearchOpen(true);
      }, 200);
    }
  };

  // Hand & Stacking Action Handlers
  const handlePlayCardFromHand = (card: HandCard) => {
    setPlayerHand((prev) => prev.filter((c) => c.id !== card.id));
    if (clientRef.current) {
      const h = tableConfig.height;
      const targetPos = clientRef.current.renderer.raycastTable() || { x: 0, y: h + 0.3, z: 1.5 };

      clientRef.current.spawnPiece({
        type: 'card',
        name: card.name,
        label: card.label,
        position: { x: targetPos.x, y: h + 0.3, z: targetPos.z },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: card.isRed ? '#dc2626' : '#0f172a',
      });
      clientRef.current.audio.playCardDeal();
    }
  };

  const handleDrawCardToHand = () => {
    // Try to draw from first deck on table
    const deck = Array.from(clientRef.current?.pieces.values() || []).find(
      (p) => p.type === 'card_deck'
    );
    if (deck && deck.metadata?.cards && deck.metadata.cards.length > 0) {
      const topCard = deck.metadata.cards[deck.metadata.cards.length - 1];
      const suit = topCard.slice(-1);
      const rank = topCard.slice(0, -1);
      const isRed = suit === '♥' || suit === '♦';

      setPlayerHand((prev) => [
        ...prev,
        {
          id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: topCard,
          label: topCard,
          suit: ['♠', '♥', '♦', '♣'].includes(suit) ? suit : '♠',
          rank,
          isRed,
        },
      ]);
      clientRef.current?.audio.playCardDeal();
      return;
    }

    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['♠', '♥', '♦', '♣'];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const isRed = suit === '♥' || suit === '♦';

    const card: HandCard = {
      id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${rank}${suit}`,
      label: `${rank}${suit}`,
      rank,
      suit,
      isRed,
    };
    setPlayerHand((prev) => [...prev, card]);
    clientRef.current?.audio.playCardDeal();
  };

  const handleSortHand = (by: 'suit' | 'rank') => {
    setPlayerHand((prev) => {
      const sorted = [...prev];
      if (by === 'suit') {
        sorted.sort((a, b) => a.suit.localeCompare(b.suit));
      } else {
        const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        sorted.sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
      }
      return sorted;
    });
  };

  const handleClearHand = () => {
    setPlayerHand([]);
  };

  // Multi-Selection Actions
  const handleGroupSelected = () => {
    if (selectedPieceIds.length > 0 && clientRef.current) {
      clientRef.current.groupPieces(selectedPieceIds);
      clientRef.current.renderer.clearSelection();
      setSelectedPieceIds([]);
    }
  };

  const handleFlipSelected = () => {
    if (clientRef.current) {
      selectedPieceIds.forEach((id) => {
        clientRef.current?.sendMessage({ type: 'flip_grabbed', pieceId: id });
      });
    }
  };

  const handleRotateSelected = (clockwise: boolean) => {
    if (clientRef.current) {
      const angle = clockwise ? -Math.PI / 8 : Math.PI / 8;
      selectedPieceIds.forEach((id) => {
        clientRef.current?.sendMessage({
          type: 'rotate_grabbed',
          pieceId: id,
          deltaEuler: { x: 0, y: angle, z: 0 },
        });
      });
    }
  };

  const handleLockSelected = () => {
    if (clientRef.current) {
      selectedPieceIds.forEach((id) => {
        clientRef.current?.toggleLock(id);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (clientRef.current) {
      selectedPieceIds.forEach((id) => {
        clientRef.current?.removePiece(id);
      });
      clientRef.current.renderer.clearSelection();
      setSelectedPieceIds([]);
    }
  };

  const handlePickupSelectedToHand = () => {
    if (clientRef.current) {
      for (const id of selectedPieceIds) {
        const p = clientRef.current.pieces.get(id);
        if (p && (p.type === 'card' || p.type === 'card_deck')) {
          const label = p.label || p.name || 'A♠';
          const suit = label.slice(-1);
          const rank = label.slice(0, -1) || 'A';
          setPlayerHand((prev) => [
            ...prev,
            {
              id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: p.name,
              label,
              suit: ['♠', '♥', '♦', '♣'].includes(suit) ? suit : '♠',
              rank,
              isRed: suit === '♥' || suit === '♦',
            },
          ]);
          if (p.type === 'card') {
            clientRef.current.removePiece(id);
          }
        }
      }
      clientRef.current.renderer.clearSelection();
      setSelectedPieceIds([]);
      clientRef.current.audio.playCardDeal();
    }
  };

  const handlePickupToHand = (piece: TabletopPieceData) => {
    if (!piece) return;
    const label = piece.label || piece.name || 'A♠';
    const suit = label.slice(-1);
    const rank = label.slice(0, -1) || 'A';
    const isRed = suit === '♥' || suit === '♦' || piece.secondaryColor === '#dc2626';

    const newCard: HandCard = {
      id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: piece.name,
      label,
      suit: ['♠', '♥', '♦', '♣'].includes(suit) ? (suit as '♠' | '♥' | '♦' | '♣') : '♠',
      rank: rank || 'A',
      isRed,
    };

    setPlayerHand((prev) => [...prev, newCard]);
    if (piece.type === 'card') {
      clientRef.current?.removePiece(piece.id);
    }
    clientRef.current?.audio.playCardDeal();
  };

  const handleClearSelection = () => {
    clientRef.current?.renderer.clearSelection();
    setSelectedPieceIds([]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Navigation */}
      <TopNavigation
        roomId={roomId}
        onSwitchRoom={handleSwitchRoom}
        players={players}
        localPlayerId={localPlayerId}
        localPlayerName={playerName}
        localPlayerColor={localPlayer?.color || localPlayerColor}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenSaveLoad={() => setIsSaveLoadOpen(true)}
        onOpenCustomAsset={() => setIsCustomAssetOpen(true)}
        onOpenScriptConsole={() => setIsScriptConsoleOpen(true)}
        onOpenHostAdmin={() => setIsHostAdminOpen(true)}
        onOpenClock={() => setIsClockOpen(true)}
        onOpenJukebox={() => setIsJukeboxOpen(true)}
        onOpenTablet={() => setIsTabletOpen(true)}
        onOpenSpawner={() => setIsSpawnerOpen(true)}
        onOpenLobby={() => setIsLobbyOpen(true)}
        onOpenColorModal={() => setIsColorModalOpen(true)}
        onToggleBlindfold={() => clientRef.current?.toggleBlindfold()}
        isBlindfolded={isBlindfolded}
        isAdmin={isAdmin}
        onSetCameraPreset={(preset) => clientRef.current?.renderer.setCameraPreset(preset)}
        onUndo={() => clientRef.current?.undo()}
        onRedo={() => clientRef.current?.redo()}
        canUndo={canUndo}
        canRedo={canRedo}
        onFlipTable={() => clientRef.current?.flipTable(1.4)}
        degreeSnap={degreeSnap}
        onSetDegreeSnap={(deg) => {
          setDegreeSnap(deg);
          clientRef.current?.setDegreeSnap(deg);
        }}
      />

      {/* Turns System HUD (kb.tabletopsimulator.com/host-guides/turns/) */}
      <TurnManagerHUD
        turns={turns}
        players={players}
        localPlayerId={localPlayerId}
        isAdmin={isAdmin}
        onPassTurn={() => clientRef.current?.passTurn()}
        onToggleTurns={(enabled) => clientRef.current?.toggleTurns(enabled)}
        onSetTimer={(seconds) => clientRef.current?.setTurnTimer(seconds)}
      />

      {/* TTS Left Toolbar Selector (F1 - F10) */}
      <ToolbarSelector
        currentTool={currentTool}
        onSelectTool={handleSelectTool}
        paintColor={paintColor}
        onSelectPaintColor={handleSelectPaintColor}
        paintBrushSize={paintBrushSize}
        onSelectBrushSize={handleSelectBrushSize}
        isErasing={isErasing}
        onToggleEraser={handleToggleEraser}
        onClearDrawings={() => clientRef.current?.clearDrawings()}
      />

      {/* Extended Tool Panels (Joints, Snap Points, 3D Text, Decals) */}
      <SnapJointToolsModal
        currentTool={currentTool}
        pieces={Array.from(clientRef.current?.pieces.values() || [])}
        snapPoints={snapPoints}
        joints={joints}
        textLabels={textLabels}
        decals={decals}
        tableHeight={tableConfig.height}
        onAddSnapPoint={(pt) => clientRef.current?.addSnapPoint(pt)}
        onRemoveSnapPoint={(id) => clientRef.current?.removeSnapPoint(id)}
        onAddJoint={(j) => clientRef.current?.addJoint(j)}
        onRemoveJoint={(id) => clientRef.current?.removeJoint(id)}
        onAddTextLabel={(lbl) => clientRef.current?.addTextLabel(lbl)}
        onRemoveTextLabel={(id) => clientRef.current?.removeTextLabel(id)}
        onAddDecal={(dec) => clientRef.current?.addDecal(dec)}
        onRemoveDecal={(id) => clientRef.current?.removeDecal(id)}
        onClose={() => handleSelectTool('grab')}
      />

      {/* Floating Dice Rolled Notification */}
      {diceNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl text-white">
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
          const next = currentTool === 'ruler' ? 'grab' : 'ruler';
          handleSelectTool(next);
          return next === 'ruler';
        }}
        isRulerActive={currentTool === 'ruler'}
        onPing={() => {
          clientRef.current?.ping({ x: 0, y: tableConfig.height + 0.1, z: 0 });
        }}
        onOpenSpawner={() => setIsSpawnerOpen(true)}
        onToggleChat={handleToggleChat}
        unreadCount={unreadCount}
        onOpenDeckSearch={handleOpenDeckSearch}
        onFlipCoin={() => {
          // Find coin or spawn coin and flip
          const coin = Array.from(clientRef.current?.pieces.values() || []).find((p) => p.type === 'coin');
          if (coin) {
            clientRef.current?.flipCoin(coin.id);
          } else {
            clientRef.current?.spawnPiece({
              type: 'coin',
              name: 'Gold Coin',
              position: { x: 0, y: tableConfig.height + 0.6, z: 0 },
            });
            setTimeout(() => {
              const newCoin = Array.from(clientRef.current?.pieces.values() || []).find((p) => p.type === 'coin');
              if (newCoin) clientRef.current?.flipCoin(newCoin.id);
            }, 100);
          }
        }}
      />

      {/* Keybinds HUD */}
      <KeybindsHUD />

      {/* Alt-Key Card / Token Zoom Magnify HUD */}
      <CardInspectModal inspectedPiece={inspectedPiece} />

      {/* Blindfold Overlay Screen ('B' Hotkey) */}
      <BlindfoldOverlay
        isBlindfolded={isBlindfolded}
        onToggleBlindfold={() => clientRef.current?.toggleBlindfold()}
      />

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

      <NotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        entries={notebook}
        onSaveEntry={(entry) => clientRef.current?.updateNotebook(entry)}
        playerName={playerName}
      />

      <SaveLoadModal
        isOpen={isSaveLoadOpen}
        onClose={() => setIsSaveLoadOpen(false)}
        pieces={Array.from(clientRef.current?.pieces.values() || [])}
        tableConfig={tableConfig}
        notebook={notebook}
        onLoadState={(state) => clientRef.current?.loadSavedState(state)}
      />

      <CustomAssetModal
        isOpen={isCustomAssetOpen}
        onClose={() => setIsCustomAssetOpen(false)}
        onSpawnPiece={(p) => clientRef.current?.spawnPiece(p)}
        tableHeight={tableConfig.height}
      />

      <ScriptConsoleModal
        isOpen={isScriptConsoleOpen}
        onClose={() => setIsScriptConsoleOpen(false)}
        client={clientRef.current}
      />

      <LibraryDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <HostAdminModal
        isOpen={isHostAdminOpen}
        onClose={() => setIsHostAdminOpen(false)}
        permissions={permissions}
        players={players}
        localPlayerId={localPlayerId}
        tableConfig={tableConfig}
        onUpdatePermissions={(p) => clientRef.current?.updatePermissions(p)}
        onPromotePlayer={(id) => clientRef.current?.promotePlayer(id)}
        onKickPlayer={(id) => clientRef.current?.kickPlayer(id)}
        onToggleBlindfold={(id) => clientRef.current?.toggleBlindfold(id)}
        onUpdateConfig={(cfg) => {
          setTableConfig((prev) => ({ ...prev, ...cfg }));
          clientRef.current?.updateTableConfig(cfg);
        }}
      />

      <DigitalClockModal
        isOpen={isClockOpen}
        onClose={() => setIsClockOpen(false)}
        clock={clock}
        onClockAction={(action, mode, seconds) => clientRef.current?.clockAction(action, mode, seconds)}
      />

      {clientRef.current && (
        <AudioJukeboxModal
          isOpen={isJukeboxOpen}
          onClose={() => setIsJukeboxOpen(false)}
          audio={clientRef.current.audio}
        />
      )}

      <DeckSearchModal
        isOpen={isDeckSearchOpen}
        onClose={() => setIsDeckSearchOpen(false)}
        deck={selectedDeck}
        onTakeCard={(deckId, card) => clientRef.current?.takeCardFromDeck(deckId, card)}
        onCutDeck={(deckId) => clientRef.current?.cutDeck(deckId)}
        onSpreadDeck={(deckId) => clientRef.current?.spreadDeck(deckId)}
        onShuffleDeck={(deckId) => clientRef.current?.shuffleDeck()}
      />

      <TabletModal
        isOpen={isTabletOpen}
        onClose={() => setIsTabletOpen(false)}
      />

      {/* Multiplayer Server & Lobby Modal (Screenshot 01) */}
      <ServerLobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        currentRoomId={roomId}
        onHostOrJoinRoom={(newRoom) => handleSwitchRoom(newRoom)}
      />

      {/* Player Color & Teams Modal (Screenshot 05) */}
      <PlayerColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        currentColor={localPlayer?.color || localPlayerColor}
        onSelectColor={(hex) => {
          setLocalPlayerColor(hex);
          clientRef.current?.sendMessage({
            type: 'join',
            roomId,
            playerName,
            playerColor: hex,
          });
        }}
        players={players}
        localPlayerId={localPlayerId}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={(txt) => clientRef.current?.sendChat(txt)}
        localPlayerId={localPlayerId}
      />

      {/* Marquee Box Selection Overlay */}
      {boxSelect.active && (
        <div
          className="fixed pointer-events-none border-2 border-sky-400 bg-sky-400/20 rounded shadow-sm z-30"
          style={{
            left: Math.min(boxSelect.x1, boxSelect.x2),
            top: Math.min(boxSelect.y1, boxSelect.y2),
            width: Math.abs(boxSelect.x2 - boxSelect.x1),
            height: Math.abs(boxSelect.y2 - boxSelect.y1),
          }}
        />
      )}

      {/* Multi-Selection Floating Action Toolbar */}
      <SelectionHUD
        selectedPieceIds={selectedPieceIds}
        pieces={clientRef.current?.pieces || new Map()}
        onGroupSelected={handleGroupSelected}
        onFlipSelected={handleFlipSelected}
        onRotateSelected={handleRotateSelected}
        onLockSelected={handleLockSelected}
        onDeleteSelected={handleDeleteSelected}
        onPickupToHand={handlePickupSelectedToHand}
        onClearSelection={handleClearSelection}
      />

      {/* Private Player Hand Shelf (Bottom Viewport) */}
      <PlayerHandHUD
        hand={playerHand}
        onPlayCard={handlePlayCardFromHand}
        onDrawCard={handleDrawCardToHand}
        onSortHand={handleSortHand}
        onClearHand={handleClearHand}
      />

      {/* Interactive Card Games Hub (Blackjack, Poker, Solitaire) */}
      <CardGamesHUD
        currentPreset={currentPreset}
        client={clientRef.current}
        onSelectPreset={(p) => {
          setCurrentPreset(p);
          clientRef.current?.loadPreset(p);
        }}
      />

      {/* Right-Click Context Menu */}
      <ContextMenu
        info={contextMenu}
        onClose={() => setContextMenu(null)}
        onDrawCard={(deckId) => {
          handleDrawCardToHand();
        }}
        onTakeToHand={(p) => handlePickupToHand(p)}
        onFlipPiece={(id) => clientRef.current?.sendMessage({ type: 'flip_grabbed', pieceId: id })}
        onShuffleDeck={(id) => clientRef.current?.shuffleDeck(id)}
        onCutDeck={(id) => clientRef.current?.cutDeck(id)}
        onSpreadDeck={(id) => clientRef.current?.spreadDeck(id)}
        onOpenDeckSearch={(p) => {
          setSelectedDeck(p);
          setIsDeckSearchOpen(true);
        }}
        onGroupPieces={handleGroupSelected}
        onToggleLock={(id) => clientRef.current?.toggleLock(id)}
        onDeletePiece={(id) => clientRef.current?.removePiece(id)}
        onSelectAll={() => clientRef.current?.renderer.selectAll()}
        onClearSelection={handleClearSelection}
        onSpawnDeck={() => {
          const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
          const suits = ['♠', '♥', '♦', '♣'];
          const cards: string[] = [];
          for (const s of suits) {
            for (const r of ranks) {
              cards.push(`${r}${s}`);
            }
          }
          clientRef.current?.spawnPiece({
            type: 'card_deck',
            name: 'Standard 52-Card Deck',
            position: { x: 0, y: tableConfig.height + 0.6, z: 0 },
            label: '52 CARDS',
            value: 52,
            metadata: { cards },
          });
        }}
      />
    </div>
  );
}
