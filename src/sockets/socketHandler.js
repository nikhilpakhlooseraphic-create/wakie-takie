import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import VoiceSession from '../models/VoiceSession.js';
import { sendCallPushNotification } from '../services/pushService.js';

// In-memory store to map userId to socketId
const onlineUsers = new Map();
// Track active voice sessions: key = senderId_receiverId, value = { startedAt }
const activeSessions = new Map();

export const setupSockets = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket Authentication Error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Add user to online map
    onlineUsers.set(userId, socket.id);

    // Notify friends that this user is online
    try {
      const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted'
      });
      
      friendships.forEach(f => {
        const friendId = f.requester.toString() === userId ? f.recipient.toString() : f.requester.toString();
        const friendSocketId = onlineUsers.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend-online', { friendId: userId });
        }
      });
    } catch (err) {
      console.error('Error notifying friends of online status:', err);
    }

    // Event: User registers their online status explicitly
    socket.on('register', () => {
      onlineUsers.set(userId, socket.id);
    });

    // Event: Start of voice transmission (Instant PTT)
    socket.on('voice-start', ({ receiverId }) => {
      if (!receiverId) return;

      // Track session start time
      const sessionKey = `${userId}_${receiverId}`;
      activeSessions.set(sessionKey, { startedAt: new Date() });

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        // Notify receiver that voice is coming instantly
        io.to(receiverSocketId).emit('voice-start', {
          senderId: userId,
          senderName: socket.user.username
        });
      }
    });

    // Event: Transmitting voice chunk
    socket.on('voice-chunk', async ({ receiverId, audioData }) => {
      if (!receiverId) return;

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        // Forward the audio chunk immediately to the receiver's socket
        io.to(receiverSocketId).emit('voice-chunk', {
          senderId: userId,
          audioData
        });
        return;
      }

      // Receiver is offline. Only a call offer is worth waking them for -
      // an answer/ice-candidate implies a call they couldn't have started.
      let message;
      try {
        message = JSON.parse(audioData);
      } catch (error) {
        return;
      }
      if (message.type !== 'offer') return;

      try {
        await sendCallPushNotification({
          receiverId,
          callerId: userId,
          callerName: socket.user.username,
          callerAvatar: socket.user.profileImage,
          signalingMessage: message
        });
      } catch (error) {
        console.error('Failed to send call push notification:', error);
      }
    });

    // Event: End of voice transmission
    socket.on('voice-end', async ({ receiverId }) => {
      if (!receiverId) return;

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice-end', {
          senderId: userId
        });
      }

      // Log session to DB
      const sessionKey = `${userId}_${receiverId}`;
      const session = activeSessions.get(sessionKey);

      if (session) {
        const endedAt = new Date();
        const durationMs = endedAt - session.startedAt;

        try {
          await VoiceSession.create({
            sender: userId,
            receiver: receiverId,
            startedAt: session.startedAt,
            endedAt,
            duration: Math.round(durationMs / 1000) // Store duration in seconds
          });
        } catch (error) {
          console.error('Failed to log voice session:', error);
        }

        activeSessions.delete(sessionKey);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
      onlineUsers.delete(userId);
      
      // Notify friends that this user is offline
      try {
        const friendships = await Friendship.find({
          $or: [{ requester: userId }, { recipient: userId }],
          status: 'accepted'
        });
        
        friendships.forEach(f => {
          const friendId = f.requester.toString() === userId ? f.recipient.toString() : f.requester.toString();
          const friendSocketId = onlineUsers.get(friendId);
          if (friendSocketId) {
            io.to(friendSocketId).emit('friend-offline', { friendId: userId });
          }
        });
      } catch (err) {
        console.error('Error notifying friends of offline status:', err);
      }
    });
  });
};

export const getOnlineUsers = () => onlineUsers;
