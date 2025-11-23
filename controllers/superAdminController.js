const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Banner = require('../models/Banner');
const Query = require('../models/Query');
const Notification = require('../models/Notification');
const FAQ = require('../models/FAQ');
const NewsLetters = require('../models/NewsLetters');
const NewsLetterEmails = require('../models/NewsLetterEmails');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { sendEmail } = require('../config/email');
const { generateTransactionId } = require('../utils/export');
const { sendNotificationToUsers } = require('../utils/fcmService');

// @desc    Register Super Admin
// @route   POST /api/superadmin/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const superAdmin = await SuperAdmin.findOne({email})
    if(superAdmin){
        return res.status(400).json({ 
        success: false, 
        message: `This ${email} is already registered. Please use a different email.` 
      });
    }else{
      const superAdmin = await SuperAdmin.create({
        username,
        email,
        password,
      });
  
      const token = generateToken(superAdmin._id, 'superadmin');
  
    return  res.status(201).json({
        success: true,
        token,
        user: {
          id: superAdmin._id,
          username: superAdmin.username,
          email: superAdmin.email,
        },
      });
    }
  } catch (error) {
 
 return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Login Super Admin
// @route   POST /api/superadmin/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');

    if (!superAdmin || !(await superAdmin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!superAdmin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(superAdmin._id, 'superadmin');

    res.json({
      success: true,
      token,
      user: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Admin
// @route   POST /api/superadmin/admins
// @access  Private (Super Admin)
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, permissions } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required.' 
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: `This ${email} is already registered. Please use a different email.` 
      });
    }

    // Create new admin using Admin model (capital A)
    const hashedPassword = await bcrypt.hash(password,10)
    const newAdmin = await Admin.create({
      username,
      email,
      password: hashedPassword,
      permissions: permissions || {},
      createdBy: req.user._id
    });

    const token = generateToken(newAdmin._id, 'admin');
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        permissions: newAdmin.permissions || permissions || {}
      },
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create admin. Please try again.' 
    });
  }
};
// @desc    Get all Admins
// @route   GET /api/superadmin/admins
// @access  Private (Super Admin)
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().populate('createdBy', 'username email');
    res.json({ success: true, data: admins });
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

