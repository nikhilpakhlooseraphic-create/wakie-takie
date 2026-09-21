import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOnlineUsers } from '../sockets/socketHandler.js';
import { sendFriendRequestPush, sendFriendAcceptedPush } from '../services/pushService.js';

// @desc    Search users by username
// @route   GET /api/friends/search?q=...
// @access  Private
export const searchUsers = asyncHandler(async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({ success: true, data: [] });
  }

  // Find users matching regex, exclude current user
  const users = await User.find({
    username: { $regex: query, $options: 'i' },
    _id: { $ne: req.user._id }
  }).select('_id username email profileImage');

  res.json({
    success: true,
    data: users
  });
});

// @desc    Add friend / Accept friend request
// @route   POST /api/friends/add
// @access  Private
export const addFriend = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const currentUserId = req.user._id;

  if (currentUserId.toString() === targetUserId) {
    res.status(400);
    throw new Error('You cannot add yourself');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if there is an existing friendship record between these two
  let friendship = await Friendship.findOne({
    $or: [
      { requester: currentUserId, recipient: targetUserId },
      { requester: targetUserId, recipient: currentUserId }
    ]
  });

  if (friendship) {
    // If there is a pending request from the target to the current user, accept it
    if (friendship.status === 'pending' && friendship.recipient.toString() === currentUserId.toString()) {
      friendship.status = 'accepted';
      await friendship.save();
      
      // Notify the requester both ways - the live socket in case they're
      // actually connected, AND the push regardless. onlineUsers can lag
      // behind reality (socket.io's disconnect detection isn't instant), so
      // gating the push on "socket looks online" silently drops it when the
      // app was killed moments ago but the server hasn't noticed yet.
      const io = req.app.get('socketio');
      const onlineUsers = getOnlineUsers();
      const requesterSocket = onlineUsers.get(friendship.requester.toString());
      console.log(`[friends] accept: requester ${friendship.requester} socket=${requesterSocket || 'offline'}`);
      if (requesterSocket) {
        io.to(requesterSocket).emit('friend-accepted', {
          friendId: currentUserId,
          friendName: req.user.username,
          friendProfileImage: req.user.profileImage
        });
      }
      sendFriendAcceptedPush({
        receiverId: friendship.requester,
        accepterId: currentUserId,
        accepterName: req.user.username
      }).catch((error) => console.error('Failed to send friend-accepted push:', error));

      return res.json({ success: true, message: 'Friend request accepted' });
    }
    
    // If they are already friends
    if (friendship.status === 'accepted') {
      res.status(400);
      throw new Error('You are already friends');
    }
    
    // If current user already sent a request
    if (friendship.status === 'pending' && friendship.requester.toString() === currentUserId.toString()) {
      res.status(400);
      throw new Error('Friend request already sent');
    }
  } else {
    // No existing record, create a new pending request
    await Friendship.create({
      requester: currentUserId,
      recipient: targetUserId,
      status: 'pending'
    });

    // Notify the recipient both ways - see the comment on the accept branch
    // above for why the push isn't gated behind the online check.
    const io = req.app.get('socketio');
    const onlineUsers = getOnlineUsers();
    const recipientSocket = onlineUsers.get(targetUserId);
    console.log(`[friends] request: recipient ${targetUserId} socket=${recipientSocket || 'offline'}`);
    if (recipientSocket) {
      io.to(recipientSocket).emit('friend-request-received', {
        requesterId: currentUserId,
        requesterName: req.user.username,
        requesterProfileImage: req.user.profileImage
      });
    }
    sendFriendRequestPush({
      receiverId: targetUserId,
      requesterId: currentUserId,
      requesterName: req.user.username
    }).catch((error) => console.error('Failed to send friend-request push:', error));

    return res.json({ success: true, message: 'Friend request sent' });
  }
});

// @desc    Get user's friends list
// @route   GET /api/friends
// @access  Private
export const getFriends = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  // Find all accepted friendships for the current user
  const friendships = await Friendship.find({
    $or: [{ requester: currentUserId }, { recipient: currentUserId }],
    status: 'accepted'
  }).populate('requester recipient', 'username email profileImage');

  // Map to a clean list of friend objects and add online status
  const onlineUsers = getOnlineUsers();
  
  const friendsList = friendships.map(f => {
    const isRequester = f.requester._id.toString() === currentUserId.toString();
    const friend = isRequester ? f.recipient.toObject() : f.requester.toObject();
    
    // Check if friend is in onlineUsers map
    const isOnline = onlineUsers.has(friend._id.toString());
    friend.status = isOnline ? 'online' : 'offline';
    
    return friend;
  });

  res.json({
    success: true,
    data: friendsList
  });
});

// @desc    Get user's pending friend requests (incoming)
// @route   GET /api/friends/pending
// @access  Private
export const getPendingRequests = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  // Find all pending friendships where the current user is the RECIPIENT
  const pendingRequests = await Friendship.find({
    recipient: currentUserId,
    status: 'pending'
  }).populate('requester', 'username email profileImage');

  // Map to a clean list of requester user objects
  const requestList = pendingRequests.map(f => f.requester);

  res.json({
    success: true,
    data: requestList
  });
});
