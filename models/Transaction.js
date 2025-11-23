const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    required: true,
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
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  employeeName: {
    type: String,
  },
  type: {
    type: String,
    enum: ['earn', 'redeem'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    min: 0,
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  invoiceImage: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed',
  },
  date:{
    type: String,
  },
  time:{
    type: String
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);

