import mongoose from 'mongoose';

const voiceSessionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // duration in seconds (or milliseconds)
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Add index to speed up queries for a specific user's history
voiceSessionSchema.index({ sender: 1, createdAt: -1 });
voiceSessionSchema.index({ receiver: 1, createdAt: -1 });

const VoiceSession = mongoose.model('VoiceSession', voiceSessionSchema);

export default VoiceSession;
