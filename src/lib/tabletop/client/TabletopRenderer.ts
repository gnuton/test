/**
 * Tabletop Nexus - 3D Renderer & Scene Manager
 * Full Tabletop Simulator Features
 */

import * as THREE from 'three';
import {
  TabletopPieceData,
  CompactPieceUpdate,
  TableConfig,
  Vector3D,
  PlayerPresence,
  ToolMode,
  DrawingStroke,
  EnvironmentTheme,
  SnapPoint,
  JointData,
  TextLabel,
  DecalData,
  CameraBookmark,
  calculateDeckHeight,
  calculateDeckHeightFromMetadata
} from '../types.js';

export interface RendererEvents {
  onPointerMove?: (worldPos: Vector3D, isPointerActive: boolean) => void;
  onPieceHover?: (pieceId: string | null) => void;
  onPieceSelect?: (pieceId: string) => void;
  onSelectionChange?: (selectedPieceIds: string[]) => void;
  onBoxSelectChange?: (box: { x1: number; y1: number; x2: number; y2: number; active: boolean }) => void;
  onPieceDrag?: (pieceId: string, worldPos: Vector3D) => void;
  onMultiPieceDrag?: (updates: Array<{ pieceId: string; worldPos: Vector3D }>) => void;
  onPieceRelease?: (pieceId: string, velocity: Vector3D) => void;
  onMultiPieceRelease?: (releases: Array<{ pieceId: string; velocity: Vector3D }>) => void;
  onContextMenu?: (info: { pieceId?: string; pieceData?: TabletopPieceData; screenX: number; screenY: number }) => void;
  onTableClick?: (worldPos: Vector3D) => void;
  onRulerMeasure?: (distanceInches: number, start: Vector3D, end: Vector3D) => void;
  onFlickRelease?: (pieceId: string, impulse: Vector3D) => void;
  onStrokeDrawn?: (stroke: DrawingStroke) => void;
  onCounterClick?: (pieceId: string, delta: number) => void;
  onPieceInspect?: (piece: TabletopPieceData | null) => void;
  onStackPieces?: (sourcePieceIds: string[], targetPieceId: string) => void;
}

export class TabletopRenderer {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public pieceMeshes = new Map<string, THREE.Group | THREE.Mesh>();
  public pieceTargetTransforms = new Map<
    string,
    { pos: THREE.Vector3; quat: THREE.Quaternion; value?: number; isLocked?: boolean }
  >();
  public playerCursorMeshes = new Map<string, THREE.Group>();

  // Selection & Multi-Selection
  public selectedPieceIds = new Set<string>();
  public isBoxSelecting = false;
  public boxSelectStart = { x: 0, y: 0 };
  public boxSelectCurrent = { x: 0, y: 0 };
  public boxSelectInitialSelection = new Set<string>();
  public boxSelectAccumulated = new Set<string>();
  public selectionHighlightGroup = new THREE.Group();
  private selectionHighlightMeshes = new Map<string, THREE.Mesh>();
  private multiDragOffsets = new Map<string, THREE.Vector3>();
  private tabletopiaRingTexture: THREE.CanvasTexture | null = null;

  // Right-click context click detection
  private rightClickStartPos: { x: number; y: number } | null = null;
  private rightClickStartTime = 0;

  // Snap Points, Joints, Text Labels & Decals
  public snapPointMeshes = new Map<string, THREE.Group>();
  public textLabelMeshes = new Map<string, THREE.Sprite>();
  public decalMeshes = new Map<string, THREE.Mesh>();
  public jointLinesGroup = new THREE.Group();

  // Camera Bookmarks & Hotkeys
  public cameraBookmarks: CameraBookmark[] = [];
  public rotationSnapAngle: number = 45;

  // Table & Environment
  private tableGroup = new THREE.Group();
  private tableMesh: THREE.Mesh | null = null;
  private rimMeshes: THREE.Mesh[] = [];
  private gridMesh: THREE.LineSegments | null = null;
  private environmentGroup = new THREE.Group();

  // Vector Paint Canvas Texture on Felt
  private paintCanvas: HTMLCanvasElement;
  private paintCtx: CanvasRenderingContext2D;
  private paintTexture: THREE.CanvasTexture;
  private currentDrawingPoints: [number, number][] = [];
  public paintColor: string = '#ef4444';
  public paintBrushSize: number = 4;
  public isErasing: boolean = false;

  // Interaction & Raycasting
  public raycaster = new THREE.Raycaster();
  public mouse = new THREE.Vector2();
  public hoveredPieceId: string | null = null;
  public grabbedPieceId: string | null = null;
  private currentDraggedY: number | null = null;
  public activeStackTargetId: string | null = null;
  private stackGuideMesh: THREE.Mesh | null = null;
  private dragPlane = new THREE.Plane();
  private dragPlaneIntersect = new THREE.Vector3();
  private lastDragPos = new THREE.Vector3();
  private lastDragTime = 0;
  private dragVelocity = new THREE.Vector3();

  // Tool Modes & Flick State
  public currentTool: ToolMode = 'grab';
  private flickStartPos: THREE.Vector3 | null = null;
  private flickTargetPieceId: string | null = null;
  private flickArrowMesh: THREE.ArrowHelper | null = null;

  // 3D Transform Gizmo State (F9 Tool)
  public gizmoGroup = new THREE.Group();
  public gizmoTargetPieceId: string | null = null;
  public activeGizmoAxis: 'x' | 'y' | 'z' | 'rotY' | null = null;
  public hoveredGizmoAxis: 'x' | 'y' | 'z' | 'rotY' | null = null;
  private gizmoHandles: Array<{ name: 'x' | 'y' | 'z' | 'rotY'; mesh: THREE.Mesh | THREE.Group; mat: THREE.MeshStandardMaterial; origColor: number; highlightColor: number }> = [];
  private gizmoDragStartPoint = new THREE.Vector3();
  private gizmoDragStartScreen = { x: 0, y: 0 };
  private gizmoPieceStartPos = new THREE.Vector3();
  private gizmoPieceStartRot = new THREE.Quaternion();
  private gizmoDragPlane = new THREE.Plane();

  // Camera State
  public isOrbiting = false;
  public isPanning = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  public cameraSpherical = { radius: 24, theta: Math.PI / 4, phi: Math.PI / 3.2 };
  public cameraTarget = new THREE.Vector3(0, 2, 0);

  // Ruler Tool
  public rulerStart: THREE.Vector3 | null = null;
  public rulerEnd: THREE.Vector3 | null = null;
  private rulerLine: THREE.Line | null = null;
  private rulerLabelMesh: THREE.Sprite | null = null;

  // Hand Zones
  private handZoneMeshes: THREE.Mesh[] = [];

  // Pings
  private activePings: Array<{ mesh: THREE.Mesh; createdAt: number; maxRadius: number }> = [];

  // Events & Config
  public events: RendererEvents = {};
  public currentTableConfig: TableConfig;
  public isAltPressed: boolean = false;

  private animationFrameId: number | null = null;
  private isDestroyed = false;

  constructor(container: HTMLElement, initialConfig: TableConfig) {
    this.container = container;
    this.currentTableConfig = initialConfig;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.add(this.environmentGroup);

    // 2. Camera
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 150);
    this.updateCameraTransform();

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. Vector Paint Texture
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = 2048;
    this.paintCanvas.height = 2048;
    this.paintCtx = this.paintCanvas.getContext('2d')!;
    this.paintCtx.lineCap = 'round';
    this.paintCtx.lineJoin = 'round';
    this.paintTexture = new THREE.CanvasTexture(this.paintCanvas);

    // 5. Lights & Environment
    this.setupLighting();
    this.applyEnvironment(this.currentTableConfig.environment || 'studio');

    // 6. Table & Visuals
    this.scene.add(this.tableGroup);
    this.scene.add(this.selectionHighlightGroup);
    this.rebuildTable(this.currentTableConfig);
    this.setupRulerVisuals();
    this.setupFlickArrow();
    this.setupStackGuide();
    this.setupTransformGizmo();

    // 7. Bind Events
    this.bindEvents();

    // 8. Render Loop
    this.renderLoop = this.renderLoop.bind(this);
    this.renderLoop();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const overheadLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    overheadLight.position.set(5, 20, 8);
    overheadLight.castShadow = true;
    overheadLight.shadow.mapSize.width = 2048;
    overheadLight.shadow.mapSize.height = 2048;
    overheadLight.shadow.camera.near = 5;
    overheadLight.shadow.camera.far = 40;
    overheadLight.shadow.camera.left = -16;
    overheadLight.shadow.camera.right = 16;
    overheadLight.shadow.camera.top = 16;
    overheadLight.shadow.camera.bottom = -16;
    overheadLight.shadow.bias = -0.0005;
    overheadLight.shadow.radius = 2.5;
    this.scene.add(overheadLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    fillLight.position.set(-10, 12, -10);
    this.scene.add(fillLight);
  }

  public applyEnvironment(env: EnvironmentTheme) {
    this.currentTableConfig.environment = env;

    while (this.environmentGroup.children.length > 0) {
      const child = this.environmentGroup.children[0];
      this.environmentGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
    }

    switch (env) {
      case 'tavern': {
        this.scene.background = new THREE.Color(0x181008);
        this.scene.fog = new THREE.FogExp2(0x181008, 0.02);

        // Warm tavern wooden floor & timber pillars
        const floorGeo = new THREE.PlaneGeometry(80, 80);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.9 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        this.environmentGroup.add(floor);
        break;
      }

      case 'space': {
        this.scene.background = new THREE.Color(0x030712);
        this.scene.fog = new THREE.FogExp2(0x030712, 0.012);

        // Starfield particles
        const starCount = 600;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i += 3) {
          starPositions[i] = (Math.random() - 0.5) * 120;
          starPositions[i + 1] = Math.random() * 50 - 5;
          starPositions[i + 2] = (Math.random() - 0.5) * 120;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.8, transparent: true, opacity: 0.8 });
        const stars = new THREE.Points(starGeo, starMat);
        this.environmentGroup.add(stars);
        break;
      }

      case 'penthouse': {
        this.scene.background = new THREE.Color(0x090d16);
        this.scene.fog = new THREE.FogExp2(0x090d16, 0.015);

        const floorGeo = new THREE.PlaneGeometry(80, 80);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.4, metalness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        this.environmentGroup.add(floor);
        break;
      }

      case 'forest': {
        this.scene.background = new THREE.Color(0x061e12);
        this.scene.fog = new THREE.FogExp2(0x061e12, 0.02);

        const floorGeo = new THREE.PlaneGeometry(80, 80);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a2416, roughness: 0.95 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        this.environmentGroup.add(floor);
        break;
      }

