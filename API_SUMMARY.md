# PointBox Backend API - Implementation Summary

## ✅ Completed Features

### Super Admin APIs
- ✅ Signup and Login
- ✅ Create/Read/Update/Delete Admins with permissions
- ✅ Activate/Deactivate Employee accounts
- ✅ Create/Read/Update/Delete Companies (with License & VAT numbers)
- ✅ View and Respond to Customer Queries (with email notifications)
- ✅ Create/Register Customers
- ✅ View Transactions (with transaction ID search)
- ✅ Create and Send Notifications (website & mobile app)
- ✅ Upload/Delete/Edit/Fetch Banners
- ✅ Get all Employees list
- ✅ Multi-language support middleware

### Company APIs
- ✅ Signup and Login
- ✅ Create/Read/Update/Delete Customer information
- ✅ Upload/Read/Update/Delete Products (with images, points, coupon codes)
- ✅ View all Transactions and Redeems
- ✅ Export Transactions (CSV, XLSX, PDF)
- ✅ Filter Customers by email and phone number
- ✅ Create and Send Notifications to linked customers
- ✅ View and Export Customer details (CSV, XLSX, PDF)
- ✅ Transaction History with all required fields
- ✅ Create/Read/Update/Delete Employees (with default phone password)
- ✅ Multi-language support

### Employee APIs
- ✅ Login
- ✅ Add redeem points to customers (by phone or QR scan)
- ✅ Verify customer linkage with company
- ✅ Redeem insertion form (Invoice number, company ID, amount, date/time)
- ✅ Scan QR code and upload invoice picture
- ✅ View redeem history
- ✅ Multi-language support

### Customer APIs
- ✅ Login and Sign Up (with Google sign-up support)
- ✅ Profile page (Linked accounts, Redeem Points, QR codes)
- ✅ Redeem points for products
- ✅ Conversion Rate (KWD to USD)
- ✅ Transaction History
- ✅ Contact support through email
- ✅ View Promotional Banners
- ✅ View Brands list
- ✅ View Linked Brands
- ✅ View Available Products
- ✅ Logout and Delete Account
- ✅ Multi-language support

## 📁 Project Structure

```
pointbox_backend/
├── config/
│   ├── database.js          # MongoDB connection
│   ├── cloudinary.js        # Cloudinary configuration
│   └── email.js             # Email configuration
├── controllers/
│   ├── superAdminController.js
│   ├── companyController.js
│   ├── employeeController.js
│   └── customerController.js
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── upload.js            # File upload (Multer)
│   ├── errorHandler.js      # Error handling
│   └── language.js          # Multi-language support
├── models/
│   ├── SuperAdmin.js
│   ├── Admin.js
│   ├── Company.js
│   ├── Employee.js
│   ├── Customer.js
│   ├── Product.js
│   ├── Transaction.js
│   ├── Banner.js
│   ├── Query.js
│   └── Notification.js
├── routes/
│   ├── superAdminRoutes.js
│   ├── companyRoutes.js
│   ├── employeeRoutes.js
│   └── customerRoutes.js
├── utils/
│   ├── cloudinaryUpload.js  # Cloudinary upload/delete
│   └── export.js            # CSV/XLSX/PDF export
├── server.js                # Main server file
├── package.json
└── README.md
```

## 🔐 Authentication

All protected routes use JWT tokens. Include in headers:
```
Authorization: Bearer <token>
```

## 📤 File Uploads

- Product images: `multipart/form-data` with field name `image`
- Banner images: `multipart/form-data` with field name `image`
- Invoice images: `multipart/form-data` with field name `invoice`
- All images are uploaded to Cloudinary

## 📊 Export Formats

- CSV: `?format=csv`
- Excel: `?format=xlsx`
- PDF: `?format=pdf`

## 🌐 Multi-Language Support

Supported languages: English (en), Arabic (ar)

Set language via:
- Header: `Accept-Language: ar`
- Query parameter: `?lang=ar`

## 🔑 Key Features

1. **Role-Based Access Control**: Separate authentication for Super Admin, Admin, Company, Employee, and Customer
2. **File Management**: Automatic Cloudinary upload for images
3. **Email Notifications**: Customer queries sent via email
4. **Transaction Tracking**: Complete transaction history with unique IDs
5. **Export Functionality**: Multiple format support for reports
6. **QR Code Support**: Employee can verify customers via QR scan
7. **Customer Linking**: Customers can be linked to multiple companies
8. **Points System**: Earn and redeem points with transaction tracking

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Set up `.env` file (see `.env.example`)
3. Start MongoDB
4. Run server: `npm run dev`

## 📝 Notes

- Employee default password is their phone number
- Customer passwords are optional for Google sign-up
- All timestamps are automatically managed by Mongoose
- Images are stored in Cloudinary with organized folders
- Transaction IDs are auto-generated
- Customer queries trigger email notifications to admin

