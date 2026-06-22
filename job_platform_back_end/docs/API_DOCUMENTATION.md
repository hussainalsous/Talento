# Job Portal — API Documentation

**Version:** v1  
**Base URL:** `http://127.0.0.1:8000/api/v1`  
**Auth Method:** Laravel Sanctum — Bearer Token  
**Content-Type:** `application/json`  
**Accept:** `application/json`

---

## Table of Contents

1. [Authentication & How to Use Tokens](#1-authentication--how-to-use-tokens)
2. [Global Response Format](#2-global-response-format)
3. [HTTP Status Codes](#3-http-status-codes)
4. [Auth Endpoints](#4-auth-endpoints)
5. [Public Endpoints](#5-public-endpoints)
6. [Admin Endpoints](#6-admin-endpoints)
7. [Company Endpoints](#7-company-endpoints)
8. [Job Seeker Endpoints](#8-job-seeker-endpoints)
9. [Role & Permission Reference](#9-role--permission-reference)
10. [Enum Values Reference](#10-enum-values-reference)
11. [Example Full Flow](#11-example-full-flow)
12. [Backend Observations & Recommendations](#12-backend-observations--recommendations)

---

## 1. Authentication & How to Use Tokens

### Overview

This API uses **Laravel Sanctum** for stateless Bearer token authentication. After a successful login or registration, you receive a token. Include it in every protected request:

```
Authorization: Bearer {your_token_here}
```

### Step-by-step

1. Register or login via the Auth endpoints.
2. Copy the `token` from the response.
3. Add the header `Authorization: Bearer {token}` to all subsequent requests.
4. On logout, the token is revoked server-side.

### Example Header

```http
GET /api/v1/auth/me HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer 1|abc123xyz...
Accept: application/json
```

---

## 2. Global Response Format

All responses follow a consistent JSON envelope.

### Success Response

```json
{
  "success": true,
  "message": "Human-readable description.",
  "data": { }
}
```

### Paginated Success Response

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 120,
    "last_page": 8
  }
}
```

### Validation Error Response (422)

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### General Error Response

```json
{
  "success": false,
  "message": "Unauthorized."
}
```

---

## 3. HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK — request succeeded |
| `201` | Created — resource created successfully |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — authenticated but insufficient role/permission |
| `404` | Not Found — resource does not exist |
| `422` | Unprocessable Entity — validation failed |
| `500` | Internal Server Error |

---

## 4. Auth Endpoints

### 4.1 Register Job Seeker

**POST** `/api/v1/auth/job-seeker/register`

No authentication required.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `first_name` | string | Yes | max:100 |
| `last_name` | string | Yes | max:100 |
| `email` | string | Yes | valid email, unique, max:255 |
| `password` | string | Yes | min:8, must match `password_confirmation` |
| `password_confirmation` | string | Yes | must match `password` |
| `phone` | string | No | max:30 |
| `location` | string | No | max:200 |
| `preferred_job_type` | string | No | one of: `full_time`, `part_time`, `remote`, `contract`, `internship`, `freelance` |

#### Example Request

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "secret123",
  "password_confirmation": "secret123",
  "location": "New York, NY",
  "preferred_job_type": "remote"
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": 12,
      "email": "john@example.com",
      "phone": null,
      "role": "job_seeker",
      "is_active": true,
      "created_at": "2024-01-18T10:00:00Z"
    },
    "token": "3|abc123xyz..."
  }
}
```

#### Error Responses

**422 — Validation failed**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": ["The email has already been taken."],
    "password": ["The password confirmation does not match."]
  }
}
```

---

### 4.2 Submit Company Registration Request

**POST** `/api/v1/auth/company-registration-requests`

No authentication required. Creates a registration request that goes to an admin for review. The company account is only activated after admin approval.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `company_name` | string | Yes | max:200 |
| `registration_number` | string | Yes | unique across companies and pending requests, max:100 |
| `requester_first_name` | string | Yes | max:100 |
| `requester_last_name` | string | Yes | max:100 |
| `requester_email` | string | Yes | valid email, unique in users and pending requests, max:255 |
| `password` | string | Yes | min:8, must match `password_confirmation` |
| `password_confirmation` | string | Yes | — |
| `website` | string | No | valid URL, max:255 |
| `address` | string | No | max:500 |
| `country` | string | No | max:100 |
| `description` | string | No | max:3000 |
| `logo` | file | No | image, jpg/jpeg/png/webp, max 2MB |
| `requester_phone` | string | No | max:30 |

#### Example Request

```json
{
  "company_name": "Acme Corp",
  "registration_number": "REG-2024-001",
  "requester_first_name": "Alice",
  "requester_last_name": "Smith",
  "requester_email": "alice@acme.com",
  "password": "secret123",
  "password_confirmation": "secret123",
  "website": "https://acme.com",
  "country": "USA",
  "description": "We build great software."
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Company registration request submitted. Pending admin review.",
  "data": {
    "id": 5,
    "company_name": "Acme Corp",
    "registration_number": "REG-2024-001",
    "requester_email": "alice@acme.com",
    "status": "pending",
    "created_at": "2024-01-18T10:00:00Z"
  }
}
```

#### Notes

- The requester's user account and company are **not** created yet. They are created only when an admin calls the approve endpoint.
- The password is stored hashed and reused during the approval to create the actual user.

---

### 4.3 Login

**POST** `/api/v1/auth/login`

No authentication required. Works for all roles.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | valid email |
| `password` | string | Yes | — |

#### Example Request

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 12,
      "email": "john@example.com",
      "role": "job_seeker",
      "is_active": true,
      "last_login_at": "2024-01-18T14:22:00Z",
      "job_seeker": {
        "id": 7,
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "location": "New York, NY",
        "preferred_job_type": "remote"
      }
    },
    "token": "3|abc123xyz..."
  }
}
```

#### Error Responses

**422 — Invalid credentials**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": ["These credentials do not match our records."]
  }
}
```

**403 — Account deactivated**
```json
{
  "success": false,
  "message": "Your account has been deactivated."
}
```

---

### 4.4 Logout

**POST** `/api/v1/auth/logout`

**Auth required:** Yes (any role)

Revokes the current token.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### 4.5 Get Authenticated User

**GET** `/api/v1/auth/me`

**Auth required:** Yes (any role)

Returns the currently authenticated user with their role-specific profile.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 12,
    "email": "john@example.com",
    "phone": null,
    "role": "job_seeker",
    "is_active": true,
    "email_verified_at": null,
    "last_login_at": "2024-01-18T14:22:00Z",
    "created_at": "2024-01-18T10:00:00Z",
    "job_seeker": {
      "id": 7,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "current_job": "Frontend Developer",
      "location": "New York, NY",
      "preferred_job_type": "remote",
      "desired_salary": 120000,
      "profile_visibility": "public",
      "cv_visibility": "upon_request",
      "skills": [
        { "id": 1, "title": "JavaScript", "level": "advanced" }
      ]
    }
  }
}
```

---

### 4.6 Update Password

**PATCH** `/api/v1/auth/password`

**Auth required:** Yes (any role)

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `current_password` | string | Yes | must match the current password |
| `password` | string | Yes | min:8, must match `password_confirmation` |
| `password_confirmation` | string | Yes | — |

#### Example Request

```json
{
  "current_password": "oldpassword",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

#### Error Responses

**422 — Wrong current password**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "current_password": ["The password is incorrect."]
  }
}
```

---

## 5. Public Endpoints

No authentication required for these endpoints.

### 5.1 Health Check

**GET** `/api/v1/ping`

#### Success Response `200`

```json
{
  "success": true,
  "message": "Job Portal API v1"
}
```

---

### 5.2 List Published Job Posts

**GET** `/api/v1/job-posts`

Returns all published, non-expired job posts.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search in title and description |
| `location` | string | Filter by location |
| `employment_type` | string | Filter by type (`full_time`, `part_time`, `remote`, `contract`, `internship`, `freelance`) |
| `skill_ids` | array | Filter by required skills (e.g. `skill_ids[]=1&skill_ids[]=3`) |
| `salary_min` | number | Minimum salary filter |
| `salary_max` | number | Maximum salary filter |
| `sort` | string | Sort field: `created_at`, `salary_min`, `salary_max`, `expires_at` (default: `created_at`) |
| `dir` | string | Sort direction: `asc` or `desc` (default: `desc`) |
| `per_page` | number | Results per page, max 50 (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 3,
      "title": "Senior JavaScript Developer",
      "description": "We are looking for...",
      "location": "New York, NY",
      "employment_type": "full_time",
      "salary_min": 100000,
      "salary_max": 150000,
      "salary_range": "100000 – 150000",
      "status": "published",
      "expires_at": "2024-03-01T23:59:59Z",
      "created_at": "2024-01-15T10:00:00Z",
      "company": {
        "id": 3,
        "name": "Acme Corp",
        "logo_url": "http://127.0.0.1:8000/storage/company-logos/acme.png"
      },
      "skills": [
        { "id": 1, "title": "JavaScript", "is_required": true },
        { "id": 2, "title": "React", "is_required": false }
      ],
      "applications_count": 24
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 87,
    "last_page": 6
  }
}
```

---

### 5.3 Get Single Job Post

**GET** `/api/v1/job-posts/{id}`

Returns a single published job post. Returns `404` if the post is not published or does not exist.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Senior JavaScript Developer",
    "description": "We are looking for a talented developer...",
    "location": "New York, NY",
    "employment_type": "full_time",
    "salary_min": 100000,
    "salary_max": 150000,
    "salary_range": "100000 – 150000",
    "responsibilities": "- Lead development projects\n- Review pull requests",
    "requirements": "- 5+ years of experience\n- Strong React knowledge",
    "status": "published",
    "expires_at": "2024-03-01T23:59:59Z",
    "created_at": "2024-01-15T10:00:00Z",
    "company": {
      "id": 3,
      "name": "Acme Corp",
      "website": "https://acme.com",
      "logo_url": "http://127.0.0.1:8000/storage/company-logos/acme.png"
    },
    "skills": [
      { "id": 1, "title": "JavaScript", "is_required": true }
    ],
    "job_title": {
      "id": 5,
      "title": "Software Engineer"
    }
  }
}
```

---

### 5.4 List Courses

**GET** `/api/v1/courses`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search in title and provider |
| `per_page` | number | Results per page, max 50 (default: 20) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Advanced JavaScript",
      "provider": "Udemy",
      "link": "https://udemy.com/course/advanced-js",
      "description": "Master advanced JavaScript concepts...",
      "skills": [
        { "id": 1, "title": "JavaScript" }
      ],
      "created_at": "2024-01-10T08:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 140,
    "last_page": 7
  }
}
```

---

## 6. Admin Endpoints

**Auth required:** Yes  
**Required role:** `admin`  
**Prefix:** `/api/v1/admin/`

All requests must include:
```
Authorization: Bearer {admin_token}
```

---

### 6.1 List Users

**GET** `/api/v1/admin/users`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role (`admin`, `company_owner`, `company_member`, `job_seeker`) |
| `search` | string | Search by email or name |
| `is_active` | boolean | Filter by active status |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "alice@company.com",
      "phone": "+1234567890",
      "role": "company_owner",
      "is_active": true,
      "last_login_at": "2024-01-18T10:00:00Z",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 240,
    "last_page": 16
  }
}
```

---

### 6.2 Get User Details

**GET** `/api/v1/admin/users/{id}`

Returns a user with their role-specific profile (admin, jobSeeker, or companyMember).

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "email": "john@example.com",
    "role": "job_seeker",
    "is_active": true,
    "created_at": "2024-01-10T08:00:00Z",
    "job_seeker": {
      "id": 7,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "current_job": "Developer",
      "location": "NY"
    }
  }
}
```

---

### 6.3 Activate User

**PATCH** `/api/v1/admin/users/{id}/activate`

Activates a deactivated user account.

#### Success Response `200`

```json
{
  "success": true,
  "message": "User activated.",
  "data": {
    "id": 5,
    "email": "john@example.com",
    "is_active": true
  }
}
```

---

### 6.4 Deactivate User

**PATCH** `/api/v1/admin/users/{id}/deactivate`

Deactivates a user account and revokes all their active tokens.

#### Success Response `200`

```json
{
  "success": true,
  "message": "User deactivated and sessions revoked.",
  "data": {
    "id": 5,
    "email": "john@example.com",
    "is_active": false
  }
}
```

---

### 6.5 Create System Employee (Admin Account)

**POST** `/api/v1/admin/system-employees`

Creates a new admin user account.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `first_name` | string | Yes | max:100 |
| `last_name` | string | Yes | max:100 |
| `email` | string | Yes | valid email, unique, max:255 |
| `password` | string | Yes | min:8 |
| `phone` | string | No | max:30 |
| `permissions` | array | No | array of permission strings |

#### Example Request

```json
{
  "first_name": "Sara",
  "last_name": "Admin",
  "email": "sara@jobportal.com",
  "password": "adminpass123",
  "permissions": ["manage_users", "manage_companies"]
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "System employee created.",
  "data": {
    "id": 3,
    "email": "sara@jobportal.com",
    "role": "admin",
    "is_active": true,
    "admin": {
      "id": 2,
      "first_name": "Sara",
      "last_name": "Admin",
      "full_name": "Sara Admin",
      "permissions": ["manage_users", "manage_companies"]
    }
  }
}
```

---

### 6.6 Update Admin Permissions

**PATCH** `/api/v1/admin/system-employees/{admin_id}/permissions`

Updates the permissions of an admin account. Pass `["*"]` for full access.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `permissions` | array | Yes | array of permission strings |

#### Example Request

```json
{
  "permissions": ["manage_users", "manage_subscriptions", "manage_cvs"]
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Permissions updated.",
  "data": {
    "id": 2,
    "first_name": "Sara",
    "last_name": "Admin",
    "permissions": ["manage_users", "manage_subscriptions", "manage_cvs"]
  }
}
```

---

### 6.7 List Company Registration Requests

**GET** `/api/v1/admin/company-registration-requests`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `approved`, `rejected` |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "company_name": "Acme Corp",
      "registration_number": "REG-2024-001",
      "requester_first_name": "Alice",
      "requester_last_name": "Smith",
      "requester_email": "alice@acme.com",
      "status": "pending",
      "rejection_reason": null,
      "reviewed_at": null,
      "created_at": "2024-01-18T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 12,
    "last_page": 1
  }
}
```

---

### 6.8 Get Company Registration Request

**GET** `/api/v1/admin/company-registration-requests/{id}`

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "company_name": "Acme Corp",
    "registration_number": "REG-2024-001",
    "website": "https://acme.com",
    "address": "123 Main St",
    "country": "USA",
    "description": "We build great software.",
    "logo_url": null,
    "requester_first_name": "Alice",
    "requester_last_name": "Smith",
    "requester_email": "alice@acme.com",
    "requester_phone": "+1234567890",
    "status": "pending",
    "rejection_reason": null,
    "reviewed_at": null,
    "company_id": null,
    "created_at": "2024-01-18T10:00:00Z"
  }
}
```

---

### 6.9 Approve Company Registration Request

**PATCH** `/api/v1/admin/company-registration-requests/{id}/approve`

No request body required. Creates the company and the owner user account. Sends confirmation to the requester.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Company registration approved. Account created.",
  "data": {
    "id": 1,
    "name": "Acme Corp",
    "registration_number": "REG-2024-001",
    "approval_status": "approved",
    "approved_at": "2024-01-20T09:00:00Z",
    "owner": {
      "id": 15,
      "email": "alice@acme.com",
      "role": "company_owner"
    }
  }
}
```

