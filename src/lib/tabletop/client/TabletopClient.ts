/**
 * Tabletop Nexus - Pluggable Client Library
 * Complete Tabletop Simulator Client SDK
 */

import {
  ClientMessage,
  ServerMessage,
  TabletopPieceData,
  TableConfig,
  PlayerPresence,
  ChatMessage,
  DrawingStroke,
  NotebookEntry,
  Vector3D,
  ToolMode,
  HostPermissions,
  TurnState,
  ClockState,
  SnapPoint,
  JointData,
  TextLabel,
  DecalData
} from '../types.js';
import { TabletopRenderer } from './TabletopRenderer.js';
import { TabletopAudio } from './TabletopAudio.js';

export interface TabletopClientOptions {
  container: HTMLElement;
  wsUrl?: string;
  roomId?: string;
  playerName?: string;
  playerColor?: string;
  initialPreset?: string;
  soundEnabled?: boolean;
}

export type TabletopEventListener = (data: any) => void;

export interface TabletopPlugin {
  name: string;
  init: (client: TabletopClient) => void;
  destroy?: () => void;
}

export class TabletopClient {
  public options: TabletopClientOptions;
  public renderer!: TabletopRenderer;
  public audio: TabletopAudio;

  public ws: WebSocket | null = null;
  public playerId: string = '';
  public roomId: string = 'general';
  public isConnected: boolean = false;
  public connectionError: string | null = null;

  public pieces = new Map<string, TabletopPieceData>();
  public players = new Map<string, PlayerPresence>();
  public chatMessages: ChatMessage[] = [];
  public strokes: DrawingStroke[] = [];
  public notebook: NotebookEntry[] = [];
  public currentTableConfig!: TableConfig;

  // TTS KB Host & Feature States
  public permissions: HostPermissions = {
    tableFlip: true,
    spawnObjects: true,
    deleteObjects: true,
    drawTools: true,
    physicsInteract: true,
    contextMenu: true,
    changeSettings: true,
  };
  public turns: TurnState = {
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
  };
  public clock: ClockState = {
    mode: 'stopwatch',
    running: false,
    seconds: 0,
    initialSeconds: 0,
  };
  public snapPoints: SnapPoint[] = [];
  public joints: JointData[] = [];
  public textLabels: TextLabel[] = [];
  public decals: DecalData[] = [];
  public degreeSnap: number = 45;
  public undoHistory: Array<{ pieces: TabletopPieceData[]; tableConfig: TableConfig }> = [];
  public redoHistory: Array<{ pieces: TabletopPieceData[]; tableConfig: TableConfig }> = [];

  private listeners = new Map<string, Set<TabletopEventListener>>();
  private plugins = new Map<string, TabletopPlugin>();
  private reconnectTimeout: any = null;
  private pointerThrottleTimer: any = null;

  constructor(options: TabletopClientOptions) {
    this.options = options;
    this.roomId = options.roomId || 'general';
    this.audio = new TabletopAudio();
    this.audio.enabled = options.soundEnabled !== false;

    this.currentTableConfig = {
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
    };

    this.initRenderer();
    this.connect();
    this.bindKeyboardShortcuts();
  }

