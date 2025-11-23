const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Protect routes - Super Admin
const protectSuperAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      if (decoded.role !== 'superadmin') {
        return res.status(401).json({ success: false, message: 'Not authorized as super admin' });
      }

      req.user = await SuperAdmin.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'User not found or inactive' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Protect routes - Admin
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      if (decoded.role === 'superadmin') {
        req.user = await SuperAdmin.findById(decoded.id).select('-password');
        req.userRole = 'superadmin';
      } else if (decoded.role === 'admin') {
        req.user = await Admin.findById(decoded.id).select('-password');
        req.userRole = 'admin';
        if (!req.user || !req.user.isActive) {
          return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
        }
      } else {
        return res.status(401).json({ success: false, message: 'Not authorized as admin' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Protect routes - Company
const protectCompany = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      if (decoded.role !== 'company') {
        return res.status(401).json({ success: false, message: 'Not authorized as company' });
      }

      req.user = await Company.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'Company not found or inactive' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Protect routes - Employee
const protectEmployee = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      if (decoded.role !== 'employee') {
        return res.status(401).json({ success: false, message: 'Not authorized as employee' });
      }

      req.user = await Employee.findById(decoded.id).select('-password').populate('company');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'Employee not found or inactive' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Protect routes - Customer
const protectCustomer = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      if (decoded.role !== 'customer') {
        return res.status(401).json({ success: false, message: 'Not authorized as customer' });
      }

      req.user = await Customer.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ success: false, message: 'Customer not found or inactive' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  generateToken,
  protectSuperAdmin,
  protectAdmin,
  protectCompany,
  protectEmployee,
  protectCustomer,
};

