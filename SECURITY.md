# Security Hardening Documentation

This document outlines all security improvements implemented for the Chop URL shortener application.

## 1. API Security

### Helmet (Security Headers)
- **File**: `middleware/` (integrated in `app.js`)
- **Features**:
  - Content Security Policy (CSP) with strict directives
  - X-Frame-Options: deny (prevents clickjacking)
  - X-XSS-Protection: enabled
  - Removes X-Powered-By header
  - Base URI and Form Action restrictions

### CORS (Cross-Origin Resource Sharing)
- **File**: `middleware/cors.js`
- **Configuration**:
  - Uses explicit origin allowlist (never wildcard `*`)
  - Dynamic allowlist from `CORS_ORIGINS` env variable
  - Automatic support for Vercel apps (*.vercel.app)
  - Credentials enabled for authenticated requests
  - Proper error handling for disallowed origins

### Rate Limiting
- **File**: `middleware/rateLimit.js`
- **Limiters**:
  - Global: 100 requests per 15 minutes
  - Auth endpoints: 5 attempts per 15 minutes (strict)
  - General endpoints: 30 requests per minute
  - Skipped in development mode
  - IP-based rate limiting with fallback

### Input Validation
- **File**: `middleware/validation.js`
- **Schemas** (using Zod):
  - `registerSchema`: Email, password (8-128 chars), name validation
  - `loginSchema`: Email, password validation
  - `changePasswordSchema`: Current and new password validation
  - `createLinkSchema`: URL validation, slug format checks
- **Integration**: Applied to auth endpoints via middleware stack

### JSON Payload Size Limit
- **File**: `app.js`
- **Configuration**: 100KB limit on JSON request bodies
- Prevents DoS attacks via large payloads

### Trust Proxy Configuration
- **File**: `app.js`
- **Setting**: `app.set("trust proxy", 1)`
- Enables proper IP address handling behind reverse proxies
- Required for Vercel and similar serverless platforms

## 2. Authentication & Sessions

### Password Hashing
- **File**: `services/auth.js`
- **Algorithm**: bcryptjs with cost factor 12
- Previous: Cost 10 → **Updated to: Cost 12**
- Applied to: User registration, password changes
- Security: Higher cost increases computation time, slowing brute-force attacks

### JWT Configuration
- **File**: `utils/jwt.js`
- **Improvements**:
  - Algorithm: HS256 (explicit, verified on decode)
  - Issuer: "chop-url" (iss claim)
  - Audience: "chop-url-api" (aud claim)
  - Expiry: 15 minutes (access), 7 days (refresh)
- **Verification**: Always uses `jwt.verify()` with explicit algorithm
- Never uses `jwt.decode()` for authorization decisions

### Refresh Token Rotation
- **File**: `services/auth.js`
- **Process**:
  - Old refresh token invalidated on use
  - New refresh token issued
  - Sessions tracked in database
- **Logout**: Invalidates refresh token immediately

### Cookie Security
- **File**: `controllers/auth.js`
- **Configuration**:
  - `httpOnly: true` (prevents JavaScript access)
  - `secure: true` (HTTPS only in production)
  - `sameSite: "lax"` (CSRF protection)
  - `maxAge: 7 days`

### Session Tracking
- Captures IP address and User-Agent
- Enables detection of suspicious login attempts
- Multiple simultaneous sessions allowed
- Clean logout invalidates specific session

## 3. Database & Prisma

### Connection Pooling
- **File**: `prisma/schema.prisma`
- **Configuration**:
  - `DATABASE_URL`: Pooled connection (app connections)
  - `DIRECT_DATABASE_URL`: Direct connection (migrations)
- **Provider**: Neon PostgreSQL with pooling support
- Improves performance and handles serverless cold starts

### Schema Security
- Foreign key constraints with ON DELETE CASCADE
- Indexed fields for common queries (email, token, user_id, timestamp)
- UUIDs for identifiers (not sequential integers)
- Proper timestamp tracking

## 4. Secrets & Configuration

### Environment Variables
- **File**: `.env.example`
- **Required Secrets**:
  - `JWT_ACCESS_SECRET`: Strong access token secret
  - `JWT_REFRESH_SECRET`: Strong refresh token secret
  - `DATABASE_URL`: PostgreSQL connection string
  - `DIRECT_DATABASE_URL`: Direct DB connection for migrations

### Secret Generation
Generate strong secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### .gitignore
- `.env` and `.env.*.local` are ignored
- `.env.example` is committed (documentation only)
- Never commit actual secrets

### Production Deployment
- Use Vercel Environment Variables for secrets
- Never inject secrets from files
- Rotate secrets periodically
- Use dedicated secrets manager if needed

## 5. Deployment & Vercel

### Serverless Function Configuration
- **File**: `vercel.json`
- **Optimization**:
  - Memory: 1024 MB
  - Max duration: 60 seconds
  - Proper function inclusion for Prisma
  - Efficient rewrites for API routing

