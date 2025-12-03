const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getProfile,
  updateProfile,
  redeemPoints,
  getTransactions,
  getConversionRate,
  contactSupport,
  submitContact,
  getBanners,
  getBrands,
  linkBrand,
  getLinkedBrands,
  getProducts,
  deleteAccount,
  registerFCMToken,
  removeFCMToken,
  getNotifications,
  getSettings,
  createNewsletterEmail,
  getCompanies,
  getCompanyProducts,
  getFAQs,
  getNewsletters,
  getBrandsBanners
} = require('../controllers/customerController');
const { protectCustomer } = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/banners', getBanners);
router.get('/brands', getBrands);
router.get('/conversion-rate', getConversionRate);
router.post('/contact', submitContact);

// Protected routes
router.get('/profile', protectCustomer, getProfile);
router.put('/profile', protectCustomer, updateProfile);
router.post('/redeem', protectCustomer, redeemPoints);
router.get('/transactions', protectCustomer, getTransactions);
router.post('/support', protectCustomer, contactSupport);

router.post('/link-brand', protectCustomer, linkBrand);
router.get('/linked-brands', protectCustomer, getLinkedBrands);
router.get('/products', protectCustomer, getProducts);
router.delete('/account', protectCustomer, deleteAccount);

// FCM Token routes
router.post('/fcm-token', protectCustomer, registerFCMToken);
router.delete('/fcm-token', protectCustomer, removeFCMToken);

// Notification routes
router.get('/notifications', protectCustomer, getNotifications);
router.get("/web",getSettings);
router.post('/web/newsletter-emails',createNewsletterEmail);
router.get('/web/companies', getCompanies);
router.post('/web/products', getCompanyProducts);
router.get('/web/faqs', getFAQs);
router.get('/web/newsletters', getNewsletters);
router.get('/web/banners', getBrandsBanners);

module.exports = router;

