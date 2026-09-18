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
  }
});

// Setup Socket.io logic
setupSockets(io);
app.set('socketio', io);

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
