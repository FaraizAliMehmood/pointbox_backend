const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Contact = require("../models/Contact");
const Transaction = require('../models/Transaction');
const Banner = require('../models/Banner');
const Query = require('../models/Query');
const FAQ = require("../models/FAQ");
const NewsLetters = require('../models/NewsLetters');
const NewsLetterEmails = require('../models/NewsLetterEmails');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { sendEmail } = require('../config/email');
const { sendNotificationToUsers } = require('../utils/fcmService');

// Helper function to check permissions
const checkPermission = (admin, permission) => {
  if (!admin || !admin.permissions) {
    return false;
  }
  return admin.permissions[permission] === true;
};

// @desc    Login Admin
// @route   POST /api/admin/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(admin._id, 'admin');

    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Companies
// @route   GET /api/admin/companies
// @access  Private (Admin with manageCompanies permission)
exports.getCompanies = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCompanies')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage companies' });
    }

    const companies = await Company.find();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Company
// @route   POST /api/admin/companies
// @access  Private (Admin with manageCompanies permission)
exports.createCompany = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCompanies')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage companies' });
    }

    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country, employeeCount } = req.body;

    let companyLogo = '';
    let publicId = '';

    // Upload logo to Cloudinary if provided
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'company-logos');
        companyLogo = result.secure_url;
        publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload logo: ${uploadError.message}`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const companyData = {
      companyName,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      vatNumber,
      address,
      country,
      companyLogo,
      publicId
    };
    
    // Handle employeeCount - convert string to number if provided
    if (employeeCount !== undefined && employeeCount !== null && employeeCount !== '') {
      const parsedCount = parseInt(employeeCount, 10);
      if (!isNaN(parsedCount) && parsedCount >= 0) {
        companyData.employeeCount = parsedCount;
      }
    }
    
    const company = await Company.create(companyData);

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Company
// @route   PUT /api/admin/companies/:id
// @access  Private (Admin with manageCompanies permission)
exports.updateCompany = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCompanies')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage companies' });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Handle logo upload if provided
    if (req.file) {
      try {
        // Delete old logo from Cloudinary if it exists
        if (company.publicId) {
          await deleteFromCloudinary(company.publicId);
        }

        // Upload new logo to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'company-logos');
        company.companyLogo = result.secure_url;
        company.publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload logo: ${uploadError.message}`,
        });
      }
    }

    // Update other fields
    const { companyName, email, phone, licenseNumber, vatNumber, address, country, password, employeeCount } = req.body;
    if (companyName) company.companyName = companyName;
    if (email) company.email = email;
    if (phone) company.phone = phone;
    if (licenseNumber) company.licenseNumber = licenseNumber;
    if (vatNumber) company.vatNumber = vatNumber;
    if (address) company.address = address;
    if (country) company.country = country;
    if (employeeCount !== undefined) company.employeeCount = employeeCount;
    
    if (password) {
      company.password = await bcrypt.hash(password, 10);
    }

    await company.save();

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Company Status
// @route   PUT /api/admin/companies/:id/status
// @access  Private (Admin with manageCompanies permission)
exports.toggleCompanyStatus = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCompanies')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage companies' });
    }

    const { isActive } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Company
