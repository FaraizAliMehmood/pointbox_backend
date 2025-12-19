const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'User ID is required'],
  },
  ratings: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5'],
  },
  review: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Review', reviewSchema);
