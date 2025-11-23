const express = require('express');
const router = express.Router();
const {
  login,
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getEmployees,
  toggleEmployeeStatus,
  updateEmployee,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getQueries,
  respondToQuery,
  getTransactions,
  getTransactionById,
  getNotifications,
  createNotification,
  deleteNotification,
  getBanners,
  uploadBanner,
  updateBanner,
  deleteBanner,
  updateAdminPassword,
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

// Public route - Login (no authentication required)
router.post('/login', login);

// Protected routes - All require admin authentication
router.use(protectAdmin);

// Company routes
router.get('/companies', getCompanies);
router.post('/companies', uploadLogo, createCompany);
router.put('/companies/:id', uploadLogo, updateCompany);
router.delete('/companies/:id', deleteCompany);

// Employee routes
router.get('/employees', getEmployees);
router.put('/employees/:id/status', toggleEmployeeStatus);
router.put('/employees/:id', updateEmployee);

// Customer routes
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Query routes
router.get('/queries', getQueries);
router.post('/queries/:id/respond', respondToQuery);

// Transaction routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

// Notification routes
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.delete('/notifications/:id', deleteNotification);

// Banner routes
router.get('/banners', getBanners);
router.post('/banners', uploadBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Admin password change route
router.put('/change-password/:id', updateAdminPassword);

module.exports = router;

