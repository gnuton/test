/**
 * Tabletop Nexus - Server-Authoritative Physics World
 * Powered by cannon-es with Tabletop Simulator features
 */

import * as CANNON from 'cannon-es';
import {
  TabletopPieceData,
  CompactPieceUpdate,
  TableConfig,
  Vector3D,
  Quaternion4D,
  PieceShapeType,
  SnapPoint,
  JointData,
  calculateDeckHeight
} from '../types.js';

interface GrabState {
  pieceId: string;
  playerId: string;
  targetPos: CANNON.Vec3;
  targetRot: CANNON.Quaternion;
  lastPos: CANNON.Vec3;
  lastTime: number;
}

export class TabletopPhysicsWorld {
  public world: CANNON.World;
  public bodies = new Map<string, CANNON.Body>();
  public pieceData = new Map<string, TabletopPieceData>();
  public grabs = new Map<string, GrabState>();
  public tableConfig: TableConfig;
  public snapPoints = new Map<string, SnapPoint>();
  public joints = new Map<string, { data: JointData; constraint: CANNON.Constraint }>();

  private tableBody: CANNON.Body | null = null;
  private rimBodies: CANNON.Body[] = [];
  private invisibleBoundaryBodies: CANNON.Body[] = [];
  private floorBody: CANNON.Body | null = null;

  // Dice roll tracking
  private rollingDice = new Set<string>();
  private diceRollStartTimes = new Map<string, number>();
  private onDiceSettledCallback?: (pieceId: string, value: number, type: PieceShapeType, rollerName?: string) => void;
  private onSoundEventCallback?: (
    sound:
      | 'dice_clatter'
      | 'card_deal'
      | 'chip_clink'
      | 'wood_knock'
      | 'table_flip'
      | 'flick'
      | 'lock'
      | 'turn_chime'
      | 'timer_tick'
      | 'timer_alarm'
      | 'joint_snap',
    intensity: number,
    pos?: Vector3D
  ) => void;

  // Materials
  private feltMaterial: CANNON.Material;
  private woodMaterial: CANNON.Material;
  private diceMaterial: CANNON.Material;
  private cardMaterial: CANNON.Material;
  private chipMaterial: CANNON.Material;
  private boundaryMaterial: CANNON.Material;

