/**
 * Tabletop Nexus - Server Entry Point
 * Express + WebSockets with Server-Authoritative Physics
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { TabletopServerRoom } from './src/lib/tabletop/server/TabletopServerRoom.js';
import { ClientMessage } from './src/lib/tabletop/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

// In-memory room manager
const rooms = new Map<string, TabletopServerRoom>();

function getOrCreateRoom(roomId: string, presetName?: string): TabletopServerRoom {
  const cleanId = roomId.trim().toLowerCase() || 'default';
  let room = rooms.get(cleanId);
  if (!room) {
    room = new TabletopServerRoom(cleanId, presetName || 'boardgame');
    rooms.set(cleanId, room);
    console.log(`[Server] Created new room: "${cleanId}"`);
  }
  return room;
}

// REST endpoints
app.use(express.json());

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, r]) => ({
    id,
    playersCount: r.clients.size,
    piecesCount: r.physics.pieceData.size,
    preset: r.currentPreset,
  }));
  res.json({ rooms: roomList });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roomsActive: rooms.size,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// WebSocket Connection Handling
wss.on('connection', (ws: WebSocket, req) => {
  let currentRoom: TabletopServerRoom | null = null;
  let playerId: string | null = null;

  // Extract roomId from URL search params if present: /ws?room=my-room&name=Alice
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const initialRoomId = url.searchParams.get('room') || 'general';
  const initialName = url.searchParams.get('name') || `Player_${Math.floor(100 + Math.random() * 900)}`;
  const initialColor = url.searchParams.get('color') || undefined;

  // Auto-join initial room
  currentRoom = getOrCreateRoom(initialRoomId);
  playerId = currentRoom.handleJoin(ws, initialName, initialColor);

  ws.on('message', (data: Buffer | string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      if (msg.type === 'join') {
        // Switching or joining a different room
        if (currentRoom && playerId) {
          currentRoom.handleLeave(playerId);
        }
        currentRoom = getOrCreateRoom(msg.roomId);
        playerId = currentRoom.handleJoin(ws, msg.playerName, msg.playerColor);
        return;
      }

      if (currentRoom && playerId) {
        currentRoom.handleMessage(playerId, msg);
      }
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId) {
      currentRoom.handleLeave(playerId);
      // Clean up empty rooms after 10 minutes of inactivity if not 'general'
      if (currentRoom.clients.size === 0 && currentRoom.roomId !== 'general') {
        setTimeout(() => {
          if (currentRoom && currentRoom.clients.size === 0) {
            currentRoom.stopTickLoop();
            rooms.delete(currentRoom.roomId);
            console.log(`[Server] Removed inactive room: "${currentRoom.roomId}"`);
          }
        }, 10 * 60 * 1000);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WebSocket] Error for client ${playerId}:`, err);
  });
});

// Vite mounting in dev or static serving in prod
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[Tabletop Nexus] Server running at http://localhost:${PORT}`);
    console.log(`[Tabletop Nexus] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
