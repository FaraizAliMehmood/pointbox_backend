const mongoose = require('mongoose');

const newsLetterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  source: {
    type: String,
    enum: ['manual', 'footer', 'signup'],
    default: 'footer',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
newsLetterSchema.index({ email: 1 });
newsLetterSchema.index({ isActive: 1 });

module.exports = mongoose.model('NewsLetterEmails', newsLetterSchema);

