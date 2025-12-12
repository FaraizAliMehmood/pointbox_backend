const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const Query = require('../models/Query');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Banner = require("../models/Banner");
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { generateTransactionId } = require('../utils/export');
const { sendEmail } = require('../config/email');
const moment = require("moment");
const {JWT} = require("google-auth-library");
const axios = require('axios')

// Helper function to safely get company ID from req.user
const getCompanyId = (user) => {
  if (!user || !user.company) {
    return null;
  }
  
  // If company is populated (object), get _id
  if (user.company._id) {
    return user.company._id;
  }
  
  // If it's an ObjectId or string, return as is
  return user.company;
};

// Helper function to get company name
const getCompanyName = (user) => {
  if (!user || !user.company) {
    return null;
  }
  
  // If company is populated (object), get companyName
  if (user.company.companyName) {
    return user.company.companyName;
  }
  
  // Fallback to user's companyName field
  return user.companyName || null;
};

// @desc    Login Employee
// @route   POST /api/employee/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const employee = await Employee.findOne({ email }).select('+password')

    const isMatch = await bcrypt.compare(password, employee.password)
    console.log(isMatch)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // if (!employee || !(await employee.comparePassword(password))) {
    //   return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // }

    if (!employee.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(employee._id, 'employee');

    res.json({
      success: true,
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        company: employee.company,
        permissions: employee.permissions || {},
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Customer by Phone or QR
// @route   POST /api/employee/verify-customer
// @access  Private (Employee)
exports.verifyCustomer = async (req, res) => {
  try {
    const { phone, qrData } = req.body;
    console.log(req.body);

    let customer;
    if (phone) {
      customer = await Customer.findOne({ phone });
    } else if (qrData) {
      // QR data could be customer ID or phone
      customer = await Customer.findOne({
        $or: [{ _id: qrData }, { phone: qrData }],
      });
    } else {
      return res.status(400).json({ success: false, message: 'Please provide phone or QR data' });
    }

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if customer is linked to employee's company and get that specific link
    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    const companyIdString = companyId.toString();
    const companyLink = customer.linkedCompanies.find(
      (link) => {
        const linkCompanyId = link.company?._id?.toString() || link.company?.toString() || '';
        return linkCompanyId === companyIdString;
      }
    );

    if (!companyLink) {
      return res.status(403).json({
        success: false,
        message: 'Customer is not linked to your company',
        customer: {
          id: customer._id,
          username: customer.username,
          email: customer.email,
          phone: customer.phone,
          isLinked: false,
        },
      });
    }
    // Populate linked companies to get company details
    await customer.populate('linkedCompanies.company', 'companyName _id redeem_points');
    console.log(customer);
    // Map linked companies to include id, name and redeem points
    const linkedCompaniesData = customer.linkedCompanies.map(link => {
      const companyId = link.company?._id?.toString() || link.company?.toString() || '';
      const companyName = link.companyName || link.company?.companyName || '';
      return {
        id: companyId,
        name: companyName,
        redeem_points: link.redeem_points || 0,
      };
    });
    
    res.json({
      success: true,
      customer: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
        phone: customer.phone,
        totalPoints: customer.totalPoints,
        // Points specific to this company from the linkedCompanies array
        companyPoints: companyLink?.redeem_points || 0,
        tierPoints: companyLink.tier_points || 0,
        isLinked: true,
        linkedCompanies: linkedCompaniesData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add Redeem Points
// @route   POST /api/employee/add-points
// @access  Private (Employee)
exports.addRedeemPoints = async (req, res) => {
  try {
    const { customerId, invoiceNumber, redeem_points, date, time, notes, type = 'earn' } = req.body;

    // Ensure points is always a number (FormData sends everything as strings)
    const points = Number(redeem_points) || 0;

    if (!customerId || !invoiceNumber || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'customerId, invoiceNumber, date and time are required',
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Points must be greater than 0',
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Verify customer is linked to company and get that specific link
    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    const companyIdString = companyId.toString();
    const companyLink = customer.linkedCompanies.find(
      (link) => {
        const linkCompanyId = link.company?._id?.toString() || link.company?.toString() || '';
        return linkCompanyId === companyIdString;
      }
    );

    if (!companyLink) {
      return res.status(403).json({ success: false, message: 'Customer is not linked to your company' });
    }

    // Validate transaction type
    if (!['earn', 'redeem'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type. Must be "earn" or "redeem"' });
    }

    // Calculate points (you can adjust the conversion rate)
    //const points = Math.floor(amount || 0);

    // For redeem, ensure customer has enough points
    if (type === 'redeem' && companyLink.redeem_points < points) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient points. Customer has ${companyLink.redeem_points} points, but trying to redeem ${points} points` 
      });
    }

    // New balance after this transaction (for information / debugging if needed)
    const newTotalPoints = type === 'redeem'
      ? customer.totalPoints - points
      : customer.totalPoints + points;

    // Create transaction
    const companyName = getCompanyName(req.user) || 'Unknown Company';
    const transaction = await Transaction.create({
      transactionId: generateTransactionId(),
      customer: customer._id,
      customerName: customer.username,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      company: companyId,
      companyName: companyName,
      employee: req.user._id,
      employeeName: req.user.name,
      type,
      // Store the actual transaction points, not the running total
      redeem_points: points,
      date,
      time,
      invoiceNumber,
      invoiceImage: req.file ? (await uploadToCloudinary(req.file.buffer, 'invoices')).secure_url : undefined,
      notes,
    });

    // Update customer points based on transaction type
    if (type === 'redeem') {
      customer.totalPoints -= points;
      companyLink.redeem_points -= points; 
      // Track redeemed points per company in linkedCompanies
      
    } else {
      customer.totalPoints += points;
      companyLink.redeem_points += points; 
      companyLink.tier_points +=points;
      console.log(companyLink.tier_points);
    }

    await customer.save();
    
    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Redeem History
// @route   GET /api/employee/redeem-history
// @access  Private (Employee)
exports.getRedeemHistory = async (req, res) => {
  try {
    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    
    const transactions = await Transaction.find({
      employee: req.user._id,
      company: companyId,
    })
      .populate('customer', 'username email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register/Update FCM Token
// @route   POST /api/employee/fcm-token
// @access  Private (Employee)
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

    const employee = await Employee.findById(req.user._id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!employee.fcmTokens) {
      employee.fcmTokens = [];
    }

    // Check if token already exists
    const existingTokenIndex = employee.fcmTokens.findIndex(
      (fcmTokenObj) => fcmTokenObj.token === token
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      employee.fcmTokens[existingTokenIndex].deviceType = deviceType;
      employee.fcmTokens[existingTokenIndex].updatedAt = new Date();
    } else {
      // Add new token
      employee.fcmTokens.push({
        token,
        deviceType,
        updatedAt: new Date(),
      });
    }

    await employee.save();

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        tokenCount: employee.fcmTokens.length,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Remove FCM Token
// @route   DELETE /api/employee/fcm-token
// @access  Private (Employee)
exports.removeFCMToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }

    const employee = await Employee.findById(req.user._id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Remove token if it exists
    if (employee.fcmTokens) {
      employee.fcmTokens = employee.fcmTokens.filter(
        (fcmTokenObj) => fcmTokenObj.token !== token
      );
      await employee.save();
    }

    res.json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update Employee Password
// @route   PUT /api/employee/update-password
// @access  Private (Employee)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both current password and new password' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const employee = await Employee.findById(req.user._id).select('+password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, employee.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    await employee.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    // Debug logging
    // console.log('Upload Banner - Request body:', req.body);
    // console.log('Upload Banner - User:', req.user ? { id: req.user._id, company: req.user.company } : 'No user');
    // console.log('Upload Banner - Company from user:', req.user?.company?._id || req.user?.company);
    // console.log('Upload Banner - CreatedBy from body:', req.body.createdBy);

    // Get company ID from authenticated employee (more secure than trusting frontend)
    const companyId = req.user?.company?._id || req.user?.company || req.body.createdBy;
    
    console.log('Upload Banner - Final companyId:', companyId);
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is missing. Please ensure you are logged in with a valid company account.' 
      });
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
      points: req.body.points,
      type: req.body.type || 'regular',
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
      createdBy: companyId,
      createdByModel: 'Company',
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
// @route   GET /api/employee/banners/:id
// @access  Private (Employee)
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({createdBy: req.params.id}).sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Banner
// @route   PUT /api/admin/banners/:id
// @access  Private (Admin with manageBanners permission)
exports.updateBanner = async (req, res) => {
  try {
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

    // Update fields - use !== undefined to allow empty strings to clear fields
    if (req.body.title !== undefined) banner.title = req.body.title;
    if (req.body.description !== undefined) banner.description = req.body.description;
    if (req.body.badge !== undefined) banner.badge = req.body.badge;
    if (req.body.points !== undefined) {
      // Convert points to number if it's a string
      banner.points = typeof req.body.points === 'string' ? parseInt(req.body.points) || 0 : req.body.points;
    }
    if (req.body.productUrl !== undefined) banner.productUrl = req.body.productUrl;
    if (req.body.startDate !== undefined) banner.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) banner.endDate = req.body.endDate;
    if (req.body.type !== undefined) banner.type = req.body.type;

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

// @desc    Upload Product
// @route   POST /api/company/products
// @access  Private (Company)
exports.uploadProduct = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a product image' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'products');
     
    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      image: result.secure_url,
      redeem_points: req.body.redeem,
      couponCode: req.body.couponCode,
      company: req.body.companyId,
      companyName: req.user.companyName,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Products
// @route   GET /api/company/products
// @access  Private (Company)
exports.getProductsFromCompany = async (req, res) => {
  try {
    const products = await Product.find({ company: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Update Product
// @route   PUT /api/company/products/:id
// @access  Private (Company)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({_id: req.params.id});
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    
    if (product.company.toString() !== companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.file) {
      // Delete old image
      if (product.image) {
        const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, 'products');
      product.image = result.secure_url;
    }

    Object.assign(product, req.body);
    await product.save();

    res.json({ success: true, data: product });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Product
// @route   DELETE /api/company/products/:id
// @access  Private (Company)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    
    if (product.company.toString() !== companyId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete image from Cloudinary
    if (product.image) {
      const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    await product.deleteOne();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.Customers = async (req, res) => {
  try {
    // Get company ID using helper function
    const companyId = getCompanyId(req.user);
    
    // If still no companyId, return error
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee is not associated with a company' 
      });
    }
    
    // Convert to string for comparison if needed
    const companyIdString = companyId.toString();
    
    // Find all customers that are linked to the employee's company
    const customers = await Customer.find({
      'linkedCompanies.company': companyId
    }).populate('linkedCompanies.company', 'companyName _id');

    // Map customers to include necessary fields
    const customersData = customers.map(customer => {
      // Find the specific linked company data for this employee's company
      const linkedCompany = customer.linkedCompanies.find(
        (link) => {
          const linkCompanyId = link.company?._id?.toString() || link.company?.toString() || '';
          return linkCompanyId === companyIdString;
        }
      );

      // Map all linked companies, including redeem_points
      const linkedCompaniesData = customer.linkedCompanies.map(link => {
        const linkCompanyId = link.company?._id?.toString() || link.company?.toString() || '';
        const linkCompanyName = link.companyName || link.company?.companyName || '';
        return {
          id: linkCompanyId,
          name: linkCompanyName,
          redeem_points: link.redeem_points || 0,
        };
      });

      return {
        _id: customer._id,
        id: customer._id,
        username: customer.username,
        name: customer.username,
        email: customer.email,
        phone: customer.phone,
        phoneNumber: customer.phone,
        address: customer.address || '',
        country: customer.country || '',
        points: customer.totalPoints || 0,
        totalPoints: customer.totalPoints || 0,
        isLinked: !!linkedCompany,
        linkedCompanies: linkedCompaniesData,
        createdAt: customer.createdAt,
        deviceToken: customer.deviceToken || null,
      };
    });
    
    res.json({
      success: true,
      data: customersData,
    });
  } catch (error) {
    console.error('Error in Customers controller:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
// @route   POST /api/employee/queries/:id/respond
// @access  Private (Employee)
exports.respondToQuery = async (req, res) => {
  try {
    const { response } = req.body;
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Check if query belongs to employee's company
    const employeeCompanyId = getCompanyId(req.user);
    if (!employeeCompanyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }
    const employeeCompanyIdString = employeeCompanyId.toString();
    const queryBrandId = query.brandId ? query.brandId.toString() : null;
    
    if (queryBrandId && queryBrandId !== employeeCompanyIdString) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this query' });
    }

    query.responses.push({
      respondedBy: req.user._id,
      response,
    });

    query.status = 'resolved';
    await query.save();
    // Send email response to customer
    try {
      await sendEmail(
        query.customerEmail,
        `Re: ${query.subject}`,
        response
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
    const data = await Employee.findOne({email: req.body.email})
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
          const Data = await Employee.findByIdAndUpdate(
            {_id: data._id},
            {$set: {otp: otp}},
             {new: true});
             res.status(200).json({success: true, message: "OTP sent successfully. Please check your email."})
         }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
exports.verifyOtp = async(req,res)=>{
  try {
      let user = await Employee.findOne({otp: req.body.otp});
      if(!user){
        return res.status(400).json({success:false, message: "Code not found"})
      }else{
         
         const isExpired = isOTPExpired(user.updatedAt);
          if(isExpired){
               res.status(400).json({success:false, message: "Your otp is expired"})
          }else{
              const Data = await Employee.findByIdAndUpdate(
                  {_id: user._id},
                  {$set: {otp: 0}},
                  {new: true}).select("-password");
     res.status(200).json({success: true, message:"account verified successfully"});
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
    const employee = await Employee.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    // Verify that OTP was verified (OTP should be 0 after verification)
    if (employee.otp !== 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify OTP first' 
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and reset OTP
    employee.password = hashedPassword;
    employee.otp = 0;
    await employee.save();

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

    const webAppBaseUrl = process.env.WEB_APP_URL || process.env.FRONTEND_URL || 'https://pointbox-3f28b.web.app';
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
exports.getNotifications = async (req, res) => {
  try {
    // if (!checkPermission(req.user, 'manageNotifications')) {
    //   return res.status(403).json({ success: false, message: 'You do not have permission to manage notifications' });
    // }

    const companyId = getCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Employee is not associated with a company' });
    }

    const notifications = await Notification.find({ company: companyId }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

