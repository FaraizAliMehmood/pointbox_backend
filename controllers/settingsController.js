const Settings = require('../models/Settings');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// @desc    Upload Logo
// @route   POST /api/settings/logo
// @access  Private (Super Admin)
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a logo image' 
      });
    }

    // Upload logo to Cloudinary
    let logoUrl = '';
    let publicId = '';

    try {
      const result = await uploadToCloudinary(req.file.buffer, 'settings-logos');
      logoUrl = result.secure_url;
      publicId = result.public_id;
    } catch (uploadError) {
      return res.status(400).json({ 
        success: false, 
        message: `Failed to upload logo: ${uploadError.message}` 
      });
    }

    // Find existing settings or create new one
    let settings = await Settings.findOne();

    if (settings) {
      // Delete old logo from Cloudinary if it exists
      if (settings.publicId) {
        try {
          await deleteFromCloudinary(settings.publicId);
        } catch (deleteError) {
          console.error('Error deleting old logo from Cloudinary:', deleteError);
          // Continue even if deletion fails
        }
      }

      // Update logo
      settings.logoUrl = logoUrl;
      settings.publicId = publicId;
      await settings.save();
    } else {
      // Create new settings with default values
      // Address is required by the model, so provide placeholder that can be updated later
      settings = await Settings.create({
        logoUrl,
        publicId,
        address: 'Address to be updated' // Placeholder - can be updated later via updateSettings
      });
    }

    res.status(200).json({
      success: true,
      data: {
        logoUrl: settings.logoUrl,
        publicId: settings.publicId,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Settings
// @route   GET /api/settings
// @access  Private (Super Admin)
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found' 
      });
    }

    res.json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Settings (JSON data)
// @route   PUT /api/settings
// @access  Private (Super Admin)
exports.updateSettings = async (req, res) => {
  try {
    const { termsCondition, address, phone, email, location, instagram, facebook, x, youtube, tiktok, linkedin } = req.body;

    // Find existing settings or create new one
    let settings = await Settings.findOne();

    if (settings) {
      // Update fields
      if (termsCondition !== undefined) settings.termsCondition = termsCondition;
      if (address !== undefined) settings.address = address;
      if (phone !== undefined) settings.phone = phone;
      if (email !== undefined) settings.email = email;
      if (location !== undefined) settings.location = location;
      if (instagram !== undefined) settings.instagram = instagram;
      if (facebook !== undefined) settings.facebook = facebook;
      if (x !== undefined) settings.x = x;
      if (youtube !== undefined) settings.youtube = youtube;
      if (tiktok !== undefined) settings.tiktok = tiktok;
      if (linkedin !== undefined) settings.linkedin = linkedin;

      await settings.save();
    } else {
      // Create new settings
      // Both address and logoUrl are required, so we need to provide defaults
      // If address is not provided, use empty string (will fail validation if truly required)
      // For logoUrl, use a placeholder that will be replaced when logo is uploaded
      if (!address) {
        return res.status(400).json({ 
          success: false, 
          message: 'Address is required. Please provide address when creating settings.' 
        });
      }

      settings = await Settings.create({
        termsCondition: termsCondition || '',
        address: address,
        phone: phone || '',
        email: email || '',
        location: location || '',
        instagram: instagram || '',
        facebook: facebook || '',
        x: x || '',
        youtube: youtube || '',
        tiktok: tiktok || '',
        linkedin: linkedin || '',
        logoUrl: 'https://via.placeholder.com/150', // Placeholder - will be replaced when logo is uploaded
        publicId: '',
      });
    }

    res.json({ 
      success: true, 
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