  private initRenderer() {
    this.renderer = new TabletopRenderer(this.options.container, this.currentTableConfig);

    this.renderer.events = {
      onPieceSelect: (pieceId) => {
        const piece = this.pieces.get(pieceId);
        if (piece && !piece.isLocked) {
          this.sendMessage({
            type: 'grab',
            pieceId,
            targetPosition: piece.position,
          });
          this.emit('piece:grabbed', { pieceId, piece });
        }
      },

      onPieceDrag: (pieceId, worldPos) => {
        this.sendMessage({
          type: 'move_grabbed',
          pieceId,
          targetPosition: worldPos,
        });
      },

      onPieceRelease: (pieceId, velocity) => {
        this.sendMessage({
          type: 'release_grabbed',
          pieceId,
          velocity,
        });
        this.emit('piece:released', { pieceId, velocity });
      },

      onPointerMove: (worldPos, isPointerActive) => {
        if (!this.pointerThrottleTimer) {
          this.pointerThrottleTimer = setTimeout(() => {
            this.pointerThrottleTimer = null;
            this.sendMessage({
              type: 'pointer_move',
              cursor: worldPos,
              isPointerActive,
            });
          }, 45);
        }
      },

      onTableClick: (worldPos) => {
        this.emit('table:click', worldPos);
      },

      onStrokeDrawn: (stroke) => {
        this.strokes.push(stroke);
        this.sendMessage({ type: 'draw_stroke', stroke });
        this.emit('stroke:added', stroke);
      },

      onFlickRelease: (pieceId, impulse) => {
        this.sendMessage({ type: 'flick_piece', pieceId, impulse });
        this.audio.playFlick();
      },

      onCounterClick: (pieceId, delta) => {
        this.sendMessage({ type: 'modify_counter', pieceId, delta });
      },

      onPieceInspect: (piece) => {
        this.emit('piece:inspect', piece);
      },

      onSelectionChange: (selectedPieceIds) => {
        this.emit('selection:changed', selectedPieceIds);
      },

      onBoxSelectChange: (box) => {
        this.emit('selection:box', box);
      },

      onMultiPieceDrag: (updates) => {
        this.sendMessage({
          type: 'multi_move_grabbed',
          updates: updates.map((u) => ({ pieceId: u.pieceId, targetPosition: u.worldPos })),
        });
      },

      onMultiPieceRelease: (releases) => {
        this.sendMessage({
          type: 'multi_release_grabbed',
          releases,
        });
      },

      onContextMenu: (info) => {
        this.emit('context_menu:open', info);
      },
    };
  }

