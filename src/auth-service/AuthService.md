# Authentication Service Design Document

## Overview

The Authentication Service handles user authentication, authorization, and token management for the Unified Faith Service. It implements OTP-based login with 6-digit codes, JWT access tokens, and refresh tokens for secure session management.

---

## Authentication Flow

### Password-Based Login Flow

Users can login using email and password:

```
1. User provides email and password
   ↓
2. System validates credentials
   ↓
3. System verifies password hash
   ↓
4. System issues Access Token + Refresh Token
```

### OTP-Based Login Flow

The authentication process also supports OTP (One-Time Password) verification:

```
1. User initiates login with email/phone
   ↓
2. System generates 6-digit OTP
   ↓
3. OTP sent to user (email/SMS)
   ↓
4. User submits OTP
   ↓
5. System validates OTP
   ↓
6. System issues Access Token + Refresh Token
```

---

## API Endpoints

### 1. Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "isVerified": false,
  "createdAt": "2026-01-22T00:00:00.000Z"
}
```

**Business Rules:**
- Email must be unique
- Password must be at least 8 characters
- Password is hashed with bcrypt before storage
- User is assigned default 'user' role automatically
- User is created as active but not verified

---

### 2. Login with Password

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": ["user"]
  },
  "expiresIn": 3600
}
```

**Business Rules:**
- Validates email and password
- Password verification using bcrypt
- Updates last_login_at timestamp
- Returns access and refresh tokens
- User must have password set (OTP-only users cannot use this endpoint)

---

### 3. Request OTP (Step 1)

**Endpoint:** `POST /auth/login/request-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 300,
  "identifier": "user@example.com"
}
```

**Business Rules:**
- Generates 6-digit numeric OTP (000000-999999)
- OTP expires in 5 minutes (300 seconds)
- Rate limiting: Max 3 OTP requests per email per 15 minutes
- OTP is hashed before storage (one-way hash)
- Previous OTPs for same email are invalidated

---

### 4. Verify OTP (Step 2)

**Endpoint:** `POST /auth/login/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": ["user"],
    "permissions": ["users:read", "content:read"]
  },
  "expiresIn": 3600
}
```

**Error Response (Invalid OTP):**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired OTP",
  "attemptsRemaining": 2
}
```

**Business Rules:**
- OTP must match and not be expired
- Max 3 verification attempts per OTP
- After successful verification, OTP is invalidated
- User is authenticated and tokens are issued
- Failed attempts are logged for security

---

### 5. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Business Rules:**
- Validates refresh token signature and expiration
- Checks if refresh token exists in database and is not revoked
- Verifies token hash matches stored hash
- Issues new access token and refresh token (refresh token rotation)
- Marks old refresh token as revoked (`is_revoked = true`)
- Creates new refresh token record in database
- Updates `last_used_at` timestamp
- New tokens have same user permissions/roles

---

### 6. Logout

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Business Rules:**
- Access token cannot be revoked immediately (stateless JWT)
  - Token remains valid until expiration (up to 1 hour)
  - Consider adding access token blacklist if immediate revocation needed
- Revokes refresh token by setting `is_revoked = true` in database
- Refresh token cannot be used to get new tokens after revocation
- Optionally: Revoke all refresh tokens for user (force logout all devices)

---

### 7. Get Profile

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "roles": ["user"],
  "permissions": ["users:read", "content:read"]
}
```

---

### 8. Validate Token

**Endpoint:** `GET /auth/validate`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

---

## Token Management

### Access Token

**Type:** JWT (JSON Web Token)

**Payload Structure:**
```typescript
{
  sub: string;           // User ID
  email: string;        // User email
  roles: string[];      // User roles
  permissions: string[]; // User permissions
  type: 'access';      // Token type
  iat: number;          // Issued at (timestamp)
  exp: number;          // Expiration (timestamp)
}
```

**Expiration:** 1 hour (3600 seconds)

**Usage:**
- Included in `Authorization: Bearer <token>` header
- Required for all protected endpoints
- Used by JWT Guard for authentication

**Storage:**
- Client-side (memory or secure storage)
- Never stored in cookies (to prevent XSS)
- Should be cleared on logout

---

### Refresh Token

**Type:** JWT (JSON Web Token)

