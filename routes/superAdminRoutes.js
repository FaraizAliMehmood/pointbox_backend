const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  getEmployees,
  toggleEmployeeStatus,
  updateEmployee,
  createCompany,
  getCompanies,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
  getQueries,
  respondToQuery,
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getTransactions,
  getTransactionById,
  createNotification,
  getNotifications,
  deleteNotification,
  uploadBanner,
  getBanners,
  updateBanner,
  deleteBanner,
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
  getSuperAdmins,
  updateSuperAdminPassword,
  getContacts,
  checkEmail,
  verifyOtp,
  notifications
} = require('../controllers/superAdminController');
const { protectSuperAdmin } = require('../middleware/auth');
const { uploadSingle, uploadLogo } = require('../middleware/upload');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/check-email',checkEmail);
router.post('/verify-otp',verifyOtp);
router.post("/notifications",notifications)
router.get('/web/newsletters', getNewsletters);

// Protected routes
router.post('/admins', protectSuperAdmin, createAdmin);
router.get('/admins', protectSuperAdmin, getAdmins);
router.put('/admins/:id', protectSuperAdmin, updateAdmin);
router.delete('/admins/:id', protectSuperAdmin, deleteAdmin);

router.get('/employees', protectSuperAdmin, getEmployees);
router.put('/employees/:id/status', protectSuperAdmin, toggleEmployeeStatus);
router.put('/employees/:id', protectSuperAdmin, updateEmployee);

router.post('/companies', protectSuperAdmin, uploadLogo, createCompany);
router.get('/companies', protectSuperAdmin, getCompanies);
router.get('/web/companies', getCompanies);
router.put('/companies/:id', protectSuperAdmin, uploadLogo, updateCompany);
router.put('/companies/:id/status', protectSuperAdmin, toggleCompanyStatus);
router.delete('/companies/:id', protectSuperAdmin, deleteCompany);

router.get('/queries', protectSuperAdmin, getQueries);
router.post('/queries/:id/respond', protectSuperAdmin, respondToQuery);

router.post('/customers', protectSuperAdmin, createCustomer);
router.get('/customers', protectSuperAdmin, getCustomers);
router.put('/customers/:id', protectSuperAdmin, updateCustomer);
router.delete('/customers/:id', protectSuperAdmin, deleteCustomer);

router.get('/transactions', protectSuperAdmin, getTransactions);
router.get('/transactions/:id', protectSuperAdmin, getTransactionById);

router.post('/notifications', protectSuperAdmin, createNotification);
router.get('/notifications', protectSuperAdmin, getNotifications);
router.delete('/notifications/:id', protectSuperAdmin, deleteNotification);

router.post('/banners', protectSuperAdmin, uploadSingle, uploadBanner);
router.get('/banners', protectSuperAdmin, getBanners);
router.get('/web/banners', getBanners);
router.put('/banners/:id', protectSuperAdmin, uploadSingle, updateBanner);
router.delete('/banners/:id', protectSuperAdmin, deleteBanner);

router.get('/faqs',protectSuperAdmin, getFAQs);
router.get('/web/faqs', getFAQs);
router.post('/faqs',protectSuperAdmin, createFAQ);
router.put('/faqs/:id',protectSuperAdmin, updateFAQ);
router.delete('/faqs/:id',protectSuperAdmin, deleteFAQ);

router.post('/newsletters',protectSuperAdmin, uploadSingle, createNewsletter);
router.get('/newsletters',protectSuperAdmin, getNewsletters);
router.get('/web/newsletters',protectSuperAdmin,getNewsletters);
router.put('/newsletters/:id',protectSuperAdmin,uploadSingle, updateNewsletter);
router.delete('/newsletters/:id',protectSuperAdmin, deleteNewsletter);

router.get('/newsletter-emails',protectSuperAdmin, getNewsletterEmails);
router.post('/newsletter-emails',protectSuperAdmin, createNewsletterEmail);
router.post('/web/newsletter-emails',protectSuperAdmin, createNewsletterEmail);
router.get('/newsletter-emails/:id',protectSuperAdmin, getNewsletterEmailById);
router.put('/newsletter-emails/:id',protectSuperAdmin, updateNewsletterEmail);
router.delete('/newsletter-emails/:id',protectSuperAdmin, deleteNewsletterEmail);

// Super Admin management routes
router.get('/super-admins', protectSuperAdmin, getSuperAdmins);
router.put('/change-password', updateSuperAdminPassword);

router.get("/contacts", getContacts);

// router.post("/contacts/:id/respond", protectSuperAdmin, respondToContact);



module.exports = router;

