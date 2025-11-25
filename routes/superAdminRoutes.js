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

} = require('../controllers/superAdminController');
const { protectSuperAdmin } = require('../middleware/auth');
const { uploadSingle, uploadLogo } = require('../middleware/upload');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

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

router.get('/faqs', getFAQs);
router.get('/web/faqs', getFAQs);
router.post('/faqs', createFAQ);
router.put('/faqs/:id', updateFAQ);
router.delete('/faqs/:id', deleteFAQ);

router.post('/newsletters', uploadSingle, createNewsletter);
router.get('/newsletters', getNewsletters);
router.get('/web/newsletters',getNewsletters);
router.put('/newsletters/:id', uploadSingle, updateNewsletter);
router.delete('/newsletters/:id', deleteNewsletter);

router.get('/newsletter-emails', getNewsletterEmails);
router.post('/newsletter-emails', createNewsletterEmail);
router.post('/web/newsletter-emails', createNewsletterEmail);
router.get('/newsletter-emails/:id', getNewsletterEmailById);
router.put('/newsletter-emails/:id', updateNewsletterEmail);
router.delete('/newsletter-emails/:id', deleteNewsletterEmail);

// Super Admin management routes
router.get('/super-admins', protectSuperAdmin, getSuperAdmins);
router.put('/super-admins/:id/password', protectSuperAdmin, updateSuperAdminPassword);

router.get("/contacts", getContacts);
// router.post("/contacts/:id/respond", protectSuperAdmin, respondToContact);

module.exports = router;

