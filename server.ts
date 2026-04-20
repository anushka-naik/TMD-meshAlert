
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Mesh State
  const peers = new Map();
  let stats = {
    messagesSeen: 0,
    broadcastsPropagated: 0,
    startTime: Date.now()
  };

  io.on('connection', (socket) => {
    console.log('Peer connected:', socket.id);

    socket.on('peer:join', (peer) => {
      peers.set(socket.id, { ...peer, socketId: socket.id, lastSeen: Date.now() });
      io.emit('mesh:peers', Array.from(peers.values()));
    });

    socket.on('peer:update', (update) => {
      if (peers.has(socket.id)) {
        peers.set(socket.id, { ...peers.get(socket.id), ...update, lastSeen: Date.now() });
        io.emit('mesh:peers', Array.from(peers.values()));
      }
    });

    socket.on('mesh:broadcast', (data) => {
      stats.messagesSeen++;
      stats.broadcastsPropagated++;
      socket.broadcast.emit('mesh:receive_broadcast', data);
    });

    socket.on('mesh:direct', ({ to, msg, replyToId, isEncrypted, iv, wrappedKey }) => {
      stats.messagesSeen++;
      // Search for the recipient by peer.id (internal mesh ID)
      const recipient = Array.from(peers.values()).find(p => p.id === to);
      if (recipient && recipient.socketId) {
        socket.to(recipient.socketId).emit('mesh:receive_direct', { 
          from: peers.get(socket.id)?.id || socket.id, 
          msg,
          replyToId,
          isEncrypted,
          iv,
          wrappedKey
        });
      }
    });

    socket.on('mesh:sync_request', ({ to, lastHash }) => {
      const recipient = Array.from(peers.values()).find(p => p.id === to);
      if (recipient && recipient.socketId) {
        socket.to(recipient.socketId).emit('mesh:receive_sync_request', { 
          from: peers.get(socket.id)?.id || socket.id, 
          lastHash 
        });
      }
    });

    socket.on('mesh:sync_response', ({ to, history }) => {
      const recipient = Array.from(peers.values()).find(p => p.id === to);
      if (recipient && recipient.socketId) {
        socket.to(recipient.socketId).emit('mesh:receive_sync_response', { 
          from: peers.get(socket.id)?.id || socket.id, 
          history 
        });
      }
    });

    socket.on('disconnect', () => {
      peers.delete(socket.id);
      io.emit('mesh:peers', Array.from(peers.values()));
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      peers: peers.size,
      stats: {
        ...stats,
        uptime: Math.floor((Date.now() - stats.startTime) / 1000)
      }
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
