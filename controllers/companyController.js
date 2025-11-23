const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Query = require('../models/Query');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const { exportToCSV, exportToXLSX, exportToPDF } = require('../utils/export');
const { sendEmail } = require('../config/email');

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
      points: req.body.points,
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
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ company: req.user._id });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ company: req.body.id });
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
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, phone, dutyAddress, password } = req.body;
    const emp = await Employee.findOne({email});
    if(emp){
      return res.status(400).json({ success: false, message: error.message });
    }else{
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
      });
  
      res.status(201).json({
        success: true,
        data: employee,
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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