#### Notes

- Creates the `User` record (role: `company_owner`), `CompanyMember` record, and `Company` record inside a database transaction.
- If the admin row does not exist for the reviewing admin, it is created automatically (`firstOrCreate`).

---

### 6.10 Reject Company Registration Request

**PATCH** `/api/v1/admin/company-registration-requests/{id}/reject`

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `rejection_reason` | string | Yes | max:1000 |

#### Example Request

```json
{
  "rejection_reason": "The registration number provided could not be verified."
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Company registration rejected.",
  "data": {
    "id": 5,
    "company_name": "Acme Corp",
    "status": "rejected",
    "rejection_reason": "The registration number provided could not be verified.",
    "reviewed_at": "2024-01-20T09:00:00Z"
  }
}
```

---

### 6.11 View CV (Admin)

**GET** `/api/v1/admin/cvs/{id}`

Admin can view any CV regardless of visibility settings.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "My 2024 CV",
    "is_primary": true,
    "visibility": "private",
    "file_url": "http://127.0.0.1:8000/storage/cvs/john_doe_cv.pdf",
    "parsed_data": {
      "name": "John Doe",
      "skills": ["JavaScript", "React"],
      "experience": []
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### 6.12 Delete CV (Admin)

**DELETE** `/api/v1/admin/cvs/{id}`

Permanently deletes a CV regardless of who owns it.

#### Success Response `200`

```json
{
  "success": true,
  "message": "CV permanently deleted."
}
```

---

### 6.13 List Candidates (Admin)

**GET** `/api/v1/admin/candidates`

Admin bypasses all privacy filters and sees all job seeker profiles.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name |
| `location` | string | Filter by location |
| `preferred_job_type` | string | Filter by job type |
| `skill_ids` | array | Filter by skills |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "current_job": "Developer",
      "location": "New York, NY",
      "preferred_job_type": "remote",
      "profile_visibility": "public",
      "cv_visibility": "upon_request"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 500,
    "last_page": 34
  }
}
```

---

### 6.14 Get Candidate Profile (Admin)

**GET** `/api/v1/admin/candidates/{job_seeker_id}`

Admin sees full profile regardless of privacy settings.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 7,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "current_job": "Frontend Developer",
    "location": "San Francisco, CA",
    "preferred_job_type": "remote",
    "desired_salary": 120000,
    "profile_visibility": "private",
    "cv_visibility": "private",
    "skills": [
      { "id": 1, "title": "JavaScript", "level": "advanced" }
    ],
    "primary_cv": {
      "id": 3,
      "title": "My 2024 CV",
      "is_primary": true,
      "visibility": "private",
      "file_url": "http://127.0.0.1:8000/storage/cvs/john_cv.pdf"
    }
  }
}
```