**Payload Structure:**
```typescript
{
  sub: string;          // User ID
  type: 'refresh';     // Token type
  tokenId: string;      // Unique token identifier (for revocation)
  iat: number;          // Issued at
  exp: number;          // Expiration (7 days)
}
```

**Expiration:** 7 days (604800 seconds)

**Usage:**
- Used only for refreshing access tokens
- Not used for API authentication
- Can be revoked (blacklisted) for security

**Storage:**
- Client-side (secure storage recommended)
- **Server-side:** Stored in `refresh_tokens` table
  - Active tokens stored with `is_revoked = false`
  - Validated on each refresh request
  - Can be revoked immediately (set `is_revoked = true`)
  - Enables session management and tracking
- Rotated on each refresh (new token issued, old one marked as revoked)

---

### Token Rotation Strategy

**Refresh Token Rotation:** Enabled

- When refresh token is used, a new refresh token is issued
- Old refresh token is immediately invalidated
- Prevents token reuse attacks
- Limits damage if refresh token is compromised

**Flow:**
```
1. Client uses refresh_token to get new tokens
   ↓
2. Server validates refresh_token
   ↓
3. Server generates new access_token + new refresh_token
   ↓
4. Server invalidates old refresh_token (blacklist)
   ↓
5. Client receives new tokens and replaces old ones
```

---

## OTP Generation & Storage

### OTP Specifications

- **Length:** 6 digits
- **Format:** Numeric only (000000-999999)
- **Expiration:** 5 minutes (300 seconds)
- **Max Attempts:** 3 verification attempts per OTP
- **Rate Limiting:** 3 OTP requests per email per 15 minutes

### OTP Storage

**Database Table:** `otp_codes`

**Schema:**
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,  -- email or phone
  code_hash VARCHAR(255) NOT NULL,   -- Hashed OTP (bcrypt)
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_identifier (identifier),
  INDEX idx_expires_at (expires_at)
);
```

**Security:**
- OTP is hashed using bcrypt before storage
- Original OTP is never stored
- Hash comparison is done server-side
- Used OTPs are marked as `is_used = true`
- Expired OTPs are cleaned up periodically

---

## Database Schema

### OTP Codes Table

```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON otp_codes(identifier);
CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_otp_active ON otp_codes(identifier, expires_at, is_used);
```

### Token Storage Strategy

**Current Design:** Hybrid Approach (Recommended)

We use a **hybrid approach** for token storage:

1. **Access Tokens**: **Stateless (not stored)**
   - JWT tokens validated by signature only
   - No database lookup required
   - Fast and scalable
   - Cannot revoke immediately (expires after 1 hour)

2. **Refresh Tokens**: **Stateful (stored in database)**
   - Active refresh tokens are stored
   - Can be revoked immediately
   - Enables session management
   - Better security control

### Refresh Tokens Table (Active Tokens)

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR(255) NOT NULL UNIQUE,  -- Unique token identifier
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,  -- Hashed refresh token (for validation)
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  device_info JSON,  -- Optional: device name, IP, user agent
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token_id (token_id),
  INDEX idx_user_active (user_id, is_revoked, expires_at),
  INDEX idx_expires_at (expires_at)
);
```

### Refresh Token Blacklist Table (Revoked Tokens)

