import express from 'express';
import Submission from '../models/Submission.js';
import Puzzle from '../models/Puzzle.js';

const router = express.Router();

// Submit solution
router.post('/', async (req, res) => {
  try {
    const { puzzleId, name, email, answer, comments } = req.body;

    // Validate puzzle exists and is active
    const puzzle = await Puzzle.findById(puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    if (puzzle.deadline < new Date()) {
      return res.status(400).json({ error: 'Puzzle deadline has passed' });
    }

    // Create submission
    const submission = new Submission({
      puzzleId,
      name,
      email,
      answer,
      comments
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission received successfully!',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Failed to submit solution' });
  }
});

// Get submissions for a puzzle (admin only - will be protected later)
router.get('/puzzle/:puzzleId', async (req, res) => {
  try {
    const submissions = await Submission.find({
      puzzleId: req.params.puzzleId
    }).sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;