---

### 6.15 List Subscription Plans

**GET** `/api/v1/admin/plans`

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic",
      "description": "For small teams",
      "price": "29.99",
      "billing_cycle": "monthly",
      "max_job_posts": 5,
      "max_members": 3,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Professional",
      "description": "For growing companies",
      "price": "99.99",
      "billing_cycle": "monthly",
      "max_job_posts": 50,
      "max_members": 15,
      "is_active": true
    }
  ]
}
```

---

### 6.16 List Subscriptions

**GET** `/api/v1/admin/subscriptions`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `cancelled`, `expired`, `pending` |
| `company_id` | number | Filter by company |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "status": "active",
      "starts_at": "2024-01-01T00:00:00Z",
      "ends_at": "2024-12-31T23:59:59Z",
      "plan": {
        "id": 2,
        "name": "Professional",
        "price": "99.99"
      },
      "company": {
        "id": 3,
        "name": "Acme Corp"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 45,
    "last_page": 3
  }
}
```

---

### 6.17 Assign Subscription to Company

**POST** `/api/v1/admin/companies/{company_id}/subscriptions`

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `plan_id` | number | Yes | must exist in `plans` table |
| `status` | string | No | one of: `active`, `cancelled`, `expired`, `pending` |
| `starts_at` | date | No | ISO 8601 date |
| `ends_at` | date | No | must be after or equal to `starts_at` |

