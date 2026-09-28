/**
 * Tabletop Nexus - 3D Tablet / Virtual Web Browser Modal
 * Implements kb.tabletopsimulator.com/built-in-objects/tablet/
 */

import React, { useState } from 'react';
import { X, Globe, ArrowLeft, RotateCw, ExternalLink, Bookmark, Search } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TabletModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState<string>('https://en.wikipedia.org/wiki/List_of_traditional_board_games');
  const [inputUrl, setInputUrl] = useState<string>(url);
  const [iframeKey, setIframeKey] = useState<number>(0);

  if (!isOpen) return null;

  const quickBookmarks = [
    { title: 'Traditional Games (Wiki)', url: 'https://en.wikipedia.org/wiki/List_of_traditional_board_games' },
    { title: 'Chess Rules & Guide', url: 'https://en.wikipedia.org/wiki/Rules_of_chess' },
    { title: 'Poker Hand Rankings', url: 'https://en.wikipedia.org/wiki/List_of_poker_hands' },
    { title: 'D&D 5e Basic Rules', url: 'https://en.wikipedia.org/wiki/Dungeons_%26_Dragons' },
  ];

  const handleNavigate = (target: string) => {
    let clean = target.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    setUrl(clean);
    setInputUrl(clean);
    setIframeKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-white flex flex-col gap-3">
        {/* Tablet Bezel & Address Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-100 hidden sm:inline">Tabletop Tablet</span>
          </div>

          {/* URL Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNavigate(inputUrl);
            }}
            className="flex-1 flex items-center gap-2 max-w-xl bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter web URL or reference page..."
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="text-slate-400 hover:text-white"
              title="Reload"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Bookmarks Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Bookmark className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {quickBookmarks.map((bm) => (
            <button
              key={bm.title}
              onClick={() => handleNavigate(bm.url)}
              className={`px-3 py-1 rounded-lg border text-[11px] font-semibold flex-shrink-0 transition ${
                url === bm.url
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {bm.title}
            </button>
          ))}
        </div>

        {/* Browser Iframe Screen */}
        <div className="flex-1 w-full rounded-2xl bg-white overflow-hidden relative border border-slate-800 shadow-inner">
          <iframe
            key={iframeKey}
            src={url}
            title="Tabletop Web Tablet"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
