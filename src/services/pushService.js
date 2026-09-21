import { getMessaging } from 'firebase-admin/messaging';
import { getFirebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';

// Sends a data-only, high-priority Android push carrying the WebRTC offer so the
// receiver's app can wake up (even if killed) and answer in the background.
// No 'notification' block (title/body): that turns this into a display
// notification, which the OS only shows in the tray and does NOT run the JS
// background task for. FCM data payload values must all be strings.
export const sendCallPushNotification = async ({ receiverId, callerId, callerName, callerAvatar, signalingMessage }) => {
  const receiver = await User.findById(receiverId).select('pushToken');

  if (!receiver?.pushToken) {
    return;
  }

  const message = {
    token: receiver.pushToken,
    data: {
      kind: 'incoming-call',
      callerId,
      callerName,
      callerAvatar: callerAvatar || '',
      signalingMessage: JSON.stringify(signalingMessage),
      ts: String(Date.now())
    },
    android: {
      priority: 'high',
      ttl: 30 * 1000
    }
  };

  try {
    const app = getFirebaseAdmin();
    const response = await getMessaging(app).send(message);
    console.log('[push] call notification sent:', response);
  } catch (error) {
    console.error('[push] failed to send call notification:', error);
  }
};

const sendUserPush = async (receiverId, message) => {
  const receiver = await User.findById(receiverId).select('pushToken');
  if (!receiver?.pushToken) return;

  try {
    const app = getFirebaseAdmin();
    const response = await getMessaging(app).send({ ...message, token: receiver.pushToken });
    console.log('[push] sent:', response);
  } catch (error) {
    console.error('[push] failed to send:', error);
  }
};

// Ordinary visible notifications (title/body) - the OS displays these from
// the tray on its own, even if the app is killed, with no JS task involved.
// Routed to the 'friends' Android channel the client creates in
// pushRegistration.ts, so they show at normal (not silent) importance.
export const sendFriendRequestPush = ({ receiverId, requesterId, requesterName }) =>
  sendUserPush(receiverId, {
    notification: {
      title: 'New friend request',
      body: `${requesterName} wants to add you as a friend`
    },
    // FCM data payload values must all be strings - requesterId/accepterId
    // are Mongoose ObjectIds at the call sites, not plain strings.
    data: { kind: 'friend-request', requesterId: String(requesterId) },
    android: { priority: 'high', notification: { channelId: 'friends' } }
  });

export const sendFriendAcceptedPush = ({ receiverId, accepterId, accepterName }) =>
  sendUserPush(receiverId, {
    notification: {
      title: 'Friend request accepted',
      body: `${accepterName} accepted your friend request`
    },
    data: { kind: 'friend-accepted', accepterId: String(accepterId) },
    android: { priority: 'high', notification: { channelId: 'friends' } }
  });
