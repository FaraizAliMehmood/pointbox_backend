const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  permissions: {
    manageCompanies: { type: Boolean, default: false },
    manageEmployees: { type: Boolean, default: false },
    manageCustomers: { type: Boolean, default: false },
    manageTransactions: { type: Boolean, default: false },
    manageQueries: { type: Boolean, default: false },
    manageBanners: { type: Boolean, default: false },
    manageNotifications: { type: Boolean, default: false },
    manageFaqs: { type: Boolean, default: false },
    manageNewsletter: { type: Boolean, default: false },
    manageContactUs: { type: Boolean, default: false },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Admin', adminSchema);

