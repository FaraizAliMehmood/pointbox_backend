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
    refPath: 'createdByModel',
    required: true,
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Admin'],
    default: 'SuperAdmin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('FAQ', faqSchema);

