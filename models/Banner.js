const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  badge:{
    type: String
  },
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
  // publicId:{
  //   type: String
  // },
startDate:{
  type: String
},
endDate:{
  type: String
},
  type: {
    type: String,
    enum: ['regular','special_event'],
    default: 'regular',
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
  // order: {
  //   type: Number,
  //   default: 0,
  // },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Banner', bannerSchema);

