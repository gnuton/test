/**
 * Tabletop Nexus - Server Room Manager
 * Manages multiplayer room state, client connections, and physics tick loop
 */

import { WebSocket } from 'ws';
import {
  ClientMessage,
  ServerMessage,
  PlayerPresence,
  ChatMessage,
  TabletopPieceData,
  TableConfig,
  PieceShapeType
} from '../types.js';
import { TabletopPhysicsWorld } from './TabletopPhysicsWorld.js';
import { getPresetPieces, getPresetTableConfig } from '../presets.js';

const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

interface ConnectedClient {
  ws: WebSocket;
  player: PlayerPresence;
}

export class TabletopServerRoom {
  public roomId: string;
  public physics: TabletopPhysicsWorld;
  public clients = new Map<string, ConnectedClient>(); // playerId -> ConnectedClient
  public messages: ChatMessage[] = [];
  public currentPreset: string = 'boardgame';

  private tickInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE = 30; // 30Hz server physics updates
  private colorIndex = 0;

  constructor(roomId: string, initialPreset: string = 'boardgame') {
    this.roomId = roomId;
    this.currentPreset = initialPreset;

    const initialTableConfig = getPresetTableConfig(initialPreset);
    this.physics = new TabletopPhysicsWorld(initialTableConfig);

    // Setup callbacks
    this.physics.setCallbacks({
      onDiceSettled: (pieceId, value, type, rollerName) => {
        this.broadcast({
          type: 'dice_settled',
          pieceId,
          value,
          diceType: type,
          rollerName,
        });

        // Add to system chat
        this.addSystemMessage(
          `🎲 ${rollerName || 'Someone'} rolled a ${type.replace('dice_', '').toUpperCase()}: [ ${value} ]`
        );
      },
      onSoundEvent: (sound, intensity, pos) => {
        this.broadcast({
          type: 'sound_event',
          sound,
          intensity,
          position: pos,
        });
      },
    });

    // Populate initial pieces
    this.loadPreset(initialPreset, false);

    // Start physics loop
    this.startTickLoop();
  }

  public startTickLoop() {
    if (this.tickInterval) return;

    const dt = 1 / this.TICK_RATE;
    this.tickInterval = setInterval(() => {
      try {
        const updates = this.physics.step(dt);

        if (updates.length > 0 && this.clients.size > 0) {
          const tickMessage: ServerMessage = {
            type: 'physics_tick',
            updates,
            timestamp: Date.now(),
          };
          this.broadcast(tickMessage);
        }
      } catch (err) {
        console.error(`[Room ${this.roomId}] Physics tick error:`, err);
      }
    }, 1000 / this.TICK_RATE);
  }

  public stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public handleJoin(ws: WebSocket, playerName: string, customColor?: string): string {
    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const seatIndex = this.clients.size;
    const color = customColor || PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    this.colorIndex++;

    const player: PlayerPresence = {
      id: playerId,
      name: playerName || `Player ${seatIndex + 1}`,
      color,
      cursor: { x: 0, y: this.physics.tableConfig.height + 1, z: 4 },
      seatIndex,
      grabbedPieceId: null,
    };

    this.clients.set(playerId, { ws, player });

    // Send full initial state to joining player
    const piecesList = Array.from(this.physics.pieceData.values());
    const playersList = Array.from(this.clients.values()).map((c) => c.player);

    const initMsg: ServerMessage = {
      type: 'init',
      playerId,
      roomId: this.roomId,
      pieces: piecesList,
      tableConfig: this.physics.tableConfig,
      players: playersList,
      messages: this.messages.slice(-50),
    };
    ws.send(JSON.stringify(initMsg));

    // Announce to other players
    this.broadcast(
      {
        type: 'player_joined',
        player,
      },
      playerId
    );

    this.addSystemMessage(`👋 ${player.name} joined the table.`);

    return playerId;
  }

  public handleLeave(playerId: string) {
    const client = this.clients.get(playerId);
    if (!client) return;

    // Release any grabbed piece
    if (client.player.grabbedPieceId) {
      this.physics.releaseGrab(client.player.grabbedPieceId, playerId);
    }

    const name = client.player.name;
    this.clients.delete(playerId);

    this.broadcast({
      type: 'player_left',
      playerId,
    });

    this.addSystemMessage(`🚪 ${name} left the room.`);
  }

