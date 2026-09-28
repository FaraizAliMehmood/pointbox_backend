require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const languageMiddleware = require('./middleware/language');
const admin = require('firebase-admin');
// Import routes
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const customerRoutes = require('./routes/customerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Connect to database
connectDB();

const app = express();

app.set('trust proxy', 1);

// ------------------------------------
// BODY SIZE LIMIT (FIXES 413)
// ------------------------------------
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));


try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      ),
    });
  } else {
    console.log("⚠️ Firebase Admin not initialized, skipping FCM.");
  }
} catch (err) {
  console.log("⚠️ Firebase Admin error ignored:", err.message);
}


// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',      // Employee app (Vite dev)
      'http://localhost:5174',      // Company app (if different port)
      'http://localhost:5175',      // Super admin app (if different port)
      'http://localhost:3000',      // Next.js dev (if applicable)
      'https://pointbox.me',        // Production frontend domains
      'https://www.pointbox.me',
      'https://admin.pointbox.me',
      'https://company.pointbox.me',
      'https://employee.pointbox.me',
      'https://superadmin.pointbox.me'
    ];
    
    // Check if origin is allowed or if it's a development environment
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - restrict in production if needed
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Accept-Language',
    'Content-Language'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
// CORS middleware automatically handles OPTIONS preflight requests
app.use(cors(corsOptions));

app.use(languageMiddleware);

// Routes
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/notification', notificationRoutes);





// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PointBox API is running' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
