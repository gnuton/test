/**
 * Tabletop Nexus - Server Room Manager
 * Complete Tabletop Simulator Knowledge Base Implementation
 * Manages multiplayer room state, client connections, physics, host administration,
 * turns, clocks, snap points, joints, text labels, decals, and deck sifting.
 */

import { WebSocket } from 'ws';
import {
  ClientMessage,
  ServerMessage,
  PlayerPresence,
  ChatMessage,
  TabletopPieceData,
  TableConfig,
  DrawingStroke,
  NotebookEntry,
  HostPermissions,
  TurnState,
  ClockState,
  SnapPoint,
  JointData,
  TextLabel,
  DecalData
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
  public clients = new Map<string, ConnectedClient>();
  public messages: ChatMessage[] = [];
  public strokes: DrawingStroke[] = [];
  public notebook: NotebookEntry[] = [];
  public currentPreset: string = 'boardgame';

  // Host & Server Administration
  public permissions: HostPermissions = {
    tableFlip: true,
    spawnObjects: true,
    deleteObjects: true,
    drawTools: true,
    physicsInteract: true,
    contextMenu: true,
    changeSettings: true,
  };

  // Turns System (kb.tabletopsimulator.com/host-guides/turns/)
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

  // Digital Clock / Stopwatch (kb.tabletopsimulator.com/built-in-objects/digital-clock/)
  public clock: ClockState = {
    mode: 'stopwatch',
    running: false,
    seconds: 0,
    initialSeconds: 0,
  };

  // Snap Points & Joints (kb.tabletopsimulator.com/game-tools/snap-points-and-joints/)
  public snapPoints: SnapPoint[] = [];
  public joints: JointData[] = [];

  // 3D Text Labels & Decals (kb.tabletopsimulator.com/game-tools/text-and-decals/)
  public textLabels: TextLabel[] = [];
  public decals: DecalData[] = [];

  private tickInterval: NodeJS.Timeout | null = null;
  private oneSecondInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE = 30;
  private colorIndex = 0;

  constructor(roomId: string, initialPreset: string = 'boardgame') {
    this.roomId = roomId;
    this.currentPreset = initialPreset;

    const initialTableConfig = getPresetTableConfig(initialPreset);
    this.physics = new TabletopPhysicsWorld(initialTableConfig);

    // Initial notebook entries
    this.notebook.push({
      id: 'entry-welcome',
      title: 'Game Rules & Notes',
      content:
        '# Welcome to Tabletop Nexus!\n\nUse this shared notebook for rules, character sheets, scores, or turn notes.\n\n- Press F1-F10 for all TTS Tools (Hand, Draw, Ruler, Flick, Joints, Snap, Zones, Text, Gizmo, Decal)\n- Press L to Lock pieces in place\n- Press Alt while hovering to inspect cards & tokens\n- Press R to roll dice / shuffle deck\n- Press G to group cards into decks\n- Press B to toggle Blindfold mode',
      updatedAt: Date.now(),
      updatedBy: 'System',
    });

    this.physics.setCallbacks({
      onDiceSettled: (pieceId, value, type, rollerName) => {
        this.broadcast({
          type: 'dice_settled',
          pieceId,
          value,
          diceType: type,
          rollerName,
        });

        if (type === 'coin') {
          const coinResult = value === 1 ? 'HEADS' : 'TAILS';
          this.addSystemMessage(`🪙 ${rollerName || 'Someone'} flipped a Coin: [ ${coinResult} ]`);
        } else if (type === 'dice_fate') {
          const fateLabel = value > 0 ? '+ (PLUS)' : value < 0 ? '- (MINUS)' : 'O (BLANK)';
          this.addSystemMessage(`🎲 ${rollerName || 'Someone'} rolled a FATE dice: [ ${fateLabel} ]`);
        } else {
          this.addSystemMessage(
            `🎲 ${rollerName || 'Someone'} rolled a ${type.replace('dice_', '').toUpperCase()}: [ ${value} ]`
          );
        }
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

    this.loadPreset(initialPreset, false);
    this.startTickLoop();
    this.startOneSecondInterval();
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

  public startOneSecondInterval() {
    if (this.oneSecondInterval) return;

    this.oneSecondInterval = setInterval(() => {
      let turnsChanged = false;
      let clockChanged = false;

      // Turn countdown timer
      if (this.turns.enabled && this.turns.timerRunning && this.turns.timeRemaining > 0) {
        this.turns.timeRemaining--;
        turnsChanged = true;

        if (this.turns.timeRemaining === 0) {
          this.passTurn();
          this.broadcast({
            type: 'sound_event',
            sound: 'timer_alarm',
            intensity: 1.0,
          });
        } else if (this.turns.timeRemaining <= 5) {
          this.broadcast({
            type: 'sound_event',
            sound: 'timer_tick',
            intensity: 0.5,
          });
        }
      }

      // Digital Clock / Stopwatch
      if (this.clock.running) {
        if (this.clock.mode === 'stopwatch') {
          this.clock.seconds++;
          clockChanged = true;
        } else if (this.clock.mode === 'countdown') {
          if (this.clock.seconds > 0) {
            this.clock.seconds--;
            clockChanged = true;
            if (this.clock.seconds === 0) {
              this.clock.running = false;
              this.broadcast({
                type: 'sound_event',
                sound: 'timer_alarm',
                intensity: 1.0,
              });
              this.addSystemMessage('⏰ Digital Clock Timer Finished!');
            }
          }
        }
      }

      if (turnsChanged) {
        this.broadcast({
          type: 'turns_updated',
          turns: this.turns,
        });
      }

      if (clockChanged) {
        this.broadcast({
          type: 'clock_updated',
          clock: this.clock,
        });
      }
    }, 1000);
  }

  public stopOneSecondInterval() {
    if (this.oneSecondInterval) {
      clearInterval(this.oneSecondInterval);
      this.oneSecondInterval = null;
    }
  }

  public handleJoin(ws: WebSocket, playerName: string, customColor?: string): string {
    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
    const seatIndex = this.clients.size;
    const isFirstPlayer = this.clients.size === 0;
    const color = customColor || PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    this.colorIndex++;

    const player: PlayerPresence = {
      id: playerId,
      name: playerName || `Player ${seatIndex + 1}`,
      color,
      cursor: { x: 0, y: this.physics.tableConfig.height + 1, z: 4 },
      seatIndex,
      grabbedPieceId: null,
      isAdmin: isFirstPlayer,
      isBlindfolded: false,
    };

    this.clients.set(playerId, { ws, player });

    // Update turn order
    if (this.turns.playerOrder.length === 0 || !this.turns.playerOrder.includes(playerId)) {
      this.turns.playerOrder.push(playerId);
      if (!this.turns.activePlayerId) {
        this.turns.activePlayerId = playerId;
        this.turns.activePlayerName = player.name;
        this.turns.activePlayerColor = player.color;
      }
    }

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
      strokes: this.strokes,
      notebook: this.notebook,
      permissions: this.permissions,
      turns: this.turns,
      clock: this.clock,
      snapPoints: this.snapPoints,
      joints: this.joints,
      textLabels: this.textLabels,
      decals: this.decals,
    };
    ws.send(JSON.stringify(initMsg));

    this.broadcast(
      {
        type: 'player_joined',
        player,
      },
      playerId
    );

    this.addSystemMessage(`👋 ${player.name} joined the table.${isFirstPlayer ? ' (Host/Admin)' : ''}`);
    return playerId;
  }

  public handleLeave(playerId: string) {
    const client = this.clients.get(playerId);
    if (!client) return;

    if (client.player.grabbedPieceId) {
      this.physics.releaseGrab(client.player.grabbedPieceId, playerId);
    }

    const name = client.player.name;
    this.clients.delete(playerId);
    this.turns.playerOrder = this.turns.playerOrder.filter((id) => id !== playerId);

    if (this.turns.activePlayerId === playerId && this.turns.playerOrder.length > 0) {
      this.passTurn();
    }

    this.broadcast({
      type: 'player_left',
      playerId,
    });

    this.addSystemMessage(`🚪 ${name} left the room.`);
  }

  public passTurn() {
    const playersList = Array.from(this.clients.values()).map((c) => c.player);
    if (playersList.length === 0) return;

    const currentOrder =
      this.turns.playerOrder.length > 0 ? this.turns.playerOrder : playersList.map((p) => p.id);

    let nextIndex = 0;
    const currentIdx = currentOrder.indexOf(this.turns.activePlayerId);
    if (currentIdx >= 0) {
      if (this.turns.order === 'counter_clockwise') {
        nextIndex = (currentIdx - 1 + currentOrder.length) % currentOrder.length;
      } else {
        nextIndex = (currentIdx + 1) % currentOrder.length;
      }
      if (nextIndex === 0) {
        this.turns.round++;
      }
    }

    const nextPlayerId = currentOrder[nextIndex];
    const nextPlayer = this.clients.get(nextPlayerId)?.player || playersList[0];

    this.turns.activePlayerId = nextPlayer.id;
    this.turns.activePlayerName = nextPlayer.name;
    this.turns.activePlayerColor = nextPlayer.color;
    this.turns.timeRemaining = this.turns.timerSeconds;

    this.broadcast({
      type: 'turns_updated',
      turns: this.turns,
    });
    this.broadcast({
      type: 'sound_event',
      sound: 'turn_chime',
      intensity: 0.9,
    });
    this.addSystemMessage(`🔔 Turn passed to ${nextPlayer.name} (Round ${this.turns.round})`);
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
        if (!this.permissions.physicsInteract) return;
        this.physics.startGrab(msg.pieceId, playerId, msg.targetPosition);
        client.player.grabbedPieceId = msg.pieceId;
        this.broadcast({
          type: 'player_update',
          player: client.player,
        });
        break;
      }

      case 'move_grabbed': {
        if (!this.permissions.physicsInteract) return;
        this.physics.updateGrab(msg.pieceId, playerId, msg.targetPosition, msg.rotation);
        break;
      }

      case 'multi_move_grabbed': {
        if (!this.permissions.physicsInteract) return;
        for (const update of msg.updates) {
          this.physics.updateGrab(update.pieceId, playerId, update.targetPosition);
        }
        break;
      }

      case 'rotate_grabbed': {
        if (!this.permissions.physicsInteract) return;
        this.physics.rotateGrabbed(msg.pieceId, msg.deltaEuler);
        break;
      }

      case 'flip_grabbed': {
        if (!this.permissions.physicsInteract) return;
        this.physics.flipGrabbed(msg.pieceId);
        break;
      }

      case 'release_grabbed': {
        const autoStackResult = this.physics.releaseGrab(msg.pieceId, playerId, msg.velocity, msg.angularVelocity);
        client.player.grabbedPieceId = null;
        this.broadcast({
          type: 'player_update',
          player: client.player,
        });

        if (autoStackResult && autoStackResult.createdDeck) {
          for (const remId of autoStackResult.removedPieceIds) {
            this.broadcast({ type: 'piece_removed', pieceId: remId });
          }
          this.broadcast({ type: 'piece_spawned', piece: autoStackResult.createdDeck });
          this.addSystemMessage(`🎴 Cards stacked into deck (${autoStackResult.createdDeck.metadata?.cards?.length || 2} cards).`);
        }
        break;
      }

      case 'multi_release_grabbed': {
        client.player.grabbedPieceId = null;
        this.broadcast({
          type: 'player_update',
          player: client.player,
        });
        for (const rel of msg.releases) {
          const autoStackResult = this.physics.releaseGrab(rel.pieceId, playerId, rel.velocity);
          if (autoStackResult && autoStackResult.createdDeck) {
            for (const remId of autoStackResult.removedPieceIds) {
              this.broadcast({ type: 'piece_removed', pieceId: remId });
            }
            this.broadcast({ type: 'piece_spawned', piece: autoStackResult.createdDeck });
          }
        }
        break;
      }

      case 'group_pieces': {
        const groupResult = this.physics.groupPieces(msg.pieceIds);
        if (groupResult && groupResult.createdDeck) {
          for (const remId of groupResult.removedPieceIds) {
            this.broadcast({ type: 'piece_removed', pieceId: remId });
          }
          this.broadcast({ type: 'piece_spawned', piece: groupResult.createdDeck });
        }
        this.addSystemMessage(`🎴 ${client.player.name} grouped pieces into a stack.`);
        break;
      }

      case 'stack_pieces': {
        const allIds = [...msg.sourcePieceIds, msg.targetPieceId];
        const stackResult = this.physics.groupPieces(allIds);
        if (stackResult && stackResult.createdDeck) {
          for (const remId of stackResult.removedPieceIds) {
            this.broadcast({ type: 'piece_removed', pieceId: remId });
          }
          this.broadcast({ type: 'piece_spawned', piece: stackResult.createdDeck });
        }
        this.addSystemMessage(`🎴 ${client.player.name} stacked pieces.`);
        break;
      }

      case 'toggle_lock': {
        const isLocked = this.physics.toggleLock(msg.pieceId);
        this.broadcast({
          type: 'piece_locked_toggled',
          pieceId: msg.pieceId,
          isLocked,
        });
        const piece = this.physics.pieceData.get(msg.pieceId);
        this.addSystemMessage(
          `🔒 ${client.player.name} ${isLocked ? 'locked' : 'unlocked'} "${piece?.name || 'piece'}"`
        );
        break;
      }

      case 'flick_piece': {
        if (!this.permissions.physicsInteract) return;
        this.physics.flickPiece(msg.pieceId, msg.impulse);
        break;
      }

      case 'modify_counter': {
        const newVal = this.physics.modifyCounter(msg.pieceId, msg.delta);
        const piece = this.physics.pieceData.get(msg.pieceId);
        if (piece) {
          this.broadcast({
            type: 'piece_spawned',
            piece,
          });
        }
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

      case 'flip_coin': {
        this.physics.flipCoin(msg.pieceId, client.player.name);
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
        if (!this.permissions.tableFlip) {
          this.addSystemMessage(`🚫 Host disabled table flipping.`);
          return;
        }
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
        if (!this.permissions.spawnObjects) return;
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
          imageUrl: msg.piece.imageUrl,
          backImageUrl: msg.piece.backImageUrl,
          isLocked: msg.piece.isLocked,
          description: msg.piece.description,
          tags: msg.piece.tags,
        };

        this.physics.addPiece(pieceData);
        this.broadcast({
          type: 'piece_spawned',
          piece: pieceData,
        });
        break;
      }

      case 'spawn_batch': {
        if (!this.permissions.spawnObjects) return;
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
            imageUrl: p.imageUrl,
            backImageUrl: p.backImageUrl,
            isLocked: p.isLocked,
            description: p.description,
            tags: p.tags,
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
        if (!this.permissions.deleteObjects) return;
        this.physics.removePiece(msg.pieceId);
        this.broadcast({
          type: 'piece_removed',
          pieceId: msg.pieceId,
        });
        break;
      }

      case 'clear_pieces': {
        if (!this.permissions.deleteObjects) return;
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

      // TTS Cut Deck (kb.tabletopsimulator.com/built-in-objects/cards/)
      case 'cut_deck': {
        const deck = this.physics.pieceData.get(msg.pieceId);
        if (deck) {
          const cutPiece: TabletopPieceData = {
            ...deck,
            id: `deck_cut_${Date.now()}`,
            name: `${deck.name} (Cut)`,
            position: {
              x: deck.position.x + 1.8,
              y: deck.position.y,
              z: deck.position.z,
            },
          };
          this.physics.addPiece(cutPiece);
          this.broadcast({
            type: 'piece_spawned',
            piece: cutPiece,
          });
          this.broadcast({
            type: 'sound_event',
            sound: 'card_deal',
            intensity: 0.7,
          });
          this.addSystemMessage(`🃏 ${client.player.name} cut the deck in half.`);
        }
        break;
      }

      // TTS Spread Deck across table
      case 'spread_deck': {
        const deck = this.physics.pieceData.get(msg.pieceId);
        if (deck) {
          const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
          const suits = ['♠', '♥', '♦', '♣'];
          for (let i = 0; i < 8; i++) {
            const r = ranks[i % ranks.length];
            const s = suits[i % suits.length];
            const spreadCard: TabletopPieceData = {
              id: `spread_${Date.now()}_${i}`,
              type: 'card',
              name: `${r}${s}`,
              label: `${r}${s}`,
              position: {
                x: deck.position.x - 3 + i * 0.85,
                y: this.physics.tableConfig.height + 0.2 + i * 0.02,
                z: deck.position.z + 1.2,
              },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
              mass: 0.04,
              color: '#ffffff',
              secondaryColor: s === '♥' || s === '♦' ? '#dc2626' : '#0f172a',
            };
            this.physics.addPiece(spreadCard);
            this.broadcast({
              type: 'piece_spawned',
              piece: spreadCard,
            });
          }
          this.broadcast({
            type: 'sound_event',
            sound: 'card_shuffle',
            intensity: 0.8,
          });
          this.addSystemMessage(`🎴 ${client.player.name} spread cards across the table.`);
        }
        break;
      }

      // TTS Sift / Search Deck & Take Card
      case 'take_card_from_deck': {
        const suit = msg.cardName.slice(-1);
        const cardPiece: TabletopPieceData = {
          id: `taken_${Date.now()}`,
          type: 'card',
          name: msg.cardName,
          label: msg.cardName,
          position: {
            x: client.player.cursor.x,
            y: this.physics.tableConfig.height + 0.6,
            z: client.player.cursor.z,
          },
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
        this.broadcast({
          type: 'sound_event',
          sound: 'card_deal',
          intensity: 0.7,
        });
        this.addSystemMessage(`🔍 ${client.player.name} drew "${msg.cardName}" from the deck.`);
        break;
      }

      // TTS Vector Drawing
      case 'draw_stroke': {
        if (!this.permissions.drawTools) return;
        this.strokes.push(msg.stroke);
        if (this.strokes.length > 500) this.strokes.shift();
        this.broadcast({
          type: 'stroke_added',
          stroke: msg.stroke,
        });
        break;
      }

      case 'clear_strokes': {
        if (!this.permissions.drawTools) return;
        this.strokes = [];
        this.broadcast({
          type: 'strokes_cleared',
        });
        this.addSystemMessage(`🖌️ ${client.player.name} erased all table drawings.`);
        break;
      }

      // TTS Shared Notebook
      case 'update_notebook': {
        const idx = this.notebook.findIndex((e) => e.id === msg.entry.id);
        if (idx >= 0) {
          this.notebook[idx] = msg.entry;
        } else {
          this.notebook.push(msg.entry);
        }
        this.broadcast({
          type: 'notebook_updated',
          entry: msg.entry,
        });
        break;
      }

      // TTS Save & Load Game State
      case 'load_saved_state': {
        this.physics.updateTableConfig(msg.state.tableConfig);
        this.physics.clearPieces();
        for (const p of msg.state.pieces) {
          this.physics.addPiece(p);
        }
        if (msg.state.notebook) {
          this.notebook = msg.state.notebook;
        }
        this.broadcast({
          type: 'table_reset',
          pieces: Array.from(this.physics.pieceData.values()),
        });
        this.broadcast({
          type: 'table_config_updated',
          config: this.physics.tableConfig,
        });
        this.addSystemMessage(`💾 ${client.player.name} loaded a saved game state!`);
        break;
      }

      // TTS Turns System (kb.tabletopsimulator.com/host-guides/turns/)
      case 'pass_turn': {
        this.passTurn();
        break;
      }

      case 'toggle_turns': {
        this.turns.enabled = msg.enabled;
        this.turns.timerRunning = msg.enabled;
        this.turns.timeRemaining = this.turns.timerSeconds;
        this.broadcast({
          type: 'turns_updated',
          turns: this.turns,
        });
        this.addSystemMessage(`⏱️ ${client.player.name} ${msg.enabled ? 'enabled' : 'disabled'} the Turns System.`);
        break;
      }

      case 'set_turn_timer': {
        this.turns.timerSeconds = Math.max(10, Math.min(300, msg.seconds));
        this.turns.timeRemaining = this.turns.timerSeconds;
        this.broadcast({
          type: 'turns_updated',
          turns: this.turns,
        });
        this.addSystemMessage(`⏱️ Turn timer set to ${this.turns.timerSeconds} seconds.`);
        break;
      }

      // TTS Host Permissions (kb.tabletopsimulator.com/host-guides/permissions/)
      case 'update_permissions': {
        if (!client.player.isAdmin) {
          this.addSystemMessage(`🚫 Only Host/Admin can change server permissions.`);
          return;
        }
        Object.assign(this.permissions, msg.permissions);
        this.broadcast({
          type: 'permissions_updated',
          permissions: this.permissions,
        });
        this.addSystemMessage(`🛡️ Server permissions updated by ${client.player.name}.`);
        break;
      }

      case 'promote_player': {
        if (!client.player.isAdmin) return;
        const target = this.clients.get(msg.targetPlayerId);
        if (target) {
          target.player.isAdmin = !target.player.isAdmin;
          this.broadcast({
            type: 'player_update',
            player: target.player,
          });
          this.addSystemMessage(
            `⭐ ${client.player.name} ${target.player.isAdmin ? 'promoted' : 'demoted'} ${target.player.name}.`
          );
        }
        break;
      }

      case 'kick_player': {
        if (!client.player.isAdmin) return;
        const target = this.clients.get(msg.targetPlayerId);
        if (target) {
          target.ws.close();
          this.handleLeave(msg.targetPlayerId);
          this.addSystemMessage(`👢 Host kicked ${target.player.name} from the room.`);
        }
        break;
      }

      case 'toggle_blindfold': {
        const targetId = msg.targetPlayerId || playerId;
        const target = this.clients.get(targetId);
        if (target) {
          target.player.isBlindfolded = !target.player.isBlindfolded;
          this.broadcast({
            type: 'player_update',
            player: target.player,
          });
          this.addSystemMessage(
            `🙈 ${target.player.name} is now ${target.player.isBlindfolded ? 'blindfolded' : 'un-blindfolded'}.`
          );
        }
        break;
      }

      // TTS Digital Clock / Stopwatch (kb.tabletopsimulator.com/built-in-objects/digital-clock/)
      case 'clock_action': {
        if (msg.action === 'start') {
          this.clock.running = true;
        } else if (msg.action === 'pause') {
          this.clock.running = false;
        } else if (msg.action === 'reset') {
          this.clock.running = false;
          this.clock.seconds = this.clock.initialSeconds;
        } else if (msg.action === 'set_mode') {
          this.clock.mode = msg.mode || 'stopwatch';
          this.clock.initialSeconds = msg.seconds || 0;
          this.clock.seconds = this.clock.initialSeconds;
          this.clock.running = false;
        }
        this.broadcast({
          type: 'clock_updated',
          clock: this.clock,
        });
        break;
      }

      // TTS Snap Points (kb.tabletopsimulator.com/game-tools/snap-points-and-joints/)
      case 'add_snap_point': {
        this.snapPoints.push(msg.snapPoint);
        this.physics.addSnapPoint(msg.snapPoint);
        this.broadcast({
          type: 'snap_points_updated',
          snapPoints: this.snapPoints,
        });
        break;
      }

      case 'remove_snap_point': {
        this.snapPoints = this.snapPoints.filter((s) => s.id !== msg.snapPointId);
        this.physics.removeSnapPoint(msg.snapPointId);
        this.broadcast({
          type: 'snap_points_updated',
          snapPoints: this.snapPoints,
        });
        break;
      }

      // TTS Joints (Fixed, Spring, Hinge)
      case 'add_joint': {
        this.joints.push(msg.joint);
        this.physics.addJoint(msg.joint);
        this.broadcast({
          type: 'joints_updated',
          joints: this.joints,
        });
        break;
      }

      case 'remove_joint': {
        this.joints = this.joints.filter((j) => j.id !== msg.jointId);
        this.physics.removeJoint(msg.jointId);
        this.broadcast({
          type: 'joints_updated',
          joints: this.joints,
        });
        break;
      }

      // TTS 3D Text Labels (kb.tabletopsimulator.com/game-tools/text-and-decals/)
      case 'add_text_label': {
        this.textLabels.push(msg.textLabel);
        this.broadcast({
          type: 'text_labels_updated',
          textLabels: this.textLabels,
        });
        break;
      }

      case 'remove_text_label': {
        this.textLabels = this.textLabels.filter((l) => l.id !== msg.textLabelId);
        this.broadcast({
          type: 'text_labels_updated',
          textLabels: this.textLabels,
        });
        break;
      }

      // TTS Decals (kb.tabletopsimulator.com/game-tools/text-and-decals/)
      case 'add_decal': {
        this.decals.push(msg.decal);
        this.broadcast({
          type: 'decals_updated',
          decals: this.decals,
        });
        break;
      }

      case 'remove_decal': {
        this.decals = this.decals.filter((d) => d.id !== msg.decalId);
        this.broadcast({
          type: 'decals_updated',
          decals: this.decals,
        });
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
        if (!client.player.isAdmin && !this.permissions.changeSettings) {
          this.addSystemMessage(`🚫 Only Host can change table settings.`);
          return;
        }
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