```sql
CREATE TABLE refresh_token_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR(255) NOT NULL UNIQUE,  -- From refresh token payload
  user_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,  -- When token would have expired
  revoked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason VARCHAR(255),  -- 'logout', 'refresh', 'security', 'compromised'
  INDEX idx_token_id (token_id),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

**Note:** For production, consider using a single table with `is_revoked` flag instead of separate blacklist table.

---

## Security Considerations

### OTP Security

1. **Rate Limiting**
   - Max 3 OTP requests per email per 15 minutes
   - Prevents OTP spam and abuse

2. **Expiration**
   - OTP expires in 5 minutes
   - Short window reduces attack surface

3. **Attempt Limits**
   - Max 3 verification attempts per OTP
   - After 3 failures, new OTP must be requested

4. **Hashing**
   - OTPs are bcrypt hashed before storage
   - Original OTP never stored

5. **Invalidation**
   - Used OTPs are immediately invalidated
   - Previous OTPs for same email are invalidated on new request

### Token Security

1. **HTTPS Only**
   - Tokens transmitted over HTTPS only
   - Prevents man-in-the-middle attacks

2. **Token Expiration**
   - Short-lived access tokens (1 hour)
   - Longer-lived refresh tokens (7 days)

3. **Token Rotation**
   - Refresh tokens rotated on each use
   - Old tokens immediately invalidated

4. **Blacklisting**
   - Revoked tokens added to blacklist
   - Checked on each token validation

5. **Storage**
   - Tokens stored client-side (not cookies)
   - Prevents XSS cookie attacks

---

## Error Handling

### OTP Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| 400 | Invalid request | Missing email or invalid format |
| 429 | Too many requests | Rate limit exceeded (3 per 15 min) |
| 401 | Invalid or expired OTP | OTP doesn't match or expired |
| 401 | OTP attempts exceeded | More than 3 failed attempts |
| 401 | OTP already used | OTP was already verified |

### Token Errors

| Error Code | Message | Description |
|------------|---------|-------------|
| 401 | Invalid token | Token signature invalid |
| 401 | Token expired | Token past expiration time |
| 401 | Token revoked | Token in blacklist |
| 401 | Invalid refresh token | Refresh token invalid/expired |

---

## Implementation Checklist

### Phase 1: OTP Generation & Validation
- [ ] Create `otp_codes` table
- [ ] Implement OTP generation service (6-digit numeric)
- [ ] Implement OTP hashing (bcrypt)
- [ ] Implement OTP storage (database)
- [ ] Implement OTP validation logic
- [ ] Implement rate limiting for OTP requests
- [ ] Implement attempt tracking
- [ ] Add OTP expiration cleanup job

### Phase 2: Access Token
- [ ] Configure JWT module with access token settings
- [ ] Update JWT payload to include user roles/permissions
- [ ] Implement access token generation
- [ ] Set access token expiration (1 hour)

### Phase 3: Refresh Token
- [ ] Implement refresh token generation
- [ ] Create `refresh_token_blacklist` table
- [ ] Implement refresh token validation
- [ ] Implement refresh token rotation
- [ ] Implement token revocation/blacklisting
- [ ] Set refresh token expiration (7 days)

### Phase 4: API Endpoints
- [ ] `POST /auth/login/request-otp` - Request OTP
- [ ] `POST /auth/login/verify-otp` - Verify OTP and get tokens
- [ ] `POST /auth/refresh` - Refresh access token
- [ ] `POST /auth/logout` - Logout and revoke tokens
- [ ] `GET /auth/validate` - Validate token (optional)

### Phase 5: Integration
- [ ] Integrate with users-service (user lookup)
- [ ] Integrate with RBAC (roles/permissions)
- [ ] Update JWT Guard to use access tokens
- [ ] Add token blacklist checking to guards
- [ ] Implement token refresh middleware (optional)

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=3600  # 1 hour in seconds
JWT_REFRESH_TOKEN_EXPIRES_IN=604800  # 7 days in seconds

# OTP Configuration
OTP_EXPIRES_IN=300  # 5 minutes in seconds
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_REQUESTS=3
OTP_RATE_LIMIT_WINDOW=900  # 15 minutes in seconds

# Email/SMS Service (for OTP delivery)
EMAIL_SERVICE_API_KEY=
SMS_SERVICE_API_KEY=
```

---

## Sequence Diagrams

### OTP Login Flow

```
Client                    Auth Service              Users Service
  |                           |                          |
  |-- POST /auth/login/request-otp -->|                  |
  |                           |-- Validate user exists -->|
  |                           |<-- User found -----------|
  |                           |-- Generate 6-digit OTP   |
  |                           |-- Hash OTP               |
  |                           |-- Store in DB            |
  |                           |-- Send OTP (email/SMS)   |
  |<-- OTP sent (200) --------|                          |
  |                           |                          |
  |-- POST /auth/login/verify-otp -->|                  |
  |                           |-- Validate OTP           |
  |                           |-- Check expiration        |
  |                           |-- Check attempts          |
  |                           |-- Get user roles/perms -->|
  |                           |<-- Roles/Permissions -----|
  |                           |-- Generate access_token   |
  |                           |-- Generate refresh_token |
  |                           |-- Mark OTP as used        |
  |<-- Tokens (200) ----------|                          |
```

### Token Refresh Flow