// @desc    Respond to Contact
// @route   POST /api/superadmin/contacts/:id/respond
// @access  Private (Super Admin)
exports.respondToContact = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || !response.trim()) {
      return res.status(400).json({ success: false, message: 'Response message is required' });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Update contact status and repliedAt
    contact.status = 'replied';
    contact.repliedAt = new Date();
    await contact.save();

    // Send email response
    await sendEmail(
      contact.email,
      `Re: ${contact.subject}`,
      response,
      `<p>${response}</p>`
    );

    res.json({ success: true, data: contact, message: 'Response sent successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Admin
// @route   PUT /api/superadmin/admins/:id
// @access  Private (Super Admin)
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Admin
// @route   DELETE /api/superadmin/admins/:id
// @access  Private (Super Admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Employees
// @route   GET /api/superadmin/employees
// @access  Private (Super Admin)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().populate('company', 'companyName email');
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate/Deactivate Employee
// @route   PUT /api/superadmin/employees/:id/status
// @access  Private (Super Admin)
exports.toggleEmployeeStatus = async (req, res) => {
  try {
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
// @route   PUT /api/superadmin/employees/:id
// @access  Private (Super Admin)
exports.updateEmployee = async (req, res) => {
  try {
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

// @desc    Create Company
// @route   POST /api/superadmin/companies
// @access  Private (Super Admin)
exports.createCompany = async (req, res) => {
  try {
    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country } = req.body;
    console.log(req.body.email)
    console.log(req.body.password)

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
          message: `Failed to upload logo: ${uploadError.message}` 
        });
      }
    }

    const company = await Company.create({
      companyName,
      email,
      password,
      phone,
      licenseNumber,
      vatNumber,
      address,
      country,
      companyLogo,
      publicId,
    });

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Companies
// @route   GET /api/superadmin/companies
// @access  Private (Super Admin)
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company
// @route   PUT /api/superadmin/companies/:id
// @access  Private (Super Admin)
exports.updateCompany = async (req, res) => {
  try {
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
          message: `Failed to upload logo: ${uploadError.message}` 
        });
      }
    }

    // Update other fields from req.body
    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country } = req.body;
    
    if (companyName) company.companyName = companyName;
    if (email) company.email = email;
    if (password) company.password = password;
    if (phone !== undefined) company.phone = phone;
    if (licenseNumber !== undefined) company.licenseNumber = licenseNumber;
    if (vatNumber !== undefined) company.vatNumber = vatNumber;
    if (address !== undefined) company.address = address;
    if (country !== undefined) company.country = country;

    await company.save();

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Company
// @route   DELETE /api/superadmin/companies/:id
// @access  Private (Super Admin)
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Customer Queries
// @route   GET /api/superadmin/queries
// @access  Private (Super Admin)
exports.getQueries = async (req, res) => {
  try {
    const queries = await Query.find()
      .populate('customer', 'username email phone')
      .populate('responses.respondedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to Query
// @route   POST /api/superadmin/queries/:id/respond
// @access  Private (Super Admin)
exports.respondToQuery = async (req, res) => {
  try {
    const { response } = req.body;
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    query.responses.push({
      respondedBy: req.user._id,
      response,
    });

    query.status = 'resolved';
    await query.save();

    // Send email response
    await sendEmail(
      query.customerEmail,
      `Re: ${query.subject}`,
      response,
      `<p>${response}</p>`
    );

    res.json({ success: true, data: query });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Create/Register Customer
// @route   POST /api/superadmin/customers
// @access  Private (Super Admin)
exports.createCustomer = async (req, res) => {
  try {
    const { username, email, password, phone, address, country, googleId, isGoogleSignup } = req.body;
    console.log('Request body:', req.body);

    // Validate required fields
    if (!username || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and phone are required' 
      });
    }

    // Check if password is required (for non-Google signups)
    if (!isGoogleSignup && !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for non-Google signups' 
      });
    }

    // Check for existing customer with same email, username, or phone
    const existingCustomer = await Customer.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingCustomer) {
      let duplicateField = '';
      if (existingCustomer.email === email.toLowerCase().trim()) duplicateField = 'Email';
      else if (existingCustomer.username === username.trim()) duplicateField = 'Username';
      else if (existingCustomer.phone === phone.trim()) duplicateField = 'Phone';
      
      return res.status(400).json({ 
        success: false, 
        message: `${duplicateField} already exists. Please use a different ${duplicateField.toLowerCase()}.` 
      });
    }

    const customer = await Customer.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: isGoogleSignup ? undefined : password,
      phone: phone.trim(),
      address: address?.trim() || '',
      country: country?.trim() || '',
      googleId: googleId || undefined,
      isGoogleSignup: isGoogleSignup || false,
      createdBy: 'superadmin',
      createdById: req.user._id,
      createdByModel: 'SuperAdmin',
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different ${field}.` 
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Customers
// @route   GET /api/superadmin/customers
// @access  Private (Super Admin)
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().populate('linkedCompanies.company');
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Customer
// @route   PUT /api/superadmin/customers/:id
// @access  Private (Super Admin)
exports.updateCustomer = async (req, res) => {
  try {
    const { username, email, password, phone, address, country, isGoogleSignup } = req.body;
    
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Update fields
    if (username !== undefined) customer.username = username;
    if (email !== undefined) customer.email = email;
    if (password !== undefined && !isGoogleSignup) {
      customer.password = password;
    }
    if (phone !== undefined) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    if (country !== undefined) customer.country = country;
    if (isGoogleSignup !== undefined) customer.isGoogleSignup = isGoogleSignup;

    await customer.save();

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Customer
// @route   DELETE /api/superadmin/customers/:id
// @access  Private (Super Admin)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Transactions
// @route   GET /api/superadmin/transactions
// @access  Private (Super Admin)
exports.getTransactions = async (req, res) => {
  try {
    const { transactionId } = req.query;
    let query = {};

    if (transactionId) {
      query.transactionId = transactionId;
    }

    const transactions = await Transaction.find(query)
      .populate('customer', 'username email phone')
      .populate('company', 'companyName')
      .populate('employee', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Transaction by ID
// @route   GET /api/superadmin/transactions/:id
// @access  Private (Super Admin)
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'username email phone')
      .populate('company', 'companyName')
      .populate('employee', 'name');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Notification and Send via FCM
// @route   POST /api/superadmin/notifications
// @access  Private (Super Admin)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, target, targetIds, company } = req.body;

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and message are required' 
      });
    }

    // Create notification record
    const notification = await Notification.create({
      title,
      message,
      type: type || 'both',
      target: target || 'all',
      targetIds,
      company,
      createdBy: req.user._id,
      createdByModel: 'SuperAdmin',
      sentAt: new Date(),
    });

    // Send FCM notifications
    let fcmResult = null;
    try {
      let users = [];

      // Determine which users to send notifications to
      if (target === 'all') {
        // Send to all customers
        users = await Customer.find({ isActive: true });
      } else if (target === 'customers') {
        // Send to all customers
        users = await Customer.find({ isActive: true });
      } else if (target === 'company' && company) {
        // Send to customers linked to specific company
        users = await Customer.find({
          isActive: true,
          'linkedCompanies.company': company,
        });
      } else if (target === 'specific' && targetIds && targetIds.length > 0) {
        // Send to specific customers
        users = await Customer.find({
          _id: { $in: targetIds },
          isActive: true,
        });
      }

      // Send FCM notifications
      if (users.length > 0) {
        fcmResult = await sendNotificationToUsers(
          users,
          { title, message, type: type || 'both' },
          type || 'both',
          {
            notificationId: notification._id.toString(),
            target: target || 'all',
          }
        );

        // Clean up invalid tokens
        if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
          await Promise.all(
            users.map(async (user) => {
              if (user.fcmTokens && user.fcmTokens.length > 0) {
                user.fcmTokens = user.fcmTokens.filter(
                  (fcmTokenObj) => !fcmResult.invalidTokens.includes(fcmTokenObj.token)
                );
                await user.save();
              }
            })
          );
        }
      }
    } catch (fcmError) {
      console.error('Error sending FCM notification:', fcmError);
      // Don't fail the entire request if FCM fails
      // Notification is still created in database
    }

    res.status(201).json({
      success: true,
      data: notification,
      fcm: fcmResult ? {
        successCount: fcmResult.successCount || 0,
        failureCount: fcmResult.failureCount || 0,
        totalUsers: fcmResult.totalUsers || 0,
      } : null,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Notifications
// @route   GET /api/superadmin/notifications
// @access  Private (Super Admin)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Notification
// @route   DELETE /api/superadmin/notifications/:id
// @access  Private (Super Admin)
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Banner
// @route   POST /api/superadmin/banners
// @access  Private (Super Admin)
exports.uploadBanner = async (req, res) => {
  try {
    // if (!req.file) {
    //   return res.status(400).json({ success: false, message: 'Please upload an image' });
    // }

   // const result = await uploadToCloudinary(req.file.buffer, 'banners');

    const banner = await Banner.create({
      title: req.body.title,
      description: req.body.description,
      badge: req.body.badge,
      imageUrl: req.body.imageUrl,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      type: req.body.type,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Banners
// @route   GET /api/superadmin/banners
// @access  Private (Super Admin)
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Banner
// @route   PUT /api/superadmin/banners/:id
// @access  Private (Super Admin)
exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    if (req.file) {
      // Delete old image from Cloudinary
      if (banner.image) {
        const publicId = banner.image.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, 'banners');
      banner.image = result.secure_url;
    }

    Object.assign(banner, req.body);
    await banner.save();

    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Banner
// @route   DELETE /api/superadmin/banners/:id
// @access  Private (Super Admin)
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Delete image from Cloudinary
    if (banner.image) {
      const publicId = banner.image.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    await banner.deleteOne();

    res.json({ success: true, message: 'Banner deleted successfully' });
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

// @desc    Get all Super Admins
// @route   GET /api/superadmin/super-admins
// @access  Private (Super Admin)
exports.getSuperAdmins = async (req, res) => {
  try {
    const superAdmins = await SuperAdmin.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: superAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Super Admin Password
// @route   PUT /api/superadmin/super-admins/:id/password
// @access  Private (Super Admin)
exports.updateSuperAdminPassword = async (req, res) => {
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
    const superAdmin = await SuperAdmin.findById(req.params.id).select('+password');

    if (!superAdmin) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }

    // Verify current password
    const isPasswordCorrect = await superAdmin.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    superAdmin.password = newPassword;
    await superAdmin.save();

    res.json({ 
      success: true, 
      message: 'Password updated successfully',
      data: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

