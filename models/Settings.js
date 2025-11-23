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
 
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);

