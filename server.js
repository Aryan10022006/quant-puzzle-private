import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import puzzleRoutes from './routes/puzzles.js';
import submissionRoutes from './routes/submissions.js';
import adminRoutes from './routes/admin.js';
import leaderboardRoutes from './routes/leaderboard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Quant Puzzle Server...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 MongoDB URI:', process.env.MONGO_URI ? 'Connected' : 'Not configured');
console.log('👤 Admin Email:', process.env.ADMIN_EMAIL || 'Not configured');

// Middleware
app.use(cors({
  origin: ['http://192.168.56.1:8080', 'http://localhost:5000', 'http://192.168.56.1:8081','http://localhost:8080'], // frontend origins
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/files', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/submissions', submissionRoutes);

// Notice admin routes are under /api/admin (no secret in URL here)
app.use('/api/admin', adminRoutes);

app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// MongoDB connection with detailed logging
console.log('🔄 Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB');
  console.log('📄 Database:', mongoose.connection.name);

  app.listen(PORT, () => {
    console.log(`🌟 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    // Frontend secret admin panel route
    console.log(`🔐 Admin panel frontend route: http://localhost:3000/admin-SECRET-STRING`);
    console.log('📝 Ready to accept requests!');
  });
})
.catch((error) => {
  console.error('❌ Database connection error:', error);
  console.error('💡 Make sure MongoDB is running and the connection string is correct');
  console.error('📋 Current MongoDB URI:', process.env.MONGO_URI);
  process.exit(1);
});

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});
