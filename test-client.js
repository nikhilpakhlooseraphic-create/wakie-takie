import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fakeUserId = new mongoose.Types.ObjectId();

// Generate a valid JWT token for our test user
const token = jwt.sign({ id: fakeUserId }, process.env.JWT_SECRET, {
  expiresIn: '1h',
});

console.log(`Generated Test Token: ${token}`);

// Connect to the Socket.IO server
const socket = io('http://localhost:5000', {
  auth: {
    token: token,
  },
});

socket.on('connect', () => {
  console.log(`✅ Successfully connected to Socket.IO server with ID: ${socket.id}`);

  // Test the 'register' event
  socket.emit('register');
  console.log('Sent register event');

  // Disconnect after 2 seconds to see the disconnect log on the server
  setTimeout(() => {
    socket.disconnect();
    console.log('Disconnected test client.');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.error(`❌ Connection failed: ${err.message}`);
  process.exit(1);
});
