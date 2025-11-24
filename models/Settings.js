const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
  termsCondition:{
    type: String
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  logoUrl: {
    type: String,
    required: [true, 'Logo is required'],
  },
  publicId:{
    type: String
  },
  instagram: {
    type: String,
    trim: true,
  },
  facebook: {
    type: String,
    trim: true,
  },
  x: {
    type: String,
    trim: true,
  },
  youtube: {
    type: String,
    trim: true,
  },
  tiktok: {
    type: String,
    trim: true,
  },
  linkedin: {
    type: String,
    trim: true,
  },
 
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);

