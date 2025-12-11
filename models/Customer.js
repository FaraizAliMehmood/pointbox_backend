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
    },
    tier_points:{
      type: Number,
      default:0
    }
  }],
  // Store redeem_points for unlinked brands to preserve them when re-linking
  // Format: { brandId: redeem_points }
  unlinkedBrandsRedeemPoints: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Store tier_points for unlinked brands to preserve them when re-linking
  // Format: { brandId: tier_points }
  unlinkedBrandsTierPoints: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    default: "customer"
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
  otp:{
    type: Number
  },
  deviceToken:{
    type: String
  }
}, {
  timestamps: true,
});
module.exports = mongoose.model('Customer', customerSchema);

