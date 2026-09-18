import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  searchUsers,
  addFriend,
  getFriends,
  getPendingRequests
} from '../controllers/friendController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/search', searchUsers);
router.get('/pending', getPendingRequests);
router.post('/add', addFriend);
router.get('/', getFriends);

export default router;
