const mongoose = require('mongoose');

const aiApiKeySchema = new mongoose.Schema({
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    enum: ['openai', 'anthropic', 'gemini', 'stability', 'elevenlabs', 'other'],
    trim: true,
  },
  label: {
    type: String,
    required: [true, 'Label is required'],
    trim: true,
  },
  apiKey: {
    type: String,
    required: [true, 'API key is required'],
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AiApiKey', aiApiKeySchema);
