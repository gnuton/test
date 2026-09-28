/**
 * Tabletop Nexus - Save & Load Game State Modal
 */

import React, { useRef, useState } from 'react';
import { Download, Upload, Save, X, FileJson, Check, AlertCircle } from 'lucide-react';
import { TabletopPieceData, TableConfig, NotebookEntry } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pieces: TabletopPieceData[];
  tableConfig: TableConfig;
  notebook: NotebookEntry[];
  onLoadState: (state: { pieces: TabletopPieceData[]; tableConfig: TableConfig; notebook?: NotebookEntry[] }) => void;
}

export const SaveLoadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pieces,
  tableConfig,
  notebook,
  onLoadState,
}) => {
  const [saveName, setSaveName] = useState('tabletop-save');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const state = {
      version: '1.0.0',
      timestamp: Date.now(),
      tableConfig,
      pieces,
      notebook,
    };
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${saveName || 'tabletop-save'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Game state exported to JSON file!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const state = JSON.parse(event.target?.result as string);
        if (state.pieces && state.tableConfig) {
          onLoadState({
            pieces: state.pieces,
            tableConfig: state.tableConfig,
            notebook: state.notebook,
          });
          setStatusMessage('Game state restored successfully!');
          setTimeout(() => {
            setStatusMessage(null);
            onClose();
          }, 1500);
        } else {
          setStatusMessage('Invalid save file format.');
        }
      } catch (err) {
        setStatusMessage('Error reading save file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Save & Load Game States</h2>
              <p className="text-[11px] text-slate-400">Save custom table setups or import existing games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Export / Save Section */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Export Save File</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Download the current positions, rotations, colors, notes, and table settings into a `.json` file.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save file name"
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
              <button
                onClick={handleExportJSON}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Import / Load Section */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Load Saved State</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Restore a previously saved `.json` tabletop setup directly onto this table for all room players.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Choose .json File to Load</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
