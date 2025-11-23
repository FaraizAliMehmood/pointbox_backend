const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { generateToken } = require('../middleware/auth');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');
const { generateTransactionId } = require('../utils/export');

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

    // Check if customer is linked to employee's company
    const isLinked = customer.linkedCompanies.some(
      (link) => link.company.toString() === req.user.company._id.toString()
    );

    if (!isLinked) {
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
    await customer.populate('linkedCompanies.company', 'companyName _id');
    
    // Map linked companies to include id and name
    const linkedCompaniesData = customer.linkedCompanies.map(link => {
      const companyId = link.company?._id?.toString() || link.company?.toString() || '';
      const companyName = link.companyName || link.company?.companyName || '';
      return {
        id: companyId,
        name: companyName,
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
    const { customerId, invoiceNumber, amount, date, time, notes, type = 'earn' } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Verify customer is linked to company
    const isLinked = customer.linkedCompanies.some(
      (link) => link.company.toString() === req.user.company._id.toString()
    );

    if (!isLinked) {
      return res.status(403).json({ success: false, message: 'Customer is not linked to your company' });
    }

    // Validate transaction type
    if (!['earn', 'redeem'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type. Must be "earn" or "redeem"' });
    }

    // Calculate points (you can adjust the conversion rate)
    const points = Math.floor(amount || 0);

    // For redeem, ensure customer has enough points
    if (type === 'redeem' && customer.totalPoints < points) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient points. Customer has ${customer.totalPoints} points, but trying to redeem ${points} points` 
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      transactionId: generateTransactionId(),
      customer: customer._id,
      customerName: customer.username,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      company: req.user.company._id,
      companyName: req.user.company.companyName,
      employee: req.user._id,
      employeeName: req.user.name,
      type,
      points: type === 'redeem' ? -points : points,
      amount: amount || 0,
      date,
      time,
      amount: amount || 0,
      invoiceNumber,
      invoiceImage: req.file ? (await uploadToCloudinary(req.file.buffer, 'invoices')).secure_url : undefined,
      notes,
    });

    // Update customer points based on transaction type
    if (type === 'redeem') {
      customer.totalPoints -= points;
      customer.redeemedPoints = (customer.redeemedPoints || 0) + points;
    } else {
      customer.totalPoints += points;
    }
    await customer.save();

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Redeem History
// @route   GET /api/employee/redeem-history
// @access  Private (Employee)
exports.getRedeemHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      employee: req.user._id,
      company: req.user.company._id,
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

