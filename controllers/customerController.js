const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Banner = require('../models/Banner');
const Query = require('../models/Query');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const NewsLetters = require('../models/NewsLetters');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const FAQ = require('../models/FAQ');
const Notification = require('../models/Notification');
const NewsLetterEmails = require('../models/NewsLetterEmails');


// @desc    Register Customer
// @route   POST /api/customer/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, email, password, phone, address, country } = req.body;

    const customer = await Customer.findOne({email})
   if(customer){
    return  res.status(400).json({ success: false, message: "Customer with this email already exist." });
   }else{
    const hashedPassword = await bcrypt.hash(password,10)
    const customer = await Customer.create({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      country,
      isGoogleSignup: false,
    });

    const token = generateToken(customer._id, 'customer');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
      },
    });
  }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Login Customer
// @route   POST /api/customer/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const customer = await Customer.findOne({ email }).select('+password');

    if (!customer) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (customer.isGoogleSignup && !password) {
      return res.status(401).json({ success: false, message: 'Please use Google sign in' });
    }

    // if (!customer.isGoogleSignup && !(await customer.comparePassword(password))) {
    //   return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // }

    const isMatch = await bcrypt.compare(password, customer.password)
    console.log(isMatch)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }


    if (!customer.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(customer._id, 'customer');

    // Convert to plain object and remove sensitive fields
    const customerData = customer.toObject();
    delete customerData.password;

    res.json({
      success: true,
      token,
      user: customerData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Customer Profile
// @route   GET /api/customer/profile
// @access  Private (Customer)
exports.getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id)
      .populate('linkedCompanies.company', 'companyName email redeem_points');

    // Convert customer to plain object and add linkedBrands array for frontend compatibility
    const customerData = customer.toObject();
    customerData.linkedBrands = customer.linkedCompanies
      .filter((link) => link.company) // Filter out any null/undefined companies
      .map((link) => {
        // Handle both populated and non-populated cases
        if (link.company && typeof link.company === 'object' && link.company._id) {
          return link.company._id.toString();
        }
        return link.company.toString();
      });

    res.json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Customer Profile
// @route   PUT /api/customer/profile
// @access  Private (Customer)
exports.updateProfile = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Redeem Points
// @route   POST /api/customer/redeem
// @access  Private (Customer)
exports.redeemPoints = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const customer = await Customer.findById(req.user._id);

    if (customer.totalPoints < product.points) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    // Check if customer is linked to the product's company
    const isLinked = customer.linkedCompanies.some(
      (link) => link.company.toString() === product.company.toString()
    );

    if (!isLinked) {
      return res.status(403).json({ success: false, message: 'Product not available for your account' });
    }

    // Create transaction
    const transaction = await Transaction.create({
      transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
      customer: customer._id,
      customerName: customer.username,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      company: product.company,
      companyName: product.companyName,
      type: 'redeem',
      points: product.points,
      notes: `Redeemed: ${product.name}`,
    });

    // Update customer points
    customer.totalPoints -= product.points;
    customer.redeemedPoints += product.points;
    await customer.save();

    res.status(201).json({
      success: true,
      data: {
        transaction,
        product,
        remainingPoints: customer.totalPoints,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Transaction History
// @route   GET /api/customer/transactions
// @access  Private (Customer)
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ customer: req.user._id })
      .populate('company', 'companyName companyLogo')
      .sort({ createdAt: -1 });
    console.log(transactions);

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Conversion Rate (KWD to USD)
// @route   GET /api/customer/conversion-rate
// @access  Public
exports.getConversionRate = async (req, res) => {
  try {
    // You can integrate with a currency API here
    // For now, returning a static rate
    const conversionRate = {
      from: 'KWD',
      to: 'USD',
      rate: 3.25, // Example rate, replace with actual API call
      lastUpdated: new Date(),
    };

    res.json({ success: true, data: conversionRate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Contact Support
// @route   POST /api/customer/support
// @access  Private (Customer)
exports.contactSupport = async (req, res) => {
  try {
    const { subject, message, brandId } = req.body;

    const query = await Query.create({
      customer: req.user._id,
      customerEmail: req.user.email,
      customerName: req.user.username,
      subject,
      message,
      brandId,
    });

    // Send email to admin
    // await sendEmail(
    //   process.env.EMAIL_USER,
    //   `Customer Query: ${subject}`,
    //   `From: ${req.user.email}\n\n${message}`,
    //   `<p><strong>From:</strong> ${req.user.email}</p><p>${message}</p>`
    // );

    res.status(201).json({
      success: true,
      data: query,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Submit Contact Form (Public)
// @route   POST /api/customer/contact
// @access  Public
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required',
      });
    }

    // Create contact submission
    const contact = await Contact.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      subject: subject.trim(),
      message: message.trim(),
      status: 'new',
    });

    // Optionally send email notification to admin
    // await sendEmail(
    //   process.env.EMAIL_USER,
    //   `New Contact Form Submission: ${subject}`,
    //   `From: ${name} (${email})${phone ? `\nPhone: ${phone}` : ''}\n\nSubject: ${subject}\n\nMessage:\n${message}`,
    //   `<p><strong>From:</strong> ${name} (${email})${phone ? `<br><strong>Phone:</strong> ${phone}` : ''}</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>`
    // );

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    
    // Handle validation errors from mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send message. Please try again.',
    });
  }
};

// @desc    Get Promotional Banners
// @route   GET /api/customer/banners
// @access  Public
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Brands List
// @route   GET /api/customer/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true })
      .select('companyName email address country companyLogo');

    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Link/Unlink Brand
// @route   POST /api/customer/link-brand
// @access  Private (Customer)
exports.linkBrand = async (req, res) => {
  try {
    const { brandId } = req.body;

    if (!brandId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brand ID is required' 
      });
    }

    // Check if company/brand exists and is active
    const company = await Company.findById(brandId);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Brand not found' 
      });
    }

    if (!company.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brand is not active' 
      });
    }

    // Get customer
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    // Check if already linked
    const isLinked = customer.linkedCompanies.some(
      (link) => link.company.toString() === brandId.toString()
    );

    if (isLinked) {
      // Remove link
      customer.linkedCompanies = customer.linkedCompanies.filter(
        (link) => link.company.toString() !== brandId.toString()
      );
    } else {
      // Add link
      customer.linkedCompanies.push({
        company: brandId,
        companyName: company.companyName,
        linkedAt: new Date(),
      });
    }

    await customer.save();

    // Get updated customer with populated data
    const updatedCustomer = await Customer.findById(req.user._id)
      .populate('linkedCompanies.company', 'companyName email address country');

    // Return linkedBrands as array of IDs for frontend compatibility
    const linkedBrands = updatedCustomer.linkedCompanies
      .filter((link) => link.company) // Filter out any null/undefined companies
      .map((link) => {
        // Handle both populated and non-populated cases
        if (link.company && typeof link.company === 'object' && link.company._id) {
          return link.company._id.toString();
        }
        return link.company.toString();
      });

    res.json({
      success: true,
      message: isLinked ? 'Brand unlinked successfully' : 'Brand linked successfully',
      data: {
        linkedBrands,
        customer: updatedCustomer,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Linked Brands
// @route   GET /api/customer/linked-brands
// @access  Private (Customer)
exports.getLinkedBrands = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id)
      .populate('linkedCompanies.company', 'companyName email address country');

    res.json({
      success: true,
      data: customer.linkedCompanies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Available Products
// @route   GET /api/customer/products
// @access  Private (Customer)
exports.getProducts = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    const linkedCompanyIds = customer.linkedCompanies.map((link) => link.company);

    const products = await Product.find({
      company: { $in: linkedCompanyIds },
      isActive: true,
    }).populate('company', 'companyName');

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Account
// @route   DELETE /api/customer/account
// @access  Private (Customer)
exports.deleteAccount = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);

    // Deactivate instead of delete
    customer.isActive = false;
    await customer.save();

    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register/Update FCM Token
// @route   POST /api/customer/fcm-token
// @access  Private (Customer)
exports.registerFCMToken = async (req, res) => {
  try {
    const { token, deviceType = 'mobile' } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }

    if (!['mobile', 'web'].includes(deviceType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Device type must be "mobile" or "web"' 
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!customer.fcmTokens) {
      customer.fcmTokens = [];
    }

    // Check if token already exists
    const existingTokenIndex = customer.fcmTokens.findIndex(
      (fcmTokenObj) => fcmTokenObj.token === token
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      customer.fcmTokens[existingTokenIndex].deviceType = deviceType;
      customer.fcmTokens[existingTokenIndex].updatedAt = new Date();
    } else {
      // Add new token
      customer.fcmTokens.push({
        token,
        deviceType,
        updatedAt: new Date(),
      });
    }

    await customer.save();

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        tokenCount: customer.fcmTokens.length,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Remove FCM Token
// @route   DELETE /api/customer/fcm-token
// @access  Private (Customer)
exports.removeFCMToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }

    const customer = await Customer.findById(req.user._id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Remove token if it exists
    if (customer.fcmTokens) {
      customer.fcmTokens = customer.fcmTokens.filter(
        (fcmTokenObj) => fcmTokenObj.token !== token
      );
      await customer.save();
    }

    res.json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Customer Notifications
// @route   GET /api/customer/notifications
// @access  Private (Customer)
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get customer with linked companies
    const customer = await Customer.findById(req.user._id).select('linkedCompanies.company');
    const linkedCompanyIds = customer.linkedCompanies.map(l => l.company);

    // Build query conditions
    const queryConditions = [
      { target: 'all' },
      { target: 'customers' },
      { target: 'specific', targetIds: req.user._id },
    ];

    // Add company condition if customer has linked companies
    if (linkedCompanyIds.length > 0) {
      queryConditions.push({
        target: 'company',
        company: { $in: linkedCompanyIds },
      });
    }

    // Get notifications for this customer
    const notifications = await Notification.find({
      $or: queryConditions,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title message type createdAt');

    const total = await Notification.countDocuments({
      $or: queryConditions,
      isActive: true,
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();

    if (!settings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Settings not found' 
      });
    }

    res.json({ 
      success: true, 
      data: settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompanyProducts = async (req, res) => {
  try {
    console.log("product is calling from the company panel")
    const products = await Product.find({ company: req.body.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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
exports.getBrandsBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