```
Client                    Auth Service
  |                           |
  |-- POST /auth/refresh -->  |
  |                           |-- Validate refresh_token |
  |                           |-- Check blacklist        |
  |                           |-- Check expiration        |
  |                           |-- Get user roles/perms    |
  |                           |-- Generate new access_token |
  |                           |-- Generate new refresh_token |
  |                           |-- Blacklist old refresh_token |
  |<-- New tokens (200) ------|
```

---

## Future Enhancements

1. **Multi-factor Authentication (MFA)**
   - Add SMS OTP as alternative to email
   - Support authenticator app (TOTP)

2. **Remember Me**
   - Longer refresh token expiration (30 days)
   - Separate "remember me" refresh tokens

3. **Device Management**
   - Track devices for token refresh
   - Revoke tokens by device
   - Device fingerprinting

4. **Session Management**
   - Active sessions endpoint
   - Revoke all sessions
   - Session timeout warnings

5. **Security Features**
   - IP-based validation
   - Geolocation tracking
   - Suspicious activity detection

---

## Token Storage Strategy Details

### Access Tokens: Stateless (Not Stored)

**Why not store access tokens?**
- Access tokens are short-lived (1 hour)
- High frequency of validation (every API request)
- Storing would require database lookup on every request
- JWT signature validation is fast and stateless
- Trade-off: Cannot revoke immediately (wait for expiration)

**When to store access tokens:**
- If you need immediate revocation capability
- If you need to track all active sessions
- If you need device/session management features
- Trade-off: Database lookup overhead on every request

### Refresh Tokens: Stateful (Stored in Database)

**Why store refresh tokens?**
- Longer-lived (7 days) - need revocation capability
- Lower frequency of validation (only on refresh)
- Enables session management
- Can track active sessions per user
- Can revoke immediately on security breach
- Can implement device management

**Storage Approach:**
- Store active refresh tokens in `refresh_tokens` table
- Store hash of token (not plain token) for security
- Use `is_revoked` flag to mark revoked tokens
- Cleanup expired tokens periodically

### Alternative: Store Access Tokens Too

If you need immediate access token revocation:

```sql
CREATE TABLE access_tokens (
  id UUID PRIMARY KEY,
  token_id VARCHAR(255) UNIQUE,  -- JWT jti claim
  user_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_token_id (token_id),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

**Trade-offs:**
- ✅ Immediate revocation possible
- ✅ Better session management
- ✅ Track all active sessions
- ❌ Database lookup on every API request
- ❌ Higher database load
- ❌ Slower request processing

**Recommendation:** Start with stateless access tokens. Add storage only if you need immediate revocation.

---

## RBAC Endpoints

### Roles Management (Admin Only)

**Base Path:** `/roles`

- `GET /roles` - Get all roles (with permissions)
- `GET /roles/:id` - Get role by ID
- `POST /roles` - Create a new role
- `PUT /roles/:id` - Update a role
- `DELETE /roles/:id` - Delete a role
- `POST /roles/:id/permissions` - Assign permissions to a role

**All endpoints require:** `Authorization: Bearer <admin_access_token>`

### Permissions Management (Admin Only)

**Base Path:** `/permissions`

- `GET /permissions` - Get all permissions
- `GET /permissions/:id` - Get permission by ID
- `POST /permissions` - Create a new permission
- `PUT /permissions/:id` - Update a permission
- `DELETE /permissions/:id` - Delete a permission

**All endpoints require:** `Authorization: Bearer <admin_access_token>`

---

## Database Schema Updates

### Users Table

The authentication service includes a `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- Nullable for OTP-only users
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP,  -- Soft delete
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Note:** `password_hash` is nullable to support OTP-only users. Users can register with password or use OTP-based login.

---

## Notes

- OTP is sent via email/SMS (implementation depends on service providers)
- **Access tokens:** Stateless JWT (not stored) - validated by signature only
- **Refresh tokens:** Stateful (stored in database) - enables revocation and session management
- Token refresh rotates both tokens for security
- All tokens should be transmitted over HTTPS only
- Consider implementing token refresh middleware for automatic renewal
- Refresh tokens are hashed before storage (similar to passwords)
- Cleanup job should remove expired tokens periodically
- Users can login via password OR OTP (flexible authentication)
- RBAC endpoints require admin role for management
- Seed file (`prisma/seed.sql`) includes admin user for initial setup