      case 'studio':
      default: {
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

        const floorGeo = new THREE.PlaneGeometry(80, 80);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.85 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        this.environmentGroup.add(floor);

        const grid = new THREE.GridHelper(60, 30, 0x1e293b, 0x111827);
        grid.position.y = -1.98;
        this.environmentGroup.add(grid);
        break;
      }
    }
  }

  public rebuildTable(config: TableConfig) {
    this.currentTableConfig = config;

    while (this.tableGroup.children.length > 0) {
      const child = this.tableGroup.children[0];
      this.tableGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
    }
    this.rimMeshes = [];

    const { width, length, height, feltColor, woodColor, hasRim, shape } = config;
    const tableThickness = 0.5;
    const tableY = height - tableThickness / 2;

    const feltMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(feltColor),
      roughness: 0.75,
      metalness: 0.05,
      map: this.paintTexture, // Overlay Vector Paint drawing strokes
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodColor),
      roughness: 0.35,
      metalness: 0.15,
    });

    if (shape === 'oval') {
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
      const tableGeo = new THREE.BoxGeometry(width, tableThickness, length);
      this.tableMesh = new THREE.Mesh(tableGeo, feltMat);
      this.tableMesh.position.set(0, tableY, 0);
      this.tableMesh.receiveShadow = true;
      this.tableGroup.add(this.tableMesh);

      if (hasRim) {
        const rimH = 0.45;
        const rimT = 0.35;
        const rimY = height + rimH / 2 - 0.05;

        const rimNSGeo = new THREE.BoxGeometry(width + rimT * 2, rimH, rimT);
        const northRim = new THREE.Mesh(rimNSGeo, woodMat);
        northRim.position.set(0, rimY, length / 2 + rimT / 2);
        northRim.castShadow = true;
        this.tableGroup.add(northRim);

        const southRim = new THREE.Mesh(rimNSGeo, woodMat);
        southRim.position.set(0, rimY, -length / 2 - rimT / 2);
        southRim.castShadow = true;
        this.tableGroup.add(southRim);

        const rimEWGeo = new THREE.BoxGeometry(rimT, rimH, length);
        const eastRim = new THREE.Mesh(rimEWGeo, woodMat);
        eastRim.position.set(width / 2 + rimT / 2, rimY, 0);
        eastRim.castShadow = true;
        this.tableGroup.add(eastRim);

        const westRim = new THREE.Mesh(rimEWGeo, woodMat);
        westRim.position.set(-width / 2 - rimT / 2, rimY, 0);
        westRim.castShadow = true;
        this.tableGroup.add(westRim);
      }
    }

    // Legs
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

    // Grid Overlay
    this.updateGridVisuals();

    // Hand Zones
    this.rebuildHandZones();
  }

  // TTS Grid Overlay on Table Surface
  public updateGridVisuals() {
    if (this.gridMesh) {
      this.tableGroup.remove(this.gridMesh);
      this.gridMesh.geometry.dispose();
      (this.gridMesh.material as THREE.Material).dispose();
      this.gridMesh = null;
    }

    if (!this.currentTableConfig.grid?.enabled) return;

    const { width, length, height, grid } = this.currentTableConfig;
    const size = grid.size || 1.5;
    const halfW = width / 2 - 0.2;
    const halfL = length / 2 - 0.2;
    const y = height + 0.01;

    const linePoints: THREE.Vector3[] = [];

    // X lines
    for (let x = -halfW; x <= halfW; x += size) {
      linePoints.push(new THREE.Vector3(x, y, -halfL));
      linePoints.push(new THREE.Vector3(x, y, halfL));
    }
    // Z lines
    for (let z = -halfL; z <= halfL; z += size) {
      linePoints.push(new THREE.Vector3(-halfW, y, z));
      linePoints.push(new THREE.Vector3(halfW, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(grid.color || '#38bdf8'),
      transparent: true,
      opacity: grid.opacity || 0.35,
      depthWrite: false,
    });
    this.gridMesh = new THREE.LineSegments(geo, mat);
    this.tableGroup.add(this.gridMesh);
  }

  // TTS Hand Zones around table
  private rebuildHandZones() {
    for (const zone of this.handZoneMeshes) {
      this.tableGroup.remove(zone);
      zone.geometry.dispose();
      (zone.material as THREE.Material).dispose();
    }
    this.handZoneMeshes = [];

    const { width, length, height } = this.currentTableConfig;
    const zoneConfigs = [
      { name: 'Seat 1 (South)', color: '#ef4444', x: 0, z: length / 2 - 1.2, w: 8, d: 2 },
      { name: 'Seat 2 (North)', color: '#3b82f6', x: 0, z: -length / 2 + 1.2, w: 8, d: 2 },
      { name: 'Seat 3 (West)', color: '#10b981', x: -width / 2 + 1.2, z: 0, w: 2, d: 8 },
      { name: 'Seat 4 (East)', color: '#f59e0b', x: width / 2 - 1.2, z: 0, w: 2, d: 8 },
    ];

    for (const z of zoneConfigs) {
      const geo = new THREE.PlaneGeometry(z.w, z.d);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(z.color),
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(z.x, height + 0.015, z.z);
      this.tableGroup.add(mesh);
      this.handZoneMeshes.push(mesh);
    }
  }

  // TTS Vector Paint: Ingest Server Strokes
  public applyStrokes(strokes: DrawingStroke[]) {
    const { width, length } = this.currentTableConfig;
    this.paintCtx.clearRect(0, 0, this.paintCanvas.width, this.paintCanvas.height);

    for (const s of strokes) {
      if (s.points.length < 2) continue;
      this.paintCtx.strokeStyle = s.color;
      this.paintCtx.lineWidth = s.size * 2;
      this.paintCtx.beginPath();

      s.points.forEach(([tx, tz], i) => {
        const cx = ((tx + width / 2) / width) * this.paintCanvas.width;
        const cy = ((tz + length / 2) / length) * this.paintCanvas.height;
        if (i === 0) this.paintCtx.moveTo(cx, cy);
        else this.paintCtx.lineTo(cx, cy);
      });
      this.paintCtx.stroke();
    }
    this.paintTexture.needsUpdate = true;
  }

  public clearPaint() {
    this.paintCtx.clearRect(0, 0, this.paintCanvas.width, this.paintCanvas.height);
    this.paintTexture.needsUpdate = true;
  }

  // Flick Arrow Helper
  private setupFlickArrow() {
    const dir = new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(0, 0, 0);
    this.flickArrowMesh = new THREE.ArrowHelper(dir, origin, 2, 0xef4444, 0.4, 0.3);
    this.flickArrowMesh.visible = false;
    this.scene.add(this.flickArrowMesh);
  }

  private updateFlickVisuals(start: THREE.Vector3, current: THREE.Vector3) {
    if (!this.flickArrowMesh) return;
    const diff = new THREE.Vector3().subVectors(start, current);
    const dist = diff.length();
    if (dist < 0.2) {
      this.flickArrowMesh.visible = false;
      return;
    }
    const dir = diff.clone().normalize();
    this.flickArrowMesh.setDirection(dir);
    this.flickArrowMesh.setLength(Math.min(6, dist * 1.5), 0.4, 0.25);
    this.flickArrowMesh.position.set(start.x, start.y + 0.2, start.z);
    this.flickArrowMesh.visible = true;
  }

  // 3D Transform Gizmo Setup (F9 Tool)
  private setupTransformGizmo() {
    this.gizmoGroup = new THREE.Group();
    this.gizmoGroup.visible = false;
    this.gizmoHandles = [];

    // Shaft & Head geometries
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 16);
    const coneGeo = new THREE.ConeGeometry(0.13, 0.38, 16);

    // X Axis: Red
    const xGroup = new THREE.Group();
    const xMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.2 });
    const xShaft = new THREE.Mesh(shaftGeo, xMat);
    xShaft.rotation.z = -Math.PI / 2;
    xShaft.position.x = 0.65;
    const xCone = new THREE.Mesh(coneGeo, xMat);
    xCone.rotation.z = -Math.PI / 2;
    xCone.position.x = 1.3 + 0.19;
    xGroup.add(xShaft);
    xGroup.add(xCone);
    (xGroup as any).gizmoAxis = 'x';
    this.gizmoGroup.add(xGroup);
    this.gizmoHandles.push({ name: 'x', mesh: xGroup, mat: xMat, origColor: 0xef4444, highlightColor: 0xfca5a5 });

    // Y Axis: Green
    const yGroup = new THREE.Group();
    const yMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 });
    const yShaft = new THREE.Mesh(shaftGeo, yMat);
    yShaft.position.y = 0.65;
    const yCone = new THREE.Mesh(coneGeo, yMat);
    yCone.position.y = 1.3 + 0.19;
    yGroup.add(yShaft);
    yGroup.add(yCone);
    (yGroup as any).gizmoAxis = 'y';
    this.gizmoGroup.add(yGroup);
    this.gizmoHandles.push({ name: 'y', mesh: yGroup, mat: yMat, origColor: 0x10b981, highlightColor: 0x6ee7b7 });

    // Z Axis: Blue
    const zGroup = new THREE.Group();
    const zMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.2 });
    const zShaft = new THREE.Mesh(shaftGeo, zMat);
    zShaft.rotation.x = Math.PI / 2;
    zShaft.position.z = 0.65;
    const zCone = new THREE.Mesh(coneGeo, zMat);
    zCone.rotation.x = Math.PI / 2;
    zCone.position.z = 1.3 + 0.19;
    zGroup.add(zShaft);
    zGroup.add(zCone);
    (zGroup as any).gizmoAxis = 'z';
    this.gizmoGroup.add(zGroup);
    this.gizmoHandles.push({ name: 'z', mesh: zGroup, mat: zMat, origColor: 0x3b82f6, highlightColor: 0x93c5fd });

    // Rotation Ring around Y: Yellow
    const rotGeo = new THREE.TorusGeometry(1.6, 0.045, 16, 48);
    rotGeo.rotateX(Math.PI / 2);
    const rotMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.2 });
    const rotMesh = new THREE.Mesh(rotGeo, rotMat);
    (rotMesh as any).gizmoAxis = 'rotY';
    this.gizmoGroup.add(rotMesh);
    this.gizmoHandles.push({ name: 'rotY', mesh: rotMesh, mat: rotMat, origColor: 0xeab308, highlightColor: 0xfef08a });

    this.scene.add(this.gizmoGroup);
  }

  private raycastGizmo(): 'x' | 'y' | 'z' | 'rotY' | null {
    if (!this.gizmoGroup.visible) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hitObjects: THREE.Object3D[] = [];
    for (const h of this.gizmoHandles) {
      if (h.mesh instanceof THREE.Group) {
        hitObjects.push(...h.mesh.children);
      } else {
        hitObjects.push(h.mesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(hitObjects, true);
    if (intersects.length > 0) {
      let cur: THREE.Object3D | null = intersects[0].object;
      while (cur && cur !== this.gizmoGroup) {
        if ((cur as any).gizmoAxis) {
          return (cur as any).gizmoAxis as 'x' | 'y' | 'z' | 'rotY';
        }
        cur = cur.parent;
      }
    }
    return null;
  }

  private updateGizmoHoverColors() {
    for (const h of this.gizmoHandles) {
      if (h.name === this.hoveredGizmoAxis || h.name === this.activeGizmoAxis) {
        h.mat.color.setHex(h.highlightColor);
      } else {
        h.mat.color.setHex(h.origColor);
      }
    }
  }

  // Sync piece mesh from server definition
  public syncPiece(data: TabletopPieceData) {
    let mesh = this.pieceMeshes.get(data.id);

    // If deck card count changed, dynamically scale the 3D model height!
    if (mesh && data.type === 'card_deck') {
      const oldPiece = (mesh as any).pieceData as TabletopPieceData | undefined;
      const oldCount = oldPiece?.metadata?.cards?.length ?? oldPiece?.value;
      const newCount = data.metadata?.cards?.length ?? data.value;
      if (oldCount !== newCount) {
        (mesh as any).pieceData = data;
        this.scaleDeckModelHeight(data.id, newCount);
      }
    }

    if (!mesh) {
      mesh = this.createPieceMesh(data);
      this.scene.add(mesh);
      this.pieceMeshes.set(data.id, mesh);
    }

    (mesh as any).pieceData = data;

    this.pieceTargetTransforms.set(data.id, {
      pos: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
      quat: new THREE.Quaternion(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w),
      value: data.value,
      isLocked: data.isLocked,
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

  // Create 3D meshes for all pieces (including Counter, Custom Token, Text Label)
  private createPieceMesh(data: TabletopPieceData): THREE.Group {
    const group = new THREE.Group();
    group.name = data.id;
    (group as any).tabletopId = data.id;
    (group as any).pieceData = data;

    const baseColor = new THREE.Color(data.color || '#f1f5f9');
    const secColor = new THREE.Color(data.secondaryColor || '#0f172a');

    switch (data.type) {
      case 'counter': {
        // TTS 3D Digital Clickable Counter Token
        const radius = (data.dimensions?.x || 1.1) / 2;
        const height = data.dimensions?.y || 0.25;
        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = data.color || '#0284c7';
        ctx.beginPath();
        ctx.arc(128, 128, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.roundRect(30, 75, 196, 106, 16);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 54px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${data.value !== undefined ? data.value : 0}`, 128, 128);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(data.label || 'COUNTER', 128, 48);

        const tex = new THREE.CanvasTexture(canvas);
        const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 });
        const sideMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4 });

        const counterMesh = new THREE.Mesh(geo, [sideMat, topMat, topMat]);
        counterMesh.castShadow = true;
        group.add(counterMesh);
        break;
      }

      case 'custom_token': {
        const radius = (data.dimensions?.x || 1.0) / 2;
        const geo = new THREE.CylinderGeometry(radius, radius, 0.15, 24);

        if (data.imageUrl) {
          const loader = new THREE.TextureLoader();
          loader.load(data.imageUrl, (tex) => {
            const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
            const sideMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4 });
            const tokenMesh = new THREE.Mesh(geo, [sideMat, topMat, topMat]);
            tokenMesh.castShadow = true;
            group.add(tokenMesh);
          });
        } else {
          const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.3 });
          const tokenMesh = new THREE.Mesh(geo, mat);
          tokenMesh.castShadow = true;
          group.add(tokenMesh);
        }
        break;
      }

      case 'dice_d6': {
        const size = data.dimensions?.x || 0.7;
        const geo = new THREE.BoxGeometry(size, size, size);
        const materials: THREE.Material[] = [];
        const faceValues = [3, 4, 1, 6, 2, 5];
        for (const val of faceValues) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;

          ctx.fillStyle = data.color || '#ef4444';
          ctx.fillRect(0, 0, 128, 128);
          ctx.strokeStyle = '#ffffff33';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, 120, 120);

          ctx.fillStyle = data.color === '#f8fafc' || data.color === '#ffffff' ? '#1e293b' : '#ffffff';
          const pips = this.getD6PipCoords(val);
          for (const [px, py] of pips) {
            ctx.beginPath();
            ctx.arc(px, py, 11, 0, Math.PI * 2);
            ctx.fill();
          }

          const tex = new THREE.CanvasTexture(canvas);
          materials.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 }));
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
        group.add(d20);
        break;
      }

      case 'dice_d4': {
        const radius = (data.dimensions?.x || 0.7) / 2;
        const geo = new THREE.TetrahedronGeometry(radius, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
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
          flatShading: true,
        });
        const d12 = new THREE.Mesh(geo, mat);
        d12.castShadow = true;
        group.add(d12);
        break;
      }

      case 'card': {
        const w = data.dimensions?.x || 1.1;
        const h = data.dimensions?.y || 0.008;
        const d = data.dimensions?.z || 1.6;
        const geo = new THREE.BoxGeometry(w, h, d);

        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 256;
        faceCanvas.height = 360;
        const fctx = faceCanvas.getContext('2d')!;

        fctx.fillStyle = '#ffffff';
        fctx.fillRect(0, 0, 256, 360);
        fctx.strokeStyle = '#e2e8f0';
        fctx.lineWidth = 4;
        fctx.strokeRect(6, 6, 244, 348);

        const label = data.label || 'A♠';
        const isRed = label.includes('♥') || label.includes('♦') || data.secondaryColor === '#dc2626';
        fctx.fillStyle = isRed ? '#dc2626' : '#0f172a';
        fctx.font = 'bold 38px sans-serif';
        fctx.textAlign = 'left';
        fctx.fillText(label, 20, 50);

        fctx.textAlign = 'right';
        fctx.fillText(label, 236, 335);

        fctx.font = '72px sans-serif';
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        fctx.fillText(label.slice(-1) || '♠', 128, 180);

        const faceTex = new THREE.CanvasTexture(faceCanvas);

        const backCanvas = document.createElement('canvas');
        backCanvas.width = 256;
        backCanvas.height = 360;
        const bctx = backCanvas.getContext('2d')!;
        bctx.fillStyle = '#1e3a8a';
        bctx.fillRect(0, 0, 256, 360);
        bctx.strokeStyle = '#f8fafc';
        bctx.lineWidth = 8;
        bctx.strokeRect(10, 10, 236, 340);
        bctx.fillStyle = '#2563eb';
        for (let i = 0; i < 8; i++) {
          bctx.strokeRect(20 + i * 10, 20 + i * 14, 216 - i * 20, 320 - i * 28);
        }
        const backTex = new THREE.CanvasTexture(backCanvas);

        const sideMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.3 });
        const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.3 });

        const cardMesh = new THREE.Mesh(geo, [sideMat, sideMat, faceMat, backMat, sideMat, sideMat]);
        cardMesh.castShadow = true;
        cardMesh.receiveShadow = true;
        group.add(cardMesh);
        break;
      }

      case 'card_deck': {
        const w = data.dimensions?.x || 1.15;
        const count = data.metadata?.cards?.length || data.value || 52;
        // Dynamic realistic card deck thickness based on card count in metadata
        const h = this.getDeckVisualHeight(data);
        const d = data.dimensions?.z || 1.65;
        const geo = new THREE.BoxGeometry(w, h, d);

        const isStackFaceUp = data.metadata?.isFaceUp !== false;
        const topCardLabel = data.metadata?.topCard || (data.label && !data.label.includes('CARDS') ? data.label : undefined) || 'A♠';

        // 1. Create Face Canvas (Face-up card appearance)
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 256;
        faceCanvas.height = 360;
        const fctx = faceCanvas.getContext('2d')!;
        fctx.fillStyle = '#ffffff';
        fctx.fillRect(0, 0, 256, 360);
        fctx.strokeStyle = '#e2e8f0';
        fctx.lineWidth = 4;
        fctx.strokeRect(6, 6, 244, 348);

        const isRed = topCardLabel.includes('♥') || topCardLabel.includes('♦') || data.secondaryColor === '#dc2626';
        fctx.fillStyle = isRed ? '#dc2626' : '#0f172a';
        fctx.font = 'bold 36px sans-serif';
        fctx.textAlign = 'left';
        fctx.fillText(topCardLabel, 18, 48);

        fctx.textAlign = 'right';
        fctx.fillText(topCardLabel, 238, 336);

        fctx.font = '72px sans-serif';
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        fctx.fillText(topCardLabel.slice(-1) || '♠', 128, 180);

        // Discreet badge on face showing number of stacked cards
        fctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        fctx.beginPath();
        fctx.roundRect(162, 16, 78, 34, 6);
        fctx.fill();
        fctx.strokeStyle = isRed ? '#dc2626' : '#38bdf8';
        fctx.lineWidth = 1.8;
        fctx.stroke();

        fctx.fillStyle = '#ffffff';
        fctx.font = 'bold 15px monospace';
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        fctx.fillText(`🎴 ${count}`, 201, 33);

        const faceTex = new THREE.CanvasTexture(faceCanvas);

        // 2. Create Back Canvas (Card Back pattern)
        const backCanvas = document.createElement('canvas');
        backCanvas.width = 256;
        backCanvas.height = 360;
        const bctx = backCanvas.getContext('2d')!;
        bctx.fillStyle = data.color || '#1e3a8a';
        bctx.fillRect(0, 0, 256, 360);
        bctx.strokeStyle = '#f8fafc';
        bctx.lineWidth = 10;
        bctx.strokeRect(10, 10, 236, 340);
        bctx.fillStyle = '#ffffff18';
        for (let i = 0; i < 6; i++) {
          bctx.strokeRect(20 + i * 12, 20 + i * 16, 216 - i * 24, 320 - i * 32);
        }

        // Back Badge
        if (count <= 4) {
          bctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          bctx.beginPath();
          bctx.roundRect(165, 20, 70, 38, 8);
          bctx.fill();
          bctx.strokeStyle = '#f59e0b';
          bctx.lineWidth = 2.5;
          bctx.stroke();
          bctx.fillStyle = '#ffffff';
          bctx.font = 'bold 20px monospace';
          bctx.textAlign = 'center';
          bctx.textBaseline = 'middle';
          bctx.fillText(`${count} 🎴`, 200, 39);
        } else {
          bctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          bctx.beginPath();
          bctx.roundRect(46, 130, 164, 96, 14);
          bctx.fill();
          bctx.strokeStyle = '#f59e0b';
          bctx.lineWidth = 3.5;
          bctx.stroke();
          bctx.fillStyle = '#f8fafc';
          bctx.font = 'bold 42px monospace';
          bctx.textAlign = 'center';
          bctx.textBaseline = 'middle';
          bctx.fillText(`${count}`, 128, 166);
          bctx.font = 'bold 18px sans-serif';
          bctx.fillStyle = '#f59e0b';
          bctx.fillText('CARDS', 128, 202);
        }
        const backTex = new THREE.CanvasTexture(backCanvas);

        // 3. Sides Canvas (proportional to real card layers)
        const sideCanvas = document.createElement('canvas');
        sideCanvas.width = 128;
        sideCanvas.height = 128;
        const sctx = sideCanvas.getContext('2d')!;
        sctx.fillStyle = '#f8fafc';
        sctx.fillRect(0, 0, 128, 128);

        if (count === 2) {
          // Exactly 2 cards: ONE clean hairline divider right in the middle
          sctx.fillStyle = '#94a3b8';
          sctx.fillRect(0, 63, 128, 2);
        } else if (count <= 6) {
          // Small stack: exact number of thin dividers
          sctx.fillStyle = '#94a3b8';
          const step = 128 / count;
          for (let i = 1; i < count; i++) {
            sctx.fillRect(0, Math.round(i * step), 128, 1.5);
          }
        } else {
          // Realistic deck side layers
          sctx.fillStyle = '#cbd5e1';
          const visibleLines = Math.min(count, 32);
          const step = 128 / visibleLines;
          for (let i = 1; i < visibleLines; i++) {
            sctx.fillRect(0, Math.round(i * step), 128, 1.2);
          }
        }
        const sideTex = new THREE.CanvasTexture(sideCanvas);
        sideTex.wrapS = THREE.RepeatWrapping;
        sideTex.wrapT = THREE.RepeatWrapping;

        const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.6 });
        // If stack is face up, top (+Y) shows the face-up card and bottom shows back; if face down, top shows back!
        const isFaceUpDeck = data.metadata?.isFaceUp === true || isStackFaceUp;
        const topMat = new THREE.MeshStandardMaterial({ map: isFaceUpDeck ? faceTex : backTex, roughness: 0.3 });
        const bottomMat = new THREE.MeshStandardMaterial({ map: isFaceUpDeck ? backTex : faceTex, roughness: 0.4 });

        const deckMesh = new THREE.Mesh(geo, [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat]);
        deckMesh.castShadow = true;
        deckMesh.receiveShadow = true;
        group.add(deckMesh);
        break;
      }

      case 'poker_chip': {
        const radius = (data.dimensions?.x || 0.75) / 2;
        const height = data.dimensions?.y || 0.12;
        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = data.color || '#dc2626';
        ctx.beginPath();
        ctx.arc(128, 128, 124, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = data.secondaryColor || '#ffffff';
        ctx.lineWidth = 14;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.arc(128, 128, 114, angle - 0.15, angle + 0.15);
          ctx.stroke();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(128, 128, 70, 0, Math.PI * 2);
        ctx.fill();

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
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.7, 16);
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const meepleMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, meepleMat);
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(headGeo, meepleMat);
        head.position.y = 0.45;
        head.castShadow = true;
        group.add(head);
        break;
      }

      case 'pawn':
      case 'chess_piece': {
        const isWhite = baseColor === '#f8fafc' || data.metadata?.side === 'white' || !data.color?.includes('#1');
        const role = (data.metadata?.role || data.name || data.label || '').toLowerCase();

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

        const totalH = data.dimensions?.y || roleH;
        const halfH = totalH / 2;

        // Staunton piece materials
        const pieceMat = new THREE.MeshStandardMaterial({
          color: isWhite ? 0xf8fafc : 0x1e293b,
          roughness: isWhite ? 0.3 : 0.35,
          metalness: 0.05,
        });

        const feltMat = new THREE.MeshStandardMaterial({
          color: 0x15803d, // tournament green felt pad on bottom
          roughness: 0.9,
        });

        // 1. Felt pad at the very bottom (exactly touches board at y = -halfH)
        const feltGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.015, 24);
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.position.y = -halfH + 0.0075;
        group.add(felt);

        // 2. Base pedestal (bottom is at -halfH, resting flush on the board)
        const baseHeight = 0.18;
        const baseGeo = new THREE.CylinderGeometry(0.30, 0.34, baseHeight, 24);
        const base = new THREE.Mesh(baseGeo, pieceMat);
        base.position.y = -halfH + baseHeight / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Base ring trim
        const ringGeo = new THREE.CylinderGeometry(0.26, 0.31, 0.06, 24);
        const ring = new THREE.Mesh(ringGeo, pieceMat);
        ring.position.y = -halfH + baseHeight + 0.03;
        ring.castShadow = true;
        group.add(ring);

        const currentY = -halfH + baseHeight + 0.06;

        if (role.includes('king')) {
          // King: Tallest piece with regal cross finial
          const stemH = 0.58;
          const stemGeo = new THREE.CylinderGeometry(0.18, 0.26, stemH, 20);
          const stem = new THREE.Mesh(stemGeo, pieceMat);
          stem.position.y = currentY + stemH / 2;
          stem.castShadow = true;
          group.add(stem);

          // Crown collar
          const collarGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.08, 20);
          const collar = new THREE.Mesh(collarGeo, pieceMat);
          collar.position.y = currentY + stemH + 0.04;
          collar.castShadow = true;
          group.add(collar);

          // Head dome
          const domeGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.22, 20);
          const dome = new THREE.Mesh(domeGeo, pieceMat);
          dome.position.y = currentY + stemH + 0.08 + 0.11;
          dome.castShadow = true;
          group.add(dome);

          // Cross finial on top
          const crossVGeo = new THREE.BoxGeometry(0.06, 0.20, 0.06);
          const crossV = new THREE.Mesh(crossVGeo, pieceMat);
          crossV.position.y = currentY + stemH + 0.08 + 0.22 + 0.10;
          crossV.castShadow = true;
          group.add(crossV);

          const crossHGeo = new THREE.BoxGeometry(0.18, 0.06, 0.06);
          const crossH = new THREE.Mesh(crossHGeo, pieceMat);
          crossH.position.y = currentY + stemH + 0.08 + 0.22 + 0.12;
          crossH.castShadow = true;
          group.add(crossH);
        } else if (role.includes('queen')) {
          // Queen: Coronet crown with royal ball finial
          const stemH = 0.54;
          const stemGeo = new THREE.CylinderGeometry(0.18, 0.26, stemH, 20);
          const stem = new THREE.Mesh(stemGeo, pieceMat);
          stem.position.y = currentY + stemH / 2;
          stem.castShadow = true;
          group.add(stem);

          // Crown flare
          const crownGeo = new THREE.CylinderGeometry(0.29, 0.20, 0.24, 20);
          const crown = new THREE.Mesh(crownGeo, pieceMat);
          crown.position.y = currentY + stemH + 0.12;
          crown.castShadow = true;
          group.add(crown);

          // Ball finial
          const ballGeo = new THREE.SphereGeometry(0.10, 16, 16);
          const ball = new THREE.Mesh(ballGeo, pieceMat);
          ball.position.y = currentY + stemH + 0.24 + 0.08;
          ball.castShadow = true;
          group.add(ball);
        } else if (role.includes('bishop')) {
          // Bishop: Slender stem with mitre pointed oval
          const stemH = 0.48;
          const stemGeo = new THREE.CylinderGeometry(0.16, 0.24, stemH, 20);
          const stem = new THREE.Mesh(stemGeo, pieceMat);
          stem.position.y = currentY + stemH / 2;
          stem.castShadow = true;
          group.add(stem);

          const mitreGeo = new THREE.SphereGeometry(0.22, 16, 16);
          mitreGeo.scale(0.85, 1.3, 0.85);
          const mitre = new THREE.Mesh(mitreGeo, pieceMat);
          mitre.position.y = currentY + stemH + 0.22;
          mitre.castShadow = true;
          group.add(mitre);

          const ballGeo = new THREE.SphereGeometry(0.06, 12, 12);
          const ball = new THREE.Mesh(ballGeo, pieceMat);
          ball.position.y = currentY + stemH + 0.48;
          ball.castShadow = true;
          group.add(ball);
        } else if (role.includes('knight')) {
          // Knight: Arched horse neck, snout and mane
          const stemH = 0.28;
          const stemGeo = new THREE.CylinderGeometry(0.22, 0.26, stemH, 20);
          const stem = new THREE.Mesh(stemGeo, pieceMat);
          stem.position.y = currentY + stemH / 2;
          stem.castShadow = true;
          group.add(stem);

          // Horse head and neck
          const horseNeckGeo = new THREE.BoxGeometry(0.24, 0.42, 0.36);
          const horseNeck = new THREE.Mesh(horseNeckGeo, pieceMat);
          horseNeck.position.set(0, currentY + stemH + 0.18, 0.04);
          horseNeck.rotation.x = -0.22;
          horseNeck.castShadow = true;
          group.add(horseNeck);

          // Horse muzzle / snout
          const snoutGeo = new THREE.BoxGeometry(0.20, 0.20, 0.28);
          const snout = new THREE.Mesh(snoutGeo, pieceMat);
          snout.position.set(0, currentY + stemH + 0.24, 0.24);
          snout.rotation.x = 0.18;
          snout.castShadow = true;
          group.add(snout);

          // Horse ears
          const earGeo = new THREE.ConeGeometry(0.06, 0.14, 8);
          const ear1 = new THREE.Mesh(earGeo, pieceMat);
          ear1.position.set(-0.08, currentY + stemH + 0.44, -0.06);
          group.add(ear1);
          const ear2 = new THREE.Mesh(earGeo, pieceMat);
          ear2.position.set(0.08, currentY + stemH + 0.44, -0.06);
          group.add(ear2);
        } else if (role.includes('rook')) {
          // Rook: Castle battlement / parapet tower
          const towerH = 0.52;
          const towerGeo = new THREE.CylinderGeometry(0.24, 0.27, towerH, 20);
          const tower = new THREE.Mesh(towerGeo, pieceMat);
          tower.position.y = currentY + towerH / 2;
          tower.castShadow = true;
          group.add(tower);

          // Parapet rim
          const parapetGeo = new THREE.CylinderGeometry(0.30, 0.27, 0.20, 16);
          const parapet = new THREE.Mesh(parapetGeo, pieceMat);
          parapet.position.y = currentY + towerH + 0.10;
          parapet.castShadow = true;
          group.add(parapet);

          // Crenel cutouts (inner depression)
          const recessGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
          const recessMat = new THREE.MeshStandardMaterial({ color: isWhite ? 0xe2e8f0 : 0x0f172a, roughness: 0.6 });
          const recess = new THREE.Mesh(recessGeo, recessMat);
          recess.position.y = currentY + towerH + 0.17;
          group.add(recess);
        } else {
          // Pawn: Classic Staunton pawn
          const stemH = 0.38;
          const stemGeo = new THREE.CylinderGeometry(0.14, 0.24, stemH, 20);
          const stem = new THREE.Mesh(stemGeo, pieceMat);
          stem.position.y = currentY + stemH / 2;
          stem.castShadow = true;
          group.add(stem);

          const collarGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.06, 20);
          const collar = new THREE.Mesh(collarGeo, pieceMat);
          collar.position.y = currentY + stemH + 0.03;
          collar.castShadow = true;
          group.add(collar);

          const headGeo = new THREE.SphereGeometry(0.19, 20, 20);
          const head = new THREE.Mesh(headGeo, pieceMat);
          head.position.y = currentY + stemH + 0.06 + 0.18;
          head.castShadow = true;
          group.add(head);
        }
        break;
      }

      case 'domino': {
        const w = data.dimensions?.x || 0.6;
        const h = data.dimensions?.y || 0.15;
        const d = data.dimensions?.z || 1.3;
        const geo = new THREE.BoxGeometry(w, h, d);
        const dominoMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });
        const dominoMesh = new THREE.Mesh(geo, dominoMat);
        dominoMesh.castShadow = true;
        group.add(dominoMesh);
        break;
      }

      case 'dice_fate': {
        const size = data.dimensions?.x || 0.7;
        const geo = new THREE.BoxGeometry(size, size, size);
        const materials: THREE.Material[] = [];
        const fateSymbols = ['+', '+', '-', '-', ' ', ' '];
        for (const sym of fateSymbols) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;

          ctx.fillStyle = data.color || '#1e293b';
          ctx.fillRect(0, 0, 128, 128);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, 120, 120);

          ctx.fillStyle = sym === '+' ? '#10b981' : sym === '-' ? '#ef4444' : '#94a3b8';
          ctx.font = 'bold 72px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sym, 64, 64);

          const tex = new THREE.CanvasTexture(canvas);
          materials.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }));
        }

        const fateCube = new THREE.Mesh(geo, materials);
        fateCube.castShadow = true;
        group.add(fateCube);
        break;
      }

      case 'coin': {
        const radius = (data.dimensions?.x || 0.8) / 2;
        const height = data.dimensions?.y || 0.08;
        const geo = new THREE.CylinderGeometry(radius, radius, height, 32);

        const makeCoinFace = (text: string) => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d')!;

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(128, 128, 124, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 10;
          ctx.stroke();

          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 128, 128);

          return new THREE.CanvasTexture(canvas);
        };

        const sideMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });
        const headsMat = new THREE.MeshStandardMaterial({ map: makeCoinFace('HEADS'), metalness: 0.5, roughness: 0.3 });
        const tailsMat = new THREE.MeshStandardMaterial({ map: makeCoinFace('TAILS'), metalness: 0.5, roughness: 0.3 });

        const coinMesh = new THREE.Mesh(geo, [sideMat, headsMat, tailsMat]);
        coinMesh.castShadow = true;
        group.add(coinMesh);
        break;
      }

      case 'tablet': {
        const w = data.dimensions?.x || 2.4;
        const h = data.dimensions?.y || 0.1;
        const d = data.dimensions?.z || 1.6;
        const frameGeo = new THREE.BoxGeometry(w, h, d);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.4 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.castShadow = true;
        group.add(frameMesh);

        const screenGeo = new THREE.PlaneGeometry(w * 0.9, d * 0.88);
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 512;
        screenCanvas.height = 360;
        const sctx = screenCanvas.getContext('2d')!;
        sctx.fillStyle = '#0284c7';
        sctx.fillRect(0, 0, 512, 360);
        sctx.fillStyle = '#ffffff';
        sctx.font = 'bold 36px sans-serif';
        sctx.textAlign = 'center';
        sctx.fillText('TABLET BROWSER', 256, 120);
        sctx.font = '22px sans-serif';
        sctx.fillText('Click to Open Web Tablet / Rules', 256, 180);
        sctx.strokeStyle = '#ffffff';
        sctx.strokeRect(40, 220, 432, 70);
        sctx.fillText('https://tabletopsimulator.com', 256, 265);

        const screenTex = new THREE.CanvasTexture(screenCanvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
        const screenMesh = new THREE.Mesh(screenGeo, screenMat);
        screenMesh.rotation.x = -Math.PI / 2;
        screenMesh.position.y = h / 2 + 0.005;
        group.add(screenMesh);
        break;
      }

      case 'board': {
        const w = data.dimensions?.x || 9.8;
        const h = data.dimensions?.y || 0.08;
        const d = data.dimensions?.z || 9.8;

        // Create high-res 8x8 tournament chessboard canvas texture
        const boardCanvas = document.createElement('canvas');
        boardCanvas.width = 1024;
        boardCanvas.height = 1024;
        const bctx = boardCanvas.getContext('2d')!;

        // 1. Rich dark walnut border / frame
        bctx.fillStyle = '#26150b';
        bctx.fillRect(0, 0, 1024, 1024);

        // Frame inner bevel
        bctx.strokeStyle = '#c29b68';
        bctx.lineWidth = 4;
        bctx.strokeRect(60, 60, 904, 904);

        bctx.strokeStyle = '#613b1e';
        bctx.lineWidth = 8;
        bctx.strokeRect(68, 68, 888, 888);

        // 2. 8x8 Chessboard Grid
        const gridX = 80;
        const gridY = 80;
        const gridSize = 864;
        const sqSize = gridSize / 8;

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const isLight = (row + col) % 2 === 0;
            bctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
            bctx.fillRect(gridX + col * sqSize, gridY + row * sqSize, sqSize, sqSize);
          }
        }

        // 3. Algebraic Coordinate Notation (Rank 1-8 & File a-h)
        bctx.fillStyle = '#e2d4be';
        bctx.font = 'bold 24px serif';
        bctx.textAlign = 'center';
        bctx.textBaseline = 'middle';

        // Files along top and bottom
        for (let i = 0; i < 8; i++) {
          const cx = gridX + i * sqSize + sqSize / 2;
          bctx.fillText(files[i], cx, 40);
          bctx.fillText(files[i], cx, 984);
        }

        // Ranks along left and right
        for (let i = 0; i < 8; i++) {
          const cy = gridY + i * sqSize + sqSize / 2;
          bctx.fillText(ranks[i], 38, cy);
          bctx.fillText(ranks[i], 986, cy);
        }

        const topTex = new THREE.CanvasTexture(boardCanvas);
        topTex.generateMipmaps = true;

        const woodMat = new THREE.MeshStandardMaterial({
          color: 0x2b180d,
          roughness: 0.45,
          metalness: 0.05,
        });

        const topMat = new THREE.MeshStandardMaterial({
          map: topTex,
          roughness: 0.25,
          metalness: 0.05,
        });

        const feltMat = new THREE.MeshStandardMaterial({
          color: 0x164e32,
          roughness: 0.9,
        });

        const boardGeo = new THREE.BoxGeometry(w, h, d);
        const boardMesh = new THREE.Mesh(boardGeo, [woodMat, woodMat, topMat, feltMat, woodMat, woodMat]);
        boardMesh.castShadow = true;
        boardMesh.receiveShadow = true;
        group.add(boardMesh);
        break;
      }

      default: {
        const size = data.dimensions?.x || 0.8;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.3 });
        const box = new THREE.Mesh(geo, mat);
        box.castShadow = true;
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

  private setupRulerVisuals() {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, depthTest: false });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    this.rulerLine = new THREE.Line(lineGeo, lineMat);
    this.rulerLine.renderOrder = 999;
    this.rulerLine.visible = false;
    this.scene.add(this.rulerLine);

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

    const distUnits = start.distanceTo(end);
    const inches = (distUnits * 3.5).toFixed(1);
    const cm = (distUnits * 8.9).toFixed(1);

    const canvas = (this.rulerLabelMesh.material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);

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

  // Stacking Visual Guide Ring
  private setupStackGuide() {
    const geo = new THREE.RingGeometry(0.5, 0.65, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.stackGuideMesh = new THREE.Mesh(geo, mat);
    this.stackGuideMesh.renderOrder = 998;
    this.stackGuideMesh.visible = false;
    this.scene.add(this.stackGuideMesh);
  }

  public showStackGuide(pos: THREE.Vector3, dims: Vector3D) {
    if (!this.stackGuideMesh) return;
    const r = Math.max(dims.x, dims.z) * 0.62;
    this.stackGuideMesh.scale.set(r, 1, r);
    this.stackGuideMesh.position.set(pos.x, pos.y + dims.y / 2 + 0.02, pos.z);
    this.stackGuideMesh.visible = true;
  }

  public hideStackGuide() {
    if (this.stackGuideMesh) {
      this.stackGuideMesh.visible = false;
    }
  }

  /**
   * Dynamically calculates the 3D model height (Y-axis) of a deck based on the number of cards
   * in its metadata, ensuring a single card is thin (~0.008) and a deck of 52 cards is visually thick (~0.320).
   */
  public getDeckVisualHeight(
    pieceOrCount?: TabletopPieceData | { metadata?: { cards?: string[]; count?: number; cardsCount?: number }; value?: number } | number | null
  ): number {
    return calculateDeckHeightFromMetadata(pieceOrCount);
  }

  /**
   * Dynamically scales the 3D model height (Y-axis) of a deck based on the number of cards in its metadata.
   * Updates the BoxGeometry height, textures, badge, and piece dimensions in real time.
   *
   * @param deckIdOrPiece - Piece ID or TabletopPieceData of the deck to scale
   * @param overrideCount - Optional manual card count override
   * @returns The updated 3D model height on the Y-axis
   */
  public scaleDeckModelHeight(
    deckIdOrPiece: string | TabletopPieceData,
    overrideCount?: number
  ): number {
    const pieceId = typeof deckIdOrPiece === 'string' ? deckIdOrPiece : deckIdOrPiece.id;
    const mesh = this.pieceMeshes.get(pieceId);
    const pieceData =
      ((mesh as any)?.pieceData as TabletopPieceData | undefined) ||
      (typeof deckIdOrPiece === 'object' ? deckIdOrPiece : undefined);

    let count = overrideCount;
    if (count === undefined && pieceData) {
      if (Array.isArray(pieceData.metadata?.cards)) {
        count = pieceData.metadata.cards.length;
      } else if (typeof pieceData.metadata?.count === 'number') {
        count = pieceData.metadata.count;
      } else if (typeof pieceData.metadata?.cardsCount === 'number') {
        count = pieceData.metadata.cardsCount;
      } else if (typeof pieceData.value === 'number') {
        count = pieceData.value;
      }
    }
    if (count === undefined) count = 52;

    const targetHeight = this.getDeckVisualHeight(count);

    if (pieceData) {
      if (!pieceData.dimensions) {
        pieceData.dimensions = { x: 1.15, y: targetHeight, z: 1.65 };
      } else {
        pieceData.dimensions.y = targetHeight;
      }
      pieceData.value = count;
      if (!pieceData.label || pieceData.label.includes('CARDS')) {
        pieceData.label = `${count} CARDS`;
      }
    }

    if (mesh) {
      let boxMesh: THREE.Mesh | null = null;
      if (mesh instanceof THREE.Mesh) {
        boxMesh = mesh;
      } else {
        mesh.traverse((child) => {
          if (!boxMesh && child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
            boxMesh = child;
          }
        });
      }

      if (boxMesh && boxMesh.geometry instanceof THREE.BoxGeometry) {
        const w = pieceData?.dimensions?.x || 1.15;
        const d = pieceData?.dimensions?.z || 1.65;

        // Dispose previous BoxGeometry and assign new dynamically scaled BoxGeometry
        boxMesh.geometry.dispose();
        boxMesh.geometry = new THREE.BoxGeometry(w, targetHeight, d);

        // Update top canvas and textures
        const topCanvas = document.createElement('canvas');
        topCanvas.width = 256;
        topCanvas.height = 360;
        const tctx = topCanvas.getContext('2d')!;

        tctx.fillStyle = pieceData?.color || '#1e3a8a';
        tctx.fillRect(0, 0, 256, 360);
        tctx.strokeStyle = '#f8fafc';
        tctx.lineWidth = 10;
        tctx.strokeRect(10, 10, 236, 340);

        tctx.fillStyle = '#ffffff18';
        for (let i = 0; i < 6; i++) {
          tctx.strokeRect(20 + i * 12, 20 + i * 16, 216 - i * 24, 320 - i * 32);
        }

        if (count <= 1) {
          tctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          tctx.beginPath();
          tctx.roundRect(165, 20, 70, 38, 8);
          tctx.fill();
          tctx.strokeStyle = '#f59e0b';
          tctx.lineWidth = 2.5;
          tctx.stroke();

          tctx.fillStyle = '#ffffff';
          tctx.font = 'bold 20px monospace';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(`1 🎴`, 200, 39);
        } else if (count === 2) {
          tctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          tctx.beginPath();
          tctx.roundRect(165, 20, 70, 38, 8);
          tctx.fill();
          tctx.strokeStyle = '#f59e0b';
          tctx.lineWidth = 2.5;
          tctx.stroke();

          tctx.fillStyle = '#ffffff';
          tctx.font = 'bold 20px monospace';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(`2 🎴`, 200, 39);
        } else if (count <= 6) {
          tctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          tctx.beginPath();
          tctx.roundRect(150, 20, 85, 40, 8);
          tctx.fill();
          tctx.strokeStyle = '#f59e0b';
          tctx.lineWidth = 2.5;
          tctx.stroke();

          tctx.fillStyle = '#ffffff';
          tctx.font = 'bold 18px monospace';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(`${count} CARDS`, 192, 40);
        } else {
          tctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          tctx.beginPath();
          tctx.roundRect(46, 130, 164, 96, 14);
          tctx.fill();
          tctx.strokeStyle = '#f59e0b';
          tctx.lineWidth = 3.5;
          tctx.stroke();

          tctx.fillStyle = '#f8fafc';
          tctx.font = 'bold 42px monospace';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(`${count}`, 128, 166);

          tctx.font = 'bold 18px sans-serif';
          tctx.fillStyle = '#f59e0b';
          tctx.fillText('CARDS', 128, 202);
        }

        const sideCanvas = document.createElement('canvas');
        sideCanvas.width = 128;
        sideCanvas.height = 128;
        const sctx = sideCanvas.getContext('2d')!;
        sctx.fillStyle = '#f8fafc';
        sctx.fillRect(0, 0, 128, 128);

        if (count <= 1) {
          // Single card: plain ivory/white edge
        } else if (count === 2) {
          sctx.fillStyle = '#94a3b8';
          sctx.fillRect(0, 63, 128, 2);
        } else if (count <= 6) {
          sctx.fillStyle = '#94a3b8';
          const step = 128 / count;
          for (let i = 1; i < count; i++) {
            sctx.fillRect(0, Math.round(i * step), 128, 1.5);
          }
        } else {
          sctx.fillStyle = '#cbd5e1';
          const visibleLines = Math.min(count, 32);
          const step = 128 / visibleLines;
          for (let i = 1; i < visibleLines; i++) {
            sctx.fillRect(0, Math.round(i * step), 128, 1.2);
          }
        }

        const topTex = new THREE.CanvasTexture(topCanvas);
        const sideTex = new THREE.CanvasTexture(sideCanvas);
        sideTex.wrapS = THREE.RepeatWrapping;
        sideTex.wrapT = THREE.RepeatWrapping;

        if (Array.isArray(boxMesh.material)) {
          boxMesh.material.forEach((mat) => {
            if ((mat as any).map) (mat as any).map.dispose();
            mat.dispose();
          });
          const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.6 });
          const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.3 });
          const bottomMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.4 });
          boxMesh.material = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
        }
      }
    }

    return targetHeight;
  }

  // Calculate real piece 3D dimensions
  public getPieceDimensions(piece?: TabletopPieceData | null): Vector3D {
    if (!piece) return { x: 1.0, y: 0.1, z: 1.0 };
    switch (piece.type) {
      case 'card':
        return { x: piece.dimensions?.x || 1.1, y: 0.008, z: piece.dimensions?.z || 1.6 };
      case 'card_deck': {
        const deckH = this.getDeckVisualHeight(piece);
        return { x: piece.dimensions?.x || 1.15, y: deckH, z: piece.dimensions?.z || 1.65 };
      }
      case 'poker_chip':
        return { x: piece.dimensions?.x || 0.75, y: piece.dimensions?.y || 0.08, z: piece.dimensions?.z || 0.75 };
      case 'checker':
        return { x: piece.dimensions?.x || 0.75, y: piece.dimensions?.y || 0.12, z: piece.dimensions?.z || 0.75 };
      case 'coin':
        return { x: piece.dimensions?.x || 0.8, y: piece.dimensions?.y || 0.05, z: piece.dimensions?.z || 0.8 };
      case 'dice_d6':
      case 'dice_fate':
        return piece.dimensions || { x: 0.7, y: 0.7, z: 0.7 };
      case 'dice_d20':
      case 'dice_d12':
      case 'dice_d10':
      case 'dice_d8':
      case 'dice_d4':
        return piece.dimensions || { x: 0.85, y: 0.85, z: 0.85 };
      case 'domino':
        return piece.dimensions || { x: 0.6, y: 0.15, z: 1.3 };
      case 'block':
        return piece.dimensions || { x: 0.8, y: 0.8, z: 0.8 };
      case 'board':
        return piece.dimensions || { x: 9.8, y: 0.08, z: 9.8 };
      case 'pawn':
        return piece.dimensions || { x: 0.6, y: 0.95, z: 0.6 };
      case 'meeple':
        return piece.dimensions || { x: 0.75, y: 0.8, z: 0.3 };
      case 'chess_piece': {
        const role = (piece.metadata?.role || piece.name || piece.label || '').toLowerCase();
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
        return piece.dimensions || { x: 0.65, y: roleH, z: 0.65 };
      }
      default:
        return piece.dimensions || { x: 1.0, y: 0.3, z: 1.0 };
    }
  }

  // Stacking compatibility logic
  public canStackPieces(source?: TabletopPieceData | null, target?: TabletopPieceData | null): boolean {
    if (!source || !target || source.id === target.id) return false;
    if (source.isLocked || target.isLocked) return false;

    // 1. Cards and Decks
    const isSourceCard = source.type === 'card' || source.type === 'card_deck';
    const isTargetCard = target.type === 'card' || target.type === 'card_deck';
    if (isSourceCard && isTargetCard) {
      return true;
    }

    // 2. Poker Chips
    if (source.type === 'poker_chip' && target.type === 'poker_chip') {
      return true;
    }

    // 3. Checkers
    if (source.type === 'checker' && target.type === 'checker') {
      return true;
    }

    // 4. Coins
    if (source.type === 'coin' && target.type === 'coin') {
      return true;
    }

    // 5. Dominos or Blocks
    if (source.type === 'domino' && target.type === 'domino') {
      return true;
    }
    if (source.type === 'block' && target.type === 'block') {
      return true;
    }

    return false;
  }

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
      group.position.lerp(new THREE.Vector3(p.cursor.x, p.cursor.y, p.cursor.z), 0.4);
    }

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

    const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.4 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -1;
    group.add(beam);

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

  public applyPhysicsUpdates(updates: CompactPieceUpdate[]) {
    for (const u of updates) {
      const target = this.pieceTargetTransforms.get(u.id);
      if (target) {
        target.pos.set(u.p[0], u.p[1], u.p[2]);
        target.quat.set(u.r[0], u.r[1], u.r[2], u.r[3]);
        if (u.val !== undefined) target.value = u.val;
        if (u.l !== undefined) target.isLocked = u.l;
      }
    }
  }

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
        this.cameraSpherical.phi = 0.05;
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

  private bindEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    // Alt key listener for card magnification/inspection
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') {
        this.isAltPressed = true;
        if (this.hoveredPieceId && this.events.onPieceInspect) {
          const mesh = this.pieceMeshes.get(this.hoveredPieceId);
          if (mesh) {
            this.events.onPieceInspect((mesh as any).pieceData);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        this.isAltPressed = false;
        if (this.events.onPieceInspect) {
          this.events.onPieceInspect(null);
        }
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      this.updateMouseCoords(e);
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      if (e.button === 2 || (e.button === 0 && e.altKey)) {
        this.rightClickStartPos = { x: e.clientX, y: e.clientY };
        this.rightClickStartTime = Date.now();
        this.isOrbiting = true;
        dom.setPointerCapture(e.pointerId);
        return;
      }

      if (e.button === 1 || (e.button === 2 && e.shiftKey)) {
        this.isPanning = true;
        dom.setPointerCapture(e.pointerId);
        return;
      }

      if (e.button === 0) {
        const tableHit = this.raycastTable();

        // 1. Paint Tool Mode
        if (this.currentTool === 'paint') {
          if (tableHit) {
            this.currentDrawingPoints = [[tableHit.x, tableHit.z]];
            dom.setPointerCapture(e.pointerId);
          }
          return;
        }

        // 2. Ruler Tool Mode
        if (this.currentTool === 'ruler') {
          if (tableHit) {
            this.rulerStart = tableHit.clone();
            this.rulerEnd = tableHit.clone();
            this.updateRuler(this.rulerStart, this.rulerEnd);
            dom.setPointerCapture(e.pointerId);
          }
          return;
        }

        // 3. Flick Tool Mode
        if (this.currentTool === 'flick') {
          const pieceHit = this.raycastPieces();
          if (pieceHit) {
            this.flickTargetPieceId = (pieceHit as any).tabletopId;
            this.flickStartPos = pieceHit.position.clone();
            dom.setPointerCapture(e.pointerId);
          }
          return;
        }

        // 3b. Transform Gizmo Tool Mode (F9)
        if (this.currentTool === 'gizmo') {
          const hitAxis = this.raycastGizmo();
          if (hitAxis && this.gizmoTargetPieceId) {
            this.activeGizmoAxis = hitAxis;
            const targetMesh = this.pieceMeshes.get(this.gizmoTargetPieceId);
            if (targetMesh) {
              this.gizmoPieceStartPos.copy(targetMesh.position);
              this.gizmoPieceStartRot.copy(targetMesh.quaternion);
              this.gizmoDragStartScreen = { x: e.clientX, y: e.clientY };
              const planeNormal = hitAxis === 'y'
                ? new THREE.Vector3().subVectors(this.camera.position, this.gizmoGroup.position).setY(0).normalize()
                : new THREE.Vector3(0, 1, 0);
              this.gizmoDragPlane.setFromNormalAndCoplanarPoint(planeNormal, this.gizmoGroup.position);
              this.raycaster.setFromCamera(this.mouse, this.camera);
              this.raycaster.ray.intersectPlane(this.gizmoDragPlane, this.gizmoDragStartPoint);
            }
            dom.setPointerCapture(e.pointerId);
            return;
          }

          // If clicked a piece, set it as gizmo target piece
          const pieceHit = this.raycastPieces();
          if (pieceHit) {
            const pieceId = (pieceHit as any).tabletopId;
            this.selectedPieceIds.clear();
            this.selectedPieceIds.add(pieceId);
            this.gizmoTargetPieceId = pieceId;
            this.updateSelectionHighlights();
            if (this.events.onSelectionChange) {
              this.events.onSelectionChange([pieceId]);
            }
            dom.setPointerCapture(e.pointerId);
            return;
          }
        }

        // 4. Default Grab Tool Mode & Selection
        const pieceHit = this.raycastPieces();
        if (pieceHit) {
          const pieceId = (pieceHit as any).tabletopId;
          const pieceData = (pieceHit as any).pieceData as TabletopPieceData;

          // If counter piece, check if click was on + or - sides
          if (pieceData?.type === 'counter') {
            const delta = e.shiftKey ? -1 : 1;
            if (this.events.onCounterClick) {
              this.events.onCounterClick(pieceId, delta);
            }
          }

          // Handle Multi-Selection Click
          if (e.shiftKey) {
            // Shift+Click: Toggle selection
            if (this.selectedPieceIds.has(pieceId)) {
              this.selectedPieceIds.delete(pieceId);
            } else {
              this.selectedPieceIds.add(pieceId);
            }
          } else {
            // Regular click: If clicking unselected item, make it the sole selection
            if (!this.selectedPieceIds.has(pieceId)) {
              this.selectedPieceIds.clear();
              this.selectedPieceIds.add(pieceId);
            }
            // If already in selection, retain multi-selection so all can be dragged together!
          }

          this.updateSelectionHighlights();
          if (this.events.onSelectionChange) {
            this.events.onSelectionChange(Array.from(this.selectedPieceIds));
          }

          if (pieceData?.isLocked) {
            return;
          }

          this.grabbedPieceId = pieceId;
          const pieceDims = this.getPieceDimensions(pieceData);
          this.currentDraggedY = pieceHit.position.y + pieceDims.y / 2 + 0.3;
          this.activeStackTargetId = null;
          this.hideStackGuide();
          this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, this.currentTableConfig.height, 0)
          );

          this.lastDragPos.copy(pieceHit.position);
          this.lastDragTime = Date.now();
          this.dragVelocity.set(0, 0, 0);

          // Store relative offsets for all other selected pieces
          this.multiDragOffsets.clear();
          const primaryPos = pieceHit.position;
          for (const otherId of this.selectedPieceIds) {
            if (otherId === pieceId) continue;
            const otherMesh = this.pieceMeshes.get(otherId);
            if (otherMesh) {
              this.multiDragOffsets.set(otherId, otherMesh.position.clone().sub(primaryPos));
            }
          }

          if (this.events.onPieceSelect) {
            this.events.onPieceSelect(pieceId);
          }
          dom.setPointerCapture(e.pointerId);
        } else {
          // Clicked empty table / space
          if (!e.shiftKey) {
            this.selectedPieceIds.clear();
            this.updateSelectionHighlights();
            if (this.events.onSelectionChange) {
              this.events.onSelectionChange([]);
            }
          }

          // Start Box Selection (Marquee Select)
          this.isBoxSelecting = true;
          this.boxSelectStart = { x: e.clientX, y: e.clientY };
          this.boxSelectCurrent = { x: e.clientX, y: e.clientY };
          this.boxSelectInitialSelection = e.shiftKey ? new Set(this.selectedPieceIds) : new Set();
          this.boxSelectAccumulated = new Set(this.boxSelectInitialSelection);
          if (this.events.onBoxSelectChange) {
            this.events.onBoxSelectChange({
              x1: e.clientX,
              y1: e.clientY,
              x2: e.clientX,
              y2: e.clientY,
              active: true,
            });
          }
          dom.setPointerCapture(e.pointerId);

          if (tableHit && this.events.onTableClick) {
            this.events.onTableClick({ x: tableHit.x, y: tableHit.y, z: tableHit.z });
          }
        }
      }
    });

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

      // Box Selection Marquee in Progress
      if (this.isBoxSelecting) {
        this.boxSelectCurrent = { x: e.clientX, y: e.clientY };
        const minX = Math.min(this.boxSelectStart.x, this.boxSelectCurrent.x);
        const maxX = Math.max(this.boxSelectStart.x, this.boxSelectCurrent.x);
        const minY = Math.min(this.boxSelectStart.y, this.boxSelectCurrent.y);
        const maxY = Math.max(this.boxSelectStart.y, this.boxSelectCurrent.y);

        if (this.events.onBoxSelectChange) {
          this.events.onBoxSelectChange({ x1: minX, y1: minY, x2: maxX, y2: maxY, active: true });
        }

        if (maxX - minX > 4 || maxY - minY > 4) {
          const rect = dom.getBoundingClientRect();

          for (const [id, mesh] of this.pieceMeshes.entries()) {
            const screenPos = mesh.position.clone().project(this.camera);
            if (screenPos.z < 1) {
              const px = ((screenPos.x + 1) / 2) * rect.width + rect.left;
              const py = ((-screenPos.y + 1) / 2) * rect.height + rect.top;
              if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
                this.boxSelectAccumulated.add(id);
              }
            }
          }

          // Items selected with the square rectangle do not get unselected when the selection rectangle is not on them anymore!
          this.selectedPieceIds = new Set(this.boxSelectAccumulated);

          this.updateSelectionHighlights();
          if (this.events.onSelectionChange) {
            this.events.onSelectionChange(Array.from(this.selectedPieceIds));
          }
        }
        return;
      }

      // Drawing with Paint Tool
      if (this.currentTool === 'paint' && this.currentDrawingPoints.length > 0) {
        const hit = this.raycastTable();
        if (hit) {
          this.currentDrawingPoints.push([hit.x, hit.z]);
          // Render immediate stroke on local canvas
          const { width, length } = this.currentTableConfig;
          const cx = ((hit.x + width / 2) / width) * this.paintCanvas.width;
          const cy = ((hit.z + length / 2) / length) * this.paintCanvas.height;
          this.paintCtx.strokeStyle = this.isErasing ? '#00000000' : this.paintColor;
          this.paintCtx.lineWidth = this.paintBrushSize * 2;
          this.paintCtx.lineTo(cx, cy);
          this.paintCtx.stroke();
          this.paintTexture.needsUpdate = true;
        }
        return;
      }

      // Ruler dragging
      if (this.currentTool === 'ruler' && this.rulerStart) {
        const hit = this.raycastTable();
        if (hit) {
          this.updateRuler(this.rulerStart, hit);
        }
        return;
      }

      // Flick Tool aiming
      if (this.currentTool === 'flick' && this.flickStartPos) {
        const hit = this.raycastTable();
        if (hit) {
          this.updateFlickVisuals(this.flickStartPos, hit);
        }
        return;
      }

      // Transform Gizmo Dragging (Translation & Rotation)
      if (this.currentTool === 'gizmo' && this.activeGizmoAxis && this.gizmoTargetPieceId) {
        const targetMesh = this.pieceMeshes.get(this.gizmoTargetPieceId);
        if (targetMesh) {
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const currentHit = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(this.gizmoDragPlane, currentHit)) {
            const delta = currentHit.clone().sub(this.gizmoDragStartPoint);

            if (this.activeGizmoAxis === 'x') {
              const newX = this.gizmoPieceStartPos.x + delta.x;
              targetMesh.position.x = newX;
            } else if (this.activeGizmoAxis === 'z') {
              const newZ = this.gizmoPieceStartPos.z + delta.z;
              targetMesh.position.z = newZ;
            } else if (this.activeGizmoAxis === 'y') {
              const screenDeltaY = (this.gizmoDragStartScreen.y - e.clientY) * 0.035;
              const newY = Math.max(this.currentTableConfig.height + 0.05, this.gizmoPieceStartPos.y + screenDeltaY);
              targetMesh.position.y = newY;
            } else if (this.activeGizmoAxis === 'rotY') {
              const startAngle = Math.atan2(this.gizmoDragStartPoint.z - this.gizmoPieceStartPos.z, this.gizmoDragStartPoint.x - this.gizmoPieceStartPos.x);
              const curAngle = Math.atan2(currentHit.z - this.gizmoPieceStartPos.z, currentHit.x - this.gizmoPieceStartPos.x);
              const angleDelta = curAngle - startAngle;
              const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angleDelta);
              targetMesh.quaternion.copy(this.gizmoPieceStartRot).multiply(rotQuat);
            }

            this.gizmoGroup.position.copy(targetMesh.position);

            if (this.events.onPieceDrag) {
              this.events.onPieceDrag(this.gizmoTargetPieceId, {
                x: targetMesh.position.x,
                y: targetMesh.position.y,
                z: targetMesh.position.z,
              });
            }
          }
        }
        return;
      }

      // Transform Gizmo Hover Highlighting
      if (this.currentTool === 'gizmo' && !this.activeGizmoAxis) {
        const hitAxis = this.raycastGizmo();
        if (hitAxis !== this.hoveredGizmoAxis) {
          this.hoveredGizmoAxis = hitAxis;
          this.updateGizmoHoverColors();
        }
        if (hitAxis) {
          dom.style.cursor = 'move';
        }
      }

      // Dragging grabbed piece (and all multi-selected pieces!)
      if (this.grabbedPieceId) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPlaneIntersect)) {
          const mesh = this.pieceMeshes.get(this.grabbedPieceId);
          const draggedPiece = mesh ? ((mesh as any).pieceData as TabletopPieceData | undefined) : undefined;
          const draggedDims = this.getPieceDimensions(draggedPiece);
          const draggedHalfX = (draggedDims.x || 1.0) / 2;
          const draggedHalfZ = (draggedDims.z || 1.0) / 2;
          const draggedRadius = Math.hypot(draggedHalfX, draggedHalfZ);
          const draggedHeight = draggedDims.y || 0.01;

          // Constrain dragging strictly within table boundaries (cannot drag pieces outside the table)
          const tableHalfW = this.currentTableConfig.width / 2;
          const tableHalfL = this.currentTableConfig.length / 2;
          const maxTableX = Math.max(0.1, tableHalfW - draggedHalfX);
          const maxTableZ = Math.max(0.1, tableHalfL - draggedHalfZ);
          let clampedX = Math.max(-maxTableX, Math.min(maxTableX, this.dragPlaneIntersect.x));
          let clampedZ = Math.max(-maxTableZ, Math.min(maxTableZ, this.dragPlaneIntersect.z));

          const tableTopY = this.currentTableConfig.height;
          // Normal hovering height when dragging over empty table:
          const baseDragElevation = tableTopY + draggedHeight / 2 + 0.10;

          let highestUnderlyingSurface = tableTopY;
          let touchedAnyPiece = false;
          let stackCandidate: { piece: TabletopPieceData; mesh: THREE.Group | THREE.Mesh; dist: number } | null = null;
          let minStackDist = Infinity;

          // Check all other pieces on the table for touch / overlap / stacking
          for (const [otherId, otherMesh] of this.pieceMeshes.entries()) {
            if (otherId === this.grabbedPieceId || this.multiDragOffsets.has(otherId)) continue;
            const otherPiece = (otherMesh as any).pieceData as TabletopPieceData | undefined;
            if (!otherPiece) continue;

            const otherDims = this.getPieceDimensions(otherPiece);
            const otherHalfX = (otherDims.x || 1.0) / 2;
            const otherHalfZ = (otherDims.z || 1.0) / 2;
            const otherRadius = Math.hypot(otherHalfX, otherHalfZ);
            const otherHeight = otherDims.y || 0.01;

            const dx = Math.abs(clampedX - otherMesh.position.x);
            const dz = Math.abs(clampedZ - otherMesh.position.z);
            const distXZ = Math.hypot(clampedX - otherMesh.position.x, clampedZ - otherMesh.position.z);

            // Bounding touch detection:
            // Two pieces touch when their footprints in the XZ plane meet or overlap:
            const touchThresholdX = (draggedHalfX + otherHalfX) * 0.96;
            const touchThresholdZ = (draggedHalfZ + otherHalfZ) * 0.96;
            const isTouching = (dx <= touchThresholdX && dz <= touchThresholdZ) || (distXZ < (draggedRadius + otherRadius) * 0.90);

            if (isTouching) {
              touchedAnyPiece = true;
              const otherTop = otherMesh.position.y + otherHeight / 2;
              if (otherTop > highestUnderlyingSurface) {
                highestUnderlyingSurface = otherTop;
              }

              // Check if stackable according to logic
              if (this.canStackPieces(draggedPiece, otherPiece)) {
                if (distXZ < minStackDist) {
                  minStackDist = distXZ;
                  stackCandidate = { piece: otherPiece, mesh: otherMesh, dist: distXZ };
                }
              }
            }
          }

          // Raise the dragged component so that it can be stacked on top of the other!
          let targetElevationY: number;
          if (touchedAnyPiece && highestUnderlyingSurface > tableTopY) {
            // When touching another component, raise it up so it hovers above the top of the underlying component:
            targetElevationY = highestUnderlyingSurface + draggedHeight / 2 + 0.12;
          } else {
            targetElevationY = baseDragElevation;
          }

          // Bound elevation within the invisible box ceiling
          const maxElevationY = tableTopY + 3.6 - draggedHeight / 2;
          targetElevationY = Math.min(maxElevationY, targetElevationY);

          // Magnetize and stack indicator when centered over a stackable candidate
          if (stackCandidate && stackCandidate.dist < (draggedHalfX + this.getPieceDimensions(stackCandidate.piece).x / 2) * 0.7) {
            // Magnetic centering assist
            clampedX = THREE.MathUtils.lerp(clampedX, stackCandidate.mesh.position.x, 0.28);
            clampedZ = THREE.MathUtils.lerp(clampedZ, stackCandidate.mesh.position.z, 0.28);
            this.activeStackTargetId = stackCandidate.piece.id;
            this.showStackGuide(stackCandidate.mesh.position, this.getPieceDimensions(stackCandidate.piece));
          } else {
            this.activeStackTargetId = null;
            this.hideStackGuide();
          }

          // Smoothly interpolate Y elevation
          if (this.currentDraggedY === null || this.currentDraggedY === undefined || Number.isNaN(this.currentDraggedY)) {
            this.currentDraggedY = targetElevationY;
          } else {
            this.currentDraggedY = THREE.MathUtils.lerp(this.currentDraggedY, targetElevationY, 0.32);
          }

          const targetPos = new THREE.Vector3(clampedX, this.currentDraggedY, clampedZ);
          if (mesh) {
            mesh.position.copy(targetPos);
          }

          const multiUpdates: Array<{ pieceId: string; worldPos: Vector3D }> = [
            { pieceId: this.grabbedPieceId, worldPos: { x: targetPos.x, y: targetPos.y, z: targetPos.z } },
          ];

          // Move all other selected pieces maintaining relative offsets, keeping within table bounds
          for (const [otherId, offset] of this.multiDragOffsets.entries()) {
            const otherMesh = this.pieceMeshes.get(otherId);
            if (otherMesh) {
              const otherPiece = (otherMesh as any).pieceData as TabletopPieceData | undefined;
              const otherDims = this.getPieceDimensions(otherPiece);
              const otherHalfX = (otherDims.x || 1.0) / 2;
              const otherHalfZ = (otherDims.z || 1.0) / 2;
              const otherMaxX = Math.max(0.1, tableHalfW - otherHalfX);
              const otherMaxZ = Math.max(0.1, tableHalfL - otherHalfZ);

              const otherX = Math.max(-otherMaxX, Math.min(otherMaxX, clampedX + offset.x));
              const otherZ = Math.max(-otherMaxZ, Math.min(otherMaxZ, clampedZ + offset.z));
              const otherY = Math.max(tableTopY + (otherDims.y || 0.01) / 2, Math.min(maxElevationY, targetPos.y + offset.y));

              const otherPos = new THREE.Vector3(otherX, otherY, otherZ);
              otherMesh.position.copy(otherPos);
              multiUpdates.push({
                pieceId: otherId,
                worldPos: { x: otherPos.x, y: otherPos.y, z: otherPos.z },
              });
            }
          }

          const now = Date.now();
          const dt = Math.max(0.01, (now - this.lastDragTime) / 1000);
          this.dragVelocity.subVectors(targetPos, this.lastDragPos).divideScalar(dt);
          this.lastDragPos.copy(targetPos);
          this.lastDragTime = now;

          this.syncSelectionHighlightPositions();

          if (this.events.onPieceDrag) {
            this.events.onPieceDrag(this.grabbedPieceId, {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
            });
          }
          if (this.events.onMultiPieceDrag && multiUpdates.length > 1) {
            this.events.onMultiPieceDrag(multiUpdates);
          }
        }
        return;
      }

      // Hover
      const tableHit = this.raycastTable();
      if (tableHit && this.events.onPointerMove) {
        this.events.onPointerMove({ x: tableHit.x, y: tableHit.y, z: tableHit.z }, false);
      }

      const pieceHit = this.raycastPieces();
      const newHoverId = pieceHit ? (pieceHit as any).tabletopId : null;
      if (newHoverId !== this.hoveredPieceId) {
        this.hoveredPieceId = newHoverId;
        dom.style.cursor =
          this.currentTool === 'paint'
            ? 'crosshair'
            : this.currentTool === 'ruler'
            ? 'crosshair'
            : this.currentTool === 'flick'
            ? 'pointer'
            : newHoverId
            ? 'grab'
            : 'default';

        if (this.events.onPieceHover) {
          this.events.onPieceHover(newHoverId);
        }

        // If Alt is held, update inspect preview
        if (this.isAltPressed && this.events.onPieceInspect) {
          this.events.onPieceInspect(pieceHit ? (pieceHit as any).pieceData : null);
        }
      }
    });

    dom.addEventListener('pointerup', (e) => {
      if (this.isOrbiting) {
        this.isOrbiting = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}

        // Check if quick right click without moving -> trigger context menu
        if (this.rightClickStartPos) {
          const dist = Math.hypot(e.clientX - this.rightClickStartPos.x, e.clientY - this.rightClickStartPos.y);
          const dur = Date.now() - this.rightClickStartTime;
          if (dist < 6 && dur < 400 && this.events.onContextMenu) {
            const pieceHit = this.raycastPieces();
            if (pieceHit) {
              const pId = (pieceHit as any).tabletopId;
              const pData = (pieceHit as any).pieceData as TabletopPieceData;
              this.events.onContextMenu({ pieceId: pId, pieceData: pData, screenX: e.clientX, screenY: e.clientY });
            } else {
              this.events.onContextMenu({ screenX: e.clientX, screenY: e.clientY });
            }
          }
          this.rightClickStartPos = null;
        }
      }

      if (this.isPanning) {
        this.isPanning = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      // Finish Box Selection
      if (this.isBoxSelecting) {
        this.isBoxSelecting = false;
        if (this.events.onBoxSelectChange) {
          this.events.onBoxSelectChange({ x1: 0, y1: 0, x2: 0, y2: 0, active: false });
        }
        if (this.events.onSelectionChange) {
          this.events.onSelectionChange(Array.from(this.selectedPieceIds));
        }
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      // Finish paint stroke
      if (this.currentTool === 'paint' && this.currentDrawingPoints.length > 1) {
        if (this.events.onStrokeDrawn) {
          this.events.onStrokeDrawn({
            id: `str_${Date.now()}`,
            color: this.isErasing ? '#00000000' : this.paintColor,
            size: this.paintBrushSize,
            points: this.currentDrawingPoints,
          });
        }
        this.currentDrawingPoints = [];
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      // Finish flick
      if (this.currentTool === 'flick' && this.flickTargetPieceId && this.flickStartPos) {
        const tableHit = this.raycastTable();
        if (tableHit) {
          const impulseVec = new THREE.Vector3().subVectors(this.flickStartPos, tableHit).multiplyScalar(8);
          if (this.events.onFlickRelease) {
            this.events.onFlickRelease(this.flickTargetPieceId, {
              x: impulseVec.x,
              y: Math.max(1, impulseVec.length() * 0.3),
              z: impulseVec.z,
            });
          }
        }
        this.flickTargetPieceId = null;
        this.flickStartPos = null;
        if (this.flickArrowMesh) this.flickArrowMesh.visible = false;
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      // Finish Gizmo drag
      if (this.currentTool === 'gizmo' && this.activeGizmoAxis && this.gizmoTargetPieceId) {
        const targetMesh = this.pieceMeshes.get(this.gizmoTargetPieceId);
        if (targetMesh && this.events.onPieceRelease) {
          this.events.onPieceRelease(this.gizmoTargetPieceId, { x: 0, y: 0, z: 0 });
        }
        this.activeGizmoAxis = null;
        this.updateGizmoHoverColors();
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      // Finish Grab Release (Single or Multi-piece)
      if (this.grabbedPieceId) {
        const releasedId = this.grabbedPieceId;
        const clampedVel: Vector3D = {
          x: Math.max(-8, Math.min(8, this.dragVelocity.x)),
          y: Math.max(-2, Math.min(5, this.dragVelocity.y)),
          z: Math.max(-8, Math.min(8, this.dragVelocity.z)),
        };

        const releases: Array<{ pieceId: string; velocity: Vector3D }> = [
          { pieceId: releasedId, velocity: clampedVel },
        ];

        for (const otherId of this.multiDragOffsets.keys()) {
          releases.push({
            pieceId: otherId,
            velocity: clampedVel,
          });
        }

        this.grabbedPieceId = null;
        this.multiDragOffsets.clear();
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (this.events.onPieceRelease) {
          this.events.onPieceRelease(releasedId, clampedVel);
        }
        if (releases.length > 1 && this.events.onMultiPieceRelease) {
          this.events.onMultiPieceRelease(releases);
        }
        this.updateSelectionHighlights();
      }

      if (this.currentTool === 'ruler' && this.rulerStart) {
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.02;
        this.cameraSpherical.radius = Math.max(5, Math.min(50, this.cameraSpherical.radius + zoomDelta));
        this.updateCameraTransform();
      },
      { passive: false }
    );

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

  public raycastTable(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.tableMesh) {
      const hits = this.raycaster.intersectObject(this.tableMesh, false);
      if (hits.length > 0) {
        return hits[0].point;
      }
    }
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

  private renderLoop() {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.renderLoop);

    for (const [id, mesh] of this.pieceMeshes.entries()) {
      if (id === this.grabbedPieceId) continue;
      if (this.currentTool === 'gizmo' && this.activeGizmoAxis && id === this.gizmoTargetPieceId) continue;

      const target = this.pieceTargetTransforms.get(id);
      if (target) {
        const distSq = mesh.position.distanceToSquared(target.pos);
        if (distSq > 0.00004) {
          mesh.position.lerp(target.pos, 0.4);
          mesh.quaternion.slerp(target.quat, 0.4);
        }
      }
    }

    // 3D Transform Gizmo Viewport Alignment & Scaling (F9)
    if (this.currentTool === 'gizmo') {
      const activeId = this.gizmoTargetPieceId || Array.from(this.selectedPieceIds)[0];
      if (activeId) {
        this.gizmoTargetPieceId = activeId;
        const targetMesh = this.pieceMeshes.get(activeId);
        if (targetMesh) {
          this.gizmoGroup.position.copy(targetMesh.position);
          const camDist = this.camera.position.distanceTo(targetMesh.position);
          const s = Math.max(0.5, Math.min(2.5, camDist * 0.065));
          this.gizmoGroup.scale.set(s, s, s);
          this.gizmoGroup.visible = true;
        } else {
          this.gizmoGroup.visible = false;
        }
      } else {
        this.gizmoGroup.visible = false;
      }
    } else {
      this.gizmoGroup.visible = false;
    }

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

    this.syncSelectionHighlightPositions();

    this.renderer.render(this.scene, this.camera);
  }

  // Tabletopia Light Blue Selection Ring Texture Generator
  private getTabletopiaRingTexture(): THREE.CanvasTexture {
    if (this.tabletopiaRingTexture) return this.tabletopiaRingTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const cx = 128;
    const cy = 128;
    const r = 96;

    // 1. Soft inner translucent light-blue fill (Tabletopia glow)
    const innerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    innerGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    innerGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
    innerGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer soft bloom halo
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Crisp vibrant light blue neon ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Inner bright cyan rim
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Tabletopia signature 4 cardinal tick accents (at 0, 90, 180, 270 deg)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    for (const a of angles) {
      const x1 = cx + Math.cos(a) * (r - 12);
      const y1 = cy + Math.sin(a) * (r - 12);
      const x2 = cx + Math.cos(a) * (r + 12);
      const y2 = cy + Math.sin(a) * (r + 12);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    this.tabletopiaRingTexture = new THREE.CanvasTexture(canvas);
    return this.tabletopiaRingTexture;
  }

  // Tabletopia Selection & Multi-Selection Highlight Management (Luminous Light Blue Ring)
  public updateSelectionHighlights() {
    // Remove highlights for unselected pieces
    for (const [id, highlightMesh] of this.selectionHighlightMeshes.entries()) {
      if (!this.selectedPieceIds.has(id)) {
        this.selectionHighlightGroup.remove(highlightMesh);
        if (highlightMesh.geometry) highlightMesh.geometry.dispose();
        this.selectionHighlightMeshes.delete(id);
      }
    }

    const ringTex = this.getTabletopiaRingTexture();

    // Add or update Tabletopia light blue ring highlights for selected pieces
    for (const id of this.selectedPieceIds) {
      const mesh = this.pieceMeshes.get(id);
      if (!mesh) continue;

      const pieceData = (mesh as any).pieceData;
      const dims = this.getPieceDimensions(pieceData);
      const radius = Math.max(dims.x, dims.z) * 0.72;

      let highlightMesh = this.selectionHighlightMeshes.get(id);
      if (!highlightMesh) {
        const ringGeo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        highlightMesh = new THREE.Mesh(ringGeo, ringMat);
        this.selectionHighlightGroup.add(highlightMesh);
        this.selectionHighlightMeshes.set(id, highlightMesh);
      }

      // Position flush at the exact base of the selected piece
      const baseElevation = mesh.position.y - dims.y / 2 + 0.012;
      highlightMesh.position.set(mesh.position.x, baseElevation, mesh.position.z);
    }
  }

  public syncSelectionHighlightPositions() {
    if (this.selectedPieceIds.size === 0) return;
    for (const [id, highlight] of this.selectionHighlightMeshes.entries()) {
      const mesh = this.pieceMeshes.get(id);
      if (mesh) {
        const dims = this.getPieceDimensions((mesh as any).pieceData);
        highlight.position.x = mesh.position.x;
        highlight.position.z = mesh.position.z;
        highlight.position.y = mesh.position.y - dims.y / 2 + 0.012;
      }
    }
  }

  public selectAll() {
    for (const id of this.pieceMeshes.keys()) {
      this.selectedPieceIds.add(id);
    }
    this.updateSelectionHighlights();
    if (this.events.onSelectionChange) {
      this.events.onSelectionChange(Array.from(this.selectedPieceIds));
    }
  }

  public clearSelection() {
    this.selectedPieceIds.clear();
    this.updateSelectionHighlights();
    if (this.events.onSelectionChange) {
      this.events.onSelectionChange([]);
    }
  }

  public selectPiece(id: string, toggle: boolean = false) {
    if (toggle) {
      if (this.selectedPieceIds.has(id)) {
        this.selectedPieceIds.delete(id);
      } else {
        this.selectedPieceIds.add(id);
      }
    } else {
      this.selectedPieceIds.clear();
      this.selectedPieceIds.add(id);
    }
    this.updateSelectionHighlights();
    if (this.events.onSelectionChange) {
      this.events.onSelectionChange(Array.from(this.selectedPieceIds));
    }
  }

  // TTS Snap Points Visuals (kb.tabletopsimulator.com/game-tools/snap-points-and-joints/)
  public syncSnapPoints(points: SnapPoint[]) {
    for (const mesh of this.snapPointMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.snapPointMeshes.clear();

    for (const pt of points) {
      const group = new THREE.Group();
      group.position.set(pt.position.x, pt.position.y + 0.02, pt.position.z);

      const ringGeo = new THREE.RingGeometry(0.3, 0.38, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);

      const crossGeo = new THREE.PlaneGeometry(0.08, 0.45);
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const crossH = new THREE.Mesh(crossGeo, crossMat);
      crossH.rotation.x = -Math.PI / 2;
      crossH.rotation.z = Math.PI / 2;
      group.add(crossH);
      const crossV = new THREE.Mesh(crossGeo, crossMat);
      crossV.rotation.x = -Math.PI / 2;
      group.add(crossV);

      this.scene.add(group);
      this.snapPointMeshes.set(pt.id, group);
    }
  }

  // TTS 3D Text Labels Visuals (kb.tabletopsimulator.com/game-tools/text-and-decals/)
  public syncTextLabels(labels: TextLabel[]) {
    for (const sprite of this.textLabelMeshes.values()) {
      this.scene.remove(sprite);
    }
    this.textLabelMeshes.clear();

    for (const lbl of labels) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;

      if (lbl.bgColor) {
        ctx.fillStyle = lbl.bgColor;
        ctx.roundRect(8, 8, 496, 144, 16);
        ctx.fill();
      }

      ctx.fillStyle = lbl.color || '#f8fafc';
      ctx.font = `bold ${Math.round((lbl.fontSize || 32) * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl.text, 256, 80);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(lbl.position.x, lbl.position.y + 0.5, lbl.position.z);
      sprite.scale.set(3, 1, 1);

      this.scene.add(sprite);
      this.textLabelMeshes.set(lbl.id, sprite);
    }
  }

  // TTS Decals Visuals (kb.tabletopsimulator.com/game-tools/text-and-decals/)
  public syncDecals(decals: DecalData[]) {
    for (const mesh of this.decalMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.decalMeshes.clear();

    const loader = new THREE.TextureLoader();
    for (const d of decals) {
      const size = d.size || 1.5;
      const geo = new THREE.PlaneGeometry(size, size);
      loader.load(d.imageUrl, (tex) => {
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = d.rotationY || 0;
        mesh.position.set(d.position.x, d.position.y + 0.015, d.position.z);
        this.scene.add(mesh);
        this.decalMeshes.set(d.id, mesh);
      });
    }
  }

  // TTS Joint Visual Connection Lines
  public syncJoints(joints: JointData[]) {
    while (this.jointLinesGroup.children.length > 0) {
      const c = this.jointLinesGroup.children[0];
      this.jointLinesGroup.remove(c);
      if ((c as any).geometry) (c as any).geometry.dispose();
    }

    for (const j of joints) {
      const meshA = this.pieceMeshes.get(j.pieceIdA);
      const meshB = this.pieceMeshes.get(j.pieceIdB);
      if (meshA && meshB) {
        const points = [meshA.position, meshB.position];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const color = j.type === 'fixed' ? 0x10b981 : j.type === 'spring' ? 0x38bdf8 : 0xf59e0b;
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        const line = new THREE.Line(geo, mat);
        this.jointLinesGroup.add(line);
      }
    }
  }

  // TTS Camera Bookmarks (Ctrl+1..4 to save, Shift+1..4 to load)
  public saveCameraBookmark(index: number) {
    const bookmark: CameraBookmark = {
      index,
      target: { x: this.cameraTarget.x, y: this.cameraTarget.y, z: this.cameraTarget.z },
      spherical: { ...this.cameraSpherical },
    };
    this.cameraBookmarks = this.cameraBookmarks.filter(b => b.index !== index);
    this.cameraBookmarks.push(bookmark);
  }

  public loadCameraBookmark(index: number) {
    const bm = this.cameraBookmarks.find(b => b.index === index);
    if (!bm) return;
    this.cameraTarget.set(bm.target.x, bm.target.y, bm.target.z);
    this.cameraSpherical = { ...bm.spherical };
    this.updateCameraTransform();
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
