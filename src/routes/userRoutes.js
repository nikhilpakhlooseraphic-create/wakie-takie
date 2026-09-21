import express from 'express';
import { getUserProfile, updateUserProfile, getAllUsers, registerPushToken } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/me')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.get('/', protect, getAllUsers);
router.post('/push-token', protect, registerPushToken);

export default router;
