import express from 'express';
import { getUserProfile, updateUserProfile, getAllUsers } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/me')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.get('/', protect, getAllUsers);

export default router;
