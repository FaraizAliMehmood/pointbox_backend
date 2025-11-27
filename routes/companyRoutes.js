const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  updateAdminPassword,
  updateCompany,
  changePassword,
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  uploadProduct,
  getProducts,
  getProductsFromCompany,
  updateProduct,
  deleteProduct,
  getTransactions,
  exportTransactions,
  exportCustomers,
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  createNotification,
  getCompanyProfile,
  getQueries,
  respondToQuery,
  uploadBanner,
  getBanners,
  updateBanner,
  deleteBanner
} = require('../controllers/companyController');
const { protectCompany } = require('../middleware/auth');
const { uploadSingle, uploadLogo } = require('../middleware/upload');

// Public routes
router.post('/signup',uploadLogo,signup);
router.post('/login', login);


// Protected routes
router.get('/profile', protectCompany, getCompanyProfile);
router.put('/profile', protectCompany, uploadLogo, updateCompany);
router.put('/change-password', protectCompany, changePassword);
router.post('/customers', protectCompany, createCustomer);
router.get('/customers', protectCompany, getCustomers);
router.put('/customers/:id', protectCompany, updateCustomer);
router.delete('/customers/:id', protectCompany, deleteCustomer);
router.get('/customers/export', protectCompany, exportCustomers);

router.post('/products', protectCompany, uploadSingle, uploadProduct);
router.get('/products', protectCompany,getProductsFromCompany);
router.post('/web/products', getProducts);
router.put('/products/:id', protectCompany, uploadSingle, updateProduct);
router.delete('/products/:id', protectCompany, deleteProduct);

router.get('/transactions', protectCompany, getTransactions);
router.get('/transactions/export', protectCompany, exportTransactions);

router.post('/employees', protectCompany, createEmployee);
router.get('/employees', protectCompany, getEmployees);
router.put('/employees/:id', protectCompany, updateEmployee);
router.delete('/employees/:id', protectCompany, deleteEmployee);

router.post('/notifications', protectCompany, createNotification);

router.get('/queries', protectCompany, getQueries);
router.post('/queries/:id/respond', protectCompany, respondToQuery);
// Banner routes
router.get('/banners',protectCompany, getBanners);
router.post('/banners',protectCompany, uploadSingle, uploadBanner);
router.put('/banners/:id',protectCompany, uploadSingle, updateBanner);
router.delete('/banners/:id',protectCompany, deleteBanner);


module.exports = router;

