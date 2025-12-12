const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Query = require('../models/Query');
const Banner = require("../models/Banner");
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { exportToCSV, exportToXLSX, exportToPDF } = require('../utils/export');
const { sendEmail } = require('../config/email');
const moment = require("moment");
const {JWT} = require("google-auth-library");
const axios = require('axios')

// @desc    Register Company
// @route   POST /api/company/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { companyName, email, password, phone, licenseNumber, vatNumber, address, country } = req.body;
    console.log(req.body)
    // Check if company with this email already exists
    const existingCompany = await Company.findOne({ email });
    if (existingCompany) {
      return res.status(400).json({ 
        success: false, 
        message: "Account with this email already exists. Please use a different email." 
      });
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
    const company = await Company.create({
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
    });

    const token = generateToken(company._id, 'company');

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
      },
      data: company,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Login Company
// @route   POST /api/company/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
     console.log(email,password);
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const company = await Company.findOne({ email }).select('+password');

    if (!company) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, company.password)
    console.log(isMatch)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!company.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(company._id, 'company');

    res.json({
      success: true,
      token,
      user: {
        id: company._id,
        companyName: company.companyName,
        email: company.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password - Send reset email
// @route   POST /api/company/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }
    const company = await Company.findOne({ email });
    console.log(company)
    return res.status(200).json({
      success: true,
      message: company._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/company/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { id, password } = req.body;
    console.log(req.body);
    const hashedPassword = await bcrypt.hash(password,10)
    const company = await Company.findById(id);
    company.password = hashedPassword;
    await company.save();
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Company Profile
// @route   GET /api/company/profile
// @access  Private (Company)
exports.getCompanyProfile = async (req, res) => {
  try {
    const company = await Company.findById(req.user._id).select('-password');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company Profile
// @route   PUT /api/company/profile
// @access  Private (Company)
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user._id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Update logo if provided
    if (req.file) {
      // Delete old logo if exists
      if (company.publicId) {
        try {
          await deleteFromCloudinary(company.publicId);
        } catch (deleteError) {
          console.error('Error deleting old logo:', deleteError);
        }
      }

      // Upload new logo
      try {
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

    // Update other fields
    const { companyName, email, phone, licenseNumber, vatNumber, address, country } = req.body;
    if (companyName) company.companyName = companyName;
    if (email) company.email = email;
    if (phone) company.phone = phone;
    if (licenseNumber) company.licenseNumber = licenseNumber;
    if (vatNumber) company.vatNumber = vatNumber;
    if (address) company.address = address;
    if (country) company.country = country;

    await company.save();

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Change Company Password
// @route   PUT /api/company/change-password
// @access  Private (Company)
exports.changePassword = async (req, res) => {
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

    // Find the company and include password field
    const company = await Company.findById(req.user._id).select('+password');

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, company.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    company.password = hashedPassword;
    await company.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Customer
// @route   POST /api/company/customers
// @access  Private (Company)
exports.createCustomer = async (req, res) => {
  try {
    const { username, email, password, phone, address, country, googleId, isGoogleSignup } = req.body;

    // Check if customer already exists
    let customer = await Customer.findOne({ email });
    
    if (customer) {
      // Check if already linked to this company
      const isLinked = customer.linkedCompanies.some(
        (link) => link.company.toString() === req.user._id.toString()
      );
      
      if (isLinked) {
        return res.status(400).json({ 
          success: false, 
          message: 'Customer is already linked to your company' 
        });
      }
      
      // Link existing customer to company
      customer.linkedCompanies.push({
        company: req.user._id,
        linkedAt: new Date(),
      });
      await customer.save();
    } else {
      // Create new customer
      const hashedPassword = isGoogleSignup ? undefined : await bcrypt.hash(password, 10);
      customer = await Customer.create({
        username,
        email,
        password: hashedPassword,
        phone,
        address,
        country,
        googleId,
        isGoogleSignup: isGoogleSignup || false,
        linkedCompanies: [{
          company: req.user._id,
          linkedAt: new Date(),
        }],
      });
    }

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};




// @desc    Get all Customers
// @route   GET /api/company/customers
// @access  Private (Company)
exports.getCustomers = async (req, res) => {
  try {
    const { email, phone } = req.query;
    let query = {
      'linkedCompanies.company': req.user._id,
    };

    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }

    if (phone) {
      query.phone = { $regex: phone, $options: 'i' };
    }

    const customers = await Customer.find(query);
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Customer
// @route   PUT /api/company/customers/:id
// @access  Private (Company)
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if customer is linked to this company
    const isLinked = customer.linkedCompanies.some(
      (link) => link.company.toString() === req.user._id.toString()
    );

    if (!isLinked) {
      return res.status(403).json({ success: false, message: 'Customer not linked to your company' });
    }

    Object.assign(customer, req.body);
    await customer.save();

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Customer
// @route   DELETE /api/company/customers/:id
// @access  Private (Company)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Remove company link
    customer.linkedCompanies = customer.linkedCompanies.filter(
      (link) => link.company.toString() !== req.user._id.toString()
    );
    await customer.save();

    res.json({ success: true, message: 'Customer unlinked successfully' });
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
      company: req.user._id,
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

    const products = await Product.find({ company: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getProducts = async (req, res) => {
  try {
    console.log("product is calling from the company panel")
    const products = await Product.find({ company: req.body.id }).sort({ createdAt: -1 });
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
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.company.toString() !== req.user._id.toString()) {
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

    if (product.company.toString() !== req.user._id.toString()) {
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

// @desc    Get Transactions
// @route   GET /api/company/transactions
// @access  Private (Company)
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ company: req.user._id })
      .populate('customer', 'username email phone')
      .populate('employee', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Transactions
// @route   GET /api/company/transactions/export
// @access  Private (Company)
exports.exportTransactions = async (req, res) => {
  try {
    const { format } = req.query; // csv, xlsx, pdf
    const transactions = await Transaction.find({ company: req.user._id })
      .populate('customer', 'username email phone')
      .populate('employee', 'name')
      .sort({ createdAt: -1 });

    const data = transactions.map((t) => ({
      'Transaction ID': t.transactionId,
      'Customer Name': t.customerName,
      'Customer Email': t.customerEmail,
      'Customer Phone': t.customerPhone,
      'Company Name': t.companyName,
      'Employee Name': t.employeeName || 'N/A',
      'Type': t.type,
      'Points': t.points,
      'Amount': t.amount || 'N/A',
      'Invoice Number': t.invoiceNumber || 'N/A',
      'Status': t.status,
      'Date': t.createdAt.toISOString(),
    }));

    let result;
    if (format === 'csv') {
      result = exportToCSV(data, 'transactions');
      res.setHeader('Content-Type', result.contentType);
      res.send(result.content);
    } else if (format === 'xlsx') {
      result = await exportToXLSX(data, 'transactions');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else if (format === 'pdf') {
      result = await exportToPDF(data, 'transactions', 'Transaction Report');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid format. Use csv, xlsx, or pdf' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Customers
// @route   GET /api/company/customers/export
// @access  Private (Company)
exports.exportCustomers = async (req, res) => {
  try {
    const { format } = req.query;
    const customers = await Customer.find({
      'linkedCompanies.company': req.user._id,
    });

    const data = customers.map((c) => ({
      'Username': c.username,
      'Email': c.email,
      'Phone': c.phone,
      'Address': c.address || 'N/A',
      'Country': c.country || 'N/A',
      'Total Points': c.totalPoints,
      'Redeemed Points': c.redeemedPoints,
      'Joined Date': c.createdAt.toISOString(),
    }));

    let result;
    if (format === 'csv') {
      result = exportToCSV(data, 'customers');
      res.setHeader('Content-Type', result.contentType);
      res.send(result.content);
    } else if (format === 'xlsx') {
      result = await exportToXLSX(data, 'customers');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else if (format === 'pdf') {
      result = await exportToPDF(data, 'customers', 'Customer Report');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid format. Use csv, xlsx, or pdf' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Employee
// @route   POST /api/company/employees
// @access  Private (Company)
// exports.createEmployee = async (req, res) => {
//   try {

//     const { name, email, phone, dutyAddress, password, permissions } = req.body;
//     const emp = await Employee.findOne({email});
//     if(emp){
//       return res.status(400).json({ success: false, message: "Email already in use." });
//     }else{
//       const hashedPassword = await bcrypt.hash(password,10)
//       const employee = await Employee.create({
//         name,
//         email,
//         phone,
//         username: phone, // Set username to phone number as default
//         password: hashedPassword,
//         dutyAddress,
//         company: req.user._id,
//         companyName: req.user.companyName,
//         permissions: permissions || {},
//         role: "employee"
//       });
  
//       res.status(201).json({
//         success: true,
//         data: employee,
//       });
//     }
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

exports.createEmployee = async (req, res) => {
  try {
    const { name, email, phone, dutyAddress, password, permissions } = req.body;
    
    // Check if email is already in use
    const emp = await Employee.findOne({email});
    if(emp){
      return res.status(400).json({ success: false, message: "Email already in use." });
    }

    // Get the company to check employeeCount limit
    const company = await Company.findById(req.user._id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    // Count actual current employees for this company
    const actualEmployeeCount = await Employee.countDocuments({ company: req.user._id });
    
    // Only check limit if employeeCount is 2 or more
    if (company.employeeCount !== null && company.employeeCount !== undefined && company.employeeCount >= 2) {
      if (actualEmployeeCount >= company.employeeCount) {
        return res.status(400).json({ 
          success: false, 
          message: `Employee limit reached. Maximum ${company.employeeCount} employees allowed.` 
        });
      }
    }

    // Create the employee
    const hashedPassword = await bcrypt.hash(password,10)
    const employee = await Employee.create({
      name,
      email,
      phone,
      username: phone, // Set username to phone number as default
      password: hashedPassword,
      dutyAddress,
      company: req.user._id,
      companyName: req.user.companyName,
      permissions: permissions || {},
      role: "employee"
    });

    res.status(201).json({
      success: true,
      data: employee,
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
      createdBy: req.user._id,
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
// @route   GET /api/admin/banners
// @access  Private (Admin with manageBanners permission)
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({createdBy: req.user._id}).sort({ createdAt: -1 });
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
      points: req.body.points,
      type: req.body.type || 'regular',
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
      createdBy: req.user._id,
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


// @desc    Get all Employees
// @route   GET /api/company/employees
// @access  Private (Company)
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ company: req.user._id });
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Employee
// @route   PUT /api/company/employees/:id
// @access  Private (Company)
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employee.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // If username is not provided or is being set to null, default to phone
    if (req.body.username === undefined || req.body.username === null) {
      req.body.username = employee.phone;
    }

    Object.assign(employee, req.body);
    await employee.save();

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete Employee
// @route   DELETE /api/company/employees/:id
// @access  Private (Company)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employee.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await employee.deleteOne();

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Notification
// @route   POST /api/company/notifications
// @access  Private (Company)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, targetIds } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type: type || 'both',
      target: targetIds && targetIds.length > 0 ? 'specific' : 'customers',
      targetIds,
      targetModel: 'Customer',
      company: req.user._id,
      createdBy: req.user._id,
      createdByModel: 'Company',
      sentAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Queries for Company
// @route   GET /api/company/queries
// @access  Private (Company)
exports.getQueries = async (req, res) => {
  try {
    const queries = await Query.find({ brandId: req.user._id })
      .populate('customer', 'username email phone')
      .populate('responses.respondedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to Query
// @route   POST /api/company/queries/:id/respond
// @access  Private (Company)
exports.respondToQuery = async (req, res) => {
  try {
    const { response } = req.body;
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Check if query belongs to this company
    if (query.brandId.toString() !== req.user._id.toString()) {
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
    const data = await Company.findOne({email: req.body.email})
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
          const Data = await Company.findByIdAndUpdate(
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
      let user = await Company.findOne({otp: req.body.otp});
      if(!user){
        return res.status(400).json({success:false, message: "Code not found"})
      }else{
         
         const isExpired = isOTPExpired(user.updatedAt);
          if(isExpired){
               res.status(400).json({success:false, message: "Your otp is expired"})
          }else{
              const Data = await Company.findByIdAndUpdate(
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
    const company = await Company.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    // Verify that OTP was verified (OTP should be 0 after verification)
    if (company.otp !== 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify OTP first' 
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and reset OTP
    company.password = hashedPassword;
    company.otp = 0;
    await company.save();

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

    const notifications = await Notification.find({company: req.user}).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



