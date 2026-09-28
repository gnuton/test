/**
 * Tabletop Nexus - Custom Asset Creator & Importer
 */

import React, { useState } from 'react';
import { Image, X, Plus, Sparkles, Layers, Box } from 'lucide-react';
import { TabletopPieceData, PieceShapeType } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSpawnPiece: (piece: Partial<TabletopPieceData> & { type: PieceShapeType }) => void;
  tableHeight: number;
}

const SAMPLE_AVATARS = [
  { name: 'Dragon Boss', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=256&auto=format&fit=crop&q=80' },
  { name: 'Cyberpunk Runner', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&auto=format&fit=crop&q=80' },
  { name: 'Knight Shield', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=256&auto=format&fit=crop&q=80' },
  { name: 'Wizard Spell', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=256&auto=format&fit=crop&q=80' },
];

export const CustomAssetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSpawnPiece,
  tableHeight,
}) => {
  const [tokenName, setTokenName] = useState('Custom Hero Token');
  const [imageUrl, setImageUrl] = useState(SAMPLE_AVATARS[0].url);
  const [tokenType, setTokenType] = useState<'token' | 'card'>('token');
  const [scale, setScale] = useState(1.2);

  if (!isOpen) return null;

  const handleSpawn = () => {
    if (tokenType === 'token') {
      onSpawnPiece({
        type: 'custom_token',
        name: tokenName || 'Custom Token',
        imageUrl: imageUrl.trim() || undefined,
        dimensions: { x: scale, y: 0.15, z: scale },
        position: { x: 0, y: tableHeight + 1.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
    } else {
      onSpawnPiece({
        type: 'card',
        name: tokenName || 'Custom Card',
        imageUrl: imageUrl.trim() || undefined,
        label: tokenName,
        dimensions: { x: 1.1 * scale, y: 0.04, z: 1.6 * scale },
        position: { x: 0, y: tableHeight + 1.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Custom Asset Importer</h2>
              <p className="text-[11px] text-slate-400">Import custom standees, tokens, and cards via image URL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Asset Type */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Asset Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTokenType('token')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  tokenType === 'token'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>3D Circular Token</span>
              </button>
              <button
                type="button"
                onClick={() => setTokenType('card')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  tokenType === 'card'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Custom Card</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Asset Name</label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g. Rogue Assassin"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/character.png"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
            />
          </div>

          {/* Quick Sample Presets */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">Or choose a quick preset image:</span>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLE_AVATARS.map((av) => (
                <button
                  key={av.name}
                  type="button"
                  onClick={() => {
                    setImageUrl(av.url);
                    setTokenName(av.name);
                  }}
                  className={`relative rounded-xl overflow-hidden border aspect-square group transition ${
                    imageUrl === av.url ? 'ring-2 ring-emerald-500 border-white' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={av.url} alt={av.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </button>
              ))}
            </div>
          </div>

          {/* Scale Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Size / Scale</label>
              <span className="text-xs font-mono text-emerald-400">{scale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Spawn Button */}
          <div className="pt-2">
            <button
              onClick={handleSpawn}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Spawn Asset on Table</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
