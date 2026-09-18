import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true
    },
    username: {
      type: String,
      required: [true, 'Please add a username'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    profileImage: {
      type: String,
      default: 'https://via.placeholder.com/150'
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

// Temporarily drop index in case it already exists in the database
User.collection.dropIndex('phoneNumber_1').catch(() => {});

export default User;
