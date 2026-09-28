/**
 * Tabletop Nexus - Extended Tools (Joints, Snap Points, 3D Text, Decals)
 * Implements kb.tabletopsimulator.com/game-tools/
 */

import React, { useState } from 'react';
import {
  Link2,
  Crosshair,
  Type,
  Sticker,
  Plus,
  Trash2,
  Check,
  X
} from 'lucide-react';
import {
  ToolMode,
  SnapPoint,
  JointData,
  TextLabel,
  DecalData,
  TabletopPieceData,
  Vector3D
} from '../lib/tabletop/types.js';

interface Props {
  currentTool: ToolMode;
  pieces: TabletopPieceData[];
  snapPoints: SnapPoint[];
  joints: JointData[];
  textLabels: TextLabel[];
  decals: DecalData[];
  tableHeight: number;
  onAddSnapPoint: (snapPoint: SnapPoint) => void;
  onRemoveSnapPoint: (id: string) => void;
  onAddJoint: (joint: JointData) => void;
  onRemoveJoint: (id: string) => void;
  onAddTextLabel: (label: TextLabel) => void;
  onRemoveTextLabel: (id: string) => void;
  onAddDecal: (decal: DecalData) => void;
  onRemoveDecal: (id: string) => void;
  onClose: () => void;
}