  public handleMessage(playerId: string, msg: ClientMessage) {
    const client = this.clients.get(playerId);
    if (!client) return;

    switch (msg.type) {
      case 'pointer_move': {
        client.player.cursor = msg.cursor;
        client.player.isPointerActive = msg.isPointerActive;
        this.broadcast(
          {
            type: 'player_update',
            player: client.player,
          },
          playerId
        );
        break;
      }

      case 'grab': {
        this.physics.startGrab(msg.pieceId, playerId, msg.targetPosition);
        client.player.grabbedPieceId = msg.pieceId;
        this.broadcast({
          type: 'player_update',
          player: client.player,
        });
        break;
      }

      case 'move_grabbed': {
        this.physics.updateGrab(msg.pieceId, playerId, msg.targetPosition, msg.rotation);
        break;
      }

      case 'rotate_grabbed': {
        this.physics.rotateGrabbed(msg.pieceId, msg.deltaEuler);
        break;
      }

      case 'flip_grabbed': {
        this.physics.flipGrabbed(msg.pieceId);
        break;
      }

      case 'release_grabbed': {
        this.physics.releaseGrab(msg.pieceId, playerId, msg.velocity, msg.angularVelocity);
        client.player.grabbedPieceId = null;
        this.broadcast({
          type: 'player_update',
          player: client.player,
        });
        break;
      }

      case 'roll_dice': {
        this.physics.rollDice(msg.pieceId, client.player.name, msg.forceMultiplier);
        break;
      }

      case 'roll_all_dice': {
        this.physics.rollAllDice(client.player.name);
        this.addSystemMessage(`🎲 ${client.player.name} rolled all dice!`);
        break;
      }

      case 'impulse': {
        const body = this.physics.bodies.get(msg.pieceId);
        if (body) {
          body.wakeUp();
          body.applyImpulse(
            new (this.physics.world as any).Vec3(msg.impulse.x, msg.impulse.y, msg.impulse.z)
          );
        }
        break;
      }

      case 'flip_table': {
        const force = msg.force || 1.2;
        this.physics.flipTable(force);
        this.broadcast({
          type: 'table_flipped',
          force,
        });
        this.addSystemMessage(`💥 (╯°□°)╯︵ ┻━┻ ${client.player.name} FLIPPED THE TABLE!`);
        break;
      }

      case 'reset_table': {
        this.loadPreset(this.currentPreset, true);
        this.addSystemMessage(`🧹 ${client.player.name} reset the table.`);
        break;
      }

      case 'load_preset': {
        this.loadPreset(msg.presetName, true);
        this.addSystemMessage(`📦 ${client.player.name} loaded preset: "${msg.presetName.toUpperCase()}"`);
        break;
      }

      case 'spawn_piece': {
        const id = msg.piece.id || `custom_${Math.random().toString(36).substring(2, 9)}`;
        const pieceData: TabletopPieceData = {
          id,
          type: msg.piece.type,
          name: msg.piece.name || `${msg.piece.type}`,
          position: msg.piece.position || { x: 0, y: this.physics.tableConfig.height + 0.8, z: 0 },
          rotation: msg.piece.rotation || { x: 0, y: 0, z: 0, w: 1 },
          mass: msg.piece.mass !== undefined ? msg.piece.mass : 0.2,
          color: msg.piece.color || client.player.color,
          label: msg.piece.label,
          value: msg.piece.value,
          dimensions: msg.piece.dimensions,
        };

        this.physics.addPiece(pieceData);
        this.broadcast({
          type: 'piece_spawned',
          piece: pieceData,
        });
        break;
      }

      case 'spawn_batch': {
        for (const p of msg.pieces) {
          const id = p.id || `custom_${Math.random().toString(36).substring(2, 9)}`;
          const pieceData: TabletopPieceData = {
            id,
            type: p.type,
            name: p.name || `${p.type}`,
            position: p.position || { x: 0, y: this.physics.tableConfig.height + 0.8, z: 0 },
            rotation: p.rotation || { x: 0, y: 0, z: 0, w: 1 },
            mass: p.mass !== undefined ? p.mass : 0.2,
            color: p.color || client.player.color,
            label: p.label,
            value: p.value,
            dimensions: p.dimensions,
          };
          this.physics.addPiece(pieceData);
          this.broadcast({
            type: 'piece_spawned',
            piece: pieceData,
          });
        }
        break;
      }

      case 'remove_piece': {
        this.physics.removePiece(msg.pieceId);
        this.broadcast({
          type: 'piece_removed',
          pieceId: msg.pieceId,
        });
        break;
      }

      case 'clear_pieces': {
        this.physics.clearPieces();
        this.broadcast({
          type: 'pieces_cleared',
        });
        this.addSystemMessage(`🧹 ${client.player.name} cleared all pieces.`);
        break;
      }

      case 'shuffle_deck': {
        this.broadcast({
          type: 'sound_event',
          sound: 'card_shuffle',
          intensity: 1.0,
        });
        this.addSystemMessage(`🃏 ${client.player.name} shuffled the deck.`);
        break;
      }

      case 'deal_cards': {
        const count = Math.min(10, Math.max(1, msg.count || 1));
        const deckPiece = Array.from(this.physics.pieceData.values()).find((p) => p.type === 'card_deck');
        const startX = deckPiece ? deckPiece.position.x : -2;
        const startZ = deckPiece ? deckPiece.position.z : 0;
        const dealtSuits = ['♠', '♥', '♦', '♣'];
        const dealtRanks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        for (let i = 0; i < count; i++) {
          const rank = dealtRanks[Math.floor(Math.random() * dealtRanks.length)];
          const suit = dealtSuits[Math.floor(Math.random() * dealtSuits.length)];
          const cardId = `dealt_${Date.now()}_${i}`;
          const targetZ = client.player.cursor.z || 3;
          const targetX = client.player.cursor.x + (i - (count - 1) / 2) * 1.3;

          const cardPiece: TabletopPieceData = {
            id: cardId,
            type: 'card',
            name: `${rank}${suit}`,
            label: `${rank}${suit}`,
            position: { x: targetX, y: this.physics.tableConfig.height + 0.4 + i * 0.05, z: targetZ },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            mass: 0.04,
            color: '#ffffff',
            secondaryColor: suit === '♥' || suit === '♦' ? '#dc2626' : '#0f172a',
          };
          this.physics.addPiece(cardPiece);
          this.broadcast({
            type: 'piece_spawned',
            piece: cardPiece,
          });
        }

        this.broadcast({
          type: 'sound_event',
          sound: 'card_deal',
          intensity: 0.8,
        });
        this.addSystemMessage(`🎴 ${client.player.name} dealt ${count} card(s).`);
        break;
      }

      case 'ping': {
        this.broadcast({
          type: 'ping_event',
          playerId,
          playerName: client.player.name,
          playerColor: client.player.color,
          position: msg.position,
        });
        this.broadcast({
          type: 'sound_event',
          sound: 'ping',
          intensity: 0.8,
        });
        break;
      }

      case 'chat': {
        const text = (msg.text || '').trim();
        if (!text) return;
        const chatMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: playerId,
          senderName: client.player.name,
          senderColor: client.player.color,
          text,
          timestamp: Date.now(),
        };
        this.messages.push(chatMsg);
        if (this.messages.length > 100) this.messages.shift();
        this.broadcast({
          type: 'chat_broadcast',
          message: chatMsg,
        });
        break;
      }

      case 'update_table_config': {
        this.physics.updateTableConfig(msg.config);
        this.broadcast({
          type: 'table_config_updated',
          config: this.physics.tableConfig,
        });
        break;
      }
    }
  }

  public loadPreset(presetName: string, broadcastUpdate: boolean = true) {
    this.currentPreset = presetName;
    const config = getPresetTableConfig(presetName);
    this.physics.updateTableConfig(config);
    this.physics.clearPieces();

    const pieces = getPresetPieces(presetName, config.height);
    for (const piece of pieces) {
      this.physics.addPiece(piece);
    }

    if (broadcastUpdate) {
      this.broadcast({
        type: 'table_reset',
        pieces: Array.from(this.physics.pieceData.values()),
      });
      this.broadcast({
        type: 'table_config_updated',
        config: this.physics.tableConfig,
      });
    }
  }

  private addSystemMessage(text: string) {
    const sysMsg: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Tabletop',
      senderColor: '#94a3b8',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    this.messages.push(sysMsg);
    if (this.messages.length > 100) this.messages.shift();
    this.broadcast({
      type: 'chat_broadcast',
      message: sysMsg,
    });
  }

  public broadcast(message: ServerMessage, excludePlayerId?: string) {
    const payload = JSON.stringify(message);
    for (const [id, client] of this.clients.entries()) {
      if (id === excludePlayerId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}
