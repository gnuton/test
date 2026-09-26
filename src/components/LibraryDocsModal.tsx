/**
 * Tabletop Nexus - Pluggable Library Documentation & Code Examples
 */

import React, { useState } from 'react';
import { Copy, Check, Code, Server, Laptop, Cpu, X, BookOpen, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LibraryDocsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'react' | 'server' | 'custom_pieces'>('quickstart');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeSnippets = {
    quickstart: `// 1. Install or import the pluggable library
import { TabletopClient } from './src/lib/tabletop';

// 2. Initialize in any HTML container element
const container = document.getElementById('tabletop-root');

const tabletop = new TabletopClient({
  container,
  roomId: 'game-night-room',
  playerName: 'Gandalf',
  playerColor: '#3b82f6',
  soundEnabled: true,
});

// 3. Listen to server physics events
tabletop.on('dice:settled', ({ pieceId, value, diceType }) => {
  console.log(\`Dice \${pieceId} (\${diceType}) settled on face: \${value}\`);
});

// 4. Programmatically spawn pieces, roll, or flip table!
tabletop.spawnPiece({
  type: 'dice_d20',
  name: 'Critical D20',
  position: { x: 0, y: 3, z: 0 },
  color: '#dc2626'
});

tabletop.rollAllDice();
// tabletop.flipTable(); // (╯°□°)╯︵ ┻━┻`,

    react: `import React, { useEffect, useRef } from 'react';
import { TabletopClient } from './src/lib/tabletop';

export function MyGameView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<TabletopClient | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Mount pluggable tabletop engine
    const client = new TabletopClient({
      container: containerRef.current,
      roomId: 'my-tournament-room',
      playerName: 'Player 1',
    });
    clientRef.current = client;

    // React to events
    client.on('table:flipped', () => {
      alert('Table was flipped!');
    });

    return () => {
      client.destroy();
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={() => clientRef.current?.rollAllDice()}
        className="absolute bottom-6 right-6 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg font-bold"
      >
        Roll All Dice
      </button>
    </div>
  );
}`,

    server: `// Server-Side Authoritative Physics Loop (Node.js)
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { TabletopServerRoom } from './src/lib/tabletop/server/TabletopServerRoom';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Create isolated multiplayer rooms with server physics
const room = new TabletopServerRoom('tournament-1', 'boardgame');

wss.on('connection', (ws) => {
  const playerId = room.handleJoin(ws, 'Guest');

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    room.handleMessage(playerId, msg);
  });

  ws.on('close', () => {
    room.handleLeave(playerId);
  });
});

server.listen(3000, () => console.log('Physics server active!'));`,

    custom_pieces: `// Register custom pieces and plugins
import { TabletopPlugin } from './src/lib/tabletop';

const AnalyticsPlugin: TabletopPlugin = {
  name: 'tabletop-analytics',
  init(client) {
    client.on('dice:settled', (e) => {
      console.log('Sending dice roll telemetry:', e.value);
    });
    client.on('piece:grabbed', (e) => {
      console.log('User picked up piece:', e.pieceId);
    });
  },
  destroy() {
    console.log('Plugin destroyed');
  }
};

client.use(AnalyticsPlugin);

// Spawning custom dominoes, poker chips, and polyhedrals
client.spawnPiece({
  type: 'poker_chip',
  name: '$1,000 High Roller Chip',
  value: 1000,
  color: '#eab308',
  secondaryColor: '#000000',
  position: { x: 0, y: 3, z: 0 }
});`
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Tabletop Nexus Core Library
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Pluggable SDK
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Embeddable 3D browser simulation with server-authoritative physics synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 px-6 py-3 bg-slate-950/30 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Server-side Cannon.js physics loop (30Hz)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Server className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Real-time WebSocket snapshot replication</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Modular Three.js client renderer</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 pt-2">
          {[
            { id: 'quickstart', label: 'Vanilla JS Quickstart', icon: Laptop },
            { id: 'react', label: 'React Integration', icon: Code },
            { id: 'server', label: 'Node.js Server Setup', icon: Server },
            { id: 'custom_pieces', label: 'Custom Pieces & Plugins', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-px ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 font-mono text-xs relative">
          <button
            onClick={() => copyToClipboard(codeSnippets[activeTab], activeTab)}
            className="absolute top-8 right-8 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow"
          >
            {copied === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">Copy Code</span>
              </>
            )}
          </button>

          <pre className="text-emerald-300 leading-relaxed overflow-x-auto p-4 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <code>{codeSnippets[activeTab]}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <div>
            Built with TypeScript, Three.js, Cannon-es, and WebSockets.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
