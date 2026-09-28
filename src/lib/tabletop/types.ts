/**
 * Tabletop Nexus - Core Types & Protocol Definition
 * Complete Tabletop Simulator Knowledge Base Feature Implementation
 */

export type PieceShapeType =
  | 'dice_d6'
  | 'dice_d20'
  | 'dice_d4'
  | 'dice_d8'
  | 'dice_d10'
  | 'dice_d12'
  | 'dice_fate'
  | 'coin'
  | 'card'
  | 'card_deck'
  | 'poker_chip'
  | 'pawn'
  | 'meeple'
  | 'domino'
  | 'chess_piece'
  | 'checker'
  | 'block'
  | 'counter'
  | 'custom_token'
  | 'custom_model'
  | 'text_label'
  | 'tablet';

export type ToolMode =
  | 'grab'        // F1 Hand & Select Tool
  | 'paint'       // F2 Drawing & Vector Lines
  | 'ruler'       // F3 Line & Measurement
  | 'flick'       // F4 Physics Flick
  | 'joint'       // F5 Joints (Fixed, Spring, Hinge)
  | 'snap_points' // F6 Points & Snap Points
  | 'zones'       // F7 Hands, Hidden & Randomize Zones
  | 'text'        // F8 3D Text Tool
  | 'gizmo'       // F9 Transform Gizmo
  | 'decal'       // F10 Decal Stamp Tool
  | 'grid'
  | 'counter';

export type EnvironmentTheme =
  | 'studio'
  | 'tavern'
  | 'space'
  | 'penthouse'
  | 'forest'
  | 'dungeon'
  | 'arena';

export type PhysicsMode = 'full' | 'semi-persistent' | 'locked';

export type JointType = 'fixed' | 'spring' | 'hinge';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates realistic card deck height based on card count.
 * 1 card: ~0.008 units (~0.4mm in physical scale)
 * 2 cards: ~0.015 units (thin like 2 real cards, NOT a 100-card block!)
 * 52 cards: ~0.265 units (~1.4cm standard poker deck)
 * 100 cards: ~0.505 units
 */
export function calculateDeckHeight(cardCount: number): number {
  if (cardCount <= 1) return 0.008;
  if (cardCount === 2) return 0.015;
  return Math.max(0.015, Math.min(0.65, 0.015 + (cardCount - 2) * 0.005));
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
  value?: number; // Dice face, chip value, or counter number
  isSleeping?: boolean;
  grabbedBy?: string | null;
  isLocked?: boolean; // TTS 'L' lock/pin feature
  imageUrl?: string;  // Custom image token / card front
  backImageUrl?: string; // Custom card back
  metadata?: Record<string, any>;
  dimensions?: Vector3D;
  tags?: string[];
  description?: string;
}

export interface CompactPieceUpdate {
  id: string;
  p: [number, number, number]; // Position [x, y, z]
  r: [number, number, number, number]; // Quaternion [x, y, z, w]
  v?: [number, number, number];
  s?: boolean; // isSleeping
  g?: string | null; // grabbedBy
  l?: boolean; // isLocked
  val?: number;
}

export interface GridConfig {
  enabled: boolean;
  type: 'square' | 'hex';
  size: number; // grid spacing
  snap: boolean; // auto-snap on release
  color: string;
  opacity: number;
}

export interface HandZone {
  id: string;
  playerId: string;
  seatColor: string;
  position: Vector3D;
  rotationY: number;
  width: number;
  depth: number;
}

export interface HiddenZone {
  id: string;
  ownerColor: string; // only this seat color can see inside, others see fog
  position: Vector3D;
  width: number;
  depth: number;
  height: number;
}

export interface SnapPoint {
  id: string;
  position: Vector3D;
  rotationY: number;
  snapRadius: number;
  tags?: string[];
}

export interface JointData {
  id: string;
  pieceIdA: string;
  pieceIdB: string;
  type: JointType;
  strength?: number;
}

export interface TextLabel {
  id: string;
  text: string;
  position: Vector3D;
  rotationY: number;
  fontSize: number;
  color: string;
  bgColor?: string;
}

export interface DecalData {
  id: string;
  position: Vector3D;
  size: number;
  rotationY: number;
  imageUrl: string;
  label?: string;
}

export interface DrawingStroke {
  id: string;
  color: string;
  size: number;
  points: [number, number][]; // Table X, Z coords
  isStraightLine?: boolean;
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
  environment: EnvironmentTheme;
  grid: GridConfig;
  customBoardImageUrl?: string;
  physicsMode?: PhysicsMode;
  restitution?: number;
}

export interface HostPermissions {
  tableFlip: boolean;
  spawnObjects: boolean;
  deleteObjects: boolean;
  drawTools: boolean;
  physicsInteract: boolean;
  contextMenu: boolean;
  changeSettings: boolean;
}

export interface TurnState {
  enabled: boolean;
  activePlayerId: string;
  activePlayerName: string;
  activePlayerColor: string;
  round: number;
  timerSeconds: number;
  timerRunning: boolean;
  timeRemaining: number;
  order: 'clockwise' | 'counter_clockwise' | 'custom';
  playerOrder: string[];
}

