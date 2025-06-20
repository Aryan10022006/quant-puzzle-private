import express from 'express';
import Submission from '../models/Submission.js';

const router = express.Router();

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const leaderboard = await Submission.aggregate([
      { $match: { status: 'correct' } },
      { $group: {
        _id: { name: '$name', puzzleId: '$puzzleId' },
        email: { $first: '$email' },
        submittedAt: { $min: '$submittedAt' }
      }},
      { $group: {
        _id: '$_id.name',
        email: { $first: '$email' },
        correctSubmissions: { $sum: 1 },
        firstCorrect: { $min: '$submittedAt' }
      }},
      { $sort: { correctSubmissions: -1, firstCorrect: 1 } },
      { $limit: 100 }
    ]);

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      name: entry._id,
      email: entry.email,
      correctSubmissions: entry.correctSubmissions
    }));

    res.json(formattedLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;