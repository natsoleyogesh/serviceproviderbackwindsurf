# Service Provider Management System API

A comprehensive Node.js/Express RESTful API for managing users and service providers with JWT authentication, email verification, and role-based access control.

## Features

- **User Management**
  - User registration and authentication using JWT
  - Email verification with OTP
  - Password reset functionality
  - Profile management
  - Address management

- **Service Provider Management**
  - Service provider registration with document verification
  - Service provider approval workflow
  - Service management (add/remove services)
  - Availability scheduling
  - Document management

- **Admin Dashboard**
  - User and service provider management
  - Document verification
  - Approval/Rejection of service providers
  - Dashboard statistics

- **Security**
  - Role-based access control (User, Service Provider, Admin)
  - Secure password hashing with bcrypt
  - JWT authentication
  - Rate limiting
  - Data sanitization
  - XSS protection
  - Parameter pollution protection

- **Developer Experience**
  - Comprehensive API documentation
  - Error handling middleware
  - Request validation
  - Logging
  - Environment-based configuration

## Prerequisites

- Node.js (v14 or later)
- npm (comes with Node.js)
- MongoDB (local or MongoDB Atlas)
- SMTP server (or email service like SendGrid, Mailgun, etc.)
- Image processing library (like Sharp or ImageMagick) for image uploads

## Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd service-backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/service_provider_db
   
   # JWT
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   
   # Email Configuration (Development - Mailtrap)
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USERNAME=your_mailtrap_username
   EMAIL_PASSWORD=your_mailtrap_password
   EMAIL_FROM='Admin <admin@example.com>'
   EMAIL_FROM_NAME='Service Provider System'
   
   # Email Configuration (Production - SendGrid)
   # SENDGRID_USERNAME=apikey
   # SENDGRID_PASSWORD=your_sendgrid_api_key
   # EMAIL_FROM=noreply@yourdomain.com
   
   # File Upload
   MAX_FILE_UPLOAD=2097152 # 2MB
   FILE_UPLOAD_PATH=./public/uploads
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60 * 60 * 1000 # 1 hour
   RATE_LIMIT_MAX=100
   ```

   **Note:** For production, make sure to use environment variables or a secure secret management solution. Never commit sensitive data to version control.

4. Start the development server
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

#### User Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/forgot-password` - Forgot password
- `PATCH /api/v1/auth/reset-password/:token` - Reset password
- `GET /api/v1/auth/verify-email/:otp` - Verify email with OTP
- `POST /api/v1/auth/resend-verification` - Resend verification email

#### Service Provider Authentication
- `POST /api/v1/service-providers/register` - Register a new service provider
- `POST /api/v1/service-providers/login` - Login service provider
- `GET /api/v1/service-providers/me` - Get current service provider profile
- `POST /api/v1/service-providers/forgot-password` - Forgot password
- `PATCH /api/v1/service-providers/reset-password/:token` - Reset password
- `GET /api/v1/service-providers/verify-email/:otp` - Verify email with OTP

### User Management
- `GET /api/v1/users` - Get all users (Admin only)
- `GET /api/v1/users/:id` - Get user by ID (Admin only)
- `PATCH /api/v1/users/:id` - Update user (Admin only)
- `DELETE /api/v1/users/:id` - Delete user (Admin only)
- `PATCH /api/v1/users/:id/status` - Update user status (Admin only)

### Service Provider Management
- `GET /api/v1/service-providers` - Get all service providers (Admin only)
- `GET /api/v1/service-providers/:id` - Get service provider by ID (Admin only)
- `PATCH /api/v1/service-providers/:id/status` - Update service provider status (Admin only)
- `PATCH /api/v1/service-providers/:id/approval` - Approve/Reject service provider (Admin only)

### Admin Dashboard
- `GET /api/v1/admin/dashboard-stats` - Get dashboard statistics (Admin only)
- `GET /api/v1/admin/service-providers/:id/documents` - Get service provider documents (Admin only)
- `PATCH /api/v1/admin/service-providers/:id/documents/:docId` - Update document status (Admin only)

- `POST /api/auth/register` - Register a new admin
- `POST /api/auth/login` - Login admin
- `GET /api/auth/me` - Get current logged in admin
- `GET /api/auth/logout` - Logout admin / clear cookie

### Cities

- `GET /api/cities` - Get all cities (public)
- `GET /api/cities/:id` - Get single city (public)
- `POST /api/cities` - Create a new city (admin)
- `PUT /api/cities/:id` - Update city (admin)
- `DELETE /api/cities/:id` - Delete city (admin)

## Advanced Querying

### Filtering

Use query parameters to filter results:
- `GET /api/cities?name[regex]=new` - Cities with name containing 'new'
- `GET /api/cities?createdAt[gt]=2023-01-01` - Cities created after 2023-01-01

### Selecting Fields

Use `select` parameter to specify fields to return:
- `GET /api/cities?select=name,description`

### Sorting

Use `sort` parameter to sort results:
- `GET /api/cities?sort=name` - Sort by name (ascending)
- `GET /api/cities?sort=-createdAt` - Sort by creation date (newest first)

### Pagination

Use `page` and `limit` parameters for pagination:
- `GET /api/cities?page=2&limit=10` - Get second page with 10 items per page

## Authentication

To access protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

## License

This project is licensed under the MIT License.
