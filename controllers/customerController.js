const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Banner = require('../models/Banner');
const WhatsNew = require('../models/WhatsNew');
const Query = require('../models/Query');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const Tier = require('../models/Tier');
const NewsLetters = require('../models/NewsLetters');
const { generateToken } = require('../middleware/auth');
const { sendEmail } = require('../config/email');
const FAQ = require('../models/FAQ');
const Notification = require('../models/Notification');
const NewsLetterEmails = require('../models/NewsLetterEmails');
const moment = require("moment");
const Terms = require('../models/Terms');
const SEO = require('../models/SEO');

function generateOTP() {
  const otp = Math.floor(1000 + Math.random() * 9000);
  return otp.toString();
}
//check otp expiration
function isOTPExpired(createdAt){
    const expirationTime = moment(createdAt).add(10,"minutes")
    return moment()>expirationTime;
}
exports.signup = async (req, res) => {
  try {
    const { username, email, password, phone, address, country } = req.body;

    // Check if customer with this email already exists
    const existingCustomerByEmail = await Customer.findByEmail(email);
    if (existingCustomerByEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer with this email already exists."
      });
    }

    // Check if customer with this phone number already exists
    if (phone) {
      const existingCustomerByPhone = await Customer.findByPhone(phone);
      if (existingCustomerByPhone) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone number already exists."
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      country,
      isGoogleSignup: false,
    });

    const otp = generateOTP();
    const response = await sendEmail(
      req.body.email,
      "Otp verification",
      `Your otp code is ${otp} and do remember otp will expire after 10 minutes.`
    );
    if (response) {
      await Customer.setOtpByEmail(email, otp);
      res.status(201).json({ success: true, message: "Please check your email." });
    }
  } catch (error) {
    // Handle MySQL duplicate key error (customers.email is the only unique column)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: `Customer with this email already exists.`
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Login Customer
// @route   POST /api/customer/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password,deviceToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const customer = await Customer.findByEmail(email, { includePassword: true });
    if (!customer) {
      return res.status(401).json({ success: false, message: `You don't have an account.Sign up please` });
    }

    if (customer.isGoogleSignup && !password) {
      return res.status(401).json({ success: false, message: 'Please use Google sign in' });
    }

    const isMatch = await bcrypt.compare(password, customer.password)
    console.log(isMatch)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }


    if (!customer.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Check if email is verified
    if (!customer.emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in. Check your email for the verification code.'
      });
    }

    // Save device token if provided
    if (deviceToken) {
      await Customer.updateById(customer.id, { deviceToken });
    }

    const token = generateToken(customer.id, 'customer');

    // Re-fetch without the password field
    const customerData = await Customer.findById(customer.id);

    res.json({
      success: true,
      token,
      user: customerData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Find the tier a customer currently sits in for a company, based on tier_points
function findCurrentTier(companyTiers, tierPoints) {
  if (!companyTiers || companyTiers.length === 0) return null;

  const points = tierPoints || 0;
  const inRange = companyTiers.find(
    (t) => points >= t.minPoints && (t.maxPoints == null || points <= t.maxPoints)
  );
  if (inRange) return inRange;

  // Above the highest tier's range (no upper limit reached) -> top tier
  // Below the lowest tier's range -> lowest tier
  const highest = companyTiers[companyTiers.length - 1];
  return points >= highest.minPoints ? highest : companyTiers[0];
}

// @desc    Get Customer Profile
// @route   GET /api/customer/profile
// @access  Private (Customer)
exports.getProfile = async (req, res) => {
  try {
    console.log("Profile:",req.user.id);
    const customer = await Customer.findById(req.user.id);
    const linkedCompanies = await Customer.getLinkedCompaniesWithDetails(req.user.id);

    const linkedWithCompany = linkedCompanies.filter((link) => link.company);
    const companyIds = linkedWithCompany.map((link) => link.company);

    // Fetch active tiers for all linked companies in one query
    const tiers = companyIds.length > 0
      ? await Tier.findByCompanies(companyIds, { isActive: true })
      : [];

    const tiersByCompany = {};
    tiers.forEach((tier) => {
      const key = String(tier.createdBy);
      if (!tiersByCompany[key]) tiersByCompany[key] = [];
      tiersByCompany[key].push(tier);
    });

    const customerData = { ...customer };

    customerData.linkedCompanies = linkedWithCompany.map((link) => {
      const companyTiers = tiersByCompany[String(link.company)] || [];
      const currentTier = findCurrentTier(companyTiers, link.tier_points);

      return {
        ...link,
        tier: currentTier
          ? {
              id: currentTier.id,
              name: currentTier.name,
              color: currentTier.color,
              minPoints: currentTier.minPoints,
              maxPoints: currentTier.maxPoints ?? null,
              expiryMonths: currentTier.expiryMonths ?? null,
              expiryDate: currentTier.expiryMonths
                ? moment(link.linkedAt).add(currentTier.expiryMonths, 'months').toDate()
                : null,
            }
          : null,
      };
    });

    customerData.linkedBrands = linkedWithCompany.map((link) => String(link.company));

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
    const { username, email, phone, address, country, password } = req.body;
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (country !== undefined) updates.country = country;
    if (password) updates.password = await bcrypt.hash(password, 10);

    const customer = await Customer.updateById(req.user.id, updates);

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

    const customer = await Customer.findById(req.user.id);

    if (customer.totalPoints < product.redeem_points) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    // Check if customer is linked to the product's company
    const isLinked = await Customer.isLinkedToCompany(customer.id, product.company);

    if (!isLinked) {
      return res.status(403).json({ success: false, message: 'Product not available for your account' });
    }

    // Create transaction
    const transaction = await Transaction.create({
      transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
      customer: customer.id,
      customerName: customer.username,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      company: product.company,
      companyName: product.companyName,
      type: 'redeem',
      redeem_points: product.redeem_points,
      notes: `Redeemed: ${product.name}`,
    });

    // Update customer points
    const remainingPoints = customer.totalPoints - product.redeem_points;
    await Customer.updateById(customer.id, { totalPoints: remainingPoints });

    res.status(201).json({
      success: true,
      data: {
        transaction,
        product,
        remainingPoints,
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
    const transactions = await Transaction.findAll({ customerId: req.user.id });
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
      customer: req.user.id,
      customerEmail: req.user.email,
      customerName: req.user.username,
      subject,
      message,
      brandId,
    });

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

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error('Contact form error:', error);

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
    const banners = await Banner.findAll({ isActive: true });

    // Filter out special_events banners where endDate has passed
    const currentDate = new Date();
    const filteredBanners = banners.filter(banner => {
      // If it's a special_event banner, check if endDate has passed
      if (banner.type === 'special_event' && banner.endDate) {
        const endDate = new Date(banner.endDate);
        // If endDate is in the past, exclude this banner
        if (endDate < currentDate) {
          return false;
        }
      }
      // Include all regular banners and special_event banners that haven't expired
      return true;
    });

    res.json({ success: true, data: filteredBanners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get What's New items
// @route   GET /api/customer/whats-new
// @access  Public
exports.getWhatsNews = async (req, res) => {
  try {
    const whatsNews = await WhatsNew.findAll({ isActive: true });
    res.json({ success: true, data: whatsNews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the 3 banners with the highest points
// @route   GET /api/customer/top-banners
// @access  Public
exports.getTopBanners = async (req, res) => {
  try {
    const topBanners = await Banner.findTopByPoints(3);
    res.json({ success: true, data: topBanners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the 3 most recently registered companies
// @route   GET /api/customer/recent-companies
// @access  Public
exports.getRecentCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({ isActive: true });
    const recentCompanies = companies.slice(0, 3).map((c) => ({
      id: c.id,
      companyName: c.companyName,
      companyLogo: c.companyLogo,
      country: c.country,
      createdAt: c.createdAt,
    }));
    res.json({ success: true, data: recentCompanies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Brands List
// @route   GET /api/customer/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    const companies = await Company.findAll({ isActive: true });
    const data = companies.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      email: c.email,
      address: c.address,
      country: c.country,
      companyLogo: c.companyLogo,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Link Brand
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
    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if already linked
    const isLinked = await Customer.isLinkedToCompany(customer.id, brandId);

    if (isLinked) {
      return res.status(400).json({
        success: false,
        message: 'Brand is already linked'
      });
    }

    // Add link
    await Customer.linkCompany(customer.id, brandId, company.companyName);

    // Get updated linked companies with populated company details
    const linkedCompanies = await Customer.getLinkedCompaniesWithDetails(req.user.id);

    const linkedBrands = linkedCompanies
      .filter((link) => link.company)
      .map((link) => String(link.company));

    res.json({
      success: true,
      message: 'Brand linked successfully',
      data: {
        linkedBrands,
        customer: { ...customer, linkedCompanies },
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
    const linkedCompanies = await Customer.getLinkedCompaniesWithDetails(req.user.id);

    res.json({
      success: true,
      data: linkedCompanies,
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
    const linkedCompanies = await Customer.getLinkedCompanies(req.user.id);
    const linkedCompanyIds = linkedCompanies.map((link) => link.company);

    const products = linkedCompanyIds.length > 0
      ? await Product.findAll({ companyIds: linkedCompanyIds, isActive: true })
      : [];

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
    await Customer.updateById(req.user.id, { isActive: false });

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

    const customer = await Customer.findById(req.user.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Customers only keep a single device token column (not a multi-device table like employees)
    await Customer.updateById(req.user.id, { deviceToken: token });

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        tokenCount: 1,
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

    const customer = await Customer.findById(req.user.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.deviceToken === token) {
      await Customer.updateById(req.user.id, { deviceToken: null });
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

    // Get customer's linked companies
    const linkedCompanies = await Customer.getLinkedCompanies(req.user.id);
    const linkedCompanyIds = linkedCompanies.map((link) => link.company);

    // Get notifications for this customer
    const notifications = await Notification.findForCustomer(req.user.id, linkedCompanyIds, {
      limit: parseInt(limit),
      offset: skip,
    });

    const total = await Notification.countForCustomer(req.user.id, linkedCompanyIds);

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
      isActive: true,
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

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompanyProducts = async (req, res) => {
  try {
    console.log("product is calling from the company panel")
    const products = await Product.findAll({ company: req.body.id });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.findAll();
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getNewsletters = async (req, res) => {
  try {
    const newsletters = await NewsLetters.findAll();
    res.json({ success: true, data: newsletters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getBrandsBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll();
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkEmail = async(req,res)=>{
  try {
    const data = await Customer.findByEmail(req.body.email);
    if(!data){
       return res.status(401).json({message: "Email with this account does not exist."})
    }
    const otp = generateOTP();
    const response =  await sendEmail(
       req.body.email,
       "Otp verification",
      `Your otp code is ${otp} and do remember otp will expire after 10 minutes.`
    );
         if(response){
          await Customer.setOtpByEmail(req.body.email, otp);
          res.status(200).json({success: true, message: "OTP sent successfully. Please check your email."})
         }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
exports.verifyOtp = async(req,res)=>{
  try {
      const user = await Customer.findByOtp(req.body.otp);
      if(!user){
        return res.status(400).json({success:false, message: "Code not found"})
      }else{

         const isExpired = isOTPExpired(user.updatedAt);
          if(isExpired){
               return res.status(400).json({success:false, message: "Your otp is expired"})
          }else{
              const Data = await Customer.updateById(user.id, { otp: 0, emailVerified: true });
     res.status(200).json({success: true, message:"account verified successfully", email: Data.email});
          }
          }
      }catch (error) {
    console.log(error.message);
     return res.status(500).json({success:false, message: "Internal server error"})
  }
};

exports.verifyPassOtp = async(req,res)=>{
  try {
      const user = await Customer.findByOtp(req.body.otp);
      if(!user){
        return res.status(400).json({success:false, message: "Code not found"})
      }else{

         const isExpired = isOTPExpired(user.updatedAt);
          if(isExpired){
               return res.status(400).json({success:false, message: "Your otp is expired"})
          }else{
              const Data = await Customer.updateById(user.id, { otp: 0 });
     res.status(200).json({success: true, message:"account verified successfully", email: Data.email});
          }
          }
      }catch (error) {
    console.log(error.message);
     return res.status(500).json({success:false, message: "Internal server error"})
  }
};

exports.changePasswordWithOTP = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Validate required fields
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find the admin by email
    const customer = await Customer.findByEmail(email.toLowerCase().trim(), { includePassword: true });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify that OTP was verified (OTP should be 0 after verification)
    if (customer.otp !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and reset OTP
    await Customer.updateById(customer.id, { password: hashedPassword, otp: 0 });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getTerms = async (req, res) => {
  try {
    const terms = await Terms.findAll();
    res.json({ success: true, data: terms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
