const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
  },
  type: {
    type: String,
    enum: ['website', 'mobile', 'both'],
    default: 'both',
  },
  target: {
    type: String,
    enum: ['all', 'customers', 'company', 'specific'],
    default: 'all',
  },
  targetIds: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
  }],
  targetModel: {
    type: String,
    enum: ['Customer', 'Company'],
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true,
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'Company'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sentAt: {
    type: Date,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);

