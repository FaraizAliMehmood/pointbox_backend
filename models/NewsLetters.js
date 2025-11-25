const mongoose = require('mongoose');

const newsLetterSchema = new mongoose.Schema({
 title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Banner image is required'],
  },
  publicId:{
    type: String
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
    enum: ['SuperAdmin', 'Admin'],
    default: 'SuperAdmin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('NewsLetters',newsLetterSchema);

