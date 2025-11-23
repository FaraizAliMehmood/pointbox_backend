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
} = require('../controllers/employeeController');
const { protectEmployee } = require('../middleware/auth');
const { uploadInvoice } = require('../middleware/upload');

// Public routes
router.post('/login', login);

// Protected routes
router.post('/verify-customer', protectEmployee, verifyCustomer);
router.post('/add-points', protectEmployee, uploadInvoice, addRedeemPoints);
router.get('/redeem-history', protectEmployee, getRedeemHistory);

// FCM Token routes
router.post('/fcm-token', protectEmployee, registerFCMToken);
router.delete('/fcm-token', protectEmployee, removeFCMToken);

// Password update route
router.put('/update-password', protectEmployee, updatePassword);

module.exports = router;

