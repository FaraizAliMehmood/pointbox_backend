const express = require('express');
const router = express.Router();
const {
  uploadLogo,
  getSettings,
  updateSettings,
} = require('../controllers/settingsController');
const { protectSuperAdmin } = require('../middleware/auth');
const { uploadLogo: uploadLogoMiddleware } = require('../middleware/upload');

// All routes are protected and require Super Admin authentication
router.post('/logo', protectSuperAdmin, uploadLogoMiddleware, uploadLogo);
router.get('/', protectSuperAdmin, getSettings);
router.get("/web",getSettings);
router.put('/', protectSuperAdmin, updateSettings);


module.exports = router;

