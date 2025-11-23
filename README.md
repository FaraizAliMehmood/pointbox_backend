# PointBox Backend API

A comprehensive backend API for the PointBox loyalty and rewards system.

## Features

- **Super Admin**: Manage admins, companies, employees, customers, transactions, queries, notifications, and banners
- **Company**: Manage customers, products, employees, transactions, and send notifications
- **Employee**: Add redeem points, verify customers, scan QR codes, upload invoices
- **Customer**: Sign up, login, redeem points, view transactions, contact support, view banners and brands

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Cloudinary for image storage
- Nodemailer for emails
- Multer for file uploads
- XLSX and PDFKit for exports

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pointbox
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_FROM=PointBox Support <noreply@pointbox.com>
```

3. Start the server:
```bash
npm run dev
```

## API Endpoints

### Super Admin Routes (`/api/superadmin`)

#### Authentication
- `POST /signup` - Register super admin
- `POST /login` - Login super admin

#### Admin Management
- `POST /admins` - Create admin (Protected)
- `GET /admins` - Get all admins (Protected)
- `PUT /admins/:id` - Update admin (Protected)
- `DELETE /admins/:id` - Delete admin (Protected)

#### Employee Management
- `PUT /employees/:id/status` - Activate/deactivate employee (Protected)

#### Company Management
- `POST /companies` - Create company (Protected)
- `GET /companies` - Get all companies (Protected)
- `PUT /companies/:id` - Update company (Protected)
- `DELETE /companies/:id` - Delete company (Protected)

#### Customer Queries
- `GET /queries` - Get all queries (Protected)
- `POST /queries/:id/respond` - Respond to query (Protected)

#### Customer Management
- `POST /customers` - Create/register customer (Protected)
- `GET /customers` - Get all customers (Protected)

#### Transactions
- `GET /transactions` - Get all transactions (Protected)
- `GET /transactions/:id` - Get transaction by ID (Protected)

#### Notifications
- `POST /notifications` - Create notification (Protected)
- `GET /notifications` - Get all notifications (Protected)

#### Banners
- `POST /banners` - Upload banner (Protected, requires image)
- `GET /banners` - Get all banners (Protected)
- `PUT /banners/:id` - Update banner (Protected, optional image)
- `DELETE /banners/:id` - Delete banner (Protected)

### Company Routes (`/api/company`)

#### Authentication
- `POST /signup` - Register company
- `POST /login` - Login company

#### Customer Management
- `POST /customers` - Create customer (Protected)
- `GET /customers` - Get all customers (Protected, supports email/phone filter)
- `PUT /customers/:id` - Update customer (Protected)
- `DELETE /customers/:id` - Delete/unlink customer (Protected)
- `GET /customers/export?format=csv|xlsx|pdf` - Export customers (Protected)

#### Product Management
- `POST /products` - Upload product (Protected, requires image)
- `GET /products` - Get all products (Protected)
- `PUT /products/:id` - Update product (Protected, optional image)
- `DELETE /products/:id` - Delete product (Protected)

#### Transactions
- `GET /transactions` - Get all transactions (Protected)
- `GET /transactions/export?format=csv|xlsx|pdf` - Export transactions (Protected)

#### Employee Management
- `POST /employees` - Create employee (Protected)
- `GET /employees` - Get all employees (Protected)

#### Notifications
- `POST /notifications` - Create notification (Protected)

### Employee Routes (`/api/employee`)

#### Authentication
- `POST /login` - Login employee

#### Customer Verification
- `POST /verify-customer` - Verify customer by phone or QR (Protected)

#### Points Management
- `POST /add-points` - Add redeem points (Protected, optional invoice upload)
- `GET /redeem-history` - Get redeem history (Protected)

### Customer Routes (`/api/customer`)

#### Authentication
- `POST /signup` - Register customer
- `POST /login` - Login customer

#### Profile
- `GET /profile` - Get profile (Protected)
- `PUT /profile` - Update profile (Protected)

#### Points & Redemption
- `POST /redeem` - Redeem points for product (Protected)
- `GET /transactions` - Get transaction history (Protected)

#### Support & Information
- `POST /support` - Contact support (Protected)
- `GET /conversion-rate` - Get KWD to USD conversion rate (Public)
- `GET /banners` - Get promotional banners (Public)
- `GET /brands` - Get all brands/companies (Public)
- `GET /linked-brands` - Get linked brands (Protected)
- `GET /products` - Get available products (Protected)

#### Account Management
- `DELETE /account` - Delete/deactivate account (Protected)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## File Uploads

- Images should be uploaded as multipart/form-data
- Supported formats: JPEG, JPG, PNG, GIF
- Maximum file size: 5MB (10MB for invoices)
- Images are automatically uploaded to Cloudinary

## Export Formats

Transactions and customers can be exported in:
- CSV
- XLSX
- PDF

## Multi-Language Support

The API supports multi-language through the `Accept-Language` header or `lang` query parameter. Supported languages: `en`, `ar`.

## Error Handling

All errors are returned in the following format:
```json
{
  "success": false,
  "message": "Error message"
}
```

## Success Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": { ... }
}
```

## Database Models

- **SuperAdmin**: Super admin accounts
- **Admin**: Admin accounts with permissions
- **Company**: Company accounts
- **Employee**: Employee accounts
- **Customer**: Customer accounts
- **Product**: Products for redemption
- **Transaction**: All transactions (earn/redeem)
- **Banner**: Promotional banners
- **Query**: Customer support queries
- **Notification**: System notifications

## License

ISC

