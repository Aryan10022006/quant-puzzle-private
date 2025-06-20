import mongoose from 'mongoose';

const adminSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  userAgent: String,
  ip: String,
});

export default mongoose.model('AdminSession', adminSessionSchema); 