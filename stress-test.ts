import { io } from 'socket.io-client';
import crypto from 'crypto';

const SERVER_URL = 'http://localhost:3000';
const NUM_VIRTUAL_PEERS = 10;
const TEST_DURATION_MS = 15000;

async function hashMsg(msg) {
  const kernel = `${msg.senderId}|${msg.content}|${msg.timestamp}|${msg.prevHash}`;
  return crypto.createHash('sha256').update(kernel).digest('hex');
}

async function runStressTest() {
  console.log(`🚀 Starting Ledger Stress Test: ${NUM_VIRTUAL_PEERS} peers...`);
  const peers = [];

  for (let i = 0; i < NUM_VIRTUAL_PEERS; i++) {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    const id = `stress-${i}`;
    let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

    socket.on('connect', async () => {
      socket.emit('peer:join', {
        id, name: `Ghost-${i}`, status: 'online', battery: 90, 
        location: { x: Math.random() * 100, y: Math.random() * 100 }, role: 'node'
      });

      // Periodic valid pulses
      setInterval(async () => {
        const isResource = Math.random() > 0.8;
        const types = ['water', 'food', 'medical', 'shelter'];
        
        const msgTemplate = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: id,
            senderName: `Ghost-${i}`,
            content: isResource ? `RESOURCE_UPDATE: Found supplies here.` : `Pulse pulse pulse ${Date.now()}`,
            timestamp: Date.now(),
            type: 'broadcast',
            hops: 1,
            prevHash: lastHash,
            metadata: isResource ? {
               resourceType: types[Math.floor(Math.random() * types.length)],
               location: { x: Math.random() * 100, y: Math.random() * 100 }
            } : undefined
        };
        const hash = await hashMsg(msgTemplate);
        lastHash = hash;
        socket.emit('mesh:broadcast', { ...msgTemplate, hash });
      }, 5000 + (Math.random() * 5000));
    });
    peers.push(socket);
  }

  await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
  peers.forEach(s => s.disconnect());
  console.log('✅ Stress Test complete.');
  process.exit(0);
}

runStressTest();
