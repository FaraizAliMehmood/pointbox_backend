const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true,
  },
  vatNumber: {
    type: String,
    required: [true, 'VAT number is required'],
    unique: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
companyLogo:{
  type: String
},
publicId:{
  type: String
},
  country: {
    type: String,
    trim: true,
  },
  role:{
    type: String,
    default: "company"
  },
  employeeCount: {
    type: Number
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
// Prevent model re-compilation during hot reloading
const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

module.exports = Company;

