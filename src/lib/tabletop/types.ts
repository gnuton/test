/**
 * Tabletop Nexus - Core Types & Protocol Definition
 * Pluggable 3D Tabletop Simulator with Server-Authoritative Physics
 */

export type PieceShapeType =
  | 'dice_d6'
  | 'dice_d20'
  | 'dice_d4'
  | 'dice_d8'
  | 'dice_d10'
  | 'dice_d12'
  | 'card'
  | 'card_deck'
  | 'poker_chip'
  | 'pawn'
  | 'meeple'
  | 'domino'
  | 'chess_piece'
  | 'checker'
  | 'block';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface TabletopPieceData {
  id: string;
  type: PieceShapeType;
  name: string;
  position: Vector3D;
  rotation: Quaternion4D;
  velocity?: Vector3D;
  angularVelocity?: Vector3D;
  mass: number;
  friction?: number;
  restitution?: number;
  color?: string;
  secondaryColor?: string;
  label?: string;
  value?: number; // Dice current face or chip value
  isSleeping?: boolean;
  grabbedBy?: string | null; // Player ID holding this piece
  metadata?: Record<string, any>;
  dimensions?: Vector3D;
}

export interface CompactPieceUpdate {
  id: string;
  p: [number, number, number]; // Position [x, y, z] rounded
  r: [number, number, number, number]; // Quaternion [x, y, z, w] rounded
  v?: [number, number, number]; // Velocity
  s?: boolean; // isSleeping
  g?: string | null; // grabbedBy
  val?: number; // face value or state
}

export interface TableConfig {
  shape: 'rectangular' | 'oval' | 'hexagonal';
  width: number;
  length: number;
  height: number;
  feltColor: string;
  woodColor: string;
  hasRim: boolean;
  gravity: number;
}

export interface PlayerPresence {
  id: string;
  name: string;
  color: string;
  cursor: Vector3D;
  isPointerActive?: boolean;
  grabbedPieceId?: string | null;
  ping?: Vector3D | null;
  seatIndex: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// Client to Server Message Protocol
export type ClientMessage =
  | { type: 'join'; roomId: string; playerName: string; playerColor?: string }
  | { type: 'pointer_move'; cursor: Vector3D; isPointerActive?: boolean }
  | { type: 'grab'; pieceId: string; targetPosition: Vector3D }
  | { type: 'move_grabbed'; pieceId: string; targetPosition: Vector3D; rotation?: Quaternion4D }
  | { type: 'rotate_grabbed'; pieceId: string; deltaEuler: Vector3D }
  | { type: 'flip_grabbed'; pieceId: string }
  | { type: 'release_grabbed'; pieceId: string; velocity?: Vector3D; angularVelocity?: Vector3D }
  | { type: 'roll_dice'; pieceId: string; forceMultiplier?: number }
  | { type: 'roll_all_dice' }
  | { type: 'impulse'; pieceId: string; impulse: Vector3D; point?: Vector3D }
  | { type: 'flip_table'; force?: number }
  | { type: 'reset_table' }
  | { type: 'spawn_piece'; piece: Partial<TabletopPieceData> & { type: PieceShapeType } }
  | { type: 'spawn_batch'; pieces: Array<Partial<TabletopPieceData> & { type: PieceShapeType }> }
  | { type: 'remove_piece'; pieceId: string }
  | { type: 'clear_pieces' }
  | { type: 'load_preset'; presetName: string }
  | { type: 'shuffle_deck'; pieceId: string }
  | { type: 'deal_cards'; count: number; targetPlayerId?: string }
  | { type: 'ping'; position: Vector3D }
  | { type: 'chat'; text: string }
  | { type: 'update_table_config'; config: Partial<TableConfig> };

// Server to Client Message Protocol
export type ServerMessage =
  | {
      type: 'init';
      playerId: string;
      roomId: string;
      pieces: TabletopPieceData[];
      tableConfig: TableConfig;
      players: PlayerPresence[];
      messages: ChatMessage[];
    }
  | {
      type: 'physics_tick';
      updates: CompactPieceUpdate[];
      timestamp: number;
    }
  | {
      type: 'player_joined';
      player: PlayerPresence;
    }
  | {
      type: 'player_left';
      playerId: string;
    }
  | {
      type: 'player_update';
      player: PlayerPresence;
    }
  | {
      type: 'piece_spawned';
      piece: TabletopPieceData;
    }
  | {
      type: 'piece_removed';
      pieceId: string;
    }
  | {
      type: 'pieces_cleared';
    }
  | {
      type: 'table_flipped';
      force: number;
    }
  | {
      type: 'table_reset';
      pieces: TabletopPieceData[];
    }
  | {
      type: 'dice_settled';
      pieceId: string;
      value: number;
      diceType: PieceShapeType;
      rollerName?: string;
    }
  | {
      type: 'sound_event';
      sound: 'dice_clatter' | 'card_deal' | 'card_shuffle' | 'chip_clink' | 'table_flip' | 'wood_knock' | 'ping';
      intensity?: number;
      position?: Vector3D;
    }
  | {
      type: 'table_config_updated';
      config: TableConfig;
    }
  | {
      type: 'chat_broadcast';
      message: ChatMessage;
    }
  | {
      type: 'ping_event';
      playerId: string;
      playerName: string;
      playerColor: string;
      position: Vector3D;
    };
