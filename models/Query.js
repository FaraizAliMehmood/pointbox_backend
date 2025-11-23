const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true,
  },
  customerName: {
    type: String,
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
  },
  brandId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
  },
  transactionId: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  },
  responses: [{
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'responseModel',
    },
    responseModel: {
      type: String,
      enum: ['SuperAdmin', 'Admin'],
      default: 'SuperAdmin',
    },
    response: {
      type: String,
      required: true,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Query', querySchema);

