import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error('No Google idToken provided');
  }

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name: username, picture: profileImage } = payload;

    // Check if user exists
    let user = await User.findOne({ googleId });

    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        googleId,
        email,
        username,
        profileImage
      });
    }

    // Return success with our own JWT
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401);
    throw new Error('Invalid Google token');
  }
});
