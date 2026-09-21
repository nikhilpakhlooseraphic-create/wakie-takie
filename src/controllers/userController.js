import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/me
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.profileImage = req.body.profileImage || user.profileImage;

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all users (except current user)
// @route   GET /api/users
// @access  Private
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select('_id username email profileImage');

  res.json({
    success: true,
    data: users
  });
});

// @desc    Save/update the current user's Expo push token
// @route   POST /api/users/push-token
// @access  Private
export const registerPushToken = asyncHandler(async (req, res) => {
  const { pushToken } = req.body;

  if (!pushToken || typeof pushToken !== 'string') {
    res.status(400);
    throw new Error('pushToken is required');
  }

  await User.findByIdAndUpdate(req.user._id, { pushToken });

  res.json({ success: true });
});
