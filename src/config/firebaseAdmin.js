import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Lazily initialized so a missing service account key doesn't crash the
// whole server on boot - it only matters once a push actually needs sending.
let app = null;

// Render (and most PaaS dashboards) can't ship a committed JSON file to disk
// on deploy, so the base64 env var is the primary path for production;
// the file path is kept for local development convenience.
const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    return JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
  }

  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 or FIREBASE_SERVICE_ACCOUNT_KEY_PATH');
};

export const getFirebaseAdmin = () => {
  if (app) return app;

  app = admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount())
  });

  return app;
};
