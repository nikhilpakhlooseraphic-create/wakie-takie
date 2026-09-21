import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { setupSockets } from './src/sockets/socketHandler.js';

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Update with client origin in production
    methods: ['GET', 'POST']
  },
  // Defaults (pingInterval 25s + pingTimeout 20s) can take up to 45s to
  // notice a dead connection - too slow for deciding "is this user actually
  // reachable for a call right now". Tightened so a killed app is detected
  // as offline quickly enough for the push-wake fallback to kick in.
  pingInterval: 15000,
  pingTimeout: 8000
});

// Setup Socket.io logic
setupSockets(io);
app.set('socketio', io);

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