#### Example Request

```json
{
  "plan_id": 2,
  "status": "active",
  "starts_at": "2024-01-01",
  "ends_at": "2024-12-31"
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Subscription assigned.",
  "data": {
    "id": 12,
    "status": "active",
    "starts_at": "2024-01-01T00:00:00Z",
    "ends_at": "2024-12-31T23:59:59Z",
    "plan": {
      "id": 2,
      "name": "Professional",
      "price": "99.99"
    },
    "company": {
      "id": 3,
      "name": "Acme Corp"
    }
  }
}
```

---

## 7. Company Endpoints

**Auth required:** Yes  
**Required role:** `company_owner` or `company_member`  
**Prefix:** `/api/v1/company/`

> **Note:** Certain actions (add member, remove member, update member) are further restricted to `company_owner` at the policy level.

---

### 7.1 Get Company Profile

**GET** `/api/v1/company/profile`

Returns the company profile for the authenticated user's company.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Acme Corp",
    "registration_number": "REG-2024-001",
    "website": "https://acme.com",
    "address": "123 Main St, New York",
    "country": "USA",
    "description": "We build great software.",
    "logo_url": "http://127.0.0.1:8000/storage/company-logos/acme.png",
    "approval_status": "approved",
    "approved_at": "2024-01-12T10:00:00Z",
    "owner": {
      "id": 15,
      "email": "alice@acme.com",
      "role": "company_owner"
    },
    "active_subscription": {
      "id": 1,
      "status": "active",
      "ends_at": "2024-12-31T23:59:59Z",
      "plan": { "name": "Professional", "max_job_posts": 50 }
    }
  }
}
```

---

### 7.2 Update Company Profile

**PATCH** `/api/v1/company/profile`

All fields are optional (partial update). Only `company_owner` can update.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | No | max:200 |
| `website` | string/null | No | valid URL, max:255 |
| `address` | string/null | No | max:500 |
| `country` | string/null | No | max:100 |
| `description` | string/null | No | max:3000 |

#### Example Request

```json
{
  "description": "Updated company description.",
  "website": "https://acme-updated.com"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Company profile updated.",
  "data": { }
}
```

---

### 7.3 Upload Company Logo

**POST** `/api/v1/company/logo`

Uploads or replaces the company logo. Only `company_owner` can upload.

#### Request Body (multipart/form-data)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `logo` | file | Yes | image, jpg/jpeg/png/webp, max 2MB |

#### Success Response `200`

```json
{
  "success": true,
  "message": "Logo uploaded.",
  "data": {
    "id": 3,
    "name": "Acme Corp",
    "logo_url": "http://127.0.0.1:8000/storage/company-logos/new_logo.png"
  }
}
```

---

### 7.4 List Company Members

**GET** `/api/v1/company/members`

Returns all members of the authenticated user's company.

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 15,
      "company_id": 3,
      "first_name": "Alice",
      "last_name": "Smith",
      "full_name": "Alice Smith",
      "role_in_company": "company_owner",
      "is_active": true,
      "email": "alice@acme.com",
      "created_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

---

### 7.5 Add Company Member

**POST** `/api/v1/company/members`

Creates a new user and adds them to the company. Only `company_owner` can perform this action.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `first_name` | string | Yes | max:100 |
| `last_name` | string | Yes | max:100 |
| `email` | string | Yes | valid email, unique, max:255 |
| `password` | string | Yes | min:8 |
| `phone` | string | No | max:30 |
| `role_in_company` | string | No | max:100 (e.g. `"company_member"`, `"company_owner"`) |

#### Example Request

```json
{
  "first_name": "Bob",
  "last_name": "Jones",
  "email": "bob@acme.com",
  "password": "bobpass123",
  "role_in_company": "company_member"
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Member added.",
  "data": {
    "id": 2,
    "first_name": "Bob",
    "last_name": "Jones",
    "full_name": "Bob Jones",
    "role_in_company": "company_member",
    "user": {
      "id": 16,
      "email": "bob@acme.com",
      "role": "company_member"
    }
  }
}
```

---

### 7.6 Update Company Member

**PATCH** `/api/v1/company/members/{id}`

Updates a member's name or role. Only `company_owner` can perform this action.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `first_name` | string | No | max:100 |
| `last_name` | string | No | max:100 |
| `role_in_company` | string | No | max:100 |

#### Success Response `200`

```json
{
  "success": true,
  "message": "Member updated.",
  "data": {
    "id": 2,
    "first_name": "Bob",
    "last_name": "Jones",
    "role_in_company": "company_owner"
  }
}
```

---

### 7.7 Remove Company Member

**DELETE** `/api/v1/company/members/{id}`

Removes a member from the company. Only `company_owner` can perform this action. A member cannot remove themselves.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Member removed."
}
```

---

### 7.8 List Company Job Posts

**GET** `/api/v1/company/job-posts`

Returns all job posts for the authenticated user's company (all statuses).

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `draft`, `published`, `closed`, `archived` |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Senior JavaScript Developer",
      "employment_type": "full_time",
      "status": "published",
      "location": "New York, NY",
      "salary_min": 100000,
      "salary_max": 150000,
      "expires_at": "2024-03-01T23:59:59Z",
      "applications_count": 24,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 8,
    "last_page": 1
  }
}
```

---

### 7.9 Create Job Post

**POST** `/api/v1/company/job-posts`

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | max:200 |
| `description` | string | Yes | — |
| `employment_type` | string | Yes | one of: `full_time`, `part_time`, `remote`, `contract`, `internship`, `freelance` |
| `job_title_id` | number | No | must exist in `job_titles` table |
| `location` | string | No | max:200 |
| `salary_min` | number | No | min:0 |
| `salary_max` | number | No | must be ≥ `salary_min` if `salary_min` is provided |
| `responsibilities` | string | No | — |
| `requirements` | string | No | — |
| `status` | string | No | one of: `draft`, `published`, `closed`, `archived` (default: `draft`) |
| `expires_at` | date | No | must be after today |
| `skill_ids` | array | No | array of skill IDs that exist in `skills` table |
| `skill_ids_required` | array | No | subset of `skill_ids` marked as required |

#### Example Request

```json
{
  "title": "Senior JavaScript Developer",
  "description": "We are looking for a talented JS developer...",
  "employment_type": "full_time",
  "location": "New York, NY",
  "salary_min": 100000,
  "salary_max": 150000,
  "status": "published",
  "expires_at": "2024-03-01",
  "skill_ids": [1, 2, 3],
  "skill_ids_required": [1]
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Job post created.",
  "data": {
    "id": 5,
    "title": "Senior JavaScript Developer",
    "employment_type": "full_time",
    "status": "published",
    "location": "New York, NY",
    "salary_min": 100000,
    "salary_max": 150000,
    "salary_range": "100000 – 150000",
    "expires_at": "2024-03-01T00:00:00Z",
    "created_at": "2024-01-18T10:00:00Z"
  }
}
```

---

### 7.10 Get Company Job Post

**GET** `/api/v1/company/job-posts/{id}`

Returns full details of a single job post. The post must belong to the authenticated user's company.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "Senior JavaScript Developer",
    "description": "We are looking for...",
    "employment_type": "full_time",
    "location": "New York, NY",
    "salary_min": 100000,
    "salary_max": 150000,
    "responsibilities": "- Lead development",
    "requirements": "- 5+ years experience",
    "status": "published",
    "expires_at": "2024-03-01T00:00:00Z",
    "skills": [
      { "id": 1, "title": "JavaScript", "is_required": true }
    ]
  }
}
```

