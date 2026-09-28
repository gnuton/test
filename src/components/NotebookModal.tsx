/**
 * Tabletop Nexus - Shared Game Notebook
 */

import React, { useState } from 'react';
import { BookOpen, X, Plus, Save, FileText, Check } from 'lucide-react';
import { NotebookEntry } from '../lib/tabletop/types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: NotebookEntry[];
  onSaveEntry: (entry: NotebookEntry) => void;
  playerName: string;
}

export const NotebookModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entries,
  onSaveEntry,
  playerName,
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    entries[0]?.id || 'entry-welcome'
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savedNotification, setSavedNotification] = useState(false);

  React.useEffect(() => {
    const entry = entries.find((e) => e.id === selectedEntryId) || entries[0];
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
    }
  }, [selectedEntryId, entries]);

  if (!isOpen) return null;

  const handleSave = () => {
    const entry: NotebookEntry = {
      id: selectedEntryId || `entry_${Date.now()}`,
      title: title || 'Untitled Note',
      content,
      updatedAt: Date.now(),
      updatedBy: playerName,
    };
    onSaveEntry(entry);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const handleCreateNew = () => {
    const newId = `entry_${Date.now()}`;
    const newEntry: NotebookEntry = {
      id: newId,
      title: 'New Page',
      content: '# New Page\n\nWrite game notes here...',
      updatedAt: Date.now(),
      updatedBy: playerName,
    };
    onSaveEntry(newEntry);
    setSelectedEntryId(newId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl h-[75vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Shared Table Notebook</h2>
              <p className="text-[11px] text-slate-400">Rules, character sheets, and notes synchronized to all players</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Pages */}
          <div className="w-60 border-r border-slate-800 bg-slate-950/30 flex flex-col">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pages</span>
              <button
                onClick={handleCreateNew}
                className="p-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition"
                title="Create New Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {entries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntryId(e.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                    selectedEntryId === e.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{e.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-1 flex flex-col bg-slate-900/60">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page Title"
                className="bg-transparent text-base font-bold text-white outline-none w-full border-b border-transparent focus:border-emerald-500 pb-1"
              />
              <button
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                {savedNotification ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedNotification ? 'Saved!' : 'Save'}</span>
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write game rules, scenario lore, character stats, or score records..."
              className="flex-1 p-5 bg-transparent text-xs text-slate-200 font-mono leading-relaxed outline-none resize-none placeholder-slate-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
