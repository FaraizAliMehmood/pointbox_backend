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
  getTopBanners,
  getWhatsNews,
  getRecentCompanies,
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
  verifyOtp,
  checkEmail,
  changePasswordWithOTP,
  getTerms,
  getSEO,
  verifyPassOtp
} = require('../controllers/customerController');
const { protectCustomer } = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/banners', getBanners);
router.get('/top-banners', getTopBanners);
router.get('/whats-new', getWhatsNews);
router.get('/recent-companies', getRecentCompanies);
router.get('/brands', getBrands);
router.get('/conversion-rate', getConversionRate);
router.post('/contact', submitContact);
router.post('/check-email',checkEmail);
router.post('/verify-otp',verifyOtp);
router.post('/verifyPass-otp',verifyPassOtp);
router.post('/change-password',changePasswordWithOTP);

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
router.get('/web/banners', getBanners);
router.get('/web/top-banners', getTopBanners);
router.get('/web/whats-new', getWhatsNews);
router.get('/web/recent-companies', getRecentCompanies);
router.get('/web/terms',getTerms);
router.get('/web/seo',getSEO);

module.exports = router;

