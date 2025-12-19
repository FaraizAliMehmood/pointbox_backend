const mongoose = require('mongoose');

const customerNotificationSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: [true, 'Notification ID is required'],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
}, {
  timestamps: true,
});



module.exports = mongoose.model('CustomerNotification', customerNotificationSchema);
