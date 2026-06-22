# Job Portal API — v1 Reference

Base URL: `https://<your-domain>/api/v1`

All responses are JSON. Successful responses always include `"success": true`.  
Error responses include `"success": false`, `"message"`, and (for 422) `"errors"`.

---

## Contents

1. [Authentication](#1-authentication)
2. [Auth — Profile & Password](#2-auth--profile--password)
3. [Public — Job Posts](#3-public--job-posts)
4. [Job Seeker — Profile](#4-job-seeker--profile)
5. [Job Seeker — CVs](#5-job-seeker--cvs)
6. [Job Seeker — Applications](#6-job-seeker--applications)
7. [Job Seeker — Invitations](#7-job-seeker--invitations)
8. [Job Seeker — Matching & Courses](#8-job-seeker--matching--courses)
9. [Company — Profile & Members](#9-company--profile--members)
10. [Company — Job Posts](#10-company--job-posts)
11. [Company — Candidates](#11-company--candidates)
12. [Company — Invitations](#12-company--invitations)
13. [Admin — Users](#13-admin--users)
14. [Admin — Company Requests](#14-admin--company-requests)
15. [Admin — Candidates & CVs](#15-admin--candidates--cvs)
16. [Admin — Subscriptions](#16-admin--subscriptions)
17. [Privacy Model](#17-privacy-model)
18. [Error Reference](#18-error-reference)
19. [Environment Setup](#19-environment-setup)

---

## 1. Authentication

### Register (Job Seeker)

```
POST /auth/job-seeker/register
```

**Body**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "jane@example.com", "role": "job_seeker" },
    "token": "1|abc123..."
  }
}
```

---

### Submit Company Registration Request (Public)

```
POST /auth/company-registration-requests
```

Initiates the company approval workflow. An admin must approve before the company account becomes active.

**Body**
```json
{
  "company_name": "Acme Corp",
  "registration_number": "REG-12345",
  "requester_first_name": "John",
  "requester_last_name": "Smith",
  "requester_email": "john@acme.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Registration request submitted. Awaiting admin approval.",
  "data": { "id": 5, "status": "pending" }
}
```

---

### Login

```
POST /auth/login
```

Works for all roles: `admin`, `company_owner`, `company_member`, `job_seeker`.

**Body**
```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "...", "role": "job_seeker" },
    "token": "2|xyz..."
  }
}
```

**Errors**
- `422` — invalid credentials or account inactive

---

### Logout

```
POST /auth/logout
Authorization: Bearer {token}
```

Revokes the current token.

**Response 200**
```json
{ "success": true, "message": "Logged out." }
```

---

## 2. Auth — Profile & Password

All endpoints in this section require `Authorization: Bearer {token}`.

### Get Profile

```
GET /auth/me
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "jane@example.com",
    "role": "job_seeker",
    "is_active": true,
    "profile": { ... }
  }
}
```

---

### Update Password

```
PATCH /auth/password
```

**Body**
```json
{
  "current_password": "oldpass",
  "password": "newpass123",
  "password_confirmation": "newpass123"
}
```

**Response 200**
```json
{ "success": true, "message": "Password updated." }
```

---

## 3. Public — Job Posts

No authentication required.

### List Published Job Posts

```
GET /job-posts
```

**Query Parameters**

| Parameter | Type   | Description                        |
|-----------|--------|------------------------------------|
| search    | string | Keyword filter on title/description |
| location  | string | Location filter                    |
| employment_type | string | `full_time`, `part_time`, `contract`, `freelance`, `internship` |
| per_page  | int    | Results per page (default: 15)     |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Senior Laravel Developer",
      "company": { "id": 3, "name": "Acme Corp" },
      "location": "Riyadh",
      "employment_type": "full_time",
      "salary_min": 10000,
      "salary_max": 15000,
      "status": "published",
      "expires_at": "2026-06-01T00:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 42, "last_page": 3 }
}
```

---

### Show Job Post

```
GET /job-posts/{id}
```

Returns 404 if the post is not `published`.

---

### List Courses

```
GET /courses
```

**Query Parameters**: `category`, `skill_ids` (comma-separated), `per_page`

---

## 4. Job Seeker — Profile

`Authorization: Bearer {token}` — role `job_seeker` required.

### Get Profile

```
GET /job-seeker/profile
```

### Update Profile

```
PATCH /job-seeker/profile
```

**Body** (all fields optional)
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "location": "Riyadh",
  "current_job": "Software Engineer",
  "preferred_job_type": "full_time",
  "desired_salary": 12000
}
```

### Update Privacy Settings

```
PATCH /job-seeker/privacy
```

**Body**
```json
{
  "profile_visibility": "public",
  "cv_visibility": "upon_request"
}
```

| Field | Values |
|-------|--------|
| `profile_visibility` | `public`, `limited`, `private` |
| `cv_visibility` | `public`, `upon_request`, `private` |

### Update Skills

```
PUT /job-seeker/skills
```

**Body**
```json
{ "skill_ids": [1, 3, 7] }
```

Replaces the seeker's skill set entirely.

---

## 5. Job Seeker — CVs

### List CVs

```
GET /job-seeker/cvs
```

### Upload CV

```
POST /job-seeker/cvs
Content-Type: multipart/form-data
```

**Body**
```
file      (required) PDF/DOCX file
title     (optional) string
is_primary (optional) boolean
visibility (optional) public | upon_request | private
```

### Update CV

```
PATCH /job-seeker/cvs/{id}
```

**Body** (all optional)
```json
{
  "title": "Updated CV",
  "is_primary": true,
  "visibility": "public"
}
```

### Delete CV (Soft)

```
DELETE /job-seeker/cvs/{id}
```

### Analyze CV (AI)

```
POST /job-seeker/cvs/{id}/analyze
```

Triggers CV parsing and skill extraction.

**Response 200**
```json
{
  "success": true,
  "data": {
    "skills_detected": ["PHP", "Laravel", "MySQL"],
    "experience_years": 5,
    "education_level": "bachelor"
  }
}
```

---

## 6. Job Seeker — Applications

### Apply to a Job

```
POST /job-posts/{jobPostId}/apply
```

**Body**
```json
{ "cover_letter": "I am very interested in this role." }
```

**Response 201**

**Errors**
- `422` — job not published, or already applied

### List My Applications

```
GET /job-seeker/applications
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "job_post": { "id": 1, "title": "..." },
      "status": "submitted",
      "score": null,
      "submitted_at": "2026-04-10T10:00:00.000000Z"
    }
  ]
}
```

### Show Application

```
GET /job-seeker/applications/{id}
```

Returns 403 if the application belongs to another seeker.

### Withdraw Application

```
PATCH /job-seeker/applications/{id}/withdraw
```

**Response 200** — status becomes `withdrawn`.

---

## 7. Job Seeker — Invitations

### List Received Invitations

```
GET /job-seeker/invitations
```

**Query Parameters**: `status` (`pending`, `accepted`, `declined`), `per_page`

### Respond to Invitation

```
PATCH /job-seeker/invitations/{id}/respond
```

**Body**
```json
{ "action": "accept" }
```

| `action` | Resulting status |
|----------|-----------------|
| `accept` | `accepted`       |
| `decline`| `declined`       |

**Errors**
- `403` — invitation belongs to another seeker
- `422` — invitation already accepted/declined, or invalid action

---

## 8. Job Seeker — Matching & Courses

### Get Suitable Jobs

```
GET /job-seeker/suitable-jobs
```

Returns jobs ranked by skill overlap, location match, and salary compatibility.

### Get Recommended Courses

```
GET /job-seeker/recommended-courses
```

Returns courses covering skills the seeker lacks, ranked by coverage count. Each item includes `recommendation_reason`.

---

## 9. Company — Profile & Members

`Authorization: Bearer {token}` — role `company_owner` or `company_member` required.

### Get Company Profile

```
GET /company/profile
```

### Update Company Profile

```
PATCH /company/profile
```

**Body** (all optional)
```json
{
  "name": "Updated Name",
  "description": "We build great software.",
  "website": "https://acme.com",
  "location": "Riyadh"
}
```

### Upload Company Logo

```
POST /company/logo
Content-Type: multipart/form-data
```

**Body**: `logo` (image file, max 2 MB)

### List Members

```
GET /company/members
```

### Add Member

```
POST /company/members
```

**Body**
```json
{
  "first_name": "Ali",
  "last_name": "Hassan",
  "email": "ali@acme.com",
  "password": "password123",
  "role_in_company": "recruiter"
}
```

### Update Member Role

```
PATCH /company/members/{id}
```

**Body**
```json
{ "role_in_company": "manager" }
```

### Remove Member

```
DELETE /company/members/{id}
```

---

## 10. Company — Job Posts

### List Company's Job Posts

```
GET /company/job-posts
```

Returns all posts (any status) belonging to the company.

### Create Job Post

```
POST /company/job-posts
```

**Body**
```json
{
  "title": "Backend Developer",
  "description": "We need a great backend dev.",
  "employment_type": "full_time",
  "location": "Riyadh",
  "salary_min": 8000,
  "salary_max": 12000,
  "status": "published",
  "expires_at": "2026-06-30",
  "skill_ids": [
    { "id": 1, "is_required": true },
    { "id": 3, "is_required": false }
  ]
}
```

**Response 201**

### Update Job Post

```
PATCH /company/job-posts/{id}
```

All fields optional. Returns 403 if the post belongs to another company.

### Delete Job Post (Soft)

```
DELETE /company/job-posts/{id}
```

### List Applicants for a Job Post

```
GET /company/job-posts/{id}/applicants
```

**Query Parameters**: `status`, `per_page`

### Update Application Status

```
PATCH /company/applications/{applicationId}/status
```

**Body**
```json
{ "status": "shortlisted", "score": 85 }
```

| Allowed statuses (company) |
|---------------------------|
| `under_review`            |
| `shortlisted`             |
| `rejected`                |
| `accepted`                |

`withdrawn` is seeker-only and cannot be set by the company.

---

## 11. Company — Candidates

### Search Candidates

```
GET /company/candidates
```

Respects candidate privacy settings. Private profiles are excluded.

**Query Parameters**

| Parameter         | Type             | Description                      |
|-------------------|------------------|----------------------------------|
| search            | string           | Name / job title keyword         |
| location          | string           | Location filter                  |
| preferred_job_type| string           | Employment type filter            |
| skill_ids         | comma-separated  | Filter by required skills         |
| salary_max        | number           | Maximum desired salary            |
| per_page          | int              | Default: 20, max: 50              |

**Privacy notes**
- `public` profiles: full name visible
- `limited` profiles: last name is masked (e.g., `J.`)
- `private` profiles: not returned

### Show Candidate Profile

```
GET /company/candidates/{jobSeekerId}
```

Returns 403 if the profile is `private`.

### Request CV Access

```
POST /company/candidates/{jobSeekerId}/request-cv-access
```

Used when the candidate's `cv_visibility` is `upon_request`. Creates a pending invitation.

**Body**
```json
{ "message": "We'd like to review your CV for a role at Acme." }
```

**Response 201**

---

## 12. Company — Invitations

### List Sent Invitations

```
GET /company/invitations
```

**Query Parameters**: `status`, `per_page`

### Send Invitation

```
POST /company/invitations
```

**Body**
```json
{
  "job_seeker_id": 7,
  "job_post_id": 3,
  "message": "We think you'd be a great fit!"
}
```

**Errors**
- `422` — duplicate active invitation, or `job_post_id` doesn't belong to the company

---

## 13. Admin — Users

`Authorization: Bearer {token}` — role `admin` required.

### List All Users

```
GET /admin/users
```

**Query Parameters**: `role` (`admin`, `company_owner`, `company_member`, `job_seeker`), `search`, `is_active`, `per_page`

**Response 200**
```json
{
  "success": true,
  "data": [ { "id": 1, "email": "...", "role": "job_seeker", "is_active": true } ],
  "meta": { "total": 150, ... }
}
```

### Show User

```
GET /admin/users/{id}
```

### Activate User

```
PATCH /admin/users/{id}/activate
```

### Deactivate User

```
PATCH /admin/users/{id}/deactivate
```

### Create System Employee (Admin)

```
POST /admin/system-employees
```

**Body**
```json
{
  "first_name": "Sara",
  "last_name": "Admin",
  "email": "sara@portal.com",
  "password": "password123",
  "permissions": ["manage_users", "manage_cvs"]
}
```

**Available permissions**: `manage_users`, `manage_cvs`, `manage_companies`, `manage_subscriptions`, `*` (superadmin)

**Response 201**

### Update Admin Permissions

```
PATCH /admin/system-employees/{adminId}/permissions
```

**Body**
```json
{ "permissions": ["manage_users", "manage_companies"] }
```

---

## 14. Admin — Company Requests

### List Registration Requests

```
GET /admin/company-registration-requests
```

**Query Parameters**: `status` (`pending`, `approved`, `rejected`), `per_page`

### Show Request

```
GET /admin/company-registration-requests/{id}
```

### Approve Request

```
PATCH /admin/company-registration-requests/{id}/approve
```

Creates the `Company` record + owner `User` account in a single transaction.

**Response 200**

**Errors**
- `422` — request is not in `pending` status

### Reject Request

```
PATCH /admin/company-registration-requests/{id}/reject
```

**Body**
```json
{ "rejection_reason": "Incomplete documentation." }
```

`rejection_reason` is required.

---

## 15. Admin — Candidates & CVs

### List All Candidates (Admin — bypasses privacy)

```
GET /admin/candidates
```

Same query parameters as the company candidates search. Admins see **all** profiles regardless of `profile_visibility`.

### Show Candidate Profile

```
GET /admin/candidates/{jobSeekerId}
```

### Show CV

```
GET /admin/cvs/{cvId}
```

Admin can view any CV regardless of `visibility` setting.

### Delete CV

```
DELETE /admin/cvs/{cvId}
```

Permanently deletes the CV file and record.

---

## 16. Admin — Subscriptions

### List Plans

```
GET /admin/plans
```

### List All Subscriptions

```
GET /admin/subscriptions
```

### Assign Plan to Company

```
POST /admin/companies/{companyId}/subscriptions
```

**Body**
```json
{ "plan_id": 2 }
```

---

## 17. Privacy Model

### Profile Visibility (`profile_visibility`)

| Value     | Company view                      | Admin view |
|-----------|-----------------------------------|-----------|
| `public`  | Full profile, full name           | Full      |
| `limited` | Profile visible, last name masked | Full      |
| `private` | Hidden — excluded from search     | Full      |

### CV Visibility (`cv_visibility`)

| Value          | Company action                                    |
|----------------|--------------------------------------------------|
| `public`       | CV embedded in candidate profile response         |
| `upon_request` | Must call `POST /company/candidates/{id}/request-cv-access` |
| `private`      | Not accessible; request-access returns 403        |

---

## 18. Error Reference

| Status | Meaning                                                |
|--------|--------------------------------------------------------|
| 200    | OK                                                     |
| 201    | Created                                                |
| 401    | Unauthenticated — missing or invalid token             |
| 403    | Forbidden — wrong role, inactive account, or policy denial |
| 404    | Not found (or private resource hidden as 404)          |
| 422    | Validation error or business rule violation            |
| 500    | Server error                                           |

**422 response shape**
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

## 19. Environment Setup

### `.env` Variables

```dotenv
APP_NAME="Job Portal"
APP_ENV=production
APP_KEY=           # Run: php artisan key:generate
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=job_portal
DB_USERNAME=root
DB_PASSWORD=

# Sanctum
SANCTUM_STATEFUL_DOMAINS=your-frontend.com
SESSION_DOMAIN=.your-domain.com

# File Storage (company logos, CVs)
FILESYSTEM_DISK=public
# For S3:
# FILESYSTEM_DISK=s3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=us-east-1
# AWS_BUCKET=

# Mail (for future notifications)
MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="${APP_NAME}"
```

### First-Time Setup

```bash
# Install dependencies
composer install --no-dev --optimize-autoloader

# Generate key
php artisan key:generate

# Run migrations
php artisan migrate

# Seed default admin accounts
php artisan db:seed --class=AdminSeeder

# Link storage (for file uploads)
php artisan storage:link

# Optimize for production
php artisan optimize
```

### Default Admin Credentials

| Email                    | Password | Permissions      |
|--------------------------|----------|-----------------|
| superadmin@jobportal.com | password | All (`*`)        |
| admin@jobportal.com      | password | manage_users, manage_companies, manage_cvs |

**Change these passwords immediately after first login.**

### Running Tests

```bash
# All tests (uses in-memory SQLite)
php artisan test

# With coverage
php artisan test --coverage

# Single test file
php artisan test --filter JobApplicationTest
```