  public connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    let wsUrl = this.options.wsUrl;
    if (!wsUrl) {
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const name = encodeURIComponent(this.options.playerName || 'Player');
      const color = encodeURIComponent(this.options.playerColor || '');
      wsUrl = `${protocol}//${loc.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${name}&color=${color}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.connectionError = null;
        this.emit('connection:open', { roomId: this.roomId });

        this.sendMessage({
          type: 'join',
          roomId: this.roomId,
          playerName: this.options.playerName || 'Player',
          playerColor: this.options.playerColor,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('[TabletopClient] Error parsing server message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection:close', {});
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 2500);
      };

      this.ws.onerror = (err) => {
        this.connectionError = 'WebSocket connection failed';
        this.emit('connection:error', err);
      };
    } catch (e: any) {
      this.connectionError = e.message;
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'init': {
        this.playerId = msg.playerId;
        this.roomId = msg.roomId;
        this.currentTableConfig = msg.tableConfig;
        this.renderer.applyEnvironment(msg.tableConfig.environment || 'studio');
        this.renderer.rebuildTable(msg.tableConfig);

        this.pieces.clear();
        this.renderer.clearAllPieces();
        for (const p of msg.pieces) {
          this.pieces.set(p.id, p);
          this.renderer.syncPiece(p);
        }

        this.players.clear();
        for (const p of msg.players) {
          this.players.set(p.id, p);
        }
        this.chatMessages = msg.messages;
        this.strokes = msg.strokes || [];
        this.notebook = msg.notebook || [];

        if (msg.permissions) this.permissions = msg.permissions;
        if (msg.turns) this.turns = msg.turns;
        if (msg.clock) this.clock = msg.clock;
        if (msg.snapPoints) {
          this.snapPoints = msg.snapPoints;
          this.renderer.syncSnapPoints(this.snapPoints);
        }
        if (msg.joints) {
          this.joints = msg.joints;
          this.renderer.syncJoints(this.joints);
        }
        if (msg.textLabels) {
          this.textLabels = msg.textLabels;
          this.renderer.syncTextLabels(this.textLabels);
        }
        if (msg.decals) {
          this.decals = msg.decals;
          this.renderer.syncDecals(this.decals);
        }

        this.renderer.applyStrokes(this.strokes);
        this.renderer.syncPlayerCursors(Array.from(this.players.values()), this.playerId);

        this.emit('init', {
          playerId: this.playerId,
          roomId: this.roomId,
          pieces: msg.pieces,
          players: msg.players,
          notebook: this.notebook,
          permissions: this.permissions,
          turns: this.turns,
          clock: this.clock,
          snapPoints: this.snapPoints,
          joints: this.joints,
          textLabels: this.textLabels,
          decals: this.decals,
        });
        break;
      }

      case 'physics_tick': {
        this.renderer.applyPhysicsUpdates(msg.updates);
        for (const u of msg.updates) {
          const p = this.pieces.get(u.id);
          if (p) {
            p.position = { x: u.p[0], y: u.p[1], z: u.p[2] };
            p.rotation = { x: u.r[0], y: u.r[1], z: u.r[2], w: u.r[3] };
            p.isSleeping = u.s;
            p.grabbedBy = u.g;
            if (u.l !== undefined) p.isLocked = u.l;
            if (u.val !== undefined) p.value = u.val;
          }
        }
        this.emit('physics:tick', msg.updates);
        break;
      }

      case 'player_joined': {
        this.players.set(msg.player.id, msg.player);
        this.renderer.syncPlayerCursors(Array.from(this.players.values()), this.playerId);
        this.emit('player:joined', msg.player);
        break;
      }

      case 'player_left': {
        this.players.delete(msg.playerId);
        this.renderer.syncPlayerCursors(Array.from(this.players.values()), this.playerId);
        this.emit('player:left', msg.playerId);
        break;
      }

      case 'player_update': {
        this.players.set(msg.player.id, msg.player);
        this.renderer.syncPlayerCursors(Array.from(this.players.values()), this.playerId);
        this.emit('player:updated', msg.player);
        break;
      }

      case 'piece_spawned': {
        this.pieces.set(msg.piece.id, msg.piece);
        this.renderer.syncPiece(msg.piece);
        this.emit('piece:spawned', msg.piece);
        break;
      }

      case 'piece_removed': {
        this.pieces.delete(msg.pieceId);
        this.renderer.removePiece(msg.pieceId);
        this.emit('piece:removed', msg.pieceId);
        break;
      }

      case 'piece_locked_toggled': {
        const piece = this.pieces.get(msg.pieceId);
        if (piece) piece.isLocked = msg.isLocked;
        this.audio.playLock();
        this.emit('piece:locked', { pieceId: msg.pieceId, isLocked: msg.isLocked });
        break;
      }

      case 'pieces_cleared': {
        this.pieces.clear();
        this.renderer.clearAllPieces();
        this.emit('pieces:cleared', {});
        break;
      }

      case 'table_reset': {
        this.pieces.clear();
        this.renderer.clearAllPieces();
        for (const p of msg.pieces) {
          this.pieces.set(p.id, p);
          this.renderer.syncPiece(p);
        }
        this.emit('table:reset', msg.pieces);
        break;
      }

      case 'table_flipped': {
        this.audio.playTableFlip();
        this.emit('table:flipped', { force: msg.force });
        break;
      }

      case 'dice_settled': {
        this.emit('dice:settled', msg);
        break;
      }

      case 'sound_event': {
        switch (msg.sound) {
          case 'dice_clatter':
            this.audio.playDiceClatter(msg.intensity);
            break;
          case 'card_deal':
            this.audio.playCardDeal();
            break;
          case 'card_shuffle':
            this.audio.playCardShuffle();
            break;
          case 'chip_clink':
            this.audio.playChipClink(msg.intensity);
            break;
          case 'wood_knock':
            this.audio.playWoodKnock(msg.intensity);
            break;
          case 'table_flip':
            this.audio.playTableFlip();
            break;
          case 'ping':
            this.audio.playPing();
            break;
          case 'flick':
            this.audio.playFlick();
            break;
          case 'lock':
            this.audio.playLock();
            break;
          case 'turn_chime':
            this.audio.playTurnChime();
            break;
          case 'timer_tick':
            this.audio.playTimerTick();
            break;
          case 'timer_alarm':
            this.audio.playTimerAlarm();
            break;
          case 'joint_snap':
            this.audio.playJointSnap();
            break;
        }
        break;
      }

      case 'permissions_updated': {
        this.permissions = msg.permissions;
        this.emit('permissions:updated', msg.permissions);
        break;
      }

      case 'turns_updated': {
        this.turns = msg.turns;
        this.emit('turns:updated', msg.turns);
        break;
      }

      case 'clock_updated': {
        this.clock = msg.clock;
        this.emit('clock:updated', msg.clock);
        break;
      }

      case 'snap_points_updated': {
        this.snapPoints = msg.snapPoints;
        this.renderer.syncSnapPoints(msg.snapPoints);
        this.emit('snap_points:updated', msg.snapPoints);
        break;
      }

      case 'joints_updated': {
        this.joints = msg.joints;
        this.renderer.syncJoints(msg.joints);
        this.emit('joints:updated', msg.joints);
        break;
      }

      case 'text_labels_updated': {
        this.textLabels = msg.textLabels;
        this.renderer.syncTextLabels(msg.textLabels);
        this.emit('text_labels:updated', msg.textLabels);
        break;
      }

      case 'decals_updated': {
        this.decals = msg.decals;
        this.renderer.syncDecals(msg.decals);
        this.emit('decals:updated', msg.decals);
        break;
      }

      case 'stroke_added': {
        this.strokes.push(msg.stroke);
        this.renderer.applyStrokes(this.strokes);
        this.emit('stroke:added', msg.stroke);
        break;
      }

      case 'strokes_cleared': {
        this.strokes = [];
        this.renderer.clearPaint();
        this.emit('strokes:cleared', {});
        break;
      }

      case 'notebook_updated': {
        const idx = this.notebook.findIndex((e) => e.id === msg.entry.id);
        if (idx >= 0) this.notebook[idx] = msg.entry;
        else this.notebook.push(msg.entry);
        this.emit('notebook:updated', msg.entry);
        break;
      }

      case 'ping_event': {
        this.renderer.triggerPing(msg.position, msg.playerColor);
        this.emit('ping', msg);
        break;
      }

      case 'chat_broadcast': {
        this.chatMessages.push(msg.message);
        if (this.chatMessages.length > 100) this.chatMessages.shift();
        this.emit('chat:message', msg.message);
        break;
      }

      case 'table_config_updated': {
        this.currentTableConfig = msg.config;
        this.renderer.applyEnvironment(msg.config.environment || 'studio');
        this.renderer.rebuildTable(msg.config);
        this.emit('table:config', msg.config);
        break;
      }
    }
  }

  public sendMessage(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Keyboard Shortcuts (TTS Standards: F1-F7, L lock, G group, Q/E rotate, R roll, F flip, 1-9 draw)
  private bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // F1 - F7 Tool Switching
      if (e.key === 'F1') {
        e.preventDefault();
        this.setTool('grab');
      } else if (e.key === 'F2') {
        e.preventDefault();
        this.setTool('paint');
      } else if (e.key === 'F3') {
        e.preventDefault();
        this.setTool('ruler');
      } else if (e.key === 'F4') {
        e.preventDefault();
        this.setTool('flick');
      } else if (e.key === 'F5') {
        e.preventDefault();
        this.setTool('joint');
      } else if (e.key === 'F6') {
        e.preventDefault();
        this.setTool('snap_points');
      } else if (e.key === 'F7') {
        e.preventDefault();
        this.setTool('zones');
      } else if (e.key === 'F8') {
        e.preventDefault();
        this.setTool('text');
      } else if (e.key === 'F9') {
        e.preventDefault();
        this.setTool('gizmo');
      } else if (e.key === 'F10') {
        e.preventDefault();
        this.setTool('decal');
      }

      // Ctrl+A Select All
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        this.renderer.selectAll();
        return;
      }

      // Escape Deselect All
      if (e.key === 'Escape') {
        this.renderer.clearSelection();
        return;
      }

      const hoveredId = this.renderer.hoveredPieceId;
      const grabbedId = this.renderer.grabbedPieceId;
      const targetId = grabbedId || hoveredId;
      const selectedIds = Array.from(this.renderer.selectedPieceIds);

      // TTS Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
        return;
      }

      // 'H' Key: Pick up card to Private Player Hand
      if ((e.key === 'h' || e.key === 'H') && (targetId || selectedIds.length > 0)) {
        const pickId = targetId || selectedIds[0];
        const piece = this.pieces.get(pickId);
        if (piece && (piece.type === 'card' || piece.type === 'card_deck')) {
          this.emit('hand:pickup', piece);
          return;
        }
      }

      // TTS 'L' Key: Toggle Lock on hovered or grabbed or selected pieces
      if (e.key === 'l' || e.key === 'L') {
        if (selectedIds.length > 1) {
          selectedIds.forEach((id) => this.toggleLock(id));
        } else if (targetId) {
          this.toggleLock(targetId);
        }
        return;
      }

      // TTS 'G' Key: Group / Stack selected pieces into a deck or column
      if (e.key === 'g' || e.key === 'G') {
        this.saveHistorySnapshot();
        if (selectedIds.length > 1) {
          this.groupPieces(selectedIds);
          this.renderer.clearSelection();
          return;
        } else if (hoveredId) {
          const piece = this.pieces.get(hoveredId);
          if (piece?.type === 'card' || piece?.type === 'poker_chip') {
            const matchingIds = Array.from(this.pieces.values())
              .filter((p) => p.type === piece.type)
              .map((p) => p.id);
            this.groupPieces(matchingIds);
            return;
          }
        }
      }

      // Number keys 1-9 to deal N cards
      if (/^[1-9]$/.test(e.key) && hoveredId) {
        const piece = this.pieces.get(hoveredId);
        if (piece?.type === 'card_deck') {
          this.dealCards(parseInt(e.key, 10));
        }
      }

      if (grabbedId || selectedIds.length > 0) {
        const activeIds = grabbedId ? [grabbedId] : selectedIds;
        const rad = (this.degreeSnap * Math.PI) / 180;

        if (e.key === 'q' || e.key === 'Q') {
          activeIds.forEach((id) => {
            this.sendMessage({
              type: 'rotate_grabbed',
              pieceId: id,
              deltaEuler: { x: 0, y: rad, z: 0 },
            });
          });
        } else if (e.key === 'e' || e.key === 'E') {
          activeIds.forEach((id) => {
            this.sendMessage({
              type: 'rotate_grabbed',
              pieceId: id,
              deltaEuler: { x: 0, y: -rad, z: 0 },
            });
          });
        } else if (e.key === 'f' || e.key === 'F') {
          activeIds.forEach((id) => {
            this.sendMessage({
              type: 'flip_grabbed',
              pieceId: id,
            });
          });
        } else if (e.key === 'r' || e.key === 'R') {
          activeIds.forEach((id) => {
            this.sendMessage({
              type: 'roll_dice',
              pieceId: id,
            });
          });
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          activeIds.forEach((id) => {
            this.removePiece(id);
          });
          this.renderer.clearSelection();
        }
      } else {
        if (e.key === 'r' || e.key === 'R') {
          if (hoveredId && this.pieces.get(hoveredId)?.type.startsWith('dice_')) {
            this.rollDice(hoveredId);
          } else {
            this.rollAllDice();
          }
        } else if (e.key === 'p' || e.key === 'P') {
          const hit = this.renderer.raycastTable();
          if (hit) {
            this.ping({ x: hit.x, y: hit.y, z: hit.z });
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.setTool(this.renderer.currentTool === 'ruler' ? 'grab' : 'ruler');
        }
      }
    });
  }

  // Tool Selection
  public setTool(tool: ToolMode) {
    this.renderer.currentTool = tool;
    if (tool !== 'ruler') {
      this.renderer.clearRuler();
    }
    this.emit('tool:changed', tool);
  }

  // Actions
  public toggleLock(pieceId: string) {
    this.sendMessage({ type: 'toggle_lock', pieceId });
  }

  public groupPieces(pieceIds: string[]) {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'group_pieces', pieceIds });
  }

  public cascadeCards(pieceIds: string[]) {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'cascade_cards', pieceIds });
  }

  public fanCards(pieceIds: string[]) {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'fan_cards', pieceIds });
  }

  public rollDice(pieceId: string) {
    this.sendMessage({ type: 'roll_dice', pieceId });
  }

  public rollAllDice() {
    this.sendMessage({ type: 'roll_all_dice' });
  }

  public setDegreeSnap(deg: number) {
    this.degreeSnap = deg;
    this.emit('degree_snap:changed', deg);
  }

  public saveHistorySnapshot() {
    if (this.pieces.size === 0) return;
    const snapshot = {
      pieces: Array.from(this.pieces.values()).map((p) => ({
        ...p,
        position: { ...p.position },
        rotation: { ...p.rotation },
      })),
      tableConfig: { ...this.currentTableConfig },
    };
    this.undoHistory.push(snapshot);
    if (this.undoHistory.length > 30) this.undoHistory.shift();
    this.redoHistory = [];
    this.emit('history:changed', { canUndo: this.undoHistory.length > 0, canRedo: this.redoHistory.length > 0 });
  }

  public undo() {
    if (this.undoHistory.length === 0) return;
    const currentSnapshot = {
      pieces: Array.from(this.pieces.values()).map((p) => ({
        ...p,
        position: { ...p.position },
        rotation: { ...p.rotation },
      })),
      tableConfig: { ...this.currentTableConfig },
    };
    this.redoHistory.push(currentSnapshot);
    const target = this.undoHistory.pop()!;
    this.loadSavedState(target);
    this.audio.playCardShuffle();
    this.emit('history:changed', { canUndo: this.undoHistory.length > 0, canRedo: this.redoHistory.length > 0 });
  }

  public redo() {
    if (this.redoHistory.length === 0) return;
    const currentSnapshot = {
      pieces: Array.from(this.pieces.values()).map((p) => ({
        ...p,
        position: { ...p.position },
        rotation: { ...p.rotation },
      })),
      tableConfig: { ...this.currentTableConfig },
    };
    this.undoHistory.push(currentSnapshot);
    const target = this.redoHistory.pop()!;
    this.loadSavedState(target);
    this.audio.playCardShuffle();
    this.emit('history:changed', { canUndo: this.undoHistory.length > 0, canRedo: this.redoHistory.length > 0 });
  }

  public flipTable(force?: number) {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'flip_table', force });
  }

  public resetTable() {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'reset_table' });
  }

  public loadPreset(presetName: string) {
    this.saveHistorySnapshot();
    this.sendMessage({ type: 'load_preset', presetName });
  }

  public spawnPiece(piece: Partial<TabletopPieceData> & { type: any }) {
    this.sendMessage({ type: 'spawn_piece', piece });
  }

  public spawnBatch(pieces: Array<Partial<TabletopPieceData> & { type: any }>) {
    this.sendMessage({ type: 'spawn_batch', pieces });
  }

  public removePiece(pieceId: string) {
    this.sendMessage({ type: 'remove_piece', pieceId });
  }

  public clearPieces() {
    this.sendMessage({ type: 'clear_pieces' });
  }

  public shuffleDeck(pieceId?: string) {
    this.sendMessage({ type: 'shuffle_deck', pieceId: pieceId || 'deck-main' });
  }

  public dealCards(count: number = 1) {
    this.sendMessage({ type: 'deal_cards', count });
  }

  public clearDrawings() {
    this.sendMessage({ type: 'clear_strokes' });
  }

  public updateNotebook(entry: NotebookEntry) {
    this.sendMessage({ type: 'update_notebook', entry });
  }

  public loadSavedState(state: { pieces: TabletopPieceData[]; tableConfig: TableConfig; notebook?: NotebookEntry[] }) {
    this.sendMessage({ type: 'load_saved_state', state });
  }

  public ping(position: Vector3D) {
    this.sendMessage({ type: 'ping', position });
  }

  public sendChat(text: string) {
    this.sendMessage({ type: 'chat', text });
  }

  public updateTableConfig(config: Partial<TableConfig>) {
    this.sendMessage({ type: 'update_table_config', config });
  }

  public switchRoom(newRoomId: string) {
    this.roomId = newRoomId;
    this.sendMessage({
      type: 'join',
      roomId: newRoomId,
      playerName: this.options.playerName || 'Player',
      playerColor: this.options.playerColor,
    });
  }

  // TTS Turns & Host Administration Methods
  public passTurn() {
    this.sendMessage({ type: 'pass_turn' });
  }

  public toggleTurns(enabled: boolean) {
    this.sendMessage({ type: 'toggle_turns', enabled });
  }

  public setTurnTimer(seconds: number) {
    this.sendMessage({ type: 'set_turn_timer', seconds });
  }

  public updatePermissions(permissions: Partial<HostPermissions>) {
    this.sendMessage({ type: 'update_permissions', permissions });
  }

  public promotePlayer(targetPlayerId: string) {
    this.sendMessage({ type: 'promote_player', targetPlayerId });
  }

  public kickPlayer(targetPlayerId: string) {
    this.sendMessage({ type: 'kick_player', targetPlayerId });
  }

  public toggleBlindfold(targetPlayerId?: string) {
    this.sendMessage({ type: 'toggle_blindfold', targetPlayerId });
  }

  public clockAction(
    action: 'start' | 'pause' | 'reset' | 'set_mode',
    mode?: 'stopwatch' | 'countdown',
    seconds?: number
  ) {
    this.sendMessage({ type: 'clock_action', action, mode, seconds });
  }

  // TTS Snap Points, Joints, Labels, and Decals
  public addSnapPoint(snapPoint: SnapPoint) {
    this.sendMessage({ type: 'add_snap_point', snapPoint });
  }

  public removeSnapPoint(snapPointId: string) {
    this.sendMessage({ type: 'remove_snap_point', snapPointId });
  }

  public addJoint(joint: JointData) {
    this.sendMessage({ type: 'add_joint', joint });
  }

  public removeJoint(jointId: string) {
    this.sendMessage({ type: 'remove_joint', jointId });
  }

  public addTextLabel(textLabel: TextLabel) {
    this.sendMessage({ type: 'add_text_label', textLabel });
  }

  public removeTextLabel(textLabelId: string) {
    this.sendMessage({ type: 'remove_text_label', textLabelId });
  }

  public addDecal(decal: DecalData) {
    this.sendMessage({ type: 'add_decal', decal });
  }

  public removeDecal(decalId: string) {
    this.sendMessage({ type: 'remove_decal', decalId });
  }

  // TTS Deck Sifting, Cutting, Spreading, and Coin Flipping
  public cutDeck(pieceId: string) {
    this.sendMessage({ type: 'cut_deck', pieceId });
  }

  public spreadDeck(pieceId: string) {
    this.sendMessage({ type: 'spread_deck', pieceId });
  }

  public takeCardFromDeck(deckId: string, cardName: string) {
    this.sendMessage({ type: 'take_card_from_deck', deckId, cardName });
  }

  public flipCoin(pieceId: string) {
    this.sendMessage({ type: 'flip_coin', pieceId });
  }

  // Plugin System
  public use(plugin: TabletopPlugin) {
    if (this.plugins.has(plugin.name)) return;
    this.plugins.set(plugin.name, plugin);
    plugin.init(this);
    return this;
  }

  public on(event: string, callback: TabletopEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: TabletopEventListener) {
    const set = this.listeners.get(event);
    if (set) set.delete(callback);
  }

  public emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      }
    }
  }

  public destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pointerThrottleTimer) clearTimeout(this.pointerThrottleTimer);

    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) plugin.destroy();
    }
    this.plugins.clear();
    this.listeners.clear();

    if (this.ws) this.ws.close();
    if (this.renderer) this.renderer.destroy();
  }
}