  constructor(tableConfig: TableConfig) {
    this.tableConfig = tableConfig;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -tableConfig.gravity, 0),
    });

    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as any).iterations = 25;
    (this.world.solver as any).tolerance = 0.001;
    this.world.allowSleep = true;

    // Initialize materials
    this.feltMaterial = new CANNON.Material('felt');
    this.woodMaterial = new CANNON.Material('wood');
    this.diceMaterial = new CANNON.Material('dice');
    this.cardMaterial = new CANNON.Material('card');
    this.chipMaterial = new CANNON.Material('chip');

    // Contact Materials (Rigid contact stiffness, zero restitution on stacked items to eliminate jitter)
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.feltMaterial, {
        friction: 0.4,
        restitution: 0.35,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
        friction: 0.35,
        restitution: 0.4,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.chipMaterial, {
        friction: 0.9,
        restitution: 0.0, // Zero restitution prevents poker token bouncing
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e8,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.feltMaterial, {
        friction: 0.75,
        restitution: 0.05,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cardMaterial, this.feltMaterial, {
        friction: 0.7,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cardMaterial, this.cardMaterial, {
        friction: 0.85,
        restitution: 0.0, // Zero restitution prevents card oscillation
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e8,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.cardMaterial, {
        friction: 0.85,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.woodMaterial, this.cardMaterial, {
        friction: 0.8,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.woodMaterial, this.chipMaterial, {
        friction: 0.8,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      })
    );

    // Invisible boundary box material and contacts
    this.boundaryMaterial = new CANNON.Material('invisible_boundary');
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.boundaryMaterial, {
        friction: 0.2,
        restitution: 0.35,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cardMaterial, this.boundaryMaterial, {
        friction: 0.3,
        restitution: 0.08,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.boundaryMaterial, {
        friction: 0.3,
        restitution: 0.2,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.woodMaterial, this.boundaryMaterial, {
        friction: 0.25,
        restitution: 0.2,
      })
    );

    this.setupTableAndBoundaries();
  }

  public setCallbacks(callbacks: {
    onDiceSettled?: (pieceId: string, value: number, type: PieceShapeType, rollerName?: string) => void;
    onSoundEvent?: (
      sound:
        | 'dice_clatter'
        | 'card_deal'
        | 'chip_clink'
        | 'wood_knock'
        | 'table_flip'
        | 'flick'
        | 'lock'
        | 'turn_chime'
        | 'timer_tick'
        | 'timer_alarm'
        | 'joint_snap',
      intensity: number,
      pos?: Vector3D
    ) => void;
  }) {
    this.onDiceSettledCallback = callbacks.onDiceSettled;
    this.onSoundEventCallback = callbacks.onSoundEvent;
  }

  public addSnapPoint(snapPoint: SnapPoint) {
    this.snapPoints.set(snapPoint.id, snapPoint);
  }

  public removeSnapPoint(snapPointId: string) {
    this.snapPoints.delete(snapPointId);
  }

  public addJoint(joint: JointData) {
    const bodyA = this.bodies.get(joint.pieceIdA);
    const bodyB = this.bodies.get(joint.pieceIdB);
    if (!bodyA || !bodyB) return;

    if (this.joints.has(joint.id)) {
      this.removeJoint(joint.id);
    }

    bodyA.wakeUp();
    bodyB.wakeUp();

    let constraint: CANNON.Constraint;
    if (joint.type === 'fixed') {
      constraint = new CANNON.LockConstraint(bodyA, bodyB);
    } else if (joint.type === 'spring') {
      constraint = new CANNON.DistanceConstraint(bodyA, bodyB, bodyA.position.distanceTo(bodyB.position));
    } else {
      constraint = new CANNON.PointToPointConstraint(
        bodyA,
        new CANNON.Vec3(0, 0, 0),
        bodyB,
        bodyB.pointToLocalFrame(bodyA.position)
      );
    }

    this.world.addConstraint(constraint);
    this.joints.set(joint.id, { data: joint, constraint });
    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('joint_snap', 0.8, {
        x: (bodyA.position.x + bodyB.position.x) / 2,
        y: (bodyA.position.y + bodyB.position.y) / 2,
        z: (bodyA.position.z + bodyB.position.z) / 2,
      });
    }
  }

  public removeJoint(jointId: string) {
    const j = this.joints.get(jointId);
    if (j) {
      this.world.removeConstraint(j.constraint);
      this.joints.delete(jointId);
    }
  }

  public updateTableConfig(newConfig: Partial<TableConfig>) {
    Object.assign(this.tableConfig, newConfig);
    if (newConfig.gravity !== undefined) {
      this.world.gravity.set(0, -this.tableConfig.gravity, 0);
    }
    this.setupTableAndBoundaries();
  }

  private setupTableAndBoundaries() {
    if (this.tableBody) {
      this.world.removeBody(this.tableBody);
      this.tableBody = null;
    }
    for (const rim of this.rimBodies) {
      this.world.removeBody(rim);
    }
    this.rimBodies = [];
    for (const bound of this.invisibleBoundaryBodies) {
      this.world.removeBody(bound);
    }
    this.invisibleBoundaryBodies = [];
    if (this.floorBody) {
      this.world.removeBody(this.floorBody);
      this.floorBody = null;
    }

    const { width, length, height, hasRim } = this.tableConfig;
    const tableThickness = 0.5;
    const tableY = height;

    const tableShape = new CANNON.Box(new CANNON.Vec3(width / 2, tableThickness / 2, length / 2));
    this.tableBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.STATIC,
      material: this.feltMaterial,
      position: new CANNON.Vec3(0, tableY - tableThickness / 2, 0),
    });
    this.tableBody.addShape(tableShape);
    this.world.addBody(this.tableBody);

    if (hasRim) {
      const rimHeight = 0.4;
      const rimThickness = 0.2;
      const rimY = tableY + rimHeight / 2;

      // North rim (+Z)
      const northRim = new CANNON.Body({ mass: 0, material: this.woodMaterial });
      northRim.addShape(new CANNON.Box(new CANNON.Vec3(width / 2 + rimThickness, rimHeight / 2, rimThickness / 2)));
      northRim.position.set(0, rimY, length / 2 + rimThickness / 2);
      this.world.addBody(northRim);
      this.rimBodies.push(northRim);

      // South rim (-Z)
      const southRim = new CANNON.Body({ mass: 0, material: this.woodMaterial });
      southRim.addShape(new CANNON.Box(new CANNON.Vec3(width / 2 + rimThickness, rimHeight / 2, rimThickness / 2)));
      southRim.position.set(0, rimY, -length / 2 - rimThickness / 2);
      this.world.addBody(southRim);
      this.rimBodies.push(southRim);

      // East rim (+X)
      const eastRim = new CANNON.Body({ mass: 0, material: this.woodMaterial });
      eastRim.addShape(new CANNON.Box(new CANNON.Vec3(rimThickness / 2, rimHeight / 2, length / 2)));
      eastRim.position.set(width / 2 + rimThickness / 2, rimY, 0);
      this.world.addBody(eastRim);
      this.rimBodies.push(eastRim);

      // West rim (-X)
      const westRim = new CANNON.Body({ mass: 0, material: this.woodMaterial });
      westRim.addShape(new CANNON.Box(new CANNON.Vec3(rimThickness / 2, rimHeight / 2, length / 2)));
      westRim.position.set(-width / 2 - rimThickness / 2, rimY, 0);
      this.world.addBody(westRim);
      this.rimBodies.push(westRim);
    }

    // Invisible Bounding Box around the table (4 vertical walls + 1 ceiling)
    // Ensures NO pieces can fly outside the table enclosure!
    const boxHeight = 4.2;
    const wallThickness = 0.6;
    const halfW = width / 2;
    const halfL = length / 2;
    const wallCenterY = tableY + boxHeight / 2;

    // Invisible North Wall (+Z)
    const northWall = new CANNON.Body({ mass: 0, material: this.boundaryMaterial });
    northWall.addShape(new CANNON.Box(new CANNON.Vec3(halfW + wallThickness, boxHeight / 2, wallThickness / 2)));
    northWall.position.set(0, wallCenterY, halfL + wallThickness / 2);
    this.world.addBody(northWall);
    this.invisibleBoundaryBodies.push(northWall);

    // Invisible South Wall (-Z)
    const southWall = new CANNON.Body({ mass: 0, material: this.boundaryMaterial });
    southWall.addShape(new CANNON.Box(new CANNON.Vec3(halfW + wallThickness, boxHeight / 2, wallThickness / 2)));
    southWall.position.set(0, wallCenterY, -halfL - wallThickness / 2);
    this.world.addBody(southWall);
    this.invisibleBoundaryBodies.push(southWall);

    // Invisible East Wall (+X)
    const eastWall = new CANNON.Body({ mass: 0, material: this.boundaryMaterial });
    eastWall.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness / 2, boxHeight / 2, halfL + wallThickness)));
    eastWall.position.set(halfW + wallThickness / 2, wallCenterY, 0);
    this.world.addBody(eastWall);
    this.invisibleBoundaryBodies.push(eastWall);

    // Invisible West Wall (-X)
    const westWall = new CANNON.Body({ mass: 0, material: this.boundaryMaterial });
    westWall.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness / 2, boxHeight / 2, halfL + wallThickness)));
    westWall.position.set(-halfW - wallThickness / 2, wallCenterY, 0);
    this.world.addBody(westWall);
    this.invisibleBoundaryBodies.push(westWall);

    // Invisible Ceiling (+Y)
    const ceiling = new CANNON.Body({ mass: 0, material: this.boundaryMaterial });
    ceiling.addShape(new CANNON.Box(new CANNON.Vec3(halfW + wallThickness, wallThickness / 2, halfL + wallThickness)));
    ceiling.position.set(0, tableY + boxHeight + wallThickness / 2, 0);
    this.world.addBody(ceiling);
    this.invisibleBoundaryBodies.push(ceiling);

    const floorShape = new CANNON.Plane();
    this.floorBody = new CANNON.Body({ mass: 0 });
    this.floorBody.addShape(floorShape);
    this.floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.floorBody.position.set(0, -3, 0);
    this.world.addBody(this.floorBody);
  }

  public addPiece(data: TabletopPieceData): CANNON.Body {
    if (this.bodies.has(data.id)) {
      this.removePiece(data.id);
    }

    const body = this.createCannonBody(data);
    this.world.addBody(body);
    this.bodies.set(data.id, body);
    this.pieceData.set(data.id, { ...data });

    body.addEventListener('collide', (e: any) => {
      const relVelocity = e.contact ? e.contact.getImpactVelocityAlongNormal() : 0;
      if (Math.abs(relVelocity) > 0.8 && this.onSoundEventCallback) {
        let soundType: 'dice_clatter' | 'card_deal' | 'chip_clink' | 'wood_knock' = 'wood_knock';
        if (data.type.startsWith('dice_')) soundType = 'dice_clatter';
        else if (data.type === 'poker_chip') soundType = 'chip_clink';
        else if (data.type === 'card') soundType = 'card_deal';

        const intensity = Math.min(1, Math.abs(relVelocity) / 6);
        this.onSoundEventCallback(soundType, intensity, {
          x: body.position.x,
          y: body.position.y,
          z: body.position.z,
        });
      }
    });

    return body;
  }

  // Wake up any pieces that were resting directly on top of or adjacent to a removed/grabbed piece
  public wakeUpRestingPiecesAbove(pieceId: string) {
    const body = this.bodies.get(pieceId);
    if (!body) return;
    const pos = body.position;
    const piece = this.pieceData.get(pieceId);
    const dims = piece?.dimensions || (piece ? this.getDefaultDimensions(piece.type, piece) : { x: 1, y: 0.1, z: 1 });
    const radiusSq = Math.max(1.5, dims.x * dims.x + dims.z * dims.z);

    for (const [otherId, otherBody] of this.bodies.entries()) {
      if (otherId === pieceId) continue;
      const otherPiece = this.pieceData.get(otherId);
      if (otherPiece?.isLocked) continue;

      const dx = otherBody.position.x - pos.x;
      const dz = otherBody.position.z - pos.z;
      const distSq = dx * dx + dz * dz;

      // If other piece is directly above or immediately touching
      if (distSq < radiusSq && otherBody.position.y >= pos.y - 0.02) {
        otherBody.wakeUp();
        if (otherBody.type !== CANNON.Body.KINEMATIC) {
          otherBody.type = CANNON.Body.DYNAMIC;
          if (otherBody.velocity.y >= 0) {
            otherBody.velocity.y = -0.15; // prompt immediate gravity acceleration to fall
          }
        }
      }
    }
  }

  public removePiece(id: string) {
    this.wakeUpRestingPiecesAbove(id);
    const body = this.bodies.get(id);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
    }
    this.pieceData.delete(id);
    this.grabs.delete(id);
    this.rollingDice.delete(id);
    this.diceRollStartTimes.delete(id);
  }

  public clearPieces() {
    for (const [id, body] of this.bodies.entries()) {
      this.world.removeBody(body);
    }
    this.bodies.clear();
    this.pieceData.clear();
    this.grabs.clear();
    this.rollingDice.clear();
    this.diceRollStartTimes.clear();
  }

  // TTS 'L' Key: Toggle Lock / Pin piece in place
  public toggleLock(pieceId: string): boolean {
    const piece = this.pieceData.get(pieceId);
    const body = this.bodies.get(pieceId);
    if (!piece || !body) return false;

    piece.isLocked = !piece.isLocked;

    if (piece.isLocked) {
      body.type = CANNON.Body.STATIC;
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
      if (this.onSoundEventCallback) {
        this.onSoundEventCallback('lock', 0.8, piece.position);
      }
    } else {
      body.type = CANNON.Body.DYNAMIC;
      body.wakeUp();
      if (this.onSoundEventCallback) {
        this.onSoundEventCallback('lock', 0.8, piece.position);
      }
    }
    return piece.isLocked;
  }

  // TTS Flick Tool
  public flickPiece(pieceId: string, impulse: Vector3D) {
    const body = this.bodies.get(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (!body || !piece || piece.isLocked) return;

    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();

    body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z));
    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('flick', 0.9, piece.position);
    }
  }

  // TTS Counter +/-
  public modifyCounter(pieceId: string, delta: number): number {
    const piece = this.pieceData.get(pieceId);
    if (!piece) return 0;
    piece.value = (piece.value || 0) + delta;
    return piece.value;
  }

  // Helper to determine if a piece's local face normal (+Y) is pointing upwards in world space
  private isPieceFaceUp(rotation?: Quaternion4D): boolean {
    if (!rotation) return true;
    const dotUp = 1 - 2 * (rotation.x * rotation.x + rotation.z * rotation.z);
    return dotUp > 0;
  }

  // TTS 'G' Grouping: Stack cards into decks, or stack chips vertically
  public groupPieces(pieceIds: string[]): { createdDeck?: TabletopPieceData; removedPieceIds: string[] } {
    if (pieceIds.length < 2) return { removedPieceIds: [] };
    const validPieces = pieceIds
      .map((id) => this.pieceData.get(id))
      .filter((p): p is TabletopPieceData => !!p);
    if (validPieces.length < 2) return { removedPieceIds: [] };

    const firstPiece = validPieces[0];
    const baseX = firstPiece.position.x;
    const baseZ = firstPiece.position.z;
    const baseY = this.tableConfig.height + 0.25;

    const areCards = validPieces.every((p) => p.type === 'card' || p.type === 'card_deck');

    if (areCards) {
      // Find which card is on top (highest Y position or last piece)
      const topPiece = validPieces.reduce((prev, curr) => (curr.position.y > prev.position.y ? curr : prev), validPieces[0]);
      // If ANY card in the stack was face-up, keep the resulting stack face-up!
      const anyFaceUp = validPieces.some(p => this.isPieceFaceUp(p.rotation) || p.metadata?.isFaceUp === true);
      const topIsFaceUp = anyFaceUp || this.isPieceFaceUp(topPiece.rotation);
      const topLabel = (topPiece.metadata?.topCard) || topPiece.label || topPiece.name || 'A♠';

      // Gather all card names/labels
      const allCards: string[] = [];
      const removedIds: string[] = [];

      for (const piece of validPieces) {
        if (piece.type === 'card_deck') {
          const deckCards: string[] = piece.metadata?.cards || [];
          if (deckCards.length > 0) {
            allCards.push(...deckCards);
          } else {
            // Default 52 cards if empty
            const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
            const suits = ['♠', '♥', '♦', '♣'];
            for (const s of suits) {
              for (const r of ranks) {
                allCards.push(`${r}${s}`);
              }
            }
          }
        } else {
          allCards.push(piece.label || piece.name || 'Card');
        }
        removedIds.push(piece.id);
        this.removePiece(piece.id);
      }

      // Calculate realistic deck height (2 cards is thin ~0.015, 52 cards is ~0.265)
      const cardCount = allCards.length;
      const deckHeight = calculateDeckHeight(cardCount);
      const deckBaseY = this.tableConfig.height + deckHeight / 2;

      // Create consolidated Deck - PRESERVING FACE-UP ORIENTATION
      const deckId = `deck_grouped_${Date.now()}`;
      const deckPiece: TabletopPieceData = {
        id: deckId,
        type: 'card_deck',
        name: `Deck (${cardCount} Cards)`,
        position: { x: baseX, y: deckBaseY, z: baseZ },
        // Never flip face-up cards: if cards were face-up, keep rotation face-up!
        rotation: topIsFaceUp ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 },
        dimensions: { x: 1.15, y: deckHeight, z: 1.65 },
        mass: Math.max(0.04, Math.min(0.5, 0.02 + cardCount * 0.005)),
        color: firstPiece.color || '#1e3a8a',
        secondaryColor: firstPiece.secondaryColor,
        label: `${cardCount} CARDS`,
        value: cardCount,
        metadata: {
          cards: allCards,
          topCard: topLabel,
          isFaceUp: topIsFaceUp,
        },
      };

      this.addPiece(deckPiece);

      if (this.onSoundEventCallback) {
        this.onSoundEventCallback('card_deal', 1.0, { x: baseX, y: deckBaseY, z: baseZ });
      }

      return { createdDeck: deckPiece, removedPieceIds: removedIds };
    }

    // Stacking poker chips / checkers / dominoes / coins
    const chipThickness = validPieces[0].dimensions?.y || (validPieces[0].type === 'coin' ? 0.05 : 0.08);
    // Find surface elevation underneath (table top or board surface)
    let surfaceY = this.tableConfig.height;
    for (const b of this.pieceData.values()) {
      if (b.type === 'board') {
        const bDims = b.dimensions || { x: 9.8, y: 0.08, z: 9.8 };
        if (
          baseX >= b.position.x - bDims.x / 2 &&
          baseX <= b.position.x + bDims.x / 2 &&
          baseZ >= b.position.z - bDims.z / 2 &&
          baseZ <= b.position.z + bDims.z / 2
        ) {
          surfaceY = b.position.y + bDims.y / 2;
        }
      }
    }

    const updatedPieces: TabletopPieceData[] = [];
    validPieces.forEach((piece, idx) => {
      const body = this.bodies.get(piece.id);
      const targetY = surfaceY + chipThickness / 2 + idx * chipThickness;

      if (body) {
        body.position.set(baseX, targetY, baseZ);
        body.quaternion.set(0, 0, 0, 1);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.sleep(); // Stable stacked column, perfectly flush with zero interpenetration or collapse!
      }

      piece.position = { x: baseX, y: targetY, z: baseZ };
      piece.rotation = { x: 0, y: 0, z: 0, w: 1 };
      updatedPieces.push(piece);
    });

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('chip_clink', 0.9, { x: baseX, y: surfaceY, z: baseZ });
    }

    return { removedPieceIds: [], updatedPieces };
  }

  // FreeCell / Solitaire style cascading column layout (staggered overlap preserving face-up state)
  public arrangeCardsCascade(pieceIds: string[]): { updatedPieces: TabletopPieceData[] } {
    if (pieceIds.length < 2) return { updatedPieces: [] };
    const validPieces = pieceIds
      .map((id) => this.pieceData.get(id))
      .filter((p): p is TabletopPieceData => !!p && (p.type === 'card' || p.type === 'card_deck'));
    if (validPieces.length < 2) return { updatedPieces: [] };

    validPieces.sort((a, b) => a.position.z - b.position.z || a.position.y - b.position.y);

    const rootX = validPieces[0].position.x;
    const startZ = validPieces[0].position.z;
    const baseY = this.tableConfig.height + 0.01;
    const zOffset = 0.42; // Authentic FreeCell tableau offset
    const yStep = 0.009;

    const updatedPieces: TabletopPieceData[] = [];
    validPieces.forEach((card, idx) => {
      const body = this.bodies.get(card.id);
      const targetZ = startZ + idx * zOffset;
      const targetY = baseY + idx * yStep;
      const isFaceUp = this.isPieceFaceUp(card.rotation) || card.metadata?.isFaceUp !== false;

      if (body) {
        body.position.set(rootX, targetY, targetZ);
        body.quaternion.set(0, 0, isFaceUp ? 0 : 1, isFaceUp ? 1 : 0);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.wakeUp();
      }

      card.position = { x: rootX, y: targetY, z: targetZ };
      card.rotation = isFaceUp ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 };
      if (!card.metadata) card.metadata = {};
      card.metadata.isFaceUp = isFaceUp;
      updatedPieces.push(card);
    });

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('card_deal', 0.9, { x: rootX, y: baseY, z: startZ });
    }

    return { updatedPieces };
  }

  // Horizontal Splay / Fan layout (horizontal row with visible card indices)
  public arrangeCardsFan(pieceIds: string[]): { updatedPieces: TabletopPieceData[] } {
    if (pieceIds.length < 2) return { updatedPieces: [] };
    const validPieces = pieceIds
      .map((id) => this.pieceData.get(id))
      .filter((p): p is TabletopPieceData => !!p && (p.type === 'card' || p.type === 'card_deck'));
    if (validPieces.length < 2) return { updatedPieces: [] };

    validPieces.sort((a, b) => a.position.x - b.position.x);

    const startX = validPieces[0].position.x;
    const rootZ = validPieces[0].position.z;
    const baseY = this.tableConfig.height + 0.01;
    const xOffset = 0.45;
    const yStep = 0.009;

    const updatedPieces: TabletopPieceData[] = [];
    validPieces.forEach((card, idx) => {
      const body = this.bodies.get(card.id);
      const targetX = startX + idx * xOffset;
      const targetY = baseY + idx * yStep;
      const isFaceUp = this.isPieceFaceUp(card.rotation) || card.metadata?.isFaceUp !== false;

      if (body) {
        body.position.set(targetX, targetY, rootZ);
        body.quaternion.set(0, 0, isFaceUp ? 0 : 1, isFaceUp ? 1 : 0);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.wakeUp();
      }

      card.position = { x: targetX, y: targetY, z: rootZ };
      card.rotation = isFaceUp ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 };
      if (!card.metadata) card.metadata = {};
      card.metadata.isFaceUp = isFaceUp;
      updatedPieces.push(card);
    });

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('card_deal', 0.9, { x: startX, y: baseY, z: rootZ });
    }

    return { updatedPieces };
  }

  // Auto-stack card onto card/deck, or cascade cards (FreeCell / Solitaire style)
  public checkAutoStack(pieceId: string): { createdDeck?: TabletopPieceData; removedPieceIds: string[]; updatedPieces?: TabletopPieceData[] } | null {
    const droppedPiece = this.pieceData.get(pieceId);
    if (!droppedPiece) return null;

    const dropBody = this.bodies.get(pieceId);
    if (!dropBody) return null;

    // 1. Cards and Decks Stacking and Cascading
    if (droppedPiece.type === 'card' || droppedPiece.type === 'card_deck') {
      let targetPiece: TabletopPieceData | null = null;
      let minDistance = 1.25;

      for (const [id, piece] of this.pieceData.entries()) {
        if (id === pieceId) continue;
        if (piece.type !== 'card' && piece.type !== 'card_deck') continue;

        const body = this.bodies.get(id);
        if (!body) continue;

        const dx = dropBody.position.x - body.position.x;
        const dz = dropBody.position.z - body.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const dy = Math.abs(dropBody.position.y - body.position.y);

        if (dist < minDistance && dy < 1.6) {
          minDistance = dist;
          targetPiece = piece;
        }
      }

      if (targetPiece) {
        const dx = dropBody.position.x - targetPiece.position.x;
        const dz = dropBody.position.z - targetPiece.position.z;
        const targetBody = this.bodies.get(targetPiece.id);

        // FreeCell & Solitaire Cascading Layout (Partial Stacking with Staggered Overlap)
        // When cards are dropped with vertical offset in a column, do NOT merge into a deck!
        // Instead, arrange them in an authentic cascade so all card faces/indices remain visible.
        const isCascadePlacement =
          targetPiece.type === 'card' &&
          droppedPiece.type === 'card' &&
          Math.abs(dx) < 0.55 &&
          dz > 0.16 &&
          dz < 1.15;

        if (isCascadePlacement && targetBody) {
          const cascadeZ = targetPiece.position.z + 0.42;
          const cascadeY = targetPiece.position.y + 0.009;
          const isFaceUp = this.isPieceFaceUp(droppedPiece.rotation);

          dropBody.position.set(targetPiece.position.x, cascadeY, cascadeZ);
          dropBody.quaternion.set(0, 0, isFaceUp ? 0 : 1, isFaceUp ? 1 : 0);
          dropBody.velocity.set(0, 0, 0);
          dropBody.angularVelocity.set(0, 0, 0);
          dropBody.wakeUp();

          droppedPiece.position = { x: targetPiece.position.x, y: cascadeY, z: cascadeZ };
          droppedPiece.rotation = isFaceUp ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 };

          if (this.onSoundEventCallback) {
            this.onSoundEventCallback('card_deal', 0.85, droppedPiece.position);
          }

          return { updatedPieces: [droppedPiece], removedPieceIds: [] };
        }

        // Complete Stacking (direct centered alignment or dropping onto existing deck/foundation)
        const distXZ = Math.hypot(dx, dz);
        if (distXZ < 0.38 || targetPiece.type === 'card_deck') {
          return this.groupPieces([targetPiece.id, pieceId]);
        }
      }
    }

    // 2. Poker Chips and Checkers Vertical Column Stacking
    if (droppedPiece.type === 'poker_chip' || droppedPiece.type === 'checker' || droppedPiece.type === 'coin') {
      let targetPiece: TabletopPieceData | null = null;
      let minDistance = 0.75;

      for (const [id, piece] of this.pieceData.entries()) {
        if (id === pieceId) continue;
        if (piece.type !== droppedPiece.type) continue;

        const body = this.bodies.get(id);
        if (!body) continue;

        const dx = dropBody.position.x - body.position.x;
        const dz = dropBody.position.z - body.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < minDistance && Math.abs(dropBody.position.y - body.position.y) < 2.0) {
          minDistance = dist;
          targetPiece = piece;
        }
      }

      if (targetPiece) {
        const targetX = targetPiece.position.x;
        const targetZ = targetPiece.position.z;
        const itemH = droppedPiece.dimensions?.y || (droppedPiece.type === 'checker' ? 0.12 : droppedPiece.type === 'coin' ? 0.05 : 0.08);

        // Find highest surface in this column
        let highestTop = targetPiece.position.y + itemH / 2;
        for (const [id, piece] of this.pieceData.entries()) {
          if (id === pieceId) continue;
          if (piece.type === droppedPiece.type) {
            const d = Math.hypot(piece.position.x - targetX, piece.position.z - targetZ);
            if (d < 0.35) {
              const top = piece.position.y + itemH / 2;
              if (top > highestTop) highestTop = top;
            }
          }
        }

        const newY = highestTop + itemH / 2 + 0.005;
        dropBody.position.set(targetX, newY, targetZ);
        dropBody.quaternion.set(0, 0, 0, 1);
        dropBody.velocity.set(0, 0, 0);
        dropBody.angularVelocity.set(0, 0, 0);

        droppedPiece.position = { x: targetX, y: newY, z: targetZ };
        droppedPiece.rotation = { x: 0, y: 0, z: 0, w: 1 };

        if (this.onSoundEventCallback) {
          this.onSoundEventCallback(
            droppedPiece.type === 'checker' ? 'wood_knock' : 'chip_clink',
            0.9,
            { x: targetX, y: newY, z: targetZ }
          );
        }

        return { removedPieceIds: [], updatedPieces: [droppedPiece] };
      }
    }

    // 3. Dominos & Blocks Vertical Stacking
    if (droppedPiece.type === 'domino' || droppedPiece.type === 'block') {
      let targetPiece: TabletopPieceData | null = null;
      let minDistance = 0.65;

      for (const [id, piece] of this.pieceData.entries()) {
        if (id === pieceId) continue;
        if (piece.type !== droppedPiece.type) continue;

        const body = this.bodies.get(id);
        if (!body) continue;

        const dx = dropBody.position.x - body.position.x;
        const dz = dropBody.position.z - body.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < minDistance && Math.abs(dropBody.position.y - body.position.y) < 2.0) {
          minDistance = dist;
          targetPiece = piece;
        }
      }

      if (targetPiece) {
        const targetX = targetPiece.position.x;
        const targetZ = targetPiece.position.z;
        const itemH = droppedPiece.dimensions?.y || (droppedPiece.type === 'domino' ? 0.15 : 0.8);

        let highestTop = targetPiece.position.y + itemH / 2;
        for (const [id, piece] of this.pieceData.entries()) {
          if (id === pieceId) continue;
          if (piece.type === droppedPiece.type) {
            const d = Math.hypot(piece.position.x - targetX, piece.position.z - targetZ);
            if (d < 0.35) {
              const top = piece.position.y + itemH / 2;
              if (top > highestTop) highestTop = top;
            }
          }
        }

        const newY = highestTop + itemH / 2 + 0.005;
        dropBody.position.set(targetX, newY, targetZ);
        dropBody.quaternion.set(0, 0, 0, 1);
        dropBody.velocity.set(0, 0, 0);
        dropBody.angularVelocity.set(0, 0, 0);

        droppedPiece.position = { x: targetX, y: newY, z: targetZ };
        droppedPiece.rotation = { x: 0, y: 0, z: 0, w: 1 };

        if (this.onSoundEventCallback) {
          this.onSoundEventCallback('wood_knock', 0.85, { x: targetX, y: newY, z: targetZ });
        }

        return { removedPieceIds: [], updatedPieces: [droppedPiece] };
      }
    }

    return null;
  }

  private createCannonBody(data: TabletopPieceData): CANNON.Body {
    const dims = data.dimensions || this.getDefaultDimensions(data.type, data);
    let shape: CANNON.Shape;
    let material = this.woodMaterial;
    let linearDamping = 0.15;
    let angularDamping = 0.2;

    switch (data.type) {
      case 'dice_d6':
      case 'dice_fate': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
        material = this.diceMaterial;
        linearDamping = 0.1;
        angularDamping = 0.15;
        break;
      }
      case 'coin': {
        shape = new CANNON.Cylinder(dims.x / 2, dims.x / 2, dims.y, 20);
        material = this.chipMaterial;
        linearDamping = 0.2;
        angularDamping = 0.25;
        break;
      }
      case 'tablet': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
        material = this.woodMaterial;
        linearDamping = 0.4;
        break;
      }
      case 'dice_d20':
      case 'dice_d12':
      case 'dice_d8':
      case 'dice_d10':
      case 'dice_d4': {
        const radius = dims.x / 2;
        shape = new CANNON.Sphere(radius);
        material = this.diceMaterial;
        linearDamping = 0.2;
        angularDamping = 0.3;
        break;
      }
      case 'card': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, Math.max(0.005, dims.y / 2), dims.z / 2));
        material = this.cardMaterial;
        linearDamping = 0.4;
        angularDamping = 0.5;
        break;
      }
      case 'card_deck': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, Math.max(0.007, dims.y / 2), dims.z / 2));
        material = this.cardMaterial;
        linearDamping = 0.3;
        angularDamping = 0.4;
        break;
      }
      case 'poker_chip': {
        shape = new CANNON.Cylinder(dims.x / 2, dims.x / 2, dims.y, 16);
        material = this.chipMaterial;
        linearDamping = 0.2;
        angularDamping = 0.3;
        break;
      }
      case 'pawn':
      case 'meeple':
      case 'chess_piece': {
        shape = new CANNON.Cylinder(dims.x / 2, dims.x / 2, dims.y, 12);
        material = this.woodMaterial;
        linearDamping = 0.25;
        angularDamping = 0.35;
        break;
      }
      case 'counter': {
        shape = new CANNON.Cylinder(dims.x / 2, dims.x / 2, dims.y, 16);
        material = this.woodMaterial;
        linearDamping = 0.3;
        angularDamping = 0.4;
        break;
      }
      case 'custom_token': {
        shape = new CANNON.Cylinder(dims.x / 2, dims.x / 2, dims.y, 24);
        material = this.woodMaterial;
        linearDamping = 0.3;
        break;
      }
      case 'domino':
      case 'checker':
      case 'block':
      default: {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
        material = this.woodMaterial;
        linearDamping = 0.2;
        angularDamping = 0.25;
        break;
      }
    }

    const bodyType = data.isLocked ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC;

    const body = new CANNON.Body({
      mass: data.isLocked ? 0 : data.mass > 0 ? data.mass : 0.2,
      type: bodyType,
      material,
      linearDamping,
      angularDamping,
      position: new CANNON.Vec3(data.position.x, data.position.y, data.position.z),
      quaternion: new CANNON.Quaternion(
        data.rotation.x,
        data.rotation.y,
        data.rotation.z,
        data.rotation.w
      ),
    });

    body.addShape(shape);
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 0.6;

    return body;
  }

  public getDefaultDimensions(type: PieceShapeType, data?: TabletopPieceData): Vector3D {
    switch (type) {
      case 'dice_d6':
      case 'dice_fate':
        return { x: 0.7, y: 0.7, z: 0.7 };
      case 'coin':
        return { x: 0.8, y: 0.08, z: 0.8 };
      case 'tablet':
        return { x: 2.4, y: 0.1, z: 1.6 };
      case 'dice_d20':
        return { x: 0.9, y: 0.9, z: 0.9 };
      case 'dice_d4':
        return { x: 0.7, y: 0.7, z: 0.7 };
      case 'dice_d8':
        return { x: 0.8, y: 0.8, z: 0.8 };
      case 'dice_d10':
      case 'dice_d12':
        return { x: 0.85, y: 0.85, z: 0.85 };
      case 'card':
        return { x: 1.1, y: 0.008, z: 1.6 };
      case 'card_deck': {
        const count = data?.metadata?.cards?.length || data?.value || 52;
        const deckHeight = calculateDeckHeight(count);
        return { x: 1.15, y: deckHeight, z: 1.65 };
      }
      case 'poker_chip':
        return { x: 0.75, y: 0.08, z: 0.75 };
      case 'pawn':
        return { x: 0.6, y: 0.95, z: 0.6 };
      case 'meeple':
        return { x: 0.75, y: 0.8, z: 0.3 };
      case 'chess_piece': {
        const role = (data?.metadata?.role || data?.name || data?.label || '').toLowerCase();
        const roleH = role.includes('king')
          ? 1.35
          : role.includes('queen')
          ? 1.25
          : role.includes('bishop')
          ? 1.15
          : role.includes('knight')
          ? 1.10
          : role.includes('rook')
          ? 1.05
          : 0.95;
        return { x: 0.65, y: roleH, z: 0.65 };
      }
      case 'counter':
        return { x: 1.1, y: 0.25, z: 1.1 };
      case 'custom_token':
        return { x: 1.0, y: 0.15, z: 1.0 };
      case 'domino':
        return { x: 0.6, y: 0.15, z: 1.3 };
      case 'checker':
        return { x: 0.7, y: 0.12, z: 0.7 };
      case 'board':
        return { x: 9.8, y: 0.08, z: 9.8 };
      case 'block':
      default:
        return { x: 0.8, y: 0.8, z: 0.8 };
    }
  }

  public startGrab(pieceId: string, playerId: string, targetPos: Vector3D) {
    const piece = this.pieceData.get(pieceId);
    if (piece?.isLocked) return; // Cannot grab locked piece

    this.wakeUpRestingPiecesAbove(pieceId);

    const body = this.bodies.get(pieceId);
    if (!body) return;

    body.wakeUp();
    body.type = CANNON.Body.KINEMATIC;
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);

    const now = Date.now();
    const pos = new CANNON.Vec3(targetPos.x, targetPos.y, targetPos.z);
    this.grabs.set(pieceId, {
      pieceId,
      playerId,
      targetPos: pos,
      targetRot: body.quaternion.clone(),
      lastPos: body.position.clone(),
      lastTime: now,
    });

    if (piece) {
      piece.grabbedBy = playerId;
    }
  }

  public updateGrab(pieceId: string, playerId: string, targetPos: Vector3D, rotation?: Quaternion4D) {
    const grab = this.grabs.get(pieceId);
    if (!grab || grab.playerId !== playerId) return;

    const body = this.bodies.get(pieceId);
    if (!body) return;

    body.wakeUp();

    // Clamp grabbed piece position strictly inside table boundary box
    const piece = this.pieceData.get(pieceId);
    const dims = piece ? this.getDefaultDimensions(piece.type) : { x: 0.5, y: 0.05, z: 0.5 };
    const halfX = Math.max(0.04, ((piece?.dimensions?.x ?? dims.x) || 0.4) / 2);
    const halfZ = Math.max(0.04, ((piece?.dimensions?.z ?? dims.z) || 0.4) / 2);
    const halfH = Math.max(0.005, ((piece?.dimensions?.y ?? dims.y) || 0.02) / 2);

    const { width, length, height } = this.tableConfig;
    const halfW = width / 2;
    const halfL = length / 2;

    const clampedX = Math.max(-halfW + halfX, Math.min(halfW - halfX, targetPos.x));
    const clampedZ = Math.max(-halfL + halfZ, Math.min(halfL - halfZ, targetPos.z));
    const clampedY = Math.max(height + halfH, Math.min(height + 3.8, targetPos.y));

    grab.targetPos.set(clampedX, clampedY, clampedZ);
    if (rotation) {
      grab.targetRot.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  public rotateGrabbed(pieceId: string, deltaEuler: Vector3D) {
    const grab = this.grabs.get(pieceId);
    const body = this.bodies.get(pieceId);
    if (!grab || !body) return;

    body.wakeUp();
    const deltaQ = new CANNON.Quaternion();
    deltaQ.setFromEuler(deltaEuler.x, deltaEuler.y, deltaEuler.z);
    grab.targetRot = deltaQ.mult(grab.targetRot);
  }

  public flipGrabbed(pieceId: string) {
    const grab = this.grabs.get(pieceId);
    const body = this.bodies.get(pieceId);
    if (!grab || !body) return;

    body.wakeUp();
    const flipQ = new CANNON.Quaternion();
    flipQ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI);
    grab.targetRot = grab.targetRot.mult(flipQ);
  }

  public releaseGrab(
    pieceId: string,
    playerId: string,
    releaseVelocity?: Vector3D,
    releaseAngularVel?: Vector3D
  ) {
    const grab = this.grabs.get(pieceId);
    const body = this.bodies.get(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (!grab || grab.playerId !== playerId || !body) return;

    body.type = piece?.isLocked ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC;
    body.wakeUp();

    // Custom user-defined Snap Points
    let snappedToPoint = false;
    for (const snap of this.snapPoints.values()) {
      const dx = body.position.x - snap.position.x;
      const dz = body.position.z - snap.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= (snap.snapRadius || 1.2)) {
        body.position.x = snap.position.x;
        body.position.z = snap.position.z;
        body.position.y = Math.max(body.position.y, snap.position.y + 0.1);
        const rotQ = new CANNON.Quaternion();
        rotQ.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), snap.rotationY || 0);
        body.quaternion = rotQ;
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        snappedToPoint = true;
        if (this.onSoundEventCallback) {
          this.onSoundEventCallback('wood_knock', 0.5, snap.position);
        }
        break;
      }
    }

    // Auto-snap to grid if active and not thrown with high speed
    if (!snappedToPoint && this.tableConfig.grid?.enabled && this.tableConfig.grid?.snap) {
      const s = this.tableConfig.grid.size || 1.5;
      const snappedX = Math.round(body.position.x / s) * s;
      const snappedZ = Math.round(body.position.z / s) * s;
      body.position.x = snappedX;
      body.position.z = snappedZ;
    }

    if (releaseVelocity) {
      const vx = Math.max(-15, Math.min(15, releaseVelocity.x));
      const vy = Math.max(-5, Math.min(15, releaseVelocity.y));
      const vz = Math.max(-15, Math.min(15, releaseVelocity.z));
      body.velocity.set(vx, vy, vz);
    } else {
      const now = Date.now();
      const dt = Math.max(0.016, (now - grab.lastTime) / 1000);
      const vel = body.position.vsub(grab.lastPos).scale(1 / dt);
      body.velocity.set(
        Math.max(-12, Math.min(12, vel.x)),
        Math.max(-5, Math.min(12, vel.y)),
        Math.max(-12, Math.min(12, vel.z))
      );
    }

    if (releaseAngularVel) {
      body.angularVelocity.set(releaseAngularVel.x, releaseAngularVel.y, releaseAngularVel.z);
    }

    this.grabs.delete(pieceId);
    if (piece) {
      piece.grabbedBy = null;
    }

    // Check if dropped card/deck auto-stacks into an adjacent card/deck
    const autoStacked = this.checkAutoStack(pieceId);
    return autoStacked;
  }

  public rollDice(pieceId: string, rollerName?: string, forceMultiplier: number = 1.0) {
    const body = this.bodies.get(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (!body || !piece || piece.isLocked) return;

    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();

    if (body.position.y < this.tableConfig.height + 0.3) {
      body.position.y = this.tableConfig.height + 0.6;
    }

    const upwardImpulse = (3.5 + Math.random() * 2.5) * forceMultiplier;
    const horizontalX = (Math.random() - 0.5) * 5 * forceMultiplier;
    const horizontalZ = (Math.random() - 0.5) * 5 * forceMultiplier;
    body.velocity.set(horizontalX, upwardImpulse, horizontalZ);

    const torqueX = (Math.random() - 0.5) * 40 * forceMultiplier;
    const torqueY = (Math.random() - 0.5) * 40 * forceMultiplier;
    const torqueZ = (Math.random() - 0.5) * 40 * forceMultiplier;
    body.angularVelocity.set(torqueX, torqueY, torqueZ);

    this.rollingDice.add(pieceId);
    this.diceRollStartTimes.set(pieceId, Date.now());

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('dice_clatter', 0.9, {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      });
    }
  }

  public rollAllDice(rollerName?: string) {
    for (const [id, piece] of this.pieceData.entries()) {
      if (piece.type.startsWith('dice_') && !piece.isLocked) {
        this.rollDice(id, rollerName);
      }
    }
  }

  // The iconic Table Flip! (Locked pieces stay grounded!)
  public flipTable(force: number = 1.0) {
    for (const [id, body] of this.bodies.entries()) {
      const piece = this.pieceData.get(id);
      if (piece?.isLocked) continue; // Locked items don't fly!

      body.type = CANNON.Body.DYNAMIC;
      body.wakeUp();

      const distFromCenter = Math.sqrt(body.position.x * body.position.x + body.position.z * body.position.z);
      const angle = Math.atan2(body.position.z, body.position.x) + (Math.random() - 0.5) * 0.5;

      const horizSpeed = (1.8 + distFromCenter * 0.8 + Math.random() * 2.2) * force;
      const vertSpeed = (2.5 + Math.random() * 2.5) * force;

      body.velocity.set(
        Math.cos(angle) * horizSpeed,
        vertSpeed,
        Math.sin(angle) * horizSpeed
      );

      body.angularVelocity.set(
        (Math.random() - 0.5) * 18 * force,
        (Math.random() - 0.5) * 18 * force,
        (Math.random() - 0.5) * 18 * force
      );
    }

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('table_flip', 1.0, { x: 0, y: this.tableConfig.height, z: 0 });
    }
  }

  public step(dt: number): CompactPieceUpdate[] {
    const updates: CompactPieceUpdate[] = [];
    const now = Date.now();

    for (const [pieceId, grab] of this.grabs.entries()) {
      const body = this.bodies.get(pieceId);
      if (!body) continue;

      grab.lastPos.copy(body.position);
      grab.lastTime = now;

      body.position.lerp(grab.targetPos, 0.45, body.position);
      body.quaternion = body.quaternion.clone();
      body.quaternion.slerp(grab.targetRot, 0.45, body.quaternion);

      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
    }

    this.world.step(dt);

    for (const pieceId of Array.from(this.rollingDice)) {
      const body = this.bodies.get(pieceId);
      const startTime = this.diceRollStartTimes.get(pieceId) || 0;
      const piece = this.pieceData.get(pieceId);
      if (!body || !piece) {
        this.rollingDice.delete(pieceId);
        continue;
      }

      const elapsed = now - startTime;
      const speed = body.velocity.length();
      const rotSpeed = body.angularVelocity.length();

      if (elapsed > 600 && speed < 0.15 && rotSpeed < 0.25) {
        this.rollingDice.delete(pieceId);
        const settledValue = this.determineDiceValue(piece.type, body.quaternion);
        piece.value = settledValue;
        if (this.onDiceSettledCallback) {
          this.onDiceSettledCallback(pieceId, settledValue, piece.type);
        }
      }
    }

    const { width, length, height } = this.tableConfig;
    const halfW = width / 2;
    const halfL = length / 2;
    const boxCeilingY = height + 4.2;

    for (const [id, body] of this.bodies.entries()) {
      const piece = this.pieceData.get(id);
      if (!piece) continue;

      // Active containment within invisible bounding box around the table
      if (!piece.isLocked) {
        const dims = piece.dimensions || this.getDefaultDimensions(piece.type, piece);
        const pieceHalfX = Math.max(0.04, ((dims.x) || 0.4) / 2);
        const pieceHalfZ = Math.max(0.04, ((dims.z) || 0.4) / 2);
        const pieceHalfY = Math.max(0.005, ((dims.y) || 0.02) / 2);

        // Find surface elevation underneath (table top or board surface)
        let surfaceY = height;
        for (const b of this.pieceData.values()) {
          if (b.type === 'board' && b.id !== id) {
            const bDims = b.dimensions || { x: 9.8, y: 0.08, z: 9.8 };
            const bHalfX = bDims.x / 2;
            const bHalfZ = bDims.z / 2;
            if (
              body.position.x >= b.position.x - bHalfX &&
              body.position.x <= b.position.x + bHalfX &&
              body.position.z >= b.position.z - bHalfZ &&
              body.position.z <= b.position.z + bHalfZ
            ) {
              const bTop = b.position.y + bDims.y / 2;
              if (bTop > surfaceY) {
                surfaceY = bTop;
              }
            }
          }
        }

        const minX = -halfW + pieceHalfX;
        const maxX = halfW - pieceHalfX;
        const minZ = -halfL + pieceHalfZ;
        const maxZ = halfL - pieceHalfZ;
        const minY = surfaceY + pieceHalfY;
        const maxY = boxCeilingY - pieceHalfY;

        // X containment
        if (body.position.x < minX) {
          body.position.x = minX;
          if (body.velocity.x < 0) body.velocity.x = -body.velocity.x * 0.3;
        } else if (body.position.x > maxX) {
          body.position.x = maxX;
          if (body.velocity.x > 0) body.velocity.x = -body.velocity.x * 0.3;
        }

        // Z containment
        if (body.position.z < minZ) {
          body.position.z = minZ;
          if (body.velocity.z < 0) body.velocity.z = -body.velocity.z * 0.3;
        } else if (body.position.z > maxZ) {
          body.position.z = maxZ;
          if (body.velocity.z > 0) body.velocity.z = -body.velocity.z * 0.3;
        }

        // Ceiling containment (pieces cannot fly into outer space)
        if (body.position.y > maxY) {
          body.position.y = maxY;
          if (body.velocity.y > 0) body.velocity.y = -body.velocity.y * 0.25;
        }

        // Table surface bottom containment (pieces cannot fall off the table or sink into void)
        if (body.position.y < minY) {
          body.position.y = minY;
          if (body.velocity.y < 0) {
            body.velocity.y = 0;
            body.velocity.x *= 0.92;
            body.velocity.z *= 0.92;
          }
        }

        // Automatic support check for sleeping pieces in mid-air (e.g. if token beneath card was removed)
        if (body.sleepState === CANNON.Body.SLEEPING && body.type === CANNON.Body.DYNAMIC) {
          if (body.position.y > surfaceY + pieceHalfY + 0.03) {
            let isSupported = false;
            for (const [subId, subBody] of this.bodies.entries()) {
              if (subId === id) continue;
              const subPiece = this.pieceData.get(subId);
              const subDims = subPiece?.dimensions || (subPiece ? this.getDefaultDimensions(subPiece.type, subPiece) : { x: 0.8, y: 0.1, z: 0.8 });
              const subTop = subBody.position.y + subDims.y / 2;
              const myBottom = body.position.y - pieceHalfY;

              if (Math.abs(myBottom - subTop) < 0.05) {
                const dx = Math.abs(body.position.x - subBody.position.x);
                const dz = Math.abs(body.position.z - subBody.position.z);
                if (dx < (pieceHalfX + subDims.x / 2) * 0.95 && dz < (pieceHalfZ + subDims.z / 2) * 0.95) {
                  isSupported = true;
                  break;
                }
              }
            }

            if (!isSupported) {
              body.wakeUp();
              body.velocity.y = -0.15;
            }
          }
        }

        // Card flatness constraint: prevent cards from tipping or seesawing when partially overlapping other cards
        if (piece.type === 'card' && body.type === CANNON.Body.DYNAMIC && !piece.grabbedBy) {
          body.angularVelocity.x *= 0.15;
          body.angularVelocity.z *= 0.15;
          const isFaceUp = this.isPieceFaceUp(body.quaternion);
          body.quaternion.x = 0;
          body.quaternion.z = isFaceUp ? 0 : 1;
          body.quaternion.normalize();
        }

        // Token / Poker chip micro-jitter stabilization
        if ((piece.type === 'poker_chip' || piece.type === 'checker' || piece.type === 'coin') && body.type === CANNON.Body.DYNAMIC && !piece.grabbedBy) {
          const speedSq = body.velocity.lengthSquared();
          if (speedSq < 0.04) {
            body.velocity.x *= 0.4;
            body.velocity.z *= 0.4;
            if (speedSq < 0.004) {
              body.velocity.set(0, 0, 0);
              body.angularVelocity.set(0, 0, 0);
              body.sleep();
            }
          }
        }
      }

      piece.position = { x: body.position.x, y: body.position.y, z: body.position.z };
      piece.rotation = {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      };
      piece.isSleeping = body.sleepState === CANNON.Body.SLEEPING;

      updates.push({
        id,
        p: [
          Math.round(body.position.x * 1000) / 1000,
          Math.round(body.position.y * 1000) / 1000,
          Math.round(body.position.z * 1000) / 1000,
        ],
        r: [
          Math.round(body.quaternion.x * 1000) / 1000,
          Math.round(body.quaternion.y * 1000) / 1000,
          Math.round(body.quaternion.z * 1000) / 1000,
          Math.round(body.quaternion.w * 1000) / 1000,
        ],
        s: body.sleepState === CANNON.Body.SLEEPING,
        g: piece.grabbedBy || null,
        l: piece.isLocked,
        val: piece.value,
      });
    }

    return updates;
  }

  public determineDiceValue(type: PieceShapeType, quat: CANNON.Quaternion): number {
    const worldUp = new CANNON.Vec3(0, 1, 0);

    if (type === 'dice_d6') {
      const localFaces = [
        { normal: new CANNON.Vec3(0, 1, 0), value: 1 },
        { normal: new CANNON.Vec3(0, -1, 0), value: 6 },
        { normal: new CANNON.Vec3(0, 0, 1), value: 2 },
        { normal: new CANNON.Vec3(0, 0, -1), value: 5 },
        { normal: new CANNON.Vec3(1, 0, 0), value: 3 },
        { normal: new CANNON.Vec3(-1, 0, 0), value: 4 },
      ];

      let maxDot = -Infinity;
      let topVal = 1;
      for (const face of localFaces) {
        const worldNormal = quat.vmult(face.normal);
        const dot = worldNormal.dot(worldUp);
        if (dot > maxDot) {
          maxDot = dot;
          topVal = face.value;
        }
      }
      return topVal;
    }

    if (type === 'dice_d20') {
      return 1 + Math.floor(Math.abs(quat.x * 7 + quat.y * 11 + quat.z * 13 + quat.w * 17) * 1000) % 20;
    }

    if (type === 'dice_d4') {
      return 1 + Math.floor(Math.abs(quat.x * 5 + quat.z * 9) * 1000) % 4;
    }

    if (type === 'dice_d8') {
      return 1 + Math.floor(Math.abs(quat.x * 3 + quat.y * 7) * 1000) % 8;
    }

    if (type === 'dice_d10') {
      return Math.floor(Math.abs(quat.x * 9 + quat.z * 11) * 1000) % 10;
    }

    if (type === 'dice_d12') {
      return 1 + Math.floor(Math.abs(quat.y * 7 + quat.w * 13) * 1000) % 12;
    }

    if (type === 'dice_fate') {
      const topFace = this.determineDiceValue('dice_d6', quat);
      if (topFace === 1 || topFace === 2) return -1; // Minus
      if (topFace === 3 || topFace === 4) return 0;  // Blank
      return 1;                                      // Plus
    }

    if (type === 'coin') {
      const coinUp = quat.vmult(new CANNON.Vec3(0, 1, 0));
      return coinUp.dot(worldUp) > 0 ? 1 : 2; // 1 = Heads, 2 = Tails
    }

    return 1;
  }

  public flipCoin(pieceId: string, rollerName?: string) {
    const body = this.bodies.get(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (!body || !piece || piece.isLocked) return;

    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();
    body.velocity.set((Math.random() - 0.5) * 1.5, 4.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5);
    body.angularVelocity.set((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50);

    this.rollingDice.add(pieceId);
    this.diceRollStartTimes.set(pieceId, Date.now());

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('chip_clink', 0.9, {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      });
    }
  }
}
