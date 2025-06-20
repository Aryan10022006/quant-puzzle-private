import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  puzzleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Puzzle',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  answer: {
    type: String,
    required: true
  },
  comments: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'correct', 'incorrect'],
    default: 'pending'
  }
});

// Index for efficient queries
submissionSchema.index({ puzzleId: 1, submittedAt: -1 });
submissionSchema.index({ email: 1, status: 1 });

export default mongoose.model('Submission', submissionSchema);