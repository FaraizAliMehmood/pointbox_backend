const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tier name is required'],
    trim: true,
  },
  color: {
    type: String,
    default: 'from-gray-400 to-gray-500',
  },
  bgColor: {
    type: String,
    default: 'bg-gray-50',
  },
  borderColor: {
    type: String,
    default: 'border-gray-200',
  },
  minPoints: {
    type: Number,
    default: 0,
  },
  maxPoints: {
    type: Number,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  benefits: {
    type: [String],
    default: [],
  },
  expiryMonths: {
    type: Number,
    enum: [6, 12, 18, 24],
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Tier', tierSchema);
