# Service Provider Management System - API Documentation

This document provides detailed information about the Service Provider Management System API, including available endpoints, request/response formats, and authentication mechanisms.

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Pagination](#pagination)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Service Providers](#service-providers-endpoints)
   - [Admin](#admin-endpoints)
6. [Data Models](#data-models)
7. [Enums](#enums)

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:5000/api/v1
```

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens). Include the token in the `Authorization` header as follows:

```
Authorization: Bearer <token>
```

### Token Types

1. **User Token**: For regular users
2. **Service Provider Token**: For service providers
3. **Admin Token**: For administrators with full access

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "message": "Error message describing the issue",
  "code": 400,
  "errors": [
    {
      "field": "field_name",
      "message": "Error message for this field"
    }
  ]
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Pagination

List endpoints support pagination using query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10, max: 100)

### Paginated Response Format

```json
{
  "status": "success",
  "results": 25,
  "data": {
    "items": [
      // Array of items
    ],
    "pagination": {
      "total": 100,
      "pages": 4,
      "page": 1,
      "limit": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## API Endpoints

### Authentication Endpoints

#### User Registration

```http
POST /auth/register
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "id": "60d5f1b3d4a9d10004c8e6a1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "isEmailVerified": false,
      "status": "active"
    }
  }
}
```

#### Service Provider Registration

```http
POST /service-providers/register
```

**Request Body:**

```json
{
  "firstName": "Service",
  "lastName": "Provider",
  "email": "provider@example.com",
  "phone": "+1234567891",
  "password": "password123",
  "passwordConfirm": "password123",
  "businessName": "Example Services",
  "businessType": "Individual"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "serviceProvider": {
      "id": "60d5f1b3d4a9d10004c8e6a2",
      "firstName": "Service",
      "lastName": "Provider",
      "email": "provider@example.com",
      "phone": "+1234567891",
      "businessName": "Example Services",
      "businessType": "Individual",
      "approvalStatus": "pending",
      "status": "inactive"
    }
  }
}
```

#### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "id": "60d5f1b3d4a9d10004c8e6a1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "isEmailVerified": true,
      "status": "active",
      "role": "user"
    }
  }
}
```

### Users Endpoints

#### Get Current User Profile

```http
GET /users/me
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "60d5f1b3d4a9d10004c8e6a1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "isEmailVerified": true,
      "status": "active",
      "createdAt": "2025-06-30T09:54:00.000Z",
      "updatedAt": "2025-06-30T09:54:00.000Z"
    }
  }
}
```

#### Update User Profile

```http
PATCH /users/update-me
```

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "firstName": "John Updated",
  "lastName": "Doe",
  "phone": "+1987654321"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "60d5f1b3d4a9d10004c8e6a1",
      "firstName": "John Updated",
      "lastName": "Doe",
      "email": "user@example.com",
      "phone": "+1987654321",
      "isEmailVerified": true,
      "status": "active"
    }
  }
}
```

### Service Providers Endpoints

#### Get Current Service Provider Profile

```http
GET /service-providers/me
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**

```json
{
  "status": "success",
  "data": {
    "serviceProvider": {
      "id": "60d5f1b3d4a9d10004c8e6a2",
      "firstName": "Service",
      "lastName": "Provider",
      "email": "provider@example.com",
      "phone": "+1234567891",
      "businessName": "Example Services",
      "businessType": "Individual",
      "approvalStatus": "approved",
      "status": "active",
      "experience": 5,
      "skills": ["Plumbing", "Electrical"],
      "mainServices": [],
      "subServices": [],
      "subSubServices": [],
      "subSubSubServices": [],
      "documents": [],
      "addresses": [],
      "createdAt": "2025-06-30T09:54:00.000Z",
      "updatedAt": "2025-06-30T09:54:00.000Z"
    }
  }
}
```

#### Add Service to Service Provider

```http
PATCH /service-providers/add-service
```

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "serviceType": "mainServices",
  "serviceId": "60d5f1b3d4a9d10004c8e6b1"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "serviceProvider": {
      "id": "60d5f1b3d4a9d10004c8e6a2",
      "mainServices": ["60d5f1b3d4a9d10004c8e6b1"]
    }
  }
}
```

### Admin Endpoints

#### Get All Users (Admin Only)

```http
GET /admin/users?page=1&limit=10&status=active
```

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (optional)
- `role`: Filter by role (optional)
- `search`: Search by name or email (optional)

**Response:**

```json
{
  "status": "success",
  "results": 25,
  "data": {
    "users": [
      {
        "id": "60d5f1b3d4a9d10004c8e6a1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com",
        "phone": "+1234567890",
        "status": "active",
        "role": "user",
        "createdAt": "2025-06-30T09:54:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "pages": 4,
      "page": 1,
      "limit": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Approve/Reject Service Provider (Admin Only)

```http
PATCH /admin/service-providers/:id/approval
```

**Headers:**
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "status": "approved"
  // OR
  // "status": "rejected",
  // "rejectionReason": "Incomplete documentation"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "serviceProvider": {
      "id": "60d5f1b3d4a9d10004c8e6a2",
      "approvalStatus": "approved",
      "status": "active",
      "approvalDate": "2025-06-30T10:30:00.000Z",
      "approvedBy": "60d5f1b3d4a9d10004c8e6a0"
    }
  }
}
```

## Data Models

### User

```typescript
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  status: 'active' | 'inactive' | 'suspended';
  role: 'user' | 'admin';
  profilePicture?: string;
  addresses: string[]; // Array of Address IDs
  createdAt: Date;
  updatedAt: Date;
}
```

### ServiceProvider

```typescript
interface ServiceProvider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  status: 'active' | 'inactive' | 'suspended';
  role: 'service_provider';
  
  // Business Information
  businessName: string;
  businessType: 'Individual' | 'Company' | 'LLP' | 'Partnership' | 'Other';
  businessRegistrationNumber?: string;
  businessDescription?: string;
  
  // Service Information
  mainServices: string[]; // Array of MainService IDs
  subServices: string[]; // Array of SubService IDs
  subSubServices: string[]; // Array of SubSubService IDs
  subSubSubServices: string[]; // Array of SubSubSubService IDs
  
  // Professional Information
  experience: number; // in years
  skills: string[];
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  
  // Availability
  availability: {
    monday: { start: string, end: string, available: boolean }[];
    tuesday: { start: string, end: string, available: boolean }[];
    wednesday: { start: string, end: string, available: boolean }[];
    thursday: { start: string, end: string, available: boolean }[];
    friday: { start: string, end: string, available: boolean }[];
    saturday: { start: string, end: string, available: boolean }[];
    sunday: { start: string, end: string, available: boolean }[];
  };
  
  // Documents
  documents: Array<{
    type: 'id_proof' | 'address_proof' | 'certification' | 'other';
    name: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    verifiedAt?: Date;
    verifiedBy?: string; // Admin ID
  }>;
  
  // Approval
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: Date;
  approvedBy?: string; // Admin ID
  rejectionReason?: string;
  
  // Ratings and Reviews
  ratingAverage: number;
  ratingCount: number;
  
  // Addresses
  addresses: string[]; // Array of Address IDs
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Address

```typescript
interface Address {
  id: string;
  userId: string; // User or ServiceProvider ID
  userModel: 'User' | 'ServiceProvider';
  fullAddress: string;
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Enums

### User Status

```typescript
type UserStatus = 'active' | 'inactive' | 'suspended';
```

### User Role

```typescript
type UserRole = 'user' | 'service_provider' | 'admin';
```

### Business Type

```typescript
type BusinessType = 'Individual' | 'Company' | 'LLP' | 'Partnership' | 'Other';
```

### Document Type

```typescript
type DocumentType = 'id_proof' | 'address_proof' | 'certification' | 'other';
```

### Document Status

```typescript
type DocumentStatus = 'pending' | 'approved' | 'rejected';
```

### Approval Status

```typescript
type ApprovalStatus = 'pending' | 'approved' | 'rejected';
```

### Service Types

```typescript
type ServiceType = 'mainServices' | 'subServices' | 'subSubServices' | 'subSubSubServices';
```

This documentation provides a comprehensive overview of the Service Provider Management System API. For any questions or issues, please contact the development team.