---

### 7.11 Update Job Post

**PATCH** `/api/v1/company/job-posts/{id}`

All fields are optional. The post must belong to the authenticated user's company.

#### Request Body

Same fields as Create Job Post, all optional (`sometimes` validation).

#### Success Response `200`

```json
{
  "success": true,
  "message": "Job post updated.",
  "data": { }
}
```

---

### 7.12 Delete Job Post

**DELETE** `/api/v1/company/job-posts/{id}`

Soft deletes the job post. The post must belong to the authenticated user's company.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Job post deleted."
}
```

---

### 7.13 List Applicants for a Job Post

**GET** `/api/v1/company/job-posts/{id}/applicants`

Returns all applications for a specific job post.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `submitted`, `under_review`, `shortlisted`, `rejected`, `accepted`, `withdrawn` |
| `sort` | string | Sort field (default: `applied_at`) |
| `dir` | string | Sort direction: `asc` or `desc` (default: `desc`) |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "status": "submitted",
      "score": null,
      "cover_letter": "I am excited about this role...",
      "applied_at": "2024-01-18T14:30:00Z",
      "job_seeker": {
        "id": 7,
        "full_name": "John Doe",
        "current_job": "Frontend Developer",
        "location": "NY"
      },
      "cv": {
        "id": 3,
        "title": "My 2024 CV",
        "file_url": "http://127.0.0.1:8000/storage/cvs/john_cv.pdf"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 24,
    "last_page": 2
  }
}
```

---

### 7.14 Update Application Status

**PATCH** `/api/v1/company/applications/{application_id}/status`

Changes the status of a job application. The application must belong to a job post in the authenticated user's company.

#### Allowed Status Values (company-side)

`under_review` → `shortlisted` → `accepted` or `rejected`

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `status` | string | Yes | one of: `under_review`, `shortlisted`, `rejected`, `accepted` |
| `score` | number | No | integer, 0–100 |

#### Example Request

```json
{
  "status": "shortlisted",
  "score": 88
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Application status updated.",
  "data": {
    "id": 10,
    "status": "shortlisted",
    "score": 88,
    "applied_at": "2024-01-18T14:30:00Z",
    "job_seeker": {
      "id": 7,
      "full_name": "John Doe"
    },
    "job_post": {
      "id": 5,
      "title": "Senior JavaScript Developer"
    }
  }
}
```

---

### 7.15 Search Candidates

**GET** `/api/v1/company/candidates`

Searches job seeker profiles. Only profiles with `profile_visibility = public` or `limited` are returned. Private profiles are excluded.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name |
| `location` | string | Filter by location |
| `preferred_job_type` | string | Filter by preferred job type |
| `skill_ids` | array | Filter by skills |
| `salary_max` | number | Filter by maximum desired salary |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "full_name": "John Doe",
      "current_job": "Frontend Developer",
      "location": "New York, NY",
      "preferred_job_type": "remote",
      "profile_visibility": "public",
      "cv_visibility": "upon_request",
      "skills": [
        { "id": 1, "title": "JavaScript", "level": "advanced" }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 320,
    "last_page": 22
  }
}
```

---

### 7.16 Get Candidate Profile

**GET** `/api/v1/company/candidates/{job_seeker_id}`

Returns a single candidate's profile.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 7,
    "full_name": "John Doe",
    "current_job": "Developer",
    "location": "NY",
    "profile_visibility": "public",
    "cv_visibility": "upon_request",
    "skills": [],
    "primary_cv": null
  }
}
```

#### Error Responses

**403 — Profile is private**
```json
{
  "success": false,
  "message": "This candidate's profile is private."
}
```

---

### 7.17 Request CV Access

**POST** `/api/v1/company/candidates/{job_seeker_id}/request-cv-access`

Sends an invitation to the candidate to request access to their CV.

No request body required.

#### Success Response `201`

```json
{
  "success": true,
  "message": "CV access request sent as invitation.",
  "data": {
    "id": 8,
    "status": "pending",
    "sent_at": "2024-01-18T10:00:00Z",
    "job_seeker": { "id": 7, "full_name": "John Doe" }
  }
}
```

#### Error Responses

**422 — CV is already public**
```json
{
  "success": false,
  "message": "CV is already publicly accessible."
}
```

**403 — CV is private (not requestable)**
```json
{
  "success": false,
  "message": "This candidate has set their CV to private."
}
```

---

### 7.18 List Sent Invitations

**GET** `/api/v1/company/invitations`

