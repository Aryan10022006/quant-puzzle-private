import mongoose from 'mongoose';

const puzzleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Expert'],
    required: true
  },
  format: {
    type: String,
    enum: ['text', 'latex', 'image', 'pdf'],
    required: true
  },
  filePath: {
    type: String,
    required: function () {
      return this.format === 'image' || this.format === 'pdf';
    }
  },
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  solutionFormat: {
    type: String,
    enum: ['text', 'latex', 'image', 'pdf']
  },
  solutionText: {
    type: String
  },
  solutionFilePath: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    trim: true
  }
});

// Virtual for status
puzzleSchema.virtual('status').get(function () {
  return this.deadline > new Date() ? 'active' : 'closed';
});

puzzleSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Puzzle', puzzleSchema);