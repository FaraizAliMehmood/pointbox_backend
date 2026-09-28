const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String
  },
  username: {
    type: String
  },
  password: {
    type: String,
    select: false,
  },
  dutyAddress: {
    type: String,
    required: [true, 'Duty address is required'],
    trim: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
  },
  role:{
    type: String,
    default: "employee"
  },
  permissions: {
    manageCustomers: { type: Boolean, default: false },
    manageTransactions: { type: Boolean, default: false },
    manageQueries: { type: Boolean, default: false },
    manageNotifications: { type: Boolean, default: false },
    manageProducts: { type: Boolean, default: false },
    manageBanners: { type: Boolean, default: false },
  },
  otp:{
    type: Number
  },
  fcmTokens: [{
    token: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'web'],
      default: 'mobile',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }]
},
 {
  timestamps: true,
});

module.exports = mongoose.model('Employee', employeeSchema);

