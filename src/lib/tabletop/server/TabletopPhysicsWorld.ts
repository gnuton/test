/**
 * Tabletop Nexus - Server-Authoritative Physics World
 * Powered by cannon-es for headless Node.js physics simulation
 */

import * as CANNON from 'cannon-es';
import {
  TabletopPieceData,
  CompactPieceUpdate,
  TableConfig,
  Vector3D,
  Quaternion4D,
  PieceShapeType
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
  public grabs = new Map<string, GrabState>(); // pieceId -> GrabState
  public tableConfig: TableConfig;

  private tableBody: CANNON.Body | null = null;
  private rimBodies: CANNON.Body[] = [];
  private floorBody: CANNON.Body | null = null;

  // Dice roll tracking
  private rollingDice = new Set<string>(); // pieceId
  private diceRollStartTimes = new Map<string, number>();
  private onDiceSettledCallback?: (pieceId: string, value: number, type: PieceShapeType, rollerName?: string) => void;
  private onSoundEventCallback?: (sound: 'dice_clatter' | 'card_deal' | 'chip_clink' | 'wood_knock' | 'table_flip', intensity: number, pos?: Vector3D) => void;

  // Materials
  private feltMaterial: CANNON.Material;
  private woodMaterial: CANNON.Material;
  private diceMaterial: CANNON.Material;
  private cardMaterial: CANNON.Material;
  private chipMaterial: CANNON.Material;

  constructor(tableConfig: TableConfig) {
    this.tableConfig = tableConfig;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -tableConfig.gravity, 0),
    });

    // Broadphase optimization
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as any).iterations = 10;
    this.world.allowSleep = true;

    // Initialize materials
    this.feltMaterial = new CANNON.Material('felt');
    this.woodMaterial = new CANNON.Material('wood');
    this.diceMaterial = new CANNON.Material('dice');
    this.cardMaterial = new CANNON.Material('card');
    this.chipMaterial = new CANNON.Material('chip');

    // Contact Materials
    // Dice on felt: nice bounce and rolling friction
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.feltMaterial, {
        friction: 0.35,
        restitution: 0.45,
      })
    );
    // Dice on dice: clack
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
        friction: 0.3,
        restitution: 0.5,
      })
    );
    // Chips on chips: high friction for neat stacking
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.chipMaterial, {
        friction: 0.8,
        restitution: 0.15,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.chipMaterial, this.feltMaterial, {
        friction: 0.6,
        restitution: 0.2,
      })
    );
    // Cards: low restitution, moderate friction
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cardMaterial, this.feltMaterial, {
        friction: 0.5,
        restitution: 0.05,
      })
    );

    this.setupTableAndBoundaries();
  }

  public setCallbacks(callbacks: {
    onDiceSettled?: (pieceId: string, value: number, type: PieceShapeType, rollerName?: string) => void;
    onSoundEvent?: (sound: 'dice_clatter' | 'card_deal' | 'chip_clink' | 'wood_knock' | 'table_flip', intensity: number, pos?: Vector3D) => void;
  }) {
    this.onDiceSettledCallback = callbacks.onDiceSettled;
    this.onSoundEventCallback = callbacks.onSoundEvent;
  }

  public updateTableConfig(newConfig: Partial<TableConfig>) {
    Object.assign(this.tableConfig, newConfig);
    this.world.gravity.set(0, -this.tableConfig.gravity, 0);
    this.setupTableAndBoundaries();
  }

  private setupTableAndBoundaries() {
    // Remove existing table & rims
    if (this.tableBody) {
      this.world.removeBody(this.tableBody);
      this.tableBody = null;
    }
    for (const rim of this.rimBodies) {
      this.world.removeBody(rim);
    }
    this.rimBodies = [];
    if (this.floorBody) {
      this.world.removeBody(this.floorBody);
      this.floorBody = null;
    }

    const { width, length, height, hasRim } = this.tableConfig;
    const tableThickness = 0.5;
    const tableY = height;

    // Table top surface
    const tableShape = new CANNON.Box(new CANNON.Vec3(width / 2, tableThickness / 2, length / 2));
    this.tableBody = new CANNON.Body({
      mass: 0, // static
      type: CANNON.Body.STATIC,
      material: this.feltMaterial,
      position: new CANNON.Vec3(0, tableY - tableThickness / 2, 0),
    });
    this.tableBody.addShape(tableShape);
    this.world.addBody(this.tableBody);

    // Table rims to prevent pieces from accidentally flying off
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

    // Floor catch plane 3 units below table
    const floorShape = new CANNON.Plane();
    this.floorBody = new CANNON.Body({ mass: 0 });
    this.floorBody.addShape(floorShape);
    this.floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.floorBody.position.set(0, -3, 0);
    this.world.addBody(this.floorBody);
  }

  public addPiece(data: TabletopPieceData): CANNON.Body {
    // If body already exists, remove it
    if (this.bodies.has(data.id)) {
      this.removePiece(data.id);
    }

    const body = this.createCannonBody(data);
    this.world.addBody(body);
    this.bodies.set(data.id, body);
    this.pieceData.set(data.id, { ...data });

    // Collide listener for sound events
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

  public removePiece(id: string) {
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

  private createCannonBody(data: TabletopPieceData): CANNON.Body {
    const dims = data.dimensions || this.getDefaultDimensions(data.type);
    let shape: CANNON.Shape;
    let material = this.woodMaterial;
    let linearDamping = 0.15;
    let angularDamping = 0.2;

    switch (data.type) {
      case 'dice_d6': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
        material = this.diceMaterial;
        linearDamping = 0.1;
        angularDamping = 0.15;
        break;
      }
      case 'dice_d20':
      case 'dice_d12':
      case 'dice_d8':
      case 'dice_d10':
      case 'dice_d4': {
        // High fidelity polyhedral approximations or radius-based spheres/compounds
        // A sphere with slight angular damping rolls realistically and avoids getting stuck
        const radius = dims.x / 2;
        shape = new CANNON.Sphere(radius);
        material = this.diceMaterial;
        linearDamping = 0.2;
        angularDamping = 0.3;
        break;
      }
      case 'card': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
        material = this.cardMaterial;
        linearDamping = 0.4;
        angularDamping = 0.5;
        break;
      }
      case 'card_deck': {
        shape = new CANNON.Box(new CANNON.Vec3(dims.x / 2, dims.y / 2, dims.z / 2));
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

    const body = new CANNON.Body({
      mass: data.mass > 0 ? data.mass : 0.2,
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

    // Sleep settings: piece sleeps when stationary to conserve server CPU
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 0.6;

    return body;
  }

  public getDefaultDimensions(type: PieceShapeType): Vector3D {
    switch (type) {
      case 'dice_d6':
        return { x: 0.7, y: 0.7, z: 0.7 };
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
        return { x: 1.1, y: 0.04, z: 1.6 };
      case 'card_deck':
        return { x: 1.15, y: 0.6, z: 1.65 };
      case 'poker_chip':
        return { x: 0.75, y: 0.12, z: 0.75 };
      case 'pawn':
        return { x: 0.6, y: 1.1, z: 0.6 };
      case 'meeple':
        return { x: 0.75, y: 0.8, z: 0.3 };
      case 'chess_piece':
        return { x: 0.65, y: 1.3, z: 0.65 };
      case 'domino':
        return { x: 0.6, y: 0.15, z: 1.3 };
      case 'checker':
        return { x: 0.7, y: 0.2, z: 0.7 };
      case 'block':
      default:
        return { x: 0.8, y: 0.8, z: 0.8 };
    }
  }

  // Handle player grabbing a piece
  public startGrab(pieceId: string, playerId: string, targetPos: Vector3D) {
    const body = this.bodies.get(pieceId);
    if (!body) return;

    body.wakeUp();
    body.type = CANNON.Body.KINEMATIC; // Server-authoritative kinematic dragging
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

    const piece = this.pieceData.get(pieceId);
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
    grab.targetPos.set(targetPos.x, targetPos.y, targetPos.z);
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
    // Rotate 180 degrees around local Z axis
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
    if (!grab || grab.playerId !== playerId || !body) return;

    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();

    if (releaseVelocity) {
      // Clamp reasonable throw velocity
      const vx = Math.max(-15, Math.min(15, releaseVelocity.x));
      const vy = Math.max(-5, Math.min(15, releaseVelocity.y));
      const vz = Math.max(-15, Math.min(15, releaseVelocity.z));
      body.velocity.set(vx, vy, vz);
    } else {
      // Calculate velocity from recent drag delta
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
      body.angularVelocity.set(
        releaseAngularVel.x,
        releaseAngularVel.y,
        releaseAngularVel.z
      );
    }

    this.grabs.delete(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (piece) {
      piece.grabbedBy = null;
    }
  }

  // Roll dice with realistic server torque & upward impulse
  public rollDice(pieceId: string, rollerName?: string, forceMultiplier: number = 1.0) {
    const body = this.bodies.get(pieceId);
    const piece = this.pieceData.get(pieceId);
    if (!body || !piece) return;

    body.type = CANNON.Body.DYNAMIC;
    body.wakeUp();

    // Lift slightly if resting
    if (body.position.y < this.tableConfig.height + 0.3) {
      body.position.y = this.tableConfig.height + 0.6;
    }

    const upwardImpulse = (3.5 + Math.random() * 2.5) * forceMultiplier;
    const horizontalX = (Math.random() - 0.5) * 5 * forceMultiplier;
    const horizontalZ = (Math.random() - 0.5) * 5 * forceMultiplier;
    body.velocity.set(horizontalX, upwardImpulse, horizontalZ);

    // Chaotic spin
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
      if (piece.type.startsWith('dice_')) {
        this.rollDice(id, rollerName);
      }
    }
  }

  // The legendary Table Flip!
  public flipTable(force: number = 1.0) {
    for (const [id, body] of this.bodies.entries()) {
      body.type = CANNON.Body.DYNAMIC;
      body.wakeUp();

      // Launch upwards and randomly outwards
      const distFromCenter = Math.sqrt(body.position.x * body.position.x + body.position.z * body.position.z);
      const angle = Math.atan2(body.position.z, body.position.x) + (Math.random() - 0.5) * 0.5;

      const horizSpeed = (4 + distFromCenter * 2 + Math.random() * 6) * force;
      const vertSpeed = (8 + Math.random() * 7) * force;

      body.velocity.set(
        Math.cos(angle) * horizSpeed,
        vertSpeed,
        Math.sin(angle) * horizSpeed
      );

      body.angularVelocity.set(
        (Math.random() - 0.5) * 35 * force,
        (Math.random() - 0.5) * 35 * force,
        (Math.random() - 0.5) * 35 * force
      );
    }

    if (this.onSoundEventCallback) {
      this.onSoundEventCallback('table_flip', 1.0, { x: 0, y: this.tableConfig.height, z: 0 });
    }
  }

  // Step physics simulation by fixed delta time
  public step(dt: number): CompactPieceUpdate[] {
    const updates: CompactPieceUpdate[] = [];

    // Apply grab kinematic positions smoothly
    const now = Date.now();
    for (const [pieceId, grab] of this.grabs.entries()) {
      const body = this.bodies.get(pieceId);
      if (!body) continue;

      grab.lastPos.copy(body.position);
      grab.lastTime = now;

      // Kinematic interpolation towards target
      body.position.lerp(grab.targetPos, 0.45, body.position);
      // Slerp quaternion
      body.quaternion = body.quaternion.clone(); // safe copy
      body.quaternion.slerp(grab.targetRot, 0.45, body.quaternion);

      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
    }

    // Step CANNON world
    this.world.step(dt);

    // Check rolling dice settling
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

      // Check if settled (after minimum roll time of 600ms)
      if (elapsed > 600 && speed < 0.15 && rotSpeed < 0.25) {
        this.rollingDice.delete(pieceId);
        const settledValue = this.determineDiceValue(piece.type, body.quaternion);
        piece.value = settledValue;
        if (this.onDiceSettledCallback) {
          this.onDiceSettledCallback(pieceId, settledValue, piece.type);
        }
      }
    }

    // Gather updates for active / moving bodies
    for (const [id, body] of this.bodies.entries()) {
      const piece = this.pieceData.get(id);
      if (!piece) continue;

      // Sync piece data position
      piece.position = { x: body.position.x, y: body.position.y, z: body.position.z };
      piece.rotation = {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      };
      piece.isSleeping = body.sleepState === CANNON.Body.SLEEPING;

      // Respawn safeguard if piece falls way below the floor
      if (body.position.y < -5) {
        body.position.set((Math.random() - 0.5) * 2, this.tableConfig.height + 0.8, (Math.random() - 0.5) * 2);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.wakeUp();
      }

      // Compact payload: round numbers to 3 decimals to save bandwidth over WebSocket
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
        val: piece.value,
      });
    }

    return updates;
  }

  // Calculate which face is pointing up for settled dice
  public determineDiceValue(type: PieceShapeType, quat: CANNON.Quaternion): number {
    const worldUp = new CANNON.Vec3(0, 1, 0);

    if (type === 'dice_d6') {
      // Standard D6 opposite faces sum to 7:
      // +Y: 1, -Y: 6
      // +Z: 2, -Z: 5
      // +X: 3, -X: 4
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
        // Transform local face normal to world space
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
      // For D20, derive a deterministic face index from the top-most vector or pseudo-random roll
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

    return 1;
  }
}