Returns all invitations sent by the authenticated user's company.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `accepted`, `declined` |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 8,
      "message": "We'd love to have you interview for...",
      "status": "pending",
      "sent_at": "2024-01-18T10:00:00Z",
      "responded_at": null,
      "job_seeker": { "id": 7, "full_name": "John Doe" },
      "job_post": { "id": 5, "title": "Senior JS Developer" }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 12,
    "last_page": 1
  }
}
```

---

### 7.19 Send Invitation

**POST** `/api/v1/company/invitations`

Sends a job invitation to a candidate.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `job_seeker_id` | number | Yes | must exist in `job_seekers` table |
| `job_post_id` | number | No | must exist in `job_posts` table |
| `message` | string | No | max:2000 |

#### Example Request

```json
{
  "job_seeker_id": 7,
  "job_post_id": 5,
  "message": "We think you'd be a great fit for our role."
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Invitation sent.",
  "data": {
    "id": 9,
    "message": "We think you'd be a great fit for our role.",
    "status": "pending",
    "sent_at": "2024-01-18T10:00:00Z",
    "job_seeker": { "id": 7, "full_name": "John Doe" },
    "job_post": { "id": 5, "title": "Senior JS Developer" }
  }
}
```

---

## 8. Job Seeker Endpoints

**Auth required:** Yes  
**Required role:** `job_seeker`  
**Prefix:** `/api/v1/job-seeker/` (plus some under `/api/v1/job-posts/`)

---

### 8.1 Get Own Profile

**GET** `/api/v1/job-seeker/profile`

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 7,
    "user_id": 12,
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "current_job": "Frontend Developer",
    "location": "San Francisco, CA",
    "preferred_job_type": "remote",
    "desired_salary": 120000,
    "profile_visibility": "public",
    "cv_visibility": "upon_request",
    "skills": [
      { "id": 1, "title": "JavaScript", "level": "advanced" },
      { "id": 2, "title": "React", "level": "intermediate" }
    ],
    "primary_cv": {
      "id": 3,
      "title": "My 2024 CV",
      "is_primary": true,
      "file_url": "http://127.0.0.1:8000/storage/cvs/john_cv.pdf"
    },
    "user": {
      "id": 12,
      "email": "john@example.com",
      "phone": null
    }
  }
}
```

---

### 8.2 Update Profile

**PATCH** `/api/v1/job-seeker/profile`

All fields optional.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `first_name` | string | No | max:100 |
| `last_name` | string | No | max:100 |
| `current_job` | string/null | No | max:200 |
| `location` | string/null | No | max:200 |
| `preferred_job_type` | string/null | No | one of: `full_time`, `part_time`, `remote`, `contract`, `internship`, `freelance` |
| `desired_salary` | number/null | No | min:0 |
| `phone` | string/null | No | max:30 |

#### Success Response `200`

```json
{
  "success": true,
  "message": "Profile updated.",
  "data": { }
}
```

---

### 8.3 Update Privacy Settings

**PATCH** `/api/v1/job-seeker/privacy`

Controls who can view the profile and CV.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `profile_visibility` | string | No | one of: `public`, `limited`, `private` |
| `cv_visibility` | string | No | one of: `public`, `upon_request`, `private` |

#### Privacy Behavior

| `profile_visibility` | Who Can See |
|---------------------|-------------|
| `public` | Everyone (companies, admin) |
| `limited` | Companies with active subscription |
| `private` | No one (admin bypasses) |

| `cv_visibility` | Who Can See |
|----------------|-------------|
| `public` | Companies can view directly |
| `upon_request` | Companies must send an invitation |
| `private` | Not accessible (admin bypasses) |

#### Success Response `200`

```json
{
  "success": true,
  "message": "Privacy settings updated.",
  "data": {
    "profile_visibility": "limited",
    "cv_visibility": "upon_request"
  }
}
```

---

### 8.4 Update Skills

**PUT** `/api/v1/job-seeker/skills`

Replaces all current skills with the provided list.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `skills` | array | Yes | array of skill objects |
| `skills[].id` | number | Yes | must exist in `skills` table |
| `skills[].level` | string | Yes | one of: `beginner`, `intermediate`, `advanced`, `expert` |

#### Example Request

```json
{
  "skills": [
    { "id": 1, "level": "advanced" },
    { "id": 2, "level": "intermediate" },
    { "id": 5, "level": "beginner" }
  ]
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Skills updated.",
  "data": { }
}
```

---

### 8.5 List Own CVs

**GET** `/api/v1/job-seeker/cvs`

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "My 2024 CV",
      "is_primary": true,
      "visibility": "upon_request",
      "file_url": "http://127.0.0.1:8000/storage/cvs/john_cv.pdf",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 8.6 Upload CV

**POST** `/api/v1/job-seeker/cvs`

Upload a new CV file. Accepts multipart/form-data.

#### Request Body (multipart/form-data)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | max:200 |
| `file` | file | No | pdf, doc, docx — max 5MB |
| `visibility` | string | No | one of: `public`, `upon_request`, `private` (default: `upon_request`) |
| `is_primary` | boolean | No | if true, previous primary CV is unset |

#### Success Response `201`

```json
{
  "success": true,
  "message": "CV uploaded.",
  "data": {
    "id": 4,
    "title": "My New CV",
    "is_primary": false,
    "visibility": "upon_request",
    "file_url": "http://127.0.0.1:8000/storage/cvs/my_new_cv.pdf",
    "created_at": "2024-01-18T15:00:00Z"
  }
}
```

---

### 8.7 Update CV

**PATCH** `/api/v1/job-seeker/cvs/{id}`

Update CV metadata or replace the file. Only the owner can update.

#### Request Body (multipart/form-data)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | No | max:200 |
| `file` | file | No | pdf, doc, docx — max 5MB |
| `visibility` | string | No | one of: `public`, `upon_request`, `private` |
| `is_primary` | boolean | No | — |

#### Success Response `200`

```json
{
  "success": true,
  "message": "CV updated.",
  "data": { }
}
```

---

### 8.8 Delete CV

**DELETE** `/api/v1/job-seeker/cvs/{id}`

Soft deletes the CV. Only the owner can delete.

#### Success Response `200`

```json
{
  "success": true,
  "message": "CV deleted."
}
```

---

### 8.9 Analyze CV

**POST** `/api/v1/job-seeker/cvs/{id}/analyze`

Triggers AI/NLP analysis of the CV file. Updates `parsed_data` on the CV record. Only the owner can analyze.

#### Success Response `200`

```json
{
  "success": true,
  "message": "CV analysis complete.",
  "data": {
    "id": 3,
    "title": "My 2024 CV",
    "parsed_data": {
      "name": "John Doe",
      "email": "john@example.com",
      "skills": ["JavaScript", "React", "Node.js"],
      "experience": [
        { "title": "Frontend Developer", "company": "Acme Corp", "years": 3 }
      ]
    }
  },
  "analysis": { }
}
```

---

### 8.10 Apply for a Job

**POST** `/api/v1/job-posts/{job_post_id}/apply`

Submits an application for a published job post.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `cv_id` | number | No | must exist in `cvs` table (and belong to the applicant) |
| `cover_letter` | string | No | max:5000 |

#### Example Request

```json
{
  "cv_id": 3,
  "cover_letter": "I am very excited about this opportunity..."
}
```

#### Success Response `201`

```json
{
  "success": true,
  "message": "Application submitted.",
  "data": {
    "id": 15,
    "status": "submitted",
    "cover_letter": "I am very excited about this opportunity...",
    "applied_at": "2024-01-18T14:30:00Z",
    "job_post": {
      "id": 5,
      "title": "Senior JavaScript Developer",
      "company": { "id": 3, "name": "Acme Corp" }
    },
    "cv": {
      "id": 3,
      "title": "My 2024 CV"
    }
  }
}
```

