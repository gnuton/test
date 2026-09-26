/**
 * Tabletop Nexus - 3D Renderer & Scene Manager
 * Built with Three.js for interactive browser simulation
 */

import * as THREE from 'three';
import {
  TabletopPieceData,
  CompactPieceUpdate,
  TableConfig,
  Vector3D,
  Quaternion4D,
  PlayerPresence
} from '../types.js';

export interface RendererEvents {
  onPointerMove?: (worldPos: Vector3D, isPointerActive: boolean) => void;
  onPieceHover?: (pieceId: string | null) => void;
  onPieceSelect?: (pieceId: string) => void;
  onPieceDrag?: (pieceId: string, worldPos: Vector3D) => void;
  onPieceRelease?: (pieceId: string, velocity: Vector3D) => void;
  onTableClick?: (worldPos: Vector3D) => void;
  onRulerMeasure?: (distanceInches: number, start: Vector3D, end: Vector3D) => void;
}

export class TabletopRenderer {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Meshes & Tracking
  public pieceMeshes = new Map<string, THREE.Group | THREE.Mesh>();
  public pieceTargetTransforms = new Map<
    string,
    { pos: THREE.Vector3; quat: THREE.Quaternion; value?: number }
  >();
  public playerCursorMeshes = new Map<string, THREE.Group>();

  // Table objects
  private tableGroup = new THREE.Group();
  private tableMesh: THREE.Mesh | null = null;
  private rimMeshes: THREE.Mesh[] = [];

  // Interaction & Raycasting
  public raycaster = new THREE.Raycaster();
  public mouse = new THREE.Vector2();
  public hoveredPieceId: string | null = null;
  public grabbedPieceId: string | null = null;
  private dragPlane = new THREE.Plane();
  private dragPlaneIntersect = new THREE.Vector3();
  private lastDragPos = new THREE.Vector3();
  private lastDragTime = 0;
  private dragVelocity = new THREE.Vector3();

  // Camera Orbit & Pan State
  public isOrbiting = false;
  public isPanning = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  public cameraSpherical = { radius: 24, theta: Math.PI / 4, phi: Math.PI / 3.2 };
  public cameraTarget = new THREE.Vector3(0, 2, 0);

  // Ruler / Measurement Tool
  public isRulerMode = false;
  public rulerStart: THREE.Vector3 | null = null;
  public rulerEnd: THREE.Vector3 | null = null;
  private rulerLine: THREE.Line | null = null;
  private rulerLabelMesh: THREE.Sprite | null = null;

  // Pings
  private activePings: Array<{ mesh: THREE.Mesh; createdAt: number; maxRadius: number }> = [];

  // Callbacks
  public events: RendererEvents = {};
  public currentTableConfig: TableConfig;

  private animationFrameId: number | null = null;
  private isDestroyed = false;

  constructor(container: HTMLElement, initialConfig: TableConfig) {
    this.container = container;
    this.currentTableConfig = initialConfig;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900 ambient room
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // 2. Camera
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 150);
    this.updateCameraTransform();

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // 4. Lights & Environment
    this.setupLighting();

    // 5. Build Table & Room Floor
    this.scene.add(this.tableGroup);
    this.rebuildTable(this.currentTableConfig);
    this.setupRoomFloor();

    // 6. Setup Ruler Objects
    this.setupRulerVisuals();

    // 7. Event Listeners
    this.bindEvents();

