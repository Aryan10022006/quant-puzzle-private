import express from 'express';
import Puzzle from '../models/Puzzle.js';
import Submission from '../models/Submission.js';

const router = express.Router();

// Get all puzzles
router.get('/', async (req, res) => {
  try {
    const puzzles = await Puzzle.find().sort({ createdAt: -1 });
    res.json(puzzles);
  } catch (error) {
    console.error('Error fetching puzzles:', error);
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

// Get single puzzle
router.get('/:id', async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    res.json(puzzle);
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    res.status(500).json({ error: 'Failed to fetch puzzle' });
  }
});

// Get latest active puzzle
router.get('/latest/active', async (req, res) => {
  try {
    const puzzle = await Puzzle.findOne({
      deadline: { $gt: new Date() },
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(puzzle);
  } catch (error) {
    console.error('Error fetching latest puzzle:', error);
    res.status(500).json({ error: 'Failed to fetch latest puzzle' });
  }
});

// Get correct solvers for a puzzle after deadline
router.get('/:id/correct', async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    const correctSubs = await Submission.find({ puzzleId: req.params.id, status: 'correct' })
      .sort({ submittedAt: 1 });
    // Unique by normalized name
    const unique = [];
    const seen = new Set();
    for (const sub of correctSubs) {
      const normalized = sub.name.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(normalized)) {
        unique.push({ name: sub.name, email: sub.email });
        seen.add(normalized);
      }
    }
    res.json(unique);
  } catch (error) {
    console.error('Error fetching correct solvers:', error);
    res.status(500).json({ error: 'Failed to fetch correct solvers' });
  }
});

export default router;