// @route   DELETE /api/admin/companies/:id
// @access  Private (Admin with manageCompanies permission)
exports.deleteCompany = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCompanies')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage companies' });
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Delete logo from Cloudinary if exists
    if (company.publicId) {
      try {
        await deleteFromCloudinary(company.publicId);
      } catch (deleteError) {
        console.error('Error deleting logo:', deleteError);
      }
    }

    await company.deleteOne();

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Employees
// @route   GET /api/admin/employees
// @access  Private (Admin with manageEmployees permission)
exports.getEmployees = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageEmployees')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage employees' });
    }

    const employees = await Employee.find().populate('company', 'companyName email');
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Employee Status
// @route   PUT /api/admin/employees/:id/status
// @access  Private (Admin with manageEmployees permission)
exports.toggleEmployeeStatus = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageEmployees')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage employees' });
    }

    const { isActive } = req.body;
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive, activatedBy: req.user._id },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Employee
// @route   PUT /api/admin/employees/:id
// @access  Private (Admin with manageEmployees permission)
exports.updateEmployee = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageEmployees')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage employees' });
    }

    const { name, email, phone, dutyAddress, password, permissions } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (dutyAddress) employee.dutyAddress = dutyAddress;
    if (password) {
      employee.password = await bcrypt.hash(password, 10);
    }
    if (permissions) {
      employee.permissions = permissions;
    }

    await employee.save();

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Customers
// @route   GET /api/admin/customers
// @access  Private (Admin with manageCustomers permission)
exports.getCustomers = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCustomers')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage customers' });
    }

    const customers = await Customer.find();
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Customer
// @route   POST /api/admin/customers
// @access  Private (Admin with manageCustomers permission)
exports.createCustomer = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCustomers')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage customers' });
    }

    const { username, email, password, phone, address, country } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Customer with this email already exists' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const customer = await Customer.create({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      country,
      isGoogleSignup: false,
      createdBy: 'superadmin',
      createdById: req.user._id,
      createdByModel: 'Admin',
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Customer
// @route   PUT /api/admin/customers/:id
// @access  Private (Admin with manageCustomers permission)
exports.updateCustomer = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCustomers')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage customers' });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { username, email, phone, address, country, password } = req.body;

    if (username) customer.username = username;
    if (email) customer.email = email;
    if (phone) customer.phone = phone;
    if (address) customer.address = address;
    if (country) customer.country = country;
    if (password) {
      customer.password = await bcrypt.hash(password, 10);
    }

    await customer.save();

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Customer
// @route   DELETE /api/admin/customers/:id
// @access  Private (Admin with manageCustomers permission)
exports.deleteCustomer = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageCustomers')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage customers' });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Deactivate instead of delete
    customer.isActive = false;
    await customer.save();

    res.json({ success: true, message: 'Customer deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Queries
// @route   GET /api/admin/queries
// @access  Private (Admin with manageQueries permission)
exports.getQueries = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageQueries')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage queries' });
    }

    const queries = await Query.find()
      .populate('customer', 'username email phone')
      .populate('brandId', 'companyName')
      .populate('responses.respondedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to Query
// @route   POST /api/admin/queries/:id/respond
// @access  Private (Admin with manageQueries permission)
exports.respondToQuery = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageQueries')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage queries' });
    }

    const { response } = req.body;
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    query.responses.push({
      respondedBy: req.user._id,
      responseModel: 'Admin',
      response,
    });

    query.status = 'resolved';
    await query.save();

    // Send email response
    try {
      await sendEmail(
        query.customerEmail,
        `Re: ${query.subject}`,
        response,
        `<p>${response}</p>`
      );
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails
    }

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Transactions
// @route   GET /api/admin/transactions
// @access  Private (Admin with manageTransactions permission)
exports.getTransactions = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageTransactions')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage transactions' });
    }

    const { transactionId } = req.query;
    let query = {};

    if (transactionId) {
      query.transactionId = transactionId;
    }

    const transactions = await Transaction.find(query)
      .populate('customer', 'username email phone')
      .populate('company', 'companyName email')
      .populate('employee', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Transaction by ID
// @route   GET /api/admin/transactions/:id
// @access  Private (Admin with manageTransactions permission)
exports.getTransactionById = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageTransactions')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage transactions' });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'username email phone')
      .populate('company', 'companyName email')
      .populate('employee', 'name email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Notifications
// @route   GET /api/admin/notifications
// @access  Private (Admin with manageNotifications permission)
exports.getNotifications = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageNotifications')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage notifications' });
    }

    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Notification
// @route   POST /api/admin/notifications
// @access  Private (Admin with manageNotifications permission)
exports.createNotification = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageNotifications')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage notifications' });
    }

    const { title, message, type, target, targetIds } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    // Create notification record
    const notification = await Notification.create({
      title,
      message,
      type: type || 'both',
      target: target || 'all',
      targetIds,
      targetModel: targetIds && targetIds.length > 0 ? 'Customer' : undefined,
      createdBy: req.user._id,
      createdByModel: 'Admin',
      sentAt: new Date(),
    });

    // Send FCM notifications
    let fcmResult = null;
    try {
      let users = [];

      // Determine which users to send notifications to
      if (target === 'all') {
        users = await Customer.find({ isActive: true });
      } else if (target === 'customers') {
        users = await Customer.find({ isActive: true });
      } else if (target === 'specific' && targetIds && targetIds.length > 0) {
        users = await Customer.find({ _id: { $in: targetIds }, isActive: true });
      }

      // Send notifications
      if (users.length > 0) {
        fcmResult = await sendNotificationToUsers(users, { title, message }, type || 'both');
      }
    } catch (fcmError) {
      console.error('Error sending FCM notifications:', fcmError);
      // Continue even if FCM fails
    }

    res.status(201).json({
      success: true,
      data: notification,
      fcmResult,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private (Admin with manageNotifications permission)
exports.deleteNotification = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageNotifications')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage notifications' });
    }

    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Banners
// @route   GET /api/admin/banners
// @access  Private (Admin with manageBanners permission)
exports.getBanners = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageBanners')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage banners' });
    }

    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Banner
// @route   POST /api/admin/banners
// @access  Private (Admin with manageBanners permission)
exports.uploadBanner = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageBanners')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage banners' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    let imageUrl = '';
    let publicId = '';

    // Upload image to Cloudinary if provided
    try {
      const result = await uploadToCloudinary(req.file.buffer, 'banners');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    } catch (uploadError) {
      return res.status(400).json({ 
        success: false, 
        message: `Failed to upload image: ${uploadError.message}` 
      });
    }

    const banner = await Banner.create({
      title: req.body.title,
      description: req.body.description,
      badge: req.body.badge,
      imageUrl: imageUrl,
      public_id: publicId,
      productUrl: req.body.productUrl,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      type: req.body.type || 'regular',
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
      createdBy: req.user._id,
      createdByModel: 'Admin',
    });

    res.status(201).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Banner
// @route   PUT /api/admin/banners/:id
// @access  Private (Admin with manageBanners permission)
exports.updateBanner = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageBanners')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage banners' });
    }

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Upload new image if provided
    if (req.file) {
      try {
        // Delete old image from Cloudinary if exists
        if (banner.public_id) {
          await deleteFromCloudinary(banner.public_id);
        }
        
        // Upload new image
        const result = await uploadToCloudinary(req.file.buffer, 'banners');
        banner.imageUrl = result.secure_url;
        banner.public_id = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({ 
          success: false, 
          message: `Failed to upload image: ${uploadError.message}` 
        });
      }
    }

    // Update fields
    if (req.body.title) banner.title = req.body.title;
    if (req.body.description !== undefined) banner.description = req.body.description;
    if (req.body.badge !== undefined) banner.badge = req.body.badge;
    if (req.body.productUrl !== undefined) banner.productUrl = req.body.productUrl;
    if (req.body.startDate) banner.startDate = req.body.startDate;
    if (req.body.endDate) banner.endDate = req.body.endDate;
    if (req.body.type) banner.type = req.body.type;
    if (req.body.isActive !== undefined) banner.isActive = req.body.isActive === 'true' || req.body.isActive === true;

    await banner.save();

    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Banner
// @route   DELETE /api/admin/banners/:id
// @access  Private (Admin with manageBanners permission)
exports.deleteBanner = async (req, res) => {
  try {
    if (!checkPermission(req.user, 'manageBanners')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to manage banners' });
    }

    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    await banner.deleteOne();

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Find the super admin and include password field
    const admin = await Admin.findById(req.params.id).select('+password');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }

    // Verify current password
    const isPasswordCorrect =  await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword,10)
    // Update password
    admin.password = hashedPassword;
    await admin.save();

    res.json({ 
      success: true, 
      message: 'Password updated successfully',
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        permission: admin.permissions
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// @desc    Create Newsletter Email
// @route   POST /api/superadmin/newsletter-emails
// @access  Private (Super Admin)
exports.createNewsletterEmail = async (req, res) => {
  try {
    const { email, source } = req.body;

    console.log(req.user._id);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if email already exists
    const existingEmail = await NewsLetterEmails.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }

    const newsletterEmail = await NewsLetterEmails.create({
      email: email.toLowerCase().trim(),
      source: source || 'manual',
      isActive: true,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: newsletterEmail,
    });
  } catch (error) {
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Newsletter Email (toggle active status or update other fields)
// @route   PUT /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.updateNewsletterEmail = async (req, res) => {
  try {
    const { isActive, source } = req.body;
    const newsletterEmail = await NewsLetterEmails.findById(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    if (isActive !== undefined) {
      newsletterEmail.isActive = isActive;
    }

    if (source !== undefined) {
      newsletterEmail.source = source;
    }

    await newsletterEmail.save();

    res.json({ success: true, data: newsletterEmail });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Newsletter Email
// @route   DELETE /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.deleteNewsletterEmail = async (req, res) => {
  try {
    const newsletterEmail = await NewsLetterEmails.findByIdAndDelete(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    res.json({ success: true, message: 'Newsletter email deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Newsletter Email by ID
// @route   GET /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.getNewsletterEmailById = async (req, res) => {
  try {
    const newsletterEmail = await NewsLetterEmails.findById(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    res.json({ success: true, data: newsletterEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Get all FAQs
// @route   GET /api/superadmin/faqs
// @access  Private (Super Admin)
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create FAQ
// @route   POST /api/superadmin/faqs
// @access  Private (Super Admin)
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category, isActive} = req.body;
    if (!question || !answer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Question and answer are required' 
      });
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || 'general',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update FAQ
// @route   PUT /api/superadmin/faqs/:id
// @access  Private (Super Admin)
exports.updateFAQ = async (req, res) => {
  try {
    const { question, answer, category, isActive, order } = req.body;

    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    if (question !== undefined) faq.question = question;
    if (answer !== undefined) faq.answer = answer;
    if (category !== undefined) faq.category = category;
    if (isActive !== undefined) faq.isActive = isActive;
    if (order !== undefined) faq.order = order;

    await faq.save();

    res.json({ success: true, data: faq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/superadmin/faqs/:id
// @access  Private (Super Admin)
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Newsletter
// @route   POST /api/superadmin/newsletters
// @access  Private (Super Admin)
exports.createNewsletter = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    let imageUrl = '';
    let publicId = '';

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'newsletters');
        imageUrl = result.secure_url;
        publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({ 
          success: false, 
          message: `Failed to upload image: ${uploadError.message}` 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Newsletter image is required' 
      });
    }

    const newsletter = await NewsLetters.create({
      title,
      description: description || '',
      imageUrl,
      publicId,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: newsletter,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Newsletters
// @route   GET /api/superadmin/newsletters
// @access  Private (Super Admin)
exports.getNewsletters = async (req, res) => {
  try {
    const newsletters = await NewsLetters.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: newsletters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Newsletter
// @route   PUT /api/superadmin/newsletters/:id
// @access  Private (Super Admin)
exports.updateNewsletter = async (req, res) => {
  try {
    const newsletter = await NewsLetters.findById(req.params.id);

    if (!newsletter) {
      return res.status(404).json({ success: false, message: 'Newsletter not found' });
    }

    // Handle image upload if provided
    if (req.file) {
      try {
        // Delete old image from Cloudinary if it exists
        if (newsletter.publicId) {
          await deleteFromCloudinary(newsletter.publicId);
        }

        // Upload new image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'newsletters');
        newsletter.imageUrl = result.secure_url;
        newsletter.publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({ 
          success: false, 
          message: `Failed to upload image: ${uploadError.message}` 
        });
      }
    }

    // Update other fields from req.body
    const { title, description, isActive } = req.body;
    
    if (title !== undefined) newsletter.title = title;
    if (description !== undefined) newsletter.description = description;
    if (isActive !== undefined) newsletter.isActive = isActive;

    await newsletter.save();

    res.json({ success: true, data: newsletter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Newsletter
// @route   DELETE /api/superadmin/newsletters/:id
// @access  Private (Super Admin)
exports.deleteNewsletter = async (req, res) => {
  try {
    const newsletter = await NewsLetters.findById(req.params.id);

    if (!newsletter) {
      return res.status(404).json({ success: false, message: 'Newsletter not found' });
    }

    // Delete image from Cloudinary if it exists
    if (newsletter.publicId) {
      try {
        await deleteFromCloudinary(newsletter.publicId);
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    await newsletter.deleteOne();

    res.json({ success: true, message: 'Newsletter deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Newsletter Emails
// @route   GET /api/superadmin/newsletter-emails
// @access  Private (Super Admin)
exports.getNewsletterEmails = async (req, res) => {
  try {
    const { search, source, isActive } = req.query;
    let query = {};

    // Filter by source if provided
    if (source) {
      query.source = source;
    }

    // Filter by isActive if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search filter (case-insensitive search on email and source)
    // Combine with existing filters using $and
    if (search) {
      const searchCondition = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } },
        ]
      };
      
      // If there are existing filters, use $and to combine them
      if (Object.keys(query).length > 0) {
        query = { $and: [query, searchCondition] };
      } else {
        query = searchCondition;
      }
    }

    const newsletterEmails = await NewsLetterEmails.find(query).sort({ createdAt: -1 });

    res.json({ success: true, data: newsletterEmails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Newsletter Email
// @route   POST /api/superadmin/newsletter-emails
// @access  Private (Super Admin)
exports.createNewsletterEmail = async (req, res) => {
  try {
    const { email, source } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if email already exists
    const existingEmail = await NewsLetterEmails.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }

    const newsletterEmail = await NewsLetterEmails.create({
      email: email.toLowerCase().trim(),
      source: source || 'manual',
      isActive: true,
      createdBy: req.user._id,
      createdByModel: 'Admin',
    });

    res.status(201).json({
      success: true,
      data: newsletterEmail,
    });
  } catch (error) {
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Newsletter Email (toggle active status or update other fields)
// @route   PUT /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.updateNewsletterEmail = async (req, res) => {
  try {
    const { isActive, source } = req.body;
    const newsletterEmail = await NewsLetterEmails.findById(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    if (isActive !== undefined) {
      newsletterEmail.isActive = isActive;
    }

    if (source !== undefined) {
      newsletterEmail.source = source;
    }

    await newsletterEmail.save();

    res.json({ success: true, data: newsletterEmail });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Newsletter Email
// @route   DELETE /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.deleteNewsletterEmail = async (req, res) => {
  try {
    const newsletterEmail = await NewsLetterEmails.findByIdAndDelete(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    res.json({ success: true, message: 'Newsletter email deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Newsletter Email by ID
// @route   GET /api/superadmin/newsletter-emails/:id
// @access  Private (Super Admin)
exports.getNewsletterEmailById = async (req, res) => {
  try {
    const newsletterEmail = await NewsLetterEmails.findById(req.params.id);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

    res.json({ success: true, data: newsletterEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