    // 8. Start Render Loop
    this.renderLoop = this.renderLoop.bind(this);
    this.renderLoop();
  }

  private setupLighting() {
    // Soft ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    // Main Overhead Softbox Light (Casts crisp shadows on felt)
    const overheadLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    overheadLight.position.set(5, 20, 8);
    overheadLight.castShadow = true;
    overheadLight.shadow.mapSize.width = 2048;
    overheadLight.shadow.mapSize.height = 2048;
    overheadLight.shadow.camera.near = 5;
    overheadLight.shadow.camera.far = 40;
    overheadLight.shadow.camera.left = -15;
    overheadLight.shadow.camera.right = 15;
    overheadLight.shadow.camera.top = 15;
    overheadLight.shadow.camera.bottom = -15;
    overheadLight.shadow.bias = -0.0005;
    overheadLight.shadow.radius = 2.5;
    this.scene.add(overheadLight);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    fillLight.position.set(-10, 12, -10);
    this.scene.add(fillLight);
  }

  private setupRoomFloor() {
    // Subtle wooden parquet or dark tiled floor below table
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle grid helper on floor
    const grid = new THREE.GridHelper(60, 30, 0x1e293b, 0x111827);
    grid.position.y = -1.98;
    this.scene.add(grid);
  }

  public rebuildTable(config: TableConfig) {
    this.currentTableConfig = config;

    // Clear previous table geometry
    while (this.tableGroup.children.length > 0) {
      const child = this.tableGroup.children[0];
      this.tableGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
    }
    this.rimMeshes = [];

    const { width, length, height, feltColor, woodColor, hasRim, shape } = config;
    const tableThickness = 0.5;
    const tableY = height - tableThickness / 2;

    // Felt Surface Material
    const feltMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(feltColor),
      roughness: 0.75,
      metalness: 0.05,
    });

    // Wood Border Material
    const woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodColor),
      roughness: 0.35,
      metalness: 0.15,
    });

    if (shape === 'oval') {
      // Cylinder for oval / circular
      const tableGeo = new THREE.CylinderGeometry(width / 2, width / 2, tableThickness, 48);
      tableGeo.scale(1, 1, length / width);
      this.tableMesh = new THREE.Mesh(tableGeo, feltMat);
      this.tableMesh.position.set(0, tableY, 0);
      this.tableMesh.receiveShadow = true;
      this.tableGroup.add(this.tableMesh);

      if (hasRim) {
        const rimGeo = new THREE.TorusGeometry(width / 2, 0.3, 16, 48);
        rimGeo.scale(1, length / width, 1);
        rimGeo.rotateX(Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, woodMat);
        rimMesh.position.set(0, height + 0.1, 0);
        rimMesh.castShadow = true;
        this.tableGroup.add(rimMesh);
      }
    } else {
      // Rectangular Table
      const tableGeo = new THREE.BoxGeometry(width, tableThickness, length);
      this.tableMesh = new THREE.Mesh(tableGeo, feltMat);
      this.tableMesh.position.set(0, tableY, 0);
      this.tableMesh.receiveShadow = true;
      this.tableGroup.add(this.tableMesh);

      // Wooden Rims
      if (hasRim) {
        const rimH = 0.45;
        const rimT = 0.35;
        const rimY = height + rimH / 2 - 0.05;

        // North & South rims
        const rimNSGeo = new THREE.BoxGeometry(width + rimT * 2, rimH, rimT);
        const northRim = new THREE.Mesh(rimNSGeo, woodMat);
        northRim.position.set(0, rimY, length / 2 + rimT / 2);
        northRim.castShadow = true;
        northRim.receiveShadow = true;
        this.tableGroup.add(northRim);
        this.rimMeshes.push(northRim);

        const southRim = new THREE.Mesh(rimNSGeo, woodMat);
        southRim.position.set(0, rimY, -length / 2 - rimT / 2);
        southRim.castShadow = true;
        southRim.receiveShadow = true;
        this.tableGroup.add(southRim);
        this.rimMeshes.push(southRim);

        // East & West rims
        const rimEWGeo = new THREE.BoxGeometry(rimT, rimH, length);
        const eastRim = new THREE.Mesh(rimEWGeo, woodMat);
        eastRim.position.set(width / 2 + rimT / 2, rimY, 0);
        eastRim.castShadow = true;
        eastRim.receiveShadow = true;
        this.tableGroup.add(eastRim);
        this.rimMeshes.push(eastRim);

        const westRim = new THREE.Mesh(rimEWGeo, woodMat);
        westRim.position.set(-width / 2 - rimT / 2, rimY, 0);
        westRim.castShadow = true;
        westRim.receiveShadow = true;
        this.tableGroup.add(westRim);
        this.rimMeshes.push(westRim);
      }
    }

    // Table Legs
    const legGeo = new THREE.CylinderGeometry(0.35, 0.25, height, 16);
    const legOffsetW = width / 2 - 1.2;
    const legOffsetL = length / 2 - 1.2;
    const legPositions = [
      [legOffsetW, legOffsetL],
      [-legOffsetW, legOffsetL],
      [legOffsetW, -legOffsetL],
      [-legOffsetW, -legOffsetL],
    ];

    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, height / 2, lz);
      leg.castShadow = true;
      this.tableGroup.add(leg);
    }
  }

  // Sync piece mesh from server definition
  public syncPiece(data: TabletopPieceData) {
    let mesh = this.pieceMeshes.get(data.id);

    if (!mesh) {
      mesh = this.createPieceMesh(data);
      this.scene.add(mesh);
      this.pieceMeshes.set(data.id, mesh);
    }

    // Set initial target transform
    this.pieceTargetTransforms.set(data.id, {
      pos: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
      quat: new THREE.Quaternion(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w),
      value: data.value,
    });

    if (!mesh.position.lengthSq()) {
      mesh.position.set(data.position.x, data.position.y, data.position.z);
      mesh.quaternion.set(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w);
    }
  }

  public removePiece(id: string) {
    const mesh = this.pieceMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.pieceMeshes.delete(id);
      this.pieceTargetTransforms.delete(id);
    }
  }

  public clearAllPieces() {
    for (const mesh of this.pieceMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.pieceMeshes.clear();
    this.pieceTargetTransforms.clear();
    this.hoveredPieceId = null;
    this.grabbedPieceId = null;
  }

  // Create high fidelity procedural 3D meshes for tabletop pieces
  private createPieceMesh(data: TabletopPieceData): THREE.Group {
    const group = new THREE.Group();
    group.name = data.id;
    (group as any).tabletopId = data.id;
    (group as any).pieceData = data;

    const baseColor = new THREE.Color(data.color || '#f1f5f9');
    const secColor = new THREE.Color(data.secondaryColor || '#0f172a');

    switch (data.type) {
      case 'dice_d6': {
        const size = data.dimensions?.x || 0.7;
        const geo = new THREE.BoxGeometry(size, size, size);

        // Generate canvas textures for the 6 faces with dots
        const materials: THREE.Material[] = [];
        const faceValues = [3, 4, 1, 6, 2, 5]; // Standard Three.js box face order (+X, -X, +Y, -Y, +Z, -Z)
        for (const val of faceValues) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;

          // Dice background with soft border
          ctx.fillStyle = data.color || '#ef4444';
          ctx.fillRect(0, 0, 128, 128);
          ctx.strokeStyle = '#ffffff33';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, 120, 120);

          // Draw pips (dots)
          ctx.fillStyle = data.color === '#f8fafc' || data.color === '#ffffff' ? '#1e293b' : '#ffffff';
          const pips = this.getD6PipCoords(val);
          for (const [px, py] of pips) {
            ctx.beginPath();
            ctx.arc(px, py, 11, 0, Math.PI * 2);
            ctx.fill();
          }

          const tex = new THREE.CanvasTexture(canvas);
          materials.push(
            new THREE.MeshStandardMaterial({
              map: tex,
              roughness: 0.25,
              metalness: 0.1,
            })
          );
        }

        const cube = new THREE.Mesh(geo, materials);
        cube.castShadow = true;
        cube.receiveShadow = true;
        group.add(cube);
        break;
      }

      case 'dice_d20': {
        const radius = (data.dimensions?.x || 0.9) / 2;
        const geo = new THREE.IcosahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.25,
          metalness: 0.2,
          flatShading: true,
        });
        const d20 = new THREE.Mesh(geo, mat);
        d20.castShadow = true;
        d20.receiveShadow = true;
        group.add(d20);
        break;
      }

      case 'dice_d4': {
        const radius = (data.dimensions?.x || 0.7) / 2;
        const geo = new THREE.TetrahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.15,
          flatShading: true,
        });
        const d4 = new THREE.Mesh(geo, mat);
        d4.castShadow = true;
        group.add(d4);
        break;
      }

      case 'dice_d8': {
        const radius = (data.dimensions?.x || 0.8) / 2;
        const geo = new THREE.OctahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.15,
          flatShading: true,
        });
        const d8 = new THREE.Mesh(geo, mat);
        d8.castShadow = true;
        group.add(d8);
        break;
      }

      case 'dice_d10':
      case 'dice_d12': {
        const radius = (data.dimensions?.x || 0.85) / 2;
        const geo = new THREE.DodecahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.15,
          flatShading: true,
        });
        const d12 = new THREE.Mesh(geo, mat);
        d12.castShadow = true;
        group.add(d12);
        break;
      }

      case 'card': {
        const w = data.dimensions?.x || 1.1;
        const h = data.dimensions?.y || 0.04;
        const d = data.dimensions?.z || 1.6;

        const geo = new THREE.BoxGeometry(w, h, d);

        // Face texture
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 256;
        faceCanvas.height = 360;
        const fctx = faceCanvas.getContext('2d')!;

        // Card front
        fctx.fillStyle = '#ffffff';
        fctx.fillRect(0, 0, 256, 360);
        fctx.strokeStyle = '#e2e8f0';
        fctx.lineWidth = 4;
        fctx.strokeRect(6, 6, 244, 348);

        // Card text / rank / suit
        const label = data.label || 'A♠';
        const isRed = label.includes('♥') || label.includes('♦') || data.secondaryColor === '#dc2626';
        fctx.fillStyle = isRed ? '#dc2626' : '#0f172a';
        fctx.font = 'bold 38px sans-serif';
        fctx.textAlign = 'left';
        fctx.fillText(label, 20, 50);

        fctx.textAlign = 'right';
        fctx.fillText(label, 236, 335);

        // Center emblem
        fctx.font = '72px sans-serif';
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        fctx.fillText(label.slice(-1) || '♠', 128, 180);

        const faceTex = new THREE.CanvasTexture(faceCanvas);

        // Back texture
        const backCanvas = document.createElement('canvas');
        backCanvas.width = 256;
        backCanvas.height = 360;
        const bctx = backCanvas.getContext('2d')!;
        bctx.fillStyle = '#1e3a8a';
        bctx.fillRect(0, 0, 256, 360);
        bctx.strokeStyle = '#f8fafc';
        bctx.lineWidth = 8;
        bctx.strokeRect(10, 10, 236, 340);
        // Ornate pattern
        bctx.fillStyle = '#2563eb';
        for (let i = 0; i < 8; i++) {
          bctx.strokeRect(20 + i * 10, 20 + i * 14, 216 - i * 20, 320 - i * 28);
        }
        const backTex = new THREE.CanvasTexture(backCanvas);

        const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.3 });
        const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.3 });

        // Materials array: [+X, -X, +Y (front), -Y (back), +Z, -Z]
        const cardMats = [sideMat, sideMat, faceMat, backMat, sideMat, sideMat];
        const cardMesh = new THREE.Mesh(geo, cardMats);
        cardMesh.castShadow = true;
        cardMesh.receiveShadow = true;
        group.add(cardMesh);
        break;
      }

      case 'card_deck': {
        const w = data.dimensions?.x || 1.15;
        const h = data.dimensions?.y || 0.6;
        const d = data.dimensions?.z || 1.65;
        const geo = new THREE.BoxGeometry(w, h, d);

        const deckMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.1,
        });
        const deckMesh = new THREE.Mesh(geo, deckMat);
        deckMesh.castShadow = true;
        deckMesh.receiveShadow = true;
        group.add(deckMesh);
        break;
      }

      case 'poker_chip': {
        const radius = (data.dimensions?.x || 0.75) / 2;
        const height = data.dimensions?.y || 0.12;

        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        // Canvas texture for top/bottom chip denomination & rim inserts
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        // Chip main color
        ctx.fillStyle = data.color || '#dc2626';
        ctx.beginPath();
        ctx.arc(128, 128, 124, 0, Math.PI * 2);
        ctx.fill();

        // Edge tick dashes
        ctx.strokeStyle = data.secondaryColor || '#ffffff';
        ctx.lineWidth = 14;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.arc(128, 128, 114, angle - 0.15, angle + 0.15);
          ctx.stroke();
        }

        // Inner circle inlay
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(128, 128, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = data.color || '#dc2626';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Denomination label
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.label || (data.value !== undefined ? `$${data.value}` : 'CHIP'), 128, 128);

        const tex = new THREE.CanvasTexture(canvas);
        const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 });
        const sideMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.3 });

        const chipMesh = new THREE.Mesh(geo, [sideMat, topMat, topMat]);
        chipMesh.castShadow = true;
        chipMesh.receiveShadow = true;
        group.add(chipMesh);
        break;
      }

      case 'meeple': {
        // Classic Carcassonne meeple using compound cylinder + spheres or extruded geometry
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.7, 16);
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const meepleMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.4,
          metalness: 0.05,
        });

        const body = new THREE.Mesh(bodyGeo, meepleMat);
        body.castShadow = true;
        body.position.y = 0;
        group.add(body);

        const head = new THREE.Mesh(headGeo, meepleMat);
        head.position.y = 0.45;
        head.castShadow = true;
        group.add(head);
        break;
      }

      case 'pawn':
      case 'chess_piece': {
        const pawnMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.35,
          metalness: 0.1,
        });

        const baseGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 16);
        const stemGeo = new THREE.CylinderGeometry(0.16, 0.25, 0.65, 16);
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);

        const base = new THREE.Mesh(baseGeo, pawnMat);
        base.position.y = 0.1;
        base.castShadow = true;
        group.add(base);

        const stem = new THREE.Mesh(stemGeo, pawnMat);
        stem.position.y = 0.5;
        stem.castShadow = true;
        group.add(stem);

        const head = new THREE.Mesh(headGeo, pawnMat);
        head.position.y = 0.95;
        head.castShadow = true;
        group.add(head);
        break;
      }

      case 'domino': {
        const w = data.dimensions?.x || 0.6;
        const h = data.dimensions?.y || 0.15;
        const d = data.dimensions?.z || 1.3;
        const geo = new THREE.BoxGeometry(w, h, d);

        const dominoMat = new THREE.MeshStandardMaterial({
          color: 0xfafafa,
          roughness: 0.2,
          metalness: 0.05,
        });
        const dominoMesh = new THREE.Mesh(geo, dominoMat);
        dominoMesh.castShadow = true;
        dominoMesh.receiveShadow = true;
        group.add(dominoMesh);
        break;
      }

      default: {
        const size = data.dimensions?.x || 0.8;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
        });
        const box = new THREE.Mesh(geo, mat);
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
        break;
      }
    }

    return group;
  }

  private getD6PipCoords(value: number): Array<[number, number]> {
    const c = 64;
    const l = 32;
    const r = 96;
    switch (value) {
      case 1:
        return [[c, c]];
      case 2:
        return [
          [l, l],
          [r, r],
        ];
      case 3:
        return [
          [l, l],
          [c, c],
          [r, r],
        ];
      case 4:
        return [
          [l, l],
          [r, l],
          [l, r],
          [r, r],
        ];
      case 5:
        return [
          [l, l],
          [r, l],
          [c, c],
          [l, r],
          [r, r],
        ];
      case 6:
        return [
          [l, l],
          [r, l],
          [l, c],
          [r, c],
          [l, r],
          [r, r],
        ];
      default:
        return [[c, c]];
    }
  }

  // Ruler setup
  private setupRulerVisuals() {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      depthTest: false,
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    this.rulerLine = new THREE.Line(lineGeo, lineMat);
    this.rulerLine.renderOrder = 999;
    this.rulerLine.visible = false;
    this.scene.add(this.rulerLine);

    // Sprite label for distance display
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: labelTex, depthTest: false });
    this.rulerLabelMesh = new THREE.Sprite(spriteMat);
    this.rulerLabelMesh.scale.set(4, 1, 1);
    this.rulerLabelMesh.renderOrder = 1000;
    this.rulerLabelMesh.visible = false;
    this.scene.add(this.rulerLabelMesh);
  }

  public updateRuler(start: THREE.Vector3, end: THREE.Vector3) {
    if (!this.rulerLine || !this.rulerLabelMesh) return;

    this.rulerStart = start;
    this.rulerEnd = end;

    const points = [
      new THREE.Vector3(start.x, start.y + 0.05, start.z),
      new THREE.Vector3(end.x, end.y + 0.05, end.z),
    ];
    this.rulerLine.geometry.setFromPoints(points);
    this.rulerLine.visible = true;

    // Calculate distance
    const distUnits = start.distanceTo(end);
    const inches = (distUnits * 3.5).toFixed(1);
    const cm = (distUnits * 8.9).toFixed(1);

    // Update sprite label text
    const canvas = (this.rulerLabelMesh.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);

    // Badge bubble
    ctx.fillStyle = '#0f172ae6';
    ctx.roundRect(10, 8, 236, 48, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.roundRect(10, 8, 236, 48, 12);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📏 ${inches}" (${cm} cm)`, 128, 32);

    this.rulerLabelMesh.material.map!.needsUpdate = true;
    this.rulerLabelMesh.position.set(
      (start.x + end.x) / 2,
      Math.max(start.y, end.y) + 0.8,
      (start.z + end.z) / 2
    );
    this.rulerLabelMesh.visible = true;

    if (this.events.onRulerMeasure) {
      this.events.onRulerMeasure(parseFloat(inches), start, end);
    }
  }

  public clearRuler() {
    this.rulerStart = null;
    this.rulerEnd = null;
    if (this.rulerLine) this.rulerLine.visible = false;
    if (this.rulerLabelMesh) this.rulerLabelMesh.visible = false;
  }

  // Ping ripple in 3D
  public triggerPing(pos: Vector3D, colorHex: string = '#38bdf8') {
    const ringGeo = new THREE.RingGeometry(0.1, 0.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.05, pos.z);
    this.scene.add(ring);

    this.activePings.push({
      mesh: ring,
      createdAt: Date.now(),
      maxRadius: 2.5,
    });
  }

  // Remote player cursor sync
  public syncPlayerCursors(players: PlayerPresence[], localPlayerId: string) {
    const activePlayerIds = new Set<string>();

    for (const p of players) {
      if (p.id === localPlayerId) continue;
      activePlayerIds.add(p.id);

      let group = this.playerCursorMeshes.get(p.id);
      if (!group) {
        group = this.createPlayerPointerMesh(p);
        this.scene.add(group);
        this.playerCursorMeshes.set(p.id, group);
      }

      // Smooth lerp to player cursor position
      group.position.lerp(new THREE.Vector3(p.cursor.x, p.cursor.y, p.cursor.z), 0.4);
    }

    // Clean up disconnected players
    for (const [id, mesh] of this.playerCursorMeshes.entries()) {
      if (!activePlayerIds.has(id)) {
        this.scene.remove(mesh);
        this.playerCursorMeshes.delete(id);
      }
    }
  }

  private createPlayerPointerMesh(player: PlayerPresence): THREE.Group {
    const group = new THREE.Group();
    const pColor = new THREE.Color(player.color || '#38bdf8');

    // 3D Pointer Cone
    const coneGeo = new THREE.ConeGeometry(0.25, 0.7, 16);
    coneGeo.rotateX(Math.PI);
    const coneMat = new THREE.MeshStandardMaterial({
      color: pColor,
      roughness: 0.2,
      emissive: pColor,
      emissiveIntensity: 0.3,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.35;
    group.add(cone);

    // Laser beam pointing down to table
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: pColor,
      transparent: true,
      opacity: 0.4,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -1;
    group.add(beam);

    // Player Name Sprite billboard
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172acc';
    ctx.roundRect(10, 8, 236, 48, 10);
    ctx.fill();
    ctx.strokeStyle = player.color || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.roundRect(10, 8, 236, 48, 10);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 0.75, 1);
    sprite.position.y = 1.1;
    group.add(sprite);

    return group;
  }

  // Ingest server physics updates
  public applyPhysicsUpdates(updates: CompactPieceUpdate[]) {
    for (const u of updates) {
      const target = this.pieceTargetTransforms.get(u.id);
      if (target) {
        target.pos.set(u.p[0], u.p[1], u.p[2]);
        target.quat.set(u.r[0], u.r[1], u.r[2], u.r[3]);
        if (u.val !== undefined) target.value = u.val;
      }
    }
  }

  // Camera Orbit, Pan, and Smooth update
  public updateCameraTransform() {
    const { radius, theta, phi } = this.cameraSpherical;
    const x = this.cameraTarget.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = this.cameraTarget.y + radius * Math.cos(phi);
    const z = this.cameraTarget.z + radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  public setCameraPreset(preset: 'top_down' | 'seat_north' | 'seat_south' | 'free') {
    switch (preset) {
      case 'top_down':
        this.cameraSpherical.radius = 22;
        this.cameraSpherical.theta = 0;
        this.cameraSpherical.phi = 0.05; // almost straight down
        this.cameraTarget.set(0, 2, 0);
        break;
      case 'seat_south':
        this.cameraSpherical.radius = 18;
        this.cameraSpherical.theta = 0;
        this.cameraSpherical.phi = Math.PI / 3;
        this.cameraTarget.set(0, 2, 2);
        break;
      case 'seat_north':
        this.cameraSpherical.radius = 18;
        this.cameraSpherical.theta = Math.PI;
        this.cameraSpherical.phi = Math.PI / 3;
        this.cameraTarget.set(0, 2, -2);
        break;
      case 'free':
      default:
        this.cameraSpherical.radius = 24;
        this.cameraSpherical.theta = Math.PI / 4;
        this.cameraSpherical.phi = Math.PI / 3.2;
        this.cameraTarget.set(0, 2, 0);
        break;
    }
    this.updateCameraTransform();
  }

  // Pointer & Drag Event Handling
  private bindEvents() {
    const dom = this.renderer.domElement;

    // Context menu disable so right click orbits cleanly
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pointer Down
    dom.addEventListener('pointerdown', (e) => {
      this.updateMouseCoords(e);
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      // Right Click or Alt + Click: Orbit camera
      if (e.button === 2 || (e.button === 0 && e.altKey)) {
        this.isOrbiting = true;
        dom.setPointerCapture(e.pointerId);
        return;
      }

      // Middle Click or Shift + Right Click: Pan camera
      if (e.button === 1 || (e.button === 2 && e.shiftKey)) {
        this.isPanning = true;
        dom.setPointerCapture(e.pointerId);
        return;
      }

      // Left Click: Ruler or Piece interaction
      if (e.button === 0) {
        const tableHit = this.raycastTable();

        if (this.isRulerMode) {
          if (tableHit) {
            this.rulerStart = tableHit.clone();
            this.rulerEnd = tableHit.clone();
            this.updateRuler(this.rulerStart, this.rulerEnd);
            dom.setPointerCapture(e.pointerId);
          }
          return;
        }

        // Raycast pieces
        const pieceHit = this.raycastPieces();
        if (pieceHit) {
          const pieceId = (pieceHit as any).tabletopId;
          this.grabbedPieceId = pieceId;

          // Setup drag plane horizontally at piece height + hover elevation
          const pieceY = pieceHit.position.y + 0.6;
          this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, pieceY, 0)
          );

          this.lastDragPos.copy(pieceHit.position);
          this.lastDragTime = Date.now();
          this.dragVelocity.set(0, 0, 0);

          if (this.events.onPieceSelect) {
            this.events.onPieceSelect(pieceId);
          }
          dom.setPointerCapture(e.pointerId);
        } else if (tableHit && this.events.onTableClick) {
          this.events.onTableClick({ x: tableHit.x, y: tableHit.y, z: tableHit.z });
        }
      }
    });

    // Pointer Move
    dom.addEventListener('pointermove', (e) => {
      this.updateMouseCoords(e);
      const dx = e.clientX - this.prevPointerX;
      const dy = e.clientY - this.prevPointerY;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      if (this.isOrbiting) {
        this.cameraSpherical.theta -= dx * 0.006;
        this.cameraSpherical.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, this.cameraSpherical.phi - dy * 0.006)
        );
        this.updateCameraTransform();
        return;
      }

      if (this.isPanning) {
        const panSpeed = 0.02 * (this.cameraSpherical.radius / 20);
        // Tangent vectors
        const forward = new THREE.Vector3()
          .subVectors(this.cameraTarget, this.camera.position)
          .setY(0)
          .normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        this.cameraTarget.addScaledVector(right, -dx * panSpeed);
        this.cameraTarget.addScaledVector(forward, dy * panSpeed);
        this.updateCameraTransform();
        return;
      }

      // Ruler dragging
      if (this.isRulerMode && this.rulerStart) {
        const hit = this.raycastTable();
        if (hit) {
          this.updateRuler(this.rulerStart, hit);
        }
        return;
      }

      // Dragging a grabbed piece
      if (this.grabbedPieceId) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPlaneIntersect)) {
          // Clamp to table area + margin
          const maxX = this.currentTableConfig.width / 2 + 1.5;
          const maxZ = this.currentTableConfig.length / 2 + 1.5;
          const clampedX = Math.max(-maxX, Math.min(maxX, this.dragPlaneIntersect.x));
          const clampedZ = Math.max(-maxZ, Math.min(maxZ, this.dragPlaneIntersect.z));

          const targetPos = new THREE.Vector3(clampedX, this.dragPlaneIntersect.y, clampedZ);

          // Update local predictive mesh position for instant responsiveness
          const mesh = this.pieceMeshes.get(this.grabbedPieceId);
          if (mesh) {
            mesh.position.copy(targetPos);
          }

          // Calculate throw velocity
          const now = Date.now();
          const dt = Math.max(0.01, (now - this.lastDragTime) / 1000);
          this.dragVelocity.subVectors(targetPos, this.lastDragPos).divideScalar(dt);
          this.lastDragPos.copy(targetPos);
          this.lastDragTime = now;

          if (this.events.onPieceDrag) {
            this.events.onPieceDrag(this.grabbedPieceId, {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
            });
          }
        }
        return;
      }

      // Hover detection & pointer broadcast
      const tableHit = this.raycastTable();
      if (tableHit && this.events.onPointerMove) {
        this.events.onPointerMove(
          { x: tableHit.x, y: tableHit.y, z: tableHit.z },
          false
        );
      }

      const pieceHit = this.raycastPieces();
      const newHoverId = pieceHit ? (pieceHit as any).tabletopId : null;
      if (newHoverId !== this.hoveredPieceId) {
        this.hoveredPieceId = newHoverId;
        dom.style.cursor = newHoverId ? 'grab' : this.isRulerMode ? 'crosshair' : 'default';
        if (this.events.onPieceHover) {
          this.events.onPieceHover(newHoverId);
        }
      }
    });

    // Pointer Up
    dom.addEventListener('pointerup', (e) => {
      if (this.isOrbiting) {
        this.isOrbiting = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      if (this.isPanning) {
        this.isPanning = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      if (this.grabbedPieceId) {
        const releasedId = this.grabbedPieceId;
        this.grabbedPieceId = null;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (this.events.onPieceRelease) {
          this.events.onPieceRelease(releasedId, {
            x: this.dragVelocity.x,
            y: this.dragVelocity.y,
            z: this.dragVelocity.z,
          });
        }
      }

      if (this.isRulerMode && this.rulerStart) {
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    });

    // Zoom (Wheel)
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.02;
        this.cameraSpherical.radius = Math.max(
          5,
          Math.min(50, this.cameraSpherical.radius + zoomDelta)
        );
        this.updateCameraTransform();
      },
      { passive: false }
    );

    // Resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private updateMouseCoords(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  private raycastPieces(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.pieceMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !(obj as any).tabletopId && obj.parent) {
        obj = obj.parent;
      }
      return obj && (obj as any).tabletopId ? obj : null;
    }
    return null;
  }

  private raycastTable(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.tableMesh) {
      const hits = this.raycaster.intersectObject(this.tableMesh, false);
      if (hits.length > 0) {
        return hits[0].point;
      }
    }
    // Fallback plane at table height
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.currentTableConfig.height);
    const pt = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, pt);
  }

  public handleResize() {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Animation Loop: Interpolation & Rendering
  private renderLoop() {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.renderLoop);

    // Smoothly interpolate pieces towards server authoritative positions
    for (const [id, mesh] of this.pieceMeshes.entries()) {
      // Don't interpolate the locally dragged piece since player is controlling it in real-time
      if (id === this.grabbedPieceId) continue;

      const target = this.pieceTargetTransforms.get(id);
      if (target) {
        mesh.position.lerp(target.pos, 0.4);
        mesh.quaternion.slerp(target.quat, 0.4);
      }
    }

    // Update active ping ripples
    const now = Date.now();
    for (let i = this.activePings.length - 1; i >= 0; i--) {
      const ping = this.activePings[i];
      const elapsed = (now - ping.createdAt) / 1000;
      if (elapsed > 1.2) {
        this.scene.remove(ping.mesh);
        (ping.mesh.geometry as any).dispose();
        (ping.mesh.material as any).dispose();
        this.activePings.splice(i, 1);
      } else {
        const scale = 1 + elapsed * ping.maxRadius;
        ping.mesh.scale.set(scale, scale, 1);
        (ping.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - elapsed / 1.2);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
