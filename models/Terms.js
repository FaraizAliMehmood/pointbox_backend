const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Terms title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Terms content is required'],
    trim: true,
  },
  section: {
    type: String,
    enum: ['general', 'user-agreement', 'privacy', 'points-policy', 'refund', 'liability'],
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

module.exports = mongoose.model('Terms', termsSchema);