---

### 8.11 List Own Applications

**GET** `/api/v1/job-seeker/applications`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "status": "shortlisted",
      "score": 88,
      "applied_at": "2024-01-18T14:30:00Z",
      "job_post": {
        "id": 5,
        "title": "Senior JavaScript Developer",
        "company": { "name": "Acme Corp" }
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 6,
    "last_page": 1
  }
}
```

---

### 8.12 Get Application Details

**GET** `/api/v1/job-seeker/applications/{id}`

Only the applicant can view their own application.

#### Success Response `200`

```json
{
  "success": true,
  "data": {
    "id": 15,
    "status": "shortlisted",
    "score": 88,
    "cover_letter": "I am very excited...",
    "applied_at": "2024-01-18T14:30:00Z",
    "job_post": {
      "id": 5,
      "title": "Senior JavaScript Developer",
      "description": "We are looking for...",
      "company": { "id": 3, "name": "Acme Corp" }
    },
    "cv": {
      "id": 3,
      "title": "My 2024 CV",
      "file_url": "http://127.0.0.1:8000/storage/cvs/john_cv.pdf"
    }
  }
}
```

---

### 8.13 Withdraw Application

**PATCH** `/api/v1/job-seeker/applications/{id}/withdraw`

Withdraws a submitted application. Only allowed if status is not already `accepted` or `rejected`.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Application withdrawn.",
  "data": {
    "id": 15,
    "status": "withdrawn"
  }
}
```

---

### 8.14 Save a Job

**POST** `/api/v1/job-posts/{job_post_id}/save`

Saves a job post to the job seeker's saved list.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Job saved."
}
```

---

### 8.15 Unsave a Job

**DELETE** `/api/v1/job-posts/{job_post_id}/save`

Removes a job from the saved list.

#### Success Response `200`

```json
{
  "success": true,
  "message": "Job removed from saved list."
}
```

---

### 8.16 List Saved Jobs

**GET** `/api/v1/job-seeker/saved-jobs`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "title": "Senior JavaScript Developer",
      "employment_type": "full_time",
      "location": "New York, NY",
      "status": "published",
      "company": { "name": "Acme Corp" }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 3,
    "last_page": 1
  }
}
```

---

### 8.17 List Received Invitations

**GET** `/api/v1/job-seeker/invitations`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `accepted`, `declined` |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 9,
      "message": "We think you'd be a great fit...",
      "status": "pending",
      "sent_at": "2024-01-18T10:00:00Z",
      "responded_at": null,
      "company": {
        "id": 3,
        "name": "Acme Corp",
        "logo_url": "http://127.0.0.1:8000/storage/company-logos/acme.png"
      },
      "job_post": {
        "id": 5,
        "title": "Senior JavaScript Developer"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 4,
    "last_page": 1
  }
}
```

---

### 8.18 Respond to Invitation

**PATCH** `/api/v1/job-seeker/invitations/{id}/respond`

Accept or decline a received invitation. Only the invited job seeker can respond.

#### Request Body

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `action` | string | Yes | one of: `accept`, `decline` |

#### Example Request

```json
{
  "action": "accept"
}
```

#### Success Response `200`

```json
{
  "success": true,
  "message": "Invitation response recorded.",
  "data": {
    "id": 9,
    "status": "accepted",
    "responded_at": "2024-01-19T09:00:00Z",
    "company": { "id": 3, "name": "Acme Corp" },
    "job_post": { "id": 5, "title": "Senior JavaScript Developer" }
  }
}
```

---

### 8.19 Get Suitable Jobs (Matching)

**GET** `/api/v1/job-seeker/suitable-jobs`

Returns published job posts ranked by compatibility with the authenticated job seeker's skills and preferences.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by keyword |
| `location` | string | Filter by location |
| `employment_type` | string | Filter by job type |
| `per_page` | number | Results per page (default: 15) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "title": "Senior JavaScript Developer",
      "employment_type": "full_time",
      "location": "New York, NY",
      "salary_min": 100000,
      "salary_max": 150000,
      "company": { "name": "Acme Corp" },
      "skills": [
        { "id": 1, "title": "JavaScript", "is_required": true }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 38,
    "last_page": 3
  }
}
```

---

### 8.20 Get Recommended Courses

**GET** `/api/v1/job-seeker/recommended-courses`

Returns courses recommended based on the job seeker's current skills.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 10) |

