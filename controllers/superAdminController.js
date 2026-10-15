const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Banner = require('../models/Banner');
const WhatsNew = require('../models/WhatsNew');
const Query = require('../models/Query');
const Notification = require('../models/Notification');
const FAQ = require('../models/FAQ');
const Terms = require('../models/Terms');
const NewsLetters = require('../models/NewsLetters');
const NewsLetterEmails = require('../models/NewsLetterEmails');
const SEO = require('../models/SEO');
const AiApiKey = require('../models/AiApiKey');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { sendEmail } = require('../config/email');
const { generateTransactionId } = require('../utils/export');
const { encrypt, decrypt, maskSecret } = require('../utils/encryption');
const { sendNotificationToTokens } = require('../utils/fcmService');
const moment = require("moment");
const {JWT} = require("google-auth-library");
const axios = require('axios')

// @desc    Register Super Admin
// @route   POST /api/superadmin/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await SuperAdmin.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `This ${email} is already registered. Please use a different email.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const superAdmin = await SuperAdmin.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = generateToken(superAdmin.id, 'superadmin');

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username or email already exists.' });
    }
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

    const superAdmin = await SuperAdmin.findByEmail(email, { includePassword: true });
    if (!superAdmin) {
      return res.status(400).json({success: false, message: "Please enter the correct email" });
    }
    const passwordCompare = await bcrypt.compare(password, superAdmin.password);
    if (!passwordCompare) {
      return res.status(400).json({ success:false, message: "Please enter the correct password", });
    }

    if (!superAdmin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(superAdmin.id, 'superadmin');

    res.json({
      success: true,
      token,
      user: {
        id: superAdmin.id,
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
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required.'
      });
    }
    const existingAdmin = await Admin.findByEmail(email);
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
      permissions: permissions || {}
    });

    const token = generateToken(newAdmin.id, 'admin');
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        permissions: newAdmin.permissions
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
    const admins = await Admin.findAll();
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll();
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

    const existing = await Contact.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Update contact status and repliedAt
    const contact = await Contact.markReplied(req.params.id);

    // Send email response
    await sendEmail(
      contact.email,
      `Re: ${contact.subject}`,
      response
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
    const admin = await Admin.updateById(req.params.id, req.body);

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
    const deleted = await Admin.deleteById(req.params.id);

    if (!deleted) {
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
    const employees = await Employee.findAll();
    const companies = await Company.findAll();
    const companyMap = new Map(companies.map((company) => [company.id, company]));

    const data = employees.map((employee) => ({
      ...employee,
      company: employee.company
        ? {
            id: employee.company,
            companyName: companyMap.get(employee.company)?.companyName ?? employee.companyName,
            email: companyMap.get(employee.company)?.email,
          }
        : null,
    }));

    res.json({ success: true, data });
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
    const employee = await Employee.updateById(req.params.id, { isActive, activatedBy: req.user.id });

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

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (dutyAddress) updates.dutyAddress = dutyAddress;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (permissions) updates.permissions = permissions;

    const employee = await Employee.updateById(req.params.id, updates);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

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
    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country, employeeCount, aiApiEnabled } = req.body;

    const company = await Company.findByEmail(email)
    if(company){
      return  res.status(400).json({ success: false, message: "Company with this email already exist." });
     }
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
    const hashedPassword = await bcrypt.hash(password,10)
    const compData = await Company.create({
      companyName,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      vatNumber,
      address,
      country,
      companyLogo,
      publicId,
      employeeCount,
      aiApiEnabled: aiApiEnabled !== undefined ? (aiApiEnabled === 'true' || aiApiEnabled === true) : false,
    });

    res.status(201).json({
      success: true,
      data: compData,
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
    const companies = await Company.findAll();
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

    const updates = {};

    // Handle logo upload if provided
    if (req.file) {
      try {
        // Delete old logo from Cloudinary if it exists
        if (company.publicId) {
          await deleteFromCloudinary(company.publicId);
        }

        // Upload new logo to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'company-logos');
        updates.companyLogo = result.secure_url;
        updates.publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload logo: ${uploadError.message}`
        });
      }
    }

    // Update other fields from req.body
    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country, employeeCount, aiApiEnabled } = req.body;

    if (companyName) updates.companyName = companyName;
    if (email) updates.email = email;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (phone !== undefined) updates.phone = phone;
    if (licenseNumber !== undefined) updates.licenseNumber = licenseNumber;
    if (vatNumber !== undefined) updates.vatNumber = vatNumber;
    if (address !== undefined) updates.address = address;
    if (country !== undefined) updates.country = country;
    if (employeeCount !== undefined) updates.employeeCount = employeeCount;
    if (aiApiEnabled !== undefined) updates.aiApiEnabled = aiApiEnabled === 'true' || aiApiEnabled === true;

    const updated = await Company.updateById(req.params.id, updates);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Company Status (Activate/Deactivate)
// @route   PUT /api/superadmin/companies/:id/status
// @access  Private (Super Admin)
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const company = await Company.updateById(req.params.id, { isActive });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Company AI API Access (Enable/Disable)
// @route   PUT /api/superadmin/companies/:id/ai-access
// @access  Private (Super Admin)
exports.toggleCompanyAiAccess = async (req, res) => {
  try {
    const { aiApiEnabled } = req.body;
    const company = await Company.updateById(req.params.id, { aiApiEnabled });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

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
    const deleted = await Company.deleteById(req.params.id);

    if (!deleted) {
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
    const queries = await Query.findAll();

    const customerIds = [...new Set(queries.map((query) => query.customer).filter(Boolean))];
    const customers = customerIds.length ? await Customer.findByIds(customerIds) : [];
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    const [superAdmins, admins] = await Promise.all([SuperAdmin.findAll(), Admin.findAll()]);
    const superAdminMap = new Map(superAdmins.map((admin) => [admin.id, admin]));
    const adminMap = new Map(admins.map((admin) => [admin.id, admin]));

    const data = queries.map((query) => {
      const customer = customerMap.get(query.customer);
      const responses = query.responses.map((response) => {
        const responderMap = response.responseModel === 'Admin' ? adminMap : superAdminMap;
        const responder = responderMap.get(Number(response.respondedBy));
        return {
          ...response,
          respondedBy: responder
            ? { id: responder.id, username: responder.username, email: responder.email }
            : response.respondedBy,
        };
      });

      return {
        ...query,
        customer: customer
          ? { id: customer.id, username: customer.username, email: customer.email, phone: customer.phone }
          : query.customer,
        responses,
      };
    });

    res.json({ success: true, data });
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
    const existing = await Query.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const query = await Query.addResponse(req.params.id, {
      respondedBy: req.user.id,
      responseModel: 'SuperAdmin',
      response,
    });

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
    const trimmedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();
    const trimmedPhone = phone.trim();

    const [byEmail, byUsername, byPhone] = await Promise.all([
      Customer.findByEmail(trimmedEmail),
      Customer.findByUsername(trimmedUsername),
      Customer.findByPhone(trimmedPhone),
    ]);

    let duplicateField = '';
    if (byEmail) duplicateField = 'Email';
    else if (byUsername) duplicateField = 'Username';
    else if (byPhone) duplicateField = 'Phone';

    if (duplicateField) {
      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists. Please use a different ${duplicateField.toLowerCase()}.`
      });
    }

    const customer = await Customer.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password: isGoogleSignup ? undefined : await bcrypt.hash(password, 10),
      phone: trimmedPhone,
      address: address?.trim() || '',
      country: country?.trim() || '',
      googleId: googleId || undefined,
      isGoogleSignup: isGoogleSignup || false,
      createdBy: 'superadmin',
      createdById: req.user.id,
      createdByModel: 'SuperAdmin',
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    // Handle duplicate key error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists. Please use a different email.'
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
    const customers = await Customer.findAll();
    const data = await Promise.all(
      customers.map(async (customer) => ({
        ...customer,
        linkedCompanies: await Customer.getLinkedCompanies(customer.id),
      }))
    );
    res.json({ success: true, data });
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

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (password !== undefined && !isGoogleSignup) {
      updates.password = await bcrypt.hash(password, 10);
    }
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (country !== undefined) updates.country = country;
    if (isGoogleSignup !== undefined) updates.isGoogleSignup = isGoogleSignup;

    const customer = await Customer.updateById(req.params.id, updates);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

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
    const deleted = await Customer.deleteById(req.params.id);

    if (!deleted) {
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

    const transactions = await Transaction.findAll({ transactionId });

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
    const transaction = await Transaction.findById(req.params.id);

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
      createdBy: req.user.id,
      createdByModel: 'SuperAdmin',
      sentAt: new Date(),
    });

    // Send FCM notifications
    let fcmResult = null;
    try {
      let users = [];

      // Determine which users to send notifications to
      if (target === 'all' || target === 'customers') {
        // Send to all customers
        users = await Customer.findAll({ isActive: true });
      } else if (target === 'company' && company) {
        // Send to customers linked to specific company
        users = await Customer.findActiveLinkedToCompany(company);
      } else if (target === 'specific' && targetIds && targetIds.length > 0) {
        // Send to specific customers
        const found = await Customer.findByIds(targetIds);
        users = found.filter((user) => user.isActive);
      }

      // Send FCM notifications (customers carry a single deviceToken, not an fcmTokens array)
      const tokens = users.map((user) => user.deviceToken).filter(Boolean);

      if (tokens.length > 0) {
        const result = await sendNotificationToTokens(
          tokens,
          { title, message, type: type || 'both' },
          {
            notificationId: notification.id.toString(),
            target: target || 'all',
          }
        );

        fcmResult = { ...result, totalUsers: users.length };

        // Clean up invalid tokens
        if (result.invalidTokens && result.invalidTokens.length > 0) {
          await Promise.all(
            users
              .filter((user) => result.invalidTokens.includes(user.deviceToken))
              .map((user) => Customer.updateById(user.id, { deviceToken: null }))
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
    const notifications = await Notification.findAll();
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
    const deleted = await Notification.deleteById(req.params.id);

    if (!deleted) {
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
      type: req.body.type,
      language: req.body.language || 'en',
      createdBy: req.user.id,
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
    const banners = await Banner.findAll();
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

    const updates = {};

    // Handle image upload if provided
    if (req.file) {
      try {
        // Delete old image from Cloudinary if it exists
        if (banner.public_id) {
          await deleteFromCloudinary(banner.public_id);
        }

        // Upload new image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'banners');
        updates.imageUrl = result.secure_url;
        updates.public_id = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload image: ${uploadError.message}`
        });
      }
    }

    // Update other fields from req.body
    const { title, description, badge, startDate, endDate, type, isActive, language } = req.body;

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (badge !== undefined) updates.badge = badge;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (type !== undefined) updates.type = type;
    if (language !== undefined) updates.language = language;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await Banner.updateById(req.params.id, updates);

    res.json({ success: true, data: updated });
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

    // Delete image from Cloudinary if it exists
    if (banner.public_id) {
      try {
        await deleteFromCloudinary(banner.public_id);
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    await Banner.deleteById(req.params.id);

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload What's New item
// @route   POST /api/superadmin/whats-new
// @access  Private (Super Admin)
exports.uploadWhatsNew = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    let imageUrl = '';
    let publicId = '';

    try {
      const result = await uploadToCloudinary(req.file.buffer, 'whats-new');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    } catch (uploadError) {
      return res.status(400).json({
        success: false,
        message: `Failed to upload image: ${uploadError.message}`,
      });
    }

    const whatsNew = await WhatsNew.create({
      title: req.body.title,
      description: req.body.description,
      imageUrl: imageUrl,
      public_id: publicId,
      productUrl: req.body.productUrl,
      language: req.body.language || 'en',
      order: req.body.order,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: whatsNew,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all What's New items
// @route   GET /api/superadmin/whats-new
// @access  Private (Super Admin)
exports.getWhatsNews = async (req, res) => {
  try {
    const whatsNews = await WhatsNew.findAll();
    res.json({ success: true, data: whatsNews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update What's New item
// @route   PUT /api/superadmin/whats-new/:id
// @access  Private (Super Admin)
exports.updateWhatsNew = async (req, res) => {
  try {
    const whatsNew = await WhatsNew.findById(req.params.id);

    if (!whatsNew) {
      return res.status(404).json({ success: false, message: "What's New item not found" });
    }

    const updates = {};

    if (req.file) {
      try {
        if (whatsNew.public_id) {
          await deleteFromCloudinary(whatsNew.public_id);
        }

        const result = await uploadToCloudinary(req.file.buffer, 'whats-new');
        updates.imageUrl = result.secure_url;
        updates.public_id = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload image: ${uploadError.message}`,
        });
      }
    }

    const { title, description, productUrl, language, order, isActive } = req.body;

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (productUrl !== undefined) updates.productUrl = productUrl;
    if (language !== undefined) updates.language = language;
    if (order !== undefined) updates.order = order;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await WhatsNew.updateById(req.params.id, updates);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete What's New item
// @route   DELETE /api/superadmin/whats-new/:id
// @access  Private (Super Admin)
exports.deleteWhatsNew = async (req, res) => {
  try {
    const whatsNew = await WhatsNew.findById(req.params.id);

    if (!whatsNew) {
      return res.status(404).json({ success: false, message: "What's New item not found" });
    }

    if (whatsNew.public_id) {
      try {
        await deleteFromCloudinary(whatsNew.public_id);
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
      }
    }

    await WhatsNew.deleteById(req.params.id);

    res.json({ success: true, message: "What's New item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all FAQs
// @route   GET /api/superadmin/faqs
// @access  Private (Super Admin)
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.findAll();
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
      createdBy: req.user.id,
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
    const { question, answer, category, isActive } = req.body;

    const updates = {};
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.isActive = isActive;

    const faq = await FAQ.updateById(req.params.id, updates);

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

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
    const deleted = await FAQ.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Terms and Conditions
// @route   GET /api/superadmin/terms
// @access  Private (Super Admin)
exports.getTerms = async (req, res) => {
  try {
    const terms = await Terms.findAll();
    res.json({ success: true, data: terms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Terms and Conditions
// @route   POST /api/superadmin/terms
// @access  Private (Super Admin)
exports.createTerms = async (req, res) => {
  try {
    const { title, content, section, isActive } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const terms = await Terms.create({
      title: title.trim(),
      content: content.trim(),
      section: section || 'general',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      createdByModel: 'SuperAdmin',
    });

    res.status(201).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Terms and Conditions
// @route   PUT /api/superadmin/terms/:id
// @access  Private (Super Admin)
exports.updateTerms = async (req, res) => {
  try {
    const { title, content, section, isActive } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (section !== undefined) updates.section = section;
    if (isActive !== undefined) updates.isActive = isActive;

    const terms = await Terms.updateById(req.params.id, updates);

    if (!terms) {
      return res.status(404).json({ success: false, message: 'Terms and Conditions not found' });
    }

    res.json({ success: true, data: terms });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Terms and Conditions
// @route   DELETE /api/superadmin/terms/:id
// @access  Private (Super Admin)
exports.deleteTerms = async (req, res) => {
  try {
    const deleted = await Terms.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Terms and Conditions not found' });
    }

    res.json({ success: true, message: 'Terms and Conditions deleted successfully' });
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
      createdBy: req.user.id,
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
    const newsletters = await NewsLetters.findAll();

    const [superAdmins, admins] = await Promise.all([SuperAdmin.findAll(), Admin.findAll()]);
    const superAdminMap = new Map(superAdmins.map((admin) => [admin.id, admin]));
    const adminMap = new Map(admins.map((admin) => [admin.id, admin]));

    const data = newsletters.map((newsletter) => {
      const creatorMap = newsletter.createdByModel === 'Admin' ? adminMap : superAdminMap;
      const creator = creatorMap.get(Number(newsletter.createdBy));
      return {
        ...newsletter,
        createdBy: creator
          ? { id: creator.id, username: creator.username, email: creator.email }
          : newsletter.createdBy,
      };
    });

    res.json({ success: true, data });
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

    const updates = {};

    // Handle image upload if provided
    if (req.file) {
      try {
        // Delete old image from Cloudinary if it exists
        if (newsletter.publicId) {
          await deleteFromCloudinary(newsletter.publicId);
        }

        // Upload new image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'newsletters');
        updates.imageUrl = result.secure_url;
        updates.publicId = result.public_id;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: `Failed to upload image: ${uploadError.message}`
        });
      }
    }

    // Update other fields from req.body
    const { title, description, isActive } = req.body;

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await NewsLetters.updateById(req.params.id, updates);

    res.json({ success: true, data: updated });
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

    await NewsLetters.deleteById(req.params.id);

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

    const newsletterEmails = await NewsLetterEmails.findAll({
      search,
      source,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

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
    const existingEmail = await NewsLetterEmails.findByEmail(email.toLowerCase().trim());
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed'
      });
    }

    const newsletterEmail = await NewsLetterEmails.create({
      email: email.toLowerCase().trim(),
      source: source || 'manual',
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: newsletterEmail,
    });
  } catch (error) {
    // Handle duplicate key error (unique constraint)
    if (error.code === 'ER_DUP_ENTRY') {
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

    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (source !== undefined) updates.source = source;

    const newsletterEmail = await NewsLetterEmails.updateById(req.params.id, updates);

    if (!newsletterEmail) {
      return res.status(404).json({ success: false, message: 'Newsletter email not found' });
    }

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
    const deleted = await NewsLetterEmails.deleteById(req.params.id);

    if (!deleted) {
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
    const superAdmins = await SuperAdmin.findAll();
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
    const { email, newPassword } = req.body;

    // Validate required fields
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: ' new password are required'
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
    const superAdmin = await SuperAdmin.findByEmail(email, { includePassword: true });

    if (!superAdmin) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword,10)
    await SuperAdmin.updatePasswordByEmail(email, hashedPassword);
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}
//check otp expiration
function isOTPExpired(createdAt){
    const expirationTime = moment(createdAt).add(10,"minutes")
    return moment()>expirationTime;
}

exports.checkEmail = async(req,res)=>{
  try {
    const data = await SuperAdmin.findByEmail(req.body.email)
    if(!data){
      return res.status(401).json({success: false,message: "Email with this account does not exist."})
    }
    const otp = generateOTP();
    const response =  await sendEmail(
       req.body.email,
       "Otp verification",
      `Your otp code is ${otp} and do remember otp will expire after 10 minutes.`
    );
         if(response){
          await SuperAdmin.setOtpByEmail(req.body.email, otp);
res.status(200).json({success: true,message: "Please check your email."})
         }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
exports.verifyOtp = async(req,res)=>{
  try {
      let user = await SuperAdmin.findByOtp(req.body.otp);
      if(!user){
        return res.status(400).json({success:false, message: "Code not found"})
      }else{

         const isExpired = isOTPExpired(user.updatedAt);
          if(isExpired){
               res.status(400).json({success:false, message: "Your otp is expired"})
          }else{
              await SuperAdmin.clearOtpById(user.id);
     res.status(200).json({success: true, message:"account verified successfully"});
          }
          }
      }catch (error) {
    console.log(error.message);
     return res.status(500).json({success:false, message: "Internal server error"})
  }
};


const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];
const client = new JWT({
    email: "firebase-adminsdk-fbsvc@pointbox-3f28b.iam.gserviceaccount.com",
    key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDFcp7b98S2Ovoo\nAIMyGuhzC6HwG5/q0pDHjmhbF4FWy0s9MykbO+qjlxwp0eFzvcNv0iNzfsFJzLrX\nj8unJ3QcSQrcqDHleiU9vsKSp8vVpNWLQwbJdO6DYU2s0csiYmbUNAe2ul7NjHvK\nJNiRBQ8CmVJjh0OEF+J4Xj5YEI61q/XnxckPGH1Zw/hqMGDvoAOrc2RbmSDJjnEC\nqdxeb9HN6Tr67/DevlimUzFAP9RU7CywPIrNu41cfdw/6T/oysQNaYvo1T6OZFr5\npSND6F10TfS7MtUwjQdUT5rZeddKYcIev2Qxcs/bvNzWwRzMA/xElUaxYBpDoW9d\nDA3qILedAgMBAAECggEADdybLIQ7ijOfxlkq3MSo1xLU/p9h3cGEqo3j46lFyksh\ncB18YE4Xjf6Y2pLCijajVuFg3cXjWgQGhgWxXX3Wl/nEynMAdcTagng2/sbK96fH\n2iwNeO09pXmaU2yzHynbYEB63ig9aZ7YPfvSPHQndp4++3/OjKKEosCzDcmzyys0\nr3eGHwDKfs9d9jTwIzpFxitPe3bfibsVQ9wh9eLd24NHADkuFJZsWEW6HGWlrU+h\nlENN26ULYk5Ts4OiTBb4SPdYqBHMcHEQBPVGxr6Nt1yvA08VIXm4v+1jDPcQSLh6\nbAMxz+E2PaTiD3ovbWEMSklL8GE3Hh5WROsSnqFAQQKBgQD5FhBSkiSnNbt3/3TL\nRYIadcSLsI9257+Y/ysPlnYbIg5PeY2CHQU4IRtUHjhSDt91dYUoNIIJ9/xKWx+e\nugVHLPNxRxP8ULwBcuLGREjIjOxG4RR3+fxGcHy6kTzn9mtRqkksPHUu2juBklVk\nlc/3B4rrnFCyeh/vOBiRP8b5sQKBgQDK7aDmIN+ACDiIHnSuFM/Kzj5OTcPkDEhO\naz3u/65HpfMmgvztoQjOsNYG96UiEwK05fumF8Fwu9JNodV9z5yuyh1SziFgYmhk\nw7lrhPlqLUyD2Bw5rwjP7qp7jdZgWFDYsndXVXgkRNKpwV/t331RHOdKPce2nE0C\nqWk/QV1rrQKBgEWZLKZlv2gZU3CMKI5Dtb6++VQu2WdYCekuI1IPsKCUO3tpc2jP\nww2T8pbmesYy8a1YUQSS52Lxr8T3ATbQs3jXzo3wVl1CEcY127eajNu8xKhpa9a6\nOwtTkwZuXp5R9Fq1QgziN7wHrmjeAo5AbgOQT/jVjJbSGOo2umabc3WBAoGAQff4\nG3fKUHvbrNyBv+nCF0Lu3FPJf8RCaUPRsXVq+Z3IKtfgU3vLOi4glclB5I7bjWVK\nZpdIalaUqmoW1jx8yhGocLfT/9pd54v9JifnUQ4C1sWVf2cYbUhAIcRdUZrERX3W\n8Aw370p0VX0oq1LBEXJc+jSVTRcIrfnW3hpovU0CgYAcI8ks7O8ZHj4XhzBMLdrD\nn1wUtAYiHwpo17ArYNBoFwsuSuLtu1tzC84VeMOUZWetx/72RqMU+s8ziheM8iFL\npwPyB9bB9jPtoNpHZjL5EDLjIrkgEuqNM49Zn5llJSqIo/aMyfVtDrIGIbJgR2B1\nXrN/IoHUcA23NTfSI1Fp2w==\n-----END PRIVATE KEY-----\n",
    scopes: SCOPES
})
exports.notifications = async (req, res) => {
  try {
    const tokens = await client.authorize();
    const token = tokens.access_token;

    const deviceTokens = req.body.deviceTokens;
    if (!Array.isArray(deviceTokens)) {
      return res.status(400).json({ error: "deviceTokens must be an array" });
    }

    const webAppBaseUrl = 'https://pointbox-main.vercel.app';
    const iconUrl = `${webAppBaseUrl}/web-app-manifest-192x192.png`;
    const imageUrl = req.body.imageUrl || iconUrl;

    const notification = {
      title: req.body.titleText,
      body: req.body.bodyText
    };

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Create an array of promises for all device tokens
    const sendPromises = deviceTokens.map(deviceToken => {
      const message = {
        message: {
          token: deviceToken,
          notification: notification,
          webpush: {
            notification: {
              title: notification.title,
              body: notification.body,
              icon: iconUrl,
              image: imageUrl
            },
            fcm_options: {
              link: req.body.clickAction || webAppBaseUrl
            }
          },
          android: {
            notification: {
              title: notification.title,
              body: notification.body,
              icon: "ic_notification",
              image: imageUrl,
              channelId: "default",
              sound: "default"
            }
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: notification.title,
                  body: notification.body
                },
                sound: "default",
                badge: 1
              }
            },
            fcm_options: {
              image: imageUrl
            }
          }
        }
      };

      // Return the axios POST promise
      return axios.post(
        'https://fcm.googleapis.com/v1/projects/pointbox-3f28b/messages:send',
        message,
        { headers }
      ).then(response => ({
        token: deviceToken,
        success: true,
        response: response.data
      })).catch(err => ({
        token: deviceToken,
        success: false,
        error: err.response?.data || err.message
      }));
    });

    // Wait for all promises to settle
    const results = await Promise.allSettled(sendPromises);

    // Format results
    const formattedResults = results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason });

    res.json({ results: formattedResults });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};

// @desc    Get SEO settings
// @route   GET /api/superadmin/seo
// @access  Private (Super Admin)
exports.getSEO = async (req, res) => {
  try {
    const seo = await SEO.getSEO();
    res.json({
      success: true,
      data: {
        metaTitle: seo.metaTitle || '',
        metaDescription: seo.metaDescription || '',
        metaKeywords: seo.metaKeywords || '',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update SEO settings
// @route   PUT /api/superadmin/seo
// @access  Private (Super Admin)
exports.updateSEO = async (req, res) => {
  try {
    const { metaTitle, metaDescription, metaKeywords } = req.body;

    // Get or create SEO document
    let seo = await SEO.findOne();
    if (!seo) {
      seo = await SEO.create({
        metaTitle: metaTitle || '',
        metaDescription: metaDescription || '',
        metaKeywords: metaKeywords || '',
      });
    } else {
      // Update only the provided fields
      const updates = {};
      if (metaTitle !== undefined) updates.metaTitle = metaTitle;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (metaKeywords !== undefined) updates.metaKeywords = metaKeywords;

      seo = await SEO.updateById(seo.id, updates);
    }

    res.json({
      success: true,
      data: {
        metaTitle: seo.metaTitle || '',
        metaDescription: seo.metaDescription || '',
        metaKeywords: seo.metaKeywords || '',
      },
      message: 'SEO settings updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Create AI API Key
// @route   POST /api/superadmin/ai-api-keys
// @access  Private (Super Admin)
exports.createAiApiKey = async (req, res) => {
  try {
    const { provider, label, apiKey, isActive } = req.body;

    if (!provider || !label || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Provider, label and apiKey are required',
      });
    }

    const created = await AiApiKey.create({
      provider,
      label,
      apiKey: encrypt(apiKey),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: created.id,
        provider: created.provider,
        label: created.label,
        apiKeyPreview: maskSecret(apiKey),
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all AI API Keys (keys are masked)
// @route   GET /api/superadmin/ai-api-keys
// @access  Private (Super Admin)
exports.getAiApiKeys = async (req, res) => {
  try {
    const keys = await AiApiKey.findAll({ includeApiKey: true });

    const data = keys.map((key) => {
      let apiKeyPreview = '****';
      try {
        apiKeyPreview = maskSecret(decrypt(key.apiKey));
      } catch (e) {
        apiKeyPreview = '****';
      }
      return {
        _id: key.id,
        provider: key.provider,
        label: key.label,
        apiKeyPreview,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single AI API Key (optionally reveal full decrypted key)
// @route   GET /api/superadmin/ai-api-keys/:id?reveal=true
// @access  Private (Super Admin)
exports.getAiApiKeyById = async (req, res) => {
  try {
    const key = await AiApiKey.findById(req.params.id, { includeApiKey: true });

    if (!key) {
      return res.status(404).json({ success: false, message: 'AI API key not found' });
    }

    const decrypted = decrypt(key.apiKey);
    const reveal = req.query.reveal === 'true';

    res.json({
      success: true,
      data: {
        _id: key.id,
        provider: key.provider,
        label: key.label,
        apiKey: reveal ? decrypted : undefined,
        apiKeyPreview: maskSecret(decrypted),
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update AI API Key
// @route   PUT /api/superadmin/ai-api-keys/:id
// @access  Private (Super Admin)
exports.updateAiApiKey = async (req, res) => {
  try {
    const { provider, label, apiKey, isActive } = req.body;

    const existing = await AiApiKey.findById(req.params.id, { includeApiKey: true });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'AI API key not found' });
    }

    const updates = {};
    if (provider !== undefined) updates.provider = provider;
    if (label !== undefined) updates.label = label;
    if (isActive !== undefined) updates.isActive = isActive;
    if (apiKey) updates.apiKey = encrypt(apiKey);

    const key = await AiApiKey.updateById(req.params.id, updates);

    res.json({
      success: true,
      data: {
        _id: key.id,
        provider: key.provider,
        label: key.label,
        apiKeyPreview: maskSecret(apiKey || decrypt(existing.apiKey)),
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle AI API Key active status
// @route   PUT /api/superadmin/ai-api-keys/:id/status
// @access  Private (Super Admin)
exports.toggleAiApiKeyStatus = async (req, res) => {
  try {
    const existing = await AiApiKey.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'AI API key not found' });
    }

    const key = await AiApiKey.updateById(req.params.id, { isActive: !existing.isActive });

    res.json({ success: true, data: { _id: key.id, isActive: key.isActive } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete AI API Key
// @route   DELETE /api/superadmin/ai-api-keys/:id
// @access  Private (Super Admin)
exports.deleteAiApiKey = async (req, res) => {
  try {
    const deleted = await AiApiKey.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'AI API key not found' });
    }

    res.json({ success: true, message: 'AI API key deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
