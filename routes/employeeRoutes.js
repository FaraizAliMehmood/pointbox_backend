const express = require('express');
const router = express.Router();
const {
  login,
  verifyCustomer,
  addRedeemPoints,
  getRedeemHistory,
  registerFCMToken,
  removeFCMToken,
  updatePassword,
  getBanners,
  uploadBanner,
  updateBanner,
  deleteBanner,
  uploadProduct,
  getProductsFromCompany,
  updateProduct,
  deleteProduct,
  Customers,
  getQueries,
  respondToQuery,
  checkEmail,
  verifyOtp,
  changePasswordWithOTP,
  getNotifications,
  notifications
} = require('../controllers/employeeController');
const { protectEmployee } = require('../middleware/auth');
const { uploadInvoice, uploadSingle } = require('../middleware/upload');

// Public routes
router.post('/login', login);
router.post('/check-email',checkEmail);
router.post('/verify-otp',verifyOtp);
router.post('/change-password',changePasswordWithOTP)
router.post("/notifications",notifications)

// Protected routes
router.post('/verify-customer', protectEmployee, verifyCustomer);
router.get('/customers', protectEmployee,Customers);
router.post('/add-points', protectEmployee, uploadInvoice, addRedeemPoints);
router.get('/redeem-history', protectEmployee, getRedeemHistory);
router.get('/notifications', protectEmployee, getNotifications);

// FCM Token routes
router.post('/fcm-token', protectEmployee, registerFCMToken);
router.delete('/fcm-token', protectEmployee, removeFCMToken);

// Password update route
router.put('/update-password', protectEmployee, updatePassword);

// Banner routes
router.get('/banners/:id', getBanners);
router.post('/banners', protectEmployee, uploadSingle, uploadBanner);
router.put('/banners/:id', protectEmployee, uploadSingle, updateBanner);
router.delete('/banners/:id', protectEmployee, deleteBanner);

// Products routes
router.post('/products', protectEmployee, uploadSingle, uploadProduct);
router.get('/products/:id',getProductsFromCompany);
router.put('/products/:id', protectEmployee, uploadSingle, updateProduct);
router.delete('/products/:id',protectEmployee, deleteProduct);
router.get('/queries', protectEmployee, getQueries);
router.post('/queries/:id/respond', protectEmployee, respondToQuery);

module.exports = router;

