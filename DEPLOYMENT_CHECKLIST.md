# Production Deployment Checklist

## Pre-Deployment Security Verification

### Environment Configuration
- [ ] Generate JWT_ACCESS_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate JWT_REFRESH_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Set DATABASE_URL to Neon pooled connection string
- [ ] Set DIRECT_DATABASE_URL to Neon direct connection string
- [ ] Set CORS_ORIGINS to actual frontend domain(s)
- [ ] Set PUBLIC_URL to shortener domain
- [ ] Confirm NODE_ENV=production in Vercel

### Code Quality & Security
- [ ] Run `pnpm audit` - resolve any vulnerabilities
- [ ] Run `pnpm test` - all tests passing
- [ ] Run `pnpm check` - syntax and type checks
- [ ] Review SECURITY.md for all hardened features
- [ ] Verify all security headers in Helmet config
- [ ] Confirm rate limiting configuration
- [ ] Verify JWT algorithm and claims

### API Endpoints Verification
- [ ] Test `/health` endpoint returns 200 OK
- [ ] Test `POST /api/auth/register` with validation
- [ ] Test `POST /api/auth/login` with rate limiting (5 attempts)
- [ ] Test `POST /api/auth/refresh` with new tokens
- [ ] Test `POST /api/auth/logout` clears session
- [ ] Verify refresh token rotation on use
- [ ] Check password hashing uses bcrypt cost 12

### Security Headers Verification
```bash
curl -i https://your-api.com/health | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Content-Security-Policy"
```
Should return:
```
X-Frame-Options: deny
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Content-Security-Policy: [security policy]
```

### Database Security
- [ ] DATABASE_URL uses SSL (sslmode=require)
- [ ] DIRECT_DATABASE_URL uses SSL
- [ ] Database backups configured
- [ ] Connection pooling working
- [ ] Prisma migrations applied
- [ ] Database indexes on frequently queried fields

### Logging & Monitoring
- [ ] Pino logger configured
- [ ] HTTP request logging working
- [ ] Error logging captures stack traces
- [ ] Structured JSON logs parseable
- [ ] Log level set to 'info' or higher
- [ ] Error aggregation service configured (optional: Sentry)
- [ ] APM configured (optional: New Relic, DataDog)

### CORS Configuration
- [ ] CORS_ORIGINS excludes wildcards (*)
- [ ] Frontend domain(s) explicitly listed
- [ ] Vercel app domains handled via pattern
- [ ] credentials: true configured for cookies
- [ ] Proper error handling for disallowed origins

### Rate Limiting
- [ ] Global limiter: 100 requests/15 min
- [ ] Auth limiter: 5 attempts/15 min
- [ ] Rate limit headers returned
- [ ] Disabled in development mode
- [ ] IP detection working behind proxy

### Input Validation
- [ ] Email validation working
- [ ] Password minimum 8 characters enforced
- [ ] Name validation working
- [ ] URL validation working
- [ ] Slug validation enforces format
- [ ] Validation errors return 400 Bad Request

### Cookie Security
- [ ] Refresh token cookies httpOnly: true
- [ ] secure: true in production
- [ ] sameSite: lax set
- [ ] maxAge: 7 days set
- [ ] Cookies cleared on logout

### Performance & Reliability
- [ ] Serverless function memory: 1024 MB
- [ ] Max duration: 60 seconds
- [ ] Cold start time acceptable
- [ ] Database connection pooling active
- [ ] API response times < 200ms (typical)

### GitHub Actions CI
- [ ] CI workflow runs on PR
- [ ] All tests pass
- [ ] Syntax checks pass
- [ ] npm audit runs successfully
- [ ] Dependabot configured for weekly scans

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs for any issues
- [ ] Check health endpoint uptime
- [ ] Verify user registration works
- [ ] Test login/logout flow
- [ ] Monitor rate limit triggers
- [ ] Check database connection stability

### Weekly
- [ ] Review security audit reports
- [ ] Check Dependabot PRs
- [ ] Monitor error patterns in logs
- [ ] Review auth endpoint usage
- [ ] Confirm backup completion

### Monthly
- [ ] Rotate JWT secrets (if policy requires)
- [ ] Review access logs
- [ ] Audit user accounts
- [ ] Update security documentation
- [ ] Review and update rate limits if needed

## Incident Response

### If Rate Limiting Triggered Unexpectedly
1. Check logs for attack patterns
2. Increase rate limit if legitimate traffic
3. Block suspicious IPs if attack detected
4. Consider implementing per-user limits

### If Validation Errors Spike
1. Review validation schema
2. Check for API client issues
3. Communicate changes to frontend team
4. Update documentation if schema changed

### If Database Connectivity Issues
1. Verify DATABASE_URL and DIRECT_DATABASE_URL
2. Check Neon connection pool status
3. Review Prisma logs
4. Consider connection pool adjustment

### If JWT Verification Fails
1. Verify JWT secrets are correctly set
2. Check algorithm configuration
3. Confirm issuer and audience claims
4. Review token expiry times

## Rollback Procedure

If critical issues arise:
1. Revert to previous Vercel deployment
2. Revert code changes to last stable commit
3. Clear browser caches (users)
4. Restore database from backup if needed
5. Post incident analysis and documentation

## Security Documentation References

- Main Security Doc: `SECURITY.md`
- Implementation Summary: `SECURITY_IMPLEMENTATION.md`
- Environment Config: `apps/api/.env.example`
- GitHub Workflows: `.github/workflows/ci.yml`
- Dependabot Config: `.github/dependabot.yml`

## Support Contacts

For security issues:
- Create a GitHub security advisory draft
- Email security team before disclosure
- Do not create public issues for vulnerabilities

## Sign-Off

- [ ] Security Lead: _________________ Date: _____
- [ ] DevOps Lead: __________________ Date: _____
- [ ] Tech Lead: ___________________ Date: _____

## Deployment Date: _______________
## Deployed By: ___________________
## Environment: ___________________
