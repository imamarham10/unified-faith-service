# Auth Service Setup Guide

## Prerequisites

1. Node.js and npm installed
2. PostgreSQL database (for auth service: `unified_faith_auth`)
3. SMTP credentials (Gmail, SendGrid, etc.)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp src/auth-service/.env.example src/auth-service/.env
```

Update the following in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/auth?sslmode=require

# JWT
JWT_SECRET=your-very-secret-key-change-in-production

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@unifiedfaith.com
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

This will:
- Create all tables (roles, permissions, user_roles, role_permissions, otp_codes, refresh_tokens)
- Apply the schema to your database

### 5. Seed Database (Optional but Recommended)

Seed initial roles and permissions:

```bash
npm run prisma:seed
```

This creates:
- 4 roles: admin, moderator, user, premium_user
- All permissions
- Role-permission mappings

### 6. Start the Application

```bash
npm run start:dev
```

## Email Provider Configuration

### Current: SMTP (Default)

The service uses SMTP by default. Configure in `.env`:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@unifiedfaith.com
```

### Future: AWS SES

To switch to AWS SES:

1. Install AWS SDK:
```bash
npm install @aws-sdk/client-ses
```

2. Update `.env`:
```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
SES_FROM_EMAIL=noreply@unifiedfaith.com
```

3. Uncomment and implement the SES code in `src/auth-service/providers/email/ses.provider.ts`

**No code changes needed** - just configuration change!

## API Endpoints

### Authentication

- `POST /auth/login/request-otp` - Request OTP
- `POST /auth/login/verify-otp` - Verify OTP and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/profile` - Get user profile (protected)
- `GET /auth/validate` - Validate token (protected)

## Database Management

### View Database

```bash
npm run prisma:studio
```

Opens Prisma Studio in browser for database management.

### Create Migration

```bash
npm run prisma:migrate
```

### Deploy Migrations (Production)

```bash
npm run prisma:migrate:deploy
```

## Testing the Setup

1. **Request OTP:**
```bash
curl -X POST http://localhost:8000/auth/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

2. **Verify OTP (use OTP from email):**
```bash
curl -X POST http://localhost:8000/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

3. **Use Access Token:**
```bash
curl -X GET http://localhost:8000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Prisma Client Not Found

Run: `npm run prisma:generate`

### Database Connection Error

Check your `DATABASE_URL` in `.env` file.

### Email Not Sending

- Check SMTP credentials
- For Gmail: Use App Password (not regular password)
- Check firewall/network restrictions

### Migration Errors

Reset database (development only):
```bash
npx prisma migrate reset
npm run prisma:seed
```

## Next Steps

1. Integrate with users-service (replace placeholder user lookup)
2. Set up Redis for caching (optional)
3. Implement scheduled jobs for OTP/token cleanup
4. Add monitoring and logging
