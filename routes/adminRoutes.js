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
  toggleCompanyStatus,
  updateAdminPassword,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  createNewsletter,
  getNewsletters,
  updateNewsletter,
  deleteNewsletter,
  getNewsletterEmails,
  createNewsletterEmail,
  updateNewsletterEmail,
  deleteNewsletterEmail,
  getNewsletterEmailById,
  getContacts
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');
const { uploadLogo, uploadSingle } = require('../middleware/upload');

// Public route - Login (no authentication required)
router.post('/login', login);
router.get("/contacts", getContacts);
router.get('/faqs',protectAdmin, getFAQs);
router.post('/faqs',protectAdmin , createFAQ);
router.put('/faqs/:id',protectAdmin , updateFAQ);
router.delete('/faqs/:id',protectAdmin , deleteFAQ);
router.post('/newsletters',protectAdmin, uploadSingle, createNewsletter);
router.get('/newsletters',protectAdmin, getNewsletters);
router.get('/web/newsletters',protectAdmin, getNewsletters);
router.put('/newsletters/:id',protectAdmin, uploadSingle, updateNewsletter);
router.delete('/newsletters/:id',protectAdmin, deleteNewsletter);

router.get('/newsletter-emails',protectAdmin, getNewsletterEmails);
router.post('/newsletter-emails',protectAdmin, createNewsletterEmail);
router.post('/web/newsletter-emails',protectAdmin, createNewsletterEmail);
router.get('/newsletter-emails/:id',protectAdmin, getNewsletterEmailById);
router.put('/newsletter-emails/:id',protectAdmin, updateNewsletterEmail);
router.delete('/newsletter-emails/:id',protectAdmin, deleteNewsletterEmail);

// Protected routes - All require admin authentication
router.use(protectAdmin);

// Company routes
router.get('/companies', getCompanies);
router.post('/companies', uploadLogo, createCompany);
router.put('/companies/:id', uploadLogo, updateCompany);
router.put('/companies/:id/status', toggleCompanyStatus);
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
router.post('/banners', uploadSingle, uploadBanner);
router.put('/banners/:id', uploadSingle, updateBanner);
router.delete('/banners/:id', deleteBanner);

// Admin password change route
router.put('/change-password/:id', updateAdminPassword);





module.exports = router;

