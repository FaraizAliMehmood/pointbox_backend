const mongoose = require('mongoose');
const customerSchema = new mongoose.Schema({
  username: {
    type: String,
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
    select: false,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  isGoogleSignup: {
    type: Boolean,
    default: false,
  },
  linkedCompanies: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    companyName: String,
    linkedAt: {
      type: Date,
      default: Date.now,
    },
    redeem_points:{
      type: Number,
      default: 0
    }
  }],
  totalPoints: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
    enum: ['superadmin', 'company'],
    default: 'company',
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Company'],
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
  }],
}, {
  timestamps: true,
});
module.exports = mongoose.model('Customer', customerSchema);

