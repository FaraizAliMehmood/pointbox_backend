const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema({
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
  },
  metaKeywords: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Ensure only one SEO document exists
seoSchema.statics.getSEO = async function() {
  let seo = await this.findOne();
  if (!seo) {
    seo = await this.create({});
  }
  return seo;
};

module.exports = mongoose.model('SEO', seoSchema);