#### Success Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Advanced JavaScript",
      "provider": "Udemy",
      "link": "https://udemy.com/course/advanced-js",
      "description": "Master advanced JS concepts.",
      "recommendation_reason": "Based on your JavaScript skills",
      "skills": [
        { "id": 1, "title": "JavaScript" }
      ]
    }
  ]
}
```

---

## 9. Role & Permission Reference

### Roles

| Role | Description |
|------|-------------|
| `admin` | Full platform administration access |
| `company_owner` | Can manage their company, members, job posts, and view candidates |
| `company_member` | Can view company data, job posts, and candidates — limited management |
| `job_seeker` | Can manage their own profile, CVs, applications, and invitations |

### Route Guards

| Middleware | Applied To |
|-----------|-----------|
| `auth:sanctum` | All protected routes |
| `role:admin` | All `/api/v1/admin/*` routes |
| `role:company_owner,company_member` | All `/api/v1/company/*` routes |
| `role:job_seeker` | All `/api/v1/job-seeker/*` routes + apply/save actions |

### Policy-Level Restrictions (within role)

| Action | Extra Restriction |
|--------|------------------|
| Update company profile | Must be `company_owner` |
| Upload company logo | Must be `company_owner` |
| Add / update / remove member | Must be `company_owner` |
| Create / update / delete job post | Must belong to the company |
| View job post applicants | Must belong to the company |
| Update application status | Job post must belong to company |
| View / delete own CV | Must own the CV |
| Withdraw application | Must own the application |
| Respond to invitation | Must be the invited job seeker |

---

## 10. Enum Values Reference

### Employment Types

`full_time` | `part_time` | `remote` | `contract` | `internship` | `freelance`

### Job Post Status

| Status | Visible to Public |
|--------|-----------------|
| `draft` | No |
| `published` | Yes (if not expired) |
| `closed` | No |
| `archived` | No |

### Application Status Flow

```
submitted → under_review → shortlisted → accepted
                        ↘ rejected
submitted → withdrawn (job seeker withdraws)
```

| Status | Set By |
|--------|--------|
| `submitted` | System (on apply) |
| `under_review` | Company |
| `shortlisted` | Company |
| `accepted` | Company |
| `rejected` | Company |
| `withdrawn` | Job Seeker |

### Invitation Status

`pending` → `accepted` or `declined` (set by job seeker)

### Profile Visibility

`public` | `limited` | `private`

### CV Visibility

`public` | `upon_request` | `private`

### Skill Levels

`beginner` | `intermediate` | `advanced` | `expert`

### Subscription Status

`active` | `cancelled` | `expired` | `pending`

---

## 11. Example Full Flow

### Flow A: Job Seeker — Register, Login, Apply

**Step 1 — Register**

```http
POST /api/v1/auth/job-seeker/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "secret123",
  "password_confirmation": "secret123"
}
```

→ Save `data.token` from response.

**Step 2 — Get profile**

```http
GET /api/v1/auth/me
Authorization: Bearer 3|abc123xyz...
```

**Step 3 — Browse jobs**

```http
GET /api/v1/job-posts?employment_type=remote&per_page=10
```

**Step 4 — Upload CV**

```http
POST /api/v1/job-seeker/cvs
Authorization: Bearer 3|abc123xyz...
Content-Type: multipart/form-data

title=My 2024 CV
file=@john_cv.pdf
is_primary=1
```

**Step 5 — Apply**

```http
POST /api/v1/job-posts/5/apply
Authorization: Bearer 3|abc123xyz...
Content-Type: application/json

{
  "cv_id": 3,
  "cover_letter": "I am excited about this role..."
}
```

**Step 6 — Track application**

```http
GET /api/v1/job-seeker/applications
Authorization: Bearer 3|abc123xyz...
```

---

### Flow B: Company — Register, Login, Post a Job

**Step 1 — Submit Registration Request**

```http
POST /api/v1/auth/company-registration-requests
Content-Type: application/json

{
  "company_name": "Acme Corp",
  "registration_number": "REG-2024-001",
  "requester_first_name": "Alice",
  "requester_last_name": "Smith",
  "requester_email": "alice@acme.com",
  "password": "alicepass123",
  "password_confirmation": "alicepass123"
}
```

→ Wait for admin approval.

**Step 2 — Admin approves (admin token)**

```http
PATCH /api/v1/admin/company-registration-requests/5/approve
Authorization: Bearer {admin_token}
```

**Step 3 — Company owner logs in**

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "alice@acme.com", "password": "alicepass123" }
```

**Step 4 — Create a job post**

```http
POST /api/v1/company/job-posts
Authorization: Bearer {company_token}
Content-Type: application/json

{
  "title": "Senior JS Developer",
  "description": "We need a talented developer...",
  "employment_type": "full_time",
  "status": "published",
  "salary_min": 100000,
  "salary_max": 150000
}
```

**Step 5 — Review applicants**

```http
GET /api/v1/company/job-posts/5/applicants
Authorization: Bearer {company_token}
```

**Step 6 — Shortlist an applicant**

```http
PATCH /api/v1/company/applications/15/status
Authorization: Bearer {company_token}
Content-Type: application/json

{ "status": "shortlisted", "score": 90 }
```

---

## 12. Backend Observations & Recommendations

### Issues Found

#### 1. `GET /api/v1/admin/candidates/{id}` — Inconsistent with company candidate endpoint

The admin candidate show endpoint (via `CandidateController`) and the company candidate show endpoint share the same controller but behave differently. The admin bypasses privacy; the company respects it. This shared controller approach is fine, but the privacy bypass logic should be clearly documented with a flag/method, which it currently is not.

**Recommendation:** Add a comment or dedicated method like `isAdminBypass()` inside `CandidateController` for clarity.

---

#### 2. `POST /api/v1/job-posts/{id}/apply` — No check for already applied

There is no documented validation error when a job seeker tries to apply to the same job post twice. If not handled, a database unique constraint violation will return a 500 instead of a clean 422.

**Recommendation:** Add a `unique:job_applications,job_post_id,{job_seeker_id},job_seeker_id` validation or a pre-check in the controller/service.

---

#### 3. `PATCH /api/v1/company/members/{id}` — `role_in_company` has no enum validation

`CreateMemberRequest` and `UpdateMemberRequest` accept `role_in_company` as a free-form string (`max:100`). The `users.role` column is separately enforced as an enum (`company_owner`, `company_member`), but `company_members.role_in_company` is a free string. This means invalid values like `"superadmin"` can be stored.

**Recommendation:** If `role_in_company` is meant to map to real roles, add `in:company_owner,company_member` validation.

---

#### 4. `POST /api/v1/company/invitations` — No duplicate check

A company can send multiple invitations to the same job seeker for the same job post. There is no documented check for this.

**Recommendation:** Add a unique constraint on `(company_id, job_seeker_id, job_post_id)` in the `invitations` table and a 422 response for duplicates.

---

#### 5. `PATCH /api/v1/job-seeker/applications/{id}/withdraw` — No status guard documented

The withdraw action should be blocked if the application is already `accepted` or `rejected`. If this guard exists in the policy, it should return a clean error response. If not, it should be added.

**Recommendation:** Return `422` with `message: "This application cannot be withdrawn."` if the status is terminal.

---

#### 6. `GET /api/v1/company/candidates` — `limited` visibility behavior unclear

The `limited` profile visibility value's behavior (who can see it) is not enforced consistently — it may depend on whether the viewing company has an active subscription. This logic should be documented in the controller and enforced at the query level.

**Recommendation:** Document the subscription tier required to view `limited` profiles, and enforce it in the candidate search scope.

---

#### 7. `PUT /api/v1/job-seeker/skills` — Uses `PUT` not `PATCH`

This endpoint uses `PUT` (full replace), which is semantically correct since it replaces all skills. However, this is the only `PUT` in the API — all others use `PATCH`. This is correct behavior but may confuse frontend developers expecting `PATCH` everywhere.

**Note for frontend:** This endpoint must send the **full** skills list every time. Sending only new skills will remove existing ones.

---

#### 8. File upload endpoints need `Content-Type: multipart/form-data`

The following endpoints require `multipart/form-data`, **not** `application/json`:

- `POST /api/v1/company/logo`
- `POST /api/v1/job-seeker/cvs`
- `PATCH /api/v1/job-seeker/cvs/{id}` (when updating the file)
- `POST /api/v1/auth/company-registration-requests` (when including a logo)

**Important:** Sending these as `application/json` will silently ignore the file and may cause unexpected behavior.

---

*Documentation generated from codebase: routes/api.php, controllers, form requests, and resources.*  
*Backend version: Laravel 13 / API v1*
