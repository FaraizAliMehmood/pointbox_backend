const mongoose = require('mongoose');
const superAdminSchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true,
  },
  otp:{
    type: Number
  }
}, {
  timestamps: true,
});
module.exports = mongoose.model('SuperAdmin', superAdminSchema);