export interface ClockState {
  mode: 'stopwatch' | 'countdown';
  running: boolean;
  seconds: number;
  initialSeconds: number;
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
  handZoneId?: string;
  isAdmin?: boolean;
  isBlindfolded?: boolean;
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

export interface NotebookEntry {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  updatedBy: string;
  isLocked?: boolean;
}

export interface CameraBookmark {
  index: number; // 1 to 4
  target: Vector3D;
  spherical: { radius: number; theta: number; phi: number };
}

// Client to Server Message Protocol
export type ClientMessage =
  | { type: 'join'; roomId: string; playerName: string; playerColor?: string }
  | { type: 'pointer_move'; cursor: Vector3D; isPointerActive?: boolean }
  | { type: 'grab'; pieceId: string; targetPosition: Vector3D }
  | { type: 'move_grabbed'; pieceId: string; targetPosition: Vector3D; rotation?: Quaternion4D }
  | { type: 'multi_move_grabbed'; updates: Array<{ pieceId: string; targetPosition: Vector3D }> }
  | { type: 'rotate_grabbed'; pieceId: string; deltaEuler: Vector3D }
  | { type: 'flip_grabbed'; pieceId: string }
  | { type: 'release_grabbed'; pieceId: string; velocity?: Vector3D; angularVelocity?: Vector3D }
  | { type: 'multi_release_grabbed'; releases: Array<{ pieceId: string; velocity?: Vector3D }> }
  | { type: 'toggle_lock'; pieceId: string } // TTS 'L' key
  | { type: 'flick_piece'; pieceId: string; impulse: Vector3D } // TTS Flick tool
  | { type: 'roll_dice'; pieceId: string; forceMultiplier?: number }
  | { type: 'roll_all_dice' }
  | { type: 'flip_coin'; pieceId: string }
  | { type: 'impulse'; pieceId: string; impulse: Vector3D; point?: Vector3D }
  | { type: 'flip_table'; force?: number }
  | { type: 'reset_table' }
  | { type: 'spawn_piece'; piece: Partial<TabletopPieceData> & { type: PieceShapeType } }
  | { type: 'spawn_batch'; pieces: Array<Partial<TabletopPieceData> & { type: PieceShapeType }> }
  | { type: 'remove_piece'; pieceId: string }
  | { type: 'clear_pieces' }
  | { type: 'load_preset'; presetName: string }
  | { type: 'group_pieces'; pieceIds: string[] } // TTS 'G' Group key
  | { type: 'stack_pieces'; sourcePieceIds: string[]; targetPieceId: string } // TTS Drop Stacking
  | { type: 'modify_counter'; pieceId: string; delta: number } // TTS Counter +/-
  | { type: 'shuffle_deck'; pieceId: string }
  | { type: 'deal_cards'; count: number; targetPlayerId?: string }
  | { type: 'cut_deck'; pieceId: string }
  | { type: 'spread_deck'; pieceId: string }
  | { type: 'take_card_from_deck'; deckId: string; cardName: string }
  | { type: 'draw_stroke'; stroke: DrawingStroke } // TTS Vector Paint
  | { type: 'clear_strokes' }
  | { type: 'update_notebook'; entry: NotebookEntry } // TTS Notebook
  | { type: 'ping'; position: Vector3D }
  | { type: 'chat'; text: string }
  | { type: 'update_table_config'; config: Partial<TableConfig> }
  | { type: 'load_saved_state'; state: { pieces: TabletopPieceData[]; tableConfig: TableConfig; notebook?: NotebookEntry[] } }
  // Knowledge Base Host & Game Features
  | { type: 'pass_turn' }
  | { type: 'toggle_turns'; enabled: boolean }
  | { type: 'set_turn_timer'; seconds: number }
  | { type: 'update_permissions'; permissions: Partial<HostPermissions> }
  | { type: 'promote_player'; targetPlayerId: string }
  | { type: 'kick_player'; targetPlayerId: string }
  | { type: 'toggle_blindfold'; targetPlayerId?: string }
  | { type: 'clock_action'; action: 'start' | 'pause' | 'reset' | 'set_mode'; mode?: 'stopwatch' | 'countdown'; seconds?: number }
  | { type: 'add_snap_point'; snapPoint: SnapPoint }
  | { type: 'remove_snap_point'; snapPointId: string }
  | { type: 'add_joint'; joint: JointData }
  | { type: 'remove_joint'; jointId: string }
  | { type: 'add_text_label'; textLabel: TextLabel }
  | { type: 'remove_text_label'; textLabelId: string }
  | { type: 'add_decal'; decal: DecalData }
  | { type: 'remove_decal'; decalId: string };

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
      strokes: DrawingStroke[];
      notebook: NotebookEntry[];
      permissions: HostPermissions;
      turns: TurnState;
      clock: ClockState;
      snapPoints: SnapPoint[];
      joints: JointData[];
      textLabels: TextLabel[];
      decals: DecalData[];
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
      type: 'piece_locked_toggled';
      pieceId: string;
      isLocked: boolean;
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
      sound:
        | 'dice_clatter'
        | 'card_deal'
        | 'card_shuffle'
        | 'chip_clink'
        | 'table_flip'
        | 'wood_knock'
        | 'ping'
        | 'flick'
        | 'lock'
        | 'turn_chime'
        | 'timer_tick'
        | 'timer_alarm'
        | 'joint_snap';
      intensity?: number;
      position?: Vector3D;
    }
  | {
      type: 'stroke_added';
      stroke: DrawingStroke;
    }
  | {
      type: 'strokes_cleared';
    }
  | {
      type: 'notebook_updated';
      entry: NotebookEntry;
    }
  | {
      type: 'table_config_updated';
      config: TableConfig;
    }
  | {
      type: 'permissions_updated';
      permissions: HostPermissions;
    }
  | {
      type: 'turns_updated';
      turns: TurnState;
    }
  | {
      type: 'clock_updated';
      clock: ClockState;
    }
  | {
      type: 'snap_points_updated';
      snapPoints: SnapPoint[];
    }
  | {
      type: 'joints_updated';
      joints: JointData[];
    }
  | {
      type: 'text_labels_updated';
      textLabels: TextLabel[];
    }
  | {
      type: 'decals_updated';
      decals: DecalData[];
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