### Health Check Endpoint
- **Route**: `GET /health`
- **Response**: `{ "status": "ok", "timestamp": "ISO-8601" }`
- Used for monitoring and load balancer checks

### Security Headers
- Added to all API responses in vercel.json
- Cache-Control: no-cache, no-store (sensitive data)
- X-Content-Type-Options: nosniff

## 6. Monitoring & Logging

### Structured Logging
- **Library**: Pino (JSON logging)
- **File**: `utils/logger.js`
- **Features**:
  - Structured JSON output for parsing
  - Colorized pretty-print in development
  - ISO 8601 timestamps
  - Configurable log level via `LOG_LEVEL`

### HTTP Request Logging
- **Middleware**: `middleware/httpLogger.js`
- **Captures**:
  - HTTP method and URL
  - Status code
  - Response time
  - User-Agent and Host headers
  - Client IP address

### Error Logging
- **File**: `app.js` (error handler)
- **Captured**:
  - Status code
  - Error message
  - Stack trace
  - Request context (method, path)

### Log Levels
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages with stack traces

## 7. Testing & CI/CD

### Unit & Integration Tests
- **File**: `test/*.test.js`
- **Framework**: Node native test runner
- **Coverage**:
  - Authentication (register, login, refresh, logout)
  - Link creation and retrieval
  - Analytics tracking
  - User management
  - Redirect functionality

### CI/CD Pipeline
- **File**: `.github/workflows/ci.yml`
- **Triggers**: Push to main, pull requests to main
- **Steps**:
  - Install dependencies
  - Run Prisma migrations
  - Execute tests
  - Syntax checking
  - Security audit (npm audit)

### Dependency Monitoring
- **File**: `.github/dependabot.yml`
- **Checks**:
  - Weekly npm dependency updates
  - Docker image updates
  - Automatic pull requests for vulnerabilities
  - Security labels applied

## 8. URL Shortener Specifics

### Reserved Slugs
- **Configuration**: `NOT_ALLOWED_SLUG` env variable
- **Default**: `analytics,links,settings,identify,api`
- **Purpose**: Prevents slug collisions with API routes

### Validation
- Slug format: Alphanumeric, hyphens, underscores only
- URL validation: Standard URL format required
- Title: Max 100 characters

## Best Practices for Deployment

### Production Checklist
1. **Secrets**:
   - [ ] Generate strong JWT secrets (32+ bytes)
   - [ ] Set unique DATABASE_URL for production
   - [ ] Use Vercel Environment Variables
   - [ ] Rotate secrets monthly

2. **Environment**:
   - [ ] Set NODE_ENV=production
   - [ ] Set CORS_ORIGINS to actual frontend domain(s)
   - [ ] Configure SSL certificates
   - [ ] Enable Vercel Analytics

3. **Database**:
   - [ ] Use Neon pooled connections for app
   - [ ] Use direct URL for migrations only
   - [ ] Enable SSL mode on PostgreSQL
   - [ ] Backup strategy in place

4. **Monitoring**:
   - [ ] Health endpoint integrated with monitoring
   - [ ] Error logging sent to external service
   - [ ] Rate limit metrics tracked
   - [ ] Log retention policy set

5. **Security**:
   - [ ] HTTPS enforced everywhere
   - [ ] CORS origin list finalized
   - [ ] Rate limits appropriate for expected load
   - [ ] Security headers verified (use OWASP ZAP)

## Incident Response

### Suspected Compromise
1. Rotate all JWT secrets immediately
2. Invalidate all active refresh tokens
3. Review audit logs
4. Reset user passwords if needed
5. Notify affected users

### Brute Force Attack
- Rate limiter auto-blocks after 5 failed attempts
- Monitor `/api/auth/login` and `/api/auth/register` endpoints
- Consider increasing rate limit strictness during attack

## Future Improvements

1. **Two-Factor Authentication (2FA)**
   - TOTP support
   - Backup codes

2. **Advanced Logging**
   - Integrate with Sentry or Datadog
   - Application Performance Monitoring (APM)

3. **URL Blocking**
   - Google Safe Browsing API integration
   - Custom malicious URL blocklist

4. **GDPR Compliance**
   - IP anonymization in analytics
   - User data export functionality
   - Right to be forgotten implementation

5. **API Rate Limiting**
   - Redis-backed store for distributed systems
   - Per-user rate limits for authenticated endpoints

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [JSON Web Tokens (JWT)](https://jwt.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Neon PostgreSQL Pooling](https://neon.tech/docs/connect/connection-pooling)

## Compliance

- **GDPR**: Anonymized analytics, user data handling
- **SOC 2**: Logging, monitoring, access control
- **PCI-DSS**: Not applicable (no payment cards handled directly via API)