export const SnapJointToolsModal: React.FC<Props> = ({
  currentTool,
  pieces,
  snapPoints,
  joints,
  textLabels,
  decals,
  tableHeight,
  onAddSnapPoint,
  onRemoveSnapPoint,
  onAddJoint,
  onRemoveJoint,
  onAddTextLabel,
  onRemoveTextLabel,
  onAddDecal,
  onRemoveDecal,
  onClose,
}) => {
  // Joint Tool State
  const [jointPieceA, setJointPieceA] = useState<string>('');
  const [jointPieceB, setJointPieceB] = useState<string>('');
  const [jointType, setJointType] = useState<'fixed' | 'spring' | 'hinge'>('fixed');

  // Snap Point State
  const [snapRadius, setSnapRadius] = useState<number>(1.2);
  const [snapRotation, setSnapRotation] = useState<number>(0);

  // 3D Text Label State
  const [labelText, setLabelText] = useState<string>('Objective Zone');
  const [labelColor, setLabelColor] = useState<string>('#f59e0b');
  const [labelBgColor, setLabelBgColor] = useState<string>('#0f172a');
  const [labelSize, setLabelSize] = useState<number>(36);

  // Decal State
  const [decalUrl, setDecalUrl] = useState<string>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80'
  );
  const [decalSize, setDecalSize] = useState<number>(2.0);

  // Only open when one of these tools is active
  if (!['joint', 'snap_points', 'text', 'decal'].includes(currentTool)) {
    return null;
  }

  const handleCreateJoint = () => {
    if (!jointPieceA || !jointPieceB || jointPieceA === jointPieceB) return;
    const newJoint: JointData = {
      id: `joint_${Date.now()}`,
      pieceIdA: jointPieceA,
      pieceIdB: jointPieceB,
      type: jointType,
    };
    onAddJoint(newJoint);
    setJointPieceA('');
    setJointPieceB('');
  };

  const handleCreateSnapPoint = (x = 0, z = 0) => {
    const newSnap: SnapPoint = {
      id: `snap_${Date.now()}`,
      position: { x, y: tableHeight + 0.05, z },
      rotationY: (snapRotation * Math.PI) / 180,
      snapRadius,
    };
    onAddSnapPoint(newSnap);
  };

  const handleCreateTextLabel = (x = 0, z = 0) => {
    if (!labelText.trim()) return;
    const newLabel: TextLabel = {
      id: `label_${Date.now()}`,
      text: labelText.trim(),
      position: { x, y: tableHeight + 0.3, z },
      rotationY: 0,
      fontSize: labelSize,
      color: labelColor,
      bgColor: labelBgColor,
    };
    onAddTextLabel(newLabel);
  };

  const handleCreateDecal = (x = 0, z = 0) => {
    if (!decalUrl.trim()) return;
    const newDecal: DecalData = {
      id: `decal_${Date.now()}`,
      imageUrl: decalUrl.trim(),
      position: { x, y: tableHeight + 0.015, z },
      rotationY: 0,
      size: decalSize,
    };
    onAddDecal(newDecal);
  };

  return (
    <div className="absolute top-16 left-16 z-30 w-80 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-white flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {currentTool === 'joint' && <Link2 className="w-4 h-4 text-emerald-400" />}
          {currentTool === 'snap_points' && <Crosshair className="w-4 h-4 text-amber-400" />}
          {currentTool === 'text' && <Type className="w-4 h-4 text-sky-400" />}
          {currentTool === 'decal' && <Sticker className="w-4 h-4 text-violet-400" />}
          <span className="text-xs font-bold capitalize">{currentTool.replace('_', ' ')} Tool</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Joint Tool Content */}
      {currentTool === 'joint' && (
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-[11px] text-slate-400 leading-snug">
            Connect two physical objects with a constraint so they move or swing together.
          </p>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Joint Type</label>
            <div className="grid grid-cols-3 gap-1">
              {(['fixed', 'spring', 'hinge'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setJointType(t)}
                  className={`py-1.5 rounded-xl border text-[11px] font-bold capitalize transition ${
                    jointType === t
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Piece A</label>
              <select
                value={jointPieceA}
                onChange={(e) => setJointPieceA(e.target.value)}
                className="w-full p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="">Select piece...</option>
                {pieces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Piece B</label>
              <select
                value={jointPieceB}
                onChange={(e) => setJointPieceB(e.target.value)}
                className="w-full p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="">Select piece...</option>
                {pieces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateJoint}
            disabled={!jointPieceA || !jointPieceB || jointPieceA === jointPieceB}
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition shadow"
          >
            Create Joint
          </button>

          {joints.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">Active Joints ({joints.length})</span>
              {joints.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-0.5 text-[11px] text-slate-300">
                  <span className="truncate max-w-[180px]">{j.type} joint</span>
                  <button onClick={() => onRemoveJoint(j.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Snap Point Tool Content */}
      {currentTool === 'snap_points' && (
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-[11px] text-slate-400 leading-snug">
            Place magnetic alignment snap points onto the tabletop for grid slots or card spaces.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Snap Radius: {snapRadius.toFixed(1)}</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={snapRadius}
              onChange={(e) => setSnapRadius(parseFloat(e.target.value))}
              className="w-28 accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCreateSnapPoint(0, 0)}
              className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
            >
              Add Center Point
            </button>
            <button
              onClick={() => {
                // Add 4 cardinal points around table
                [-4, 4].forEach((x) => {
                  [-3, 3].forEach((z) => handleCreateSnapPoint(x, z));
                });
              }}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition"
            >
              Add 4 Corners
            </button>
          </div>

          {snapPoints.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">Snap Points ({snapPoints.length})</span>
              {snapPoints.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-0.5 text-[11px] text-slate-300">
                  <span>Point ({s.position.x.toFixed(1)}, {s.position.z.toFixed(1)})</span>
                  <button onClick={() => onRemoveSnapPoint(s.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 3D Text Tool Content */}
      {currentTool === 'text' && (
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-[11px] text-slate-400 leading-snug">
            Place floating 3D billboard text labels directly in the tabletop scene.
          </p>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Label Text</label>
            <input
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="e.g. Draw Pile, Discard, High Roller..."
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Color</label>
              <input
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
                className="w-10 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 block mb-1">Font Size: {labelSize}px</label>
              <input
                type="range"
                min="20"
                max="64"
                value={labelSize}
                onChange={(e) => setLabelSize(parseInt(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          <button
            onClick={() => handleCreateTextLabel(0, 0)}
            className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition shadow"
          >
            Place 3D Label
          </button>

          {textLabels.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">Labels ({textLabels.length})</span>
              {textLabels.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-0.5 text-[11px] text-slate-300">
                  <span className="truncate max-w-[180px]">{l.text}</span>
                  <button onClick={() => onRemoveTextLabel(l.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Decal Tool Content */}
      {currentTool === 'decal' && (
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-[11px] text-slate-400 leading-snug">
            Stamp custom image decals or stickers flat onto the tabletop surface.
          </p>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Image URL</label>
            <input
              type="text"
              value={decalUrl}
              onChange={(e) => setDecalUrl(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Decal Size: {decalSize.toFixed(1)}</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.2"
              value={decalSize}
              onChange={(e) => setDecalSize(parseFloat(e.target.value))}
              className="w-28 accent-violet-500"
            />
          </div>

          <button
            onClick={() => handleCreateDecal(0, 0)}
            className="w-full py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold transition shadow"
          >
            Stamp Decal on Table
          </button>

          {decals.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">Stamped Decals ({decals.length})</span>
              {decals.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-0.5 text-[11px] text-slate-300">
                  <span className="truncate max-w-[180px]">Decal ({d.size}x{d.size})</span>
                  <button onClick={() => onRemoveDecal(d.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
