/**
 * Tabletop Nexus - Pluggable Client Library
 * Core SDK for embedding 3D Tabletop Simulator into web applications
 */

import {
  ClientMessage,
  ServerMessage,
  TabletopPieceData,
  TableConfig,
  PlayerPresence,
  ChatMessage,
  Vector3D
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
  public currentTableConfig!: TableConfig;

  private listeners = new Map<string, Set<TabletopEventListener>>();
  private plugins = new Map<string, TabletopPlugin>();
  private reconnectTimeout: any = null;
  private pointerThrottleTimer: any = null;

  constructor(options: TabletopClientOptions) {
    this.options = options;
    this.roomId = options.roomId || 'general';
    this.audio = new TabletopAudio();
    this.audio.enabled = options.soundEnabled !== false;

    // Default table config before server init
    this.currentTableConfig = {
      shape: 'rectangular',
      width: 16,
      length: 22,
      height: 2.0,
      feltColor: '#1c4234',
      woodColor: '#3d2516',
      hasRim: true,
      gravity: 9.81,
    };

    // Initialize 3D renderer
    this.initRenderer();

    // Connect to WebSocket server
    this.connect();

    // Bind keyboard shortcuts
    this.bindKeyboardShortcuts();
  }

  private initRenderer() {
    this.renderer = new TabletopRenderer(this.options.container, this.currentTableConfig);

    // Wire renderer callbacks to network messages
    this.renderer.events = {
      onPieceSelect: (pieceId) => {
        const piece = this.pieces.get(pieceId);
        if (piece) {
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
          }, 45); // ~22Hz pointer broadcasts
        }
      },

      onTableClick: (worldPos) => {
        this.emit('table:click', worldPos);
      },
    };
  }

  public connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Determine WebSocket URL
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

        // Join room explicitly
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
        // Auto-reconnect after 2.5s
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
        this.renderer.rebuildTable(msg.tableConfig);

        // Clear & populate pieces
        this.pieces.clear();
        this.renderer.clearAllPieces();
        for (const p of msg.pieces) {
          this.pieces.set(p.id, p);
          this.renderer.syncPiece(p);
        }

        // Players & chat
        this.players.clear();
        for (const p of msg.players) {
          this.players.set(p.id, p);
        }
        this.chatMessages = msg.messages;
        this.renderer.syncPlayerCursors(Array.from(this.players.values()), this.playerId);

        this.emit('init', {
          playerId: this.playerId,
          roomId: this.roomId,
          pieces: msg.pieces,
          players: msg.players,
        });
        break;
      }

      case 'physics_tick': {
        this.renderer.applyPhysicsUpdates(msg.updates);
        // Sync local pieces map
        for (const u of msg.updates) {
          const p = this.pieces.get(u.id);
          if (p) {
            p.position = { x: u.p[0], y: u.p[1], z: u.p[2] };
            p.rotation = { x: u.r[0], y: u.r[1], z: u.r[2], w: u.r[3] };
            p.isSleeping = u.s;
            p.grabbedBy = u.g;
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
        }
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

  // Keyboard Shortcuts (TTS Standards: Q/E rotate, R roll, F flip, etc.)
  private bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if typing in an input / textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const grabbedId = this.renderer.grabbedPieceId;

      if (grabbedId) {
        if (e.key === 'q' || e.key === 'Q') {
          // Rotate counterclockwise around Y
          this.sendMessage({
            type: 'rotate_grabbed',
            pieceId: grabbedId,
            deltaEuler: { x: 0, y: Math.PI / 8, z: 0 },
          });
        } else if (e.key === 'e' || e.key === 'E') {
          // Rotate clockwise around Y
          this.sendMessage({
            type: 'rotate_grabbed',
            pieceId: grabbedId,
            deltaEuler: { x: 0, y: -Math.PI / 8, z: 0 },
          });
        } else if (e.key === 'f' || e.key === 'F') {
          // Flip upside down
          this.sendMessage({
            type: 'flip_grabbed',
            pieceId: grabbedId,
          });
        } else if (e.key === 'r' || e.key === 'R') {
          // Roll held dice
          this.sendMessage({
            type: 'roll_dice',
            pieceId: grabbedId,
          });
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          this.removePiece(grabbedId);
        }
      } else {
        if (e.key === 'r' || e.key === 'R') {
          // Roll all dice on table
          this.rollAllDice();
        } else if (e.key === 'p' || e.key === 'P') {
          // Ping table location
          const hit = (this.renderer as any).raycastTable();
          if (hit) {
            this.ping({ x: hit.x, y: hit.y, z: hit.z });
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.toggleRuler();
        }
      }
    });
  }

  // Pluggable Action API
  public rollDice(pieceId: string) {
    this.sendMessage({ type: 'roll_dice', pieceId });
  }

  public rollAllDice() {
    this.sendMessage({ type: 'roll_all_dice' });
  }

  public flipTable(force?: number) {
    this.sendMessage({ type: 'flip_table', force });
  }

  public resetTable() {
    this.sendMessage({ type: 'reset_table' });
  }

  public loadPreset(presetName: string) {
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

  public toggleRuler() {
    this.renderer.isRulerMode = !this.renderer.isRulerMode;
    if (!this.renderer.isRulerMode) {
      this.renderer.clearRuler();
    }
    this.emit('ruler:toggled', { active: this.renderer.isRulerMode });
    return this.renderer.isRulerMode;
  }

  // Plugin System
  public use(plugin: TabletopPlugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already registered.`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    plugin.init(this);
    return this;
  }

  // Event System
  public on(event: string, callback: TabletopEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: TabletopEventListener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
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

    if (this.ws) {
      this.ws.close();
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}
