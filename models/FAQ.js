const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'FAQ question is required'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'FAQ answer is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['general', 'points', 'rewards', 'tiers', 'account'],
    default: 'general',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('FAQ', faqSchema);

