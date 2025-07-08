import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Puzzle from '../models/Puzzle.js';
import Submission from '../models/Submission.js';
import fs from 'fs';
import AdminSession from '../models/AdminSession.js';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check sessionId in DB
    const session = await AdminSession.findOne({ sessionId: decoded.sessionId });
    if (!session) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials !!!' });
    }

    // Generate sessionId and store in DB
    const sessionId = uuidv4();
    await AdminSession.create({
      sessionId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    const token = jwt.sign(
      { email: process.env.ADMIN_EMAIL, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create puzzle
router.post('/puzzles', authenticateAdmin, upload.fields([
{ name: 'puzzleFile', maxCount: 1 },
{ name: 'solutionFile', maxCount: 1 }]
), async (req, res) => {
  try {
    const { title, description, tags, difficulty, format, deadline, solutionFormat, solutionText } = req.body;

    let slug = slugify(title, { lower: true, strict: true });
    // Ensure slug is unique
    let existing = await Puzzle.findOne({ slug });
    if (existing) {
      slug += '-' + Date.now();
    }

    const puzzleData = {
      title,
      description,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      difficulty,
      format,
      deadline: new Date(deadline),
      solutionFormat,
      solutionText,
      slug
    };

    if (req.files?.puzzleFile) {
      puzzleData.filePath = req.files.puzzleFile[0].filename;
    }

    if (req.files?.solutionFile) {
      puzzleData.solutionFilePath = req.files.solutionFile[0].filename;
    }

    const puzzle = new Puzzle(puzzleData);
    await puzzle.save();

    res.status(201).json(puzzle);
  } catch (error) {
    console.error('Error creating puzzle:', error);
    res.status(500).json({ error: 'Failed to create puzzle' });
  }
});

// Get all submissions
router.get('/submissions', authenticateAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find().
    populate('puzzleId', 'title').
    sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Update submission status
router.patch('/submissions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'correct', 'incorrect'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Get submissions for specific puzzle
router.get('/puzzles/:id/submissions', authenticateAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({ puzzleId: req.params.id }).
    sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching puzzle submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Delete puzzle by ID
router.delete('/puzzles/:id', authenticateAdmin, async (req, res) => {
  try {
    const puzzle = await Puzzle.findByIdAndDelete(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    // Delete associated files if they exist
    const uploadsDir = path.join(__dirname, '../uploads/');
    if (puzzle.filePath) {
      const filePath = path.join(uploadsDir, puzzle.filePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (puzzle.solutionFilePath) {
      const solutionFilePath = path.join(uploadsDir, puzzle.solutionFilePath);
      if (fs.existsSync(solutionFilePath)) fs.unlinkSync(solutionFilePath);
    }
    // Optionally, delete all submissions for this puzzle
    await Submission.deleteMany({ puzzleId: req.params.id });
    res.json({ message: 'Puzzle and associated files deleted' });
  } catch (error) {
    console.error('Error deleting puzzle:', error);
    res.status(500).json({ error: 'Failed to delete puzzle' });
  }
});

// Delete submission by ID
router.delete('/submissions/:id', authenticateAdmin, async (req, res) => {
  try {
    const submission = await Submission.findByIdAndDelete(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Admin logout
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    const sessionId = req.admin.sessionId;
    await AdminSession.deleteOne({ sessionId });
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Update puzzle by ID
router.patch('/puzzles/:id', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, tags, difficulty, format, deadline, solutionFormat, solutionText } = req.body;
    const updateData = {};
    if (title) {
      updateData.title = title;
      // Update slug if title changes
      let slug = slugify(title, { lower: true, strict: true });
      let existing = await Puzzle.findOne({ slug, _id: { $ne: req.params.id } });
      if (existing) {
        slug += '-' + Date.now();
      }
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? tags.split(',').map((tag) => tag.trim()) : tags;
    if (difficulty) updateData.difficulty = difficulty;
    if (format) updateData.format = format;
    if (deadline) updateData.deadline = new Date(deadline);
    if (solutionFormat) updateData.solutionFormat = solutionFormat;
    if (solutionText !== undefined) updateData.solutionText = solutionText;

    const puzzle = await Puzzle.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }
    res.json(puzzle);
  } catch (error) {
    console.error('Error updating puzzle:', error);
    res.status(500).json({ error: 'Failed to update puzzle' });
  }
});

export default router;