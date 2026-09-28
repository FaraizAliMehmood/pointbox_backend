const mongoose = require('mongoose');

const whatsNewSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, "Image is required"],
  },
  public_id: {
    type: String,
  },
  productUrl: {
    type: String,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true,
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Admin', 'Company', 'Employee'],
    default: 'SuperAdmin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('WhatsNew', whatsNewSchema);
