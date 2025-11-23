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
  // createdBy: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'SuperAdmin'
  // },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

// companySchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// companySchema.methods.comparePassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// Prevent model re-compilation during hot reloading
const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

module.exports = Company;

