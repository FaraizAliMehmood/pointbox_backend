const { extractInvoiceData } = require('../utils/openaiService');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Receives a captured invoice photo and returns the invoice number,
 * phone number(s), and total amount extracted via OpenAI.
 */
exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No invoice image was provided' });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG or WEBP images are supported' });
    }

    const data = await extractInvoiceData(req.file.buffer, req.file.mimetype);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Invoice scan error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze invoice image',
    });
  }
};
