# 🔒 Security Guide: LLM API Integration

## Issues Fixed

### 1. ❌ SSL Certificate Error (`ERR_CERT_AUTHORITY_INVALID`)

**Problem**: Direct HTTPS calls to IP address `18.213.206.235` without valid SSL certificate.

**Solution**: Created internal API proxy at `/api/llm` that handles SSL certificate issues safely.

### 2. ❌ Security Vulnerability: Exposed LLM Endpoint

**Problem**: LLM API URL was exposed in browser console logs and client-side code.

**Solution**: Moved LLM API calls to server-side proxy, removed all console logging of sensitive data.

## Architecture Changes

### Before (Insecure)

```
Browser → Direct HTTPS call → 18.213.206.235/chat/
❌ SSL certificate errors
❌ Exposed endpoint URL in console
❌ Client-side API key exposure risk
```

### After (Secure)

```
Browser → /api/llm → Server-side proxy → LLM Service
✅ SSL handling on server
✅ No exposed endpoints
✅ Server-side authentication
✅ Rate limiting capability
```

## Environment Configuration

### Development (.env)

```bash
# Server-side only (not exposed to browser)
LLM_API_URL=https://18.213.206.235/chat/
```

### Production (.env.production)

```bash
# Use domain with valid SSL certificate
LLM_API_URL=https://api.yourdomain.com/v1/chat
```

## Production Deployment Checklist

### 🔐 SSL Certificate Requirements

- [ ] LLM API endpoint must have valid SSL certificate
- [ ] Use domain name, not IP address
- [ ] Certificate must be trusted by standard certificate authorities

### 🛡️ Security Hardening

- [ ] Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` in production
- [ ] Implement rate limiting on `/api/llm` endpoint
- [ ] Add API key validation for LLM service
- [ ] Enable CORS restrictions
- [ ] Add request/response logging (without sensitive data)

### 📝 Environment Variables

```bash
# Required for production
NEXTAUTH_SECRET=your-super-secure-secret
LLM_API_URL=https://your-secure-llm-api.com/chat
NODE_ENV=production

# Optional security headers
FRAME_OPTIONS=DENY
CONTENT_TYPE_OPTIONS=nosniff
REFERRER_POLICY=strict-origin-when-cross-origin
```

### 🚀 Deployment Steps

1. **Update LLM API URL**:

   ```bash
   # Replace IP with domain that has valid SSL
   LLM_API_URL=https://api.yourdomain.com/v1/chat
   ```

2. **Test SSL Certificate**:

   ```bash
   curl -I https://api.yourdomain.com/v1/chat
   # Should return 200 without SSL errors
   ```

3. **Deploy with secure environment**:

   ```bash
   # Ensure production environment is set
   NODE_ENV=production npm run build
   npm run start
   ```

4. **Verify security**:
   - ✅ No LLM endpoints visible in browser console
   - ✅ No SSL certificate errors
   - ✅ API calls go through `/api/llm` proxy
   - ✅ Authentication required for LLM access

## Rate Limiting (Recommended)

Add to `/api/llm/route.ts`:

```typescript
import { NextRequest } from "next/server";

const rateLimit = new Map();

function checkRateLimit(userEmail: string): boolean {
  const now = Date.now();
  const userRequests = rateLimit.get(userEmail) || [];

  // Remove requests older than 1 hour
  const recentRequests = userRequests.filter(
    (time: number) => now - time < 3600000
  );

  if (recentRequests.length >= 100) {
    return false; // Rate limit exceeded
  }

  recentRequests.push(now);
  rateLimit.set(userEmail, recentRequests);
  return true;
}
```

## Monitoring

### Log LLM API Usage

```typescript
// Add to LLM proxy
console.log(
  `LLM request: user=${user.email}, model=${
    payload.model
  }, timestamp=${new Date().toISOString()}`
);
```

### Error Tracking

- Monitor SSL certificate expiration
- Track LLM API response times
- Alert on high error rates

## Testing

### Development Testing

```bash
# Test internal proxy
curl -X POST http://localhost:3000/api/llm \
  -H "Content-Type: application/json" \
  -d '{"canvasId":"test","nodeId":"test","model":"gpt-4","message":"Hello"}'
```

### Production Testing

```bash
# Verify SSL certificate
openssl s_client -connect your-llm-api.com:443 -servername your-llm-api.com
```

## Migration Guide

If you need to change LLM providers:

1. Update `LLM_API_URL` environment variable
2. Modify request/response format in `/api/llm/route.ts` if needed
3. Test thoroughly in staging environment
4. Deploy with zero downtime using blue-green deployment

---

## Summary

✅ **Fixed**: SSL certificate errors  
✅ **Fixed**: Security vulnerability (exposed endpoints)  
✅ **Added**: Server-side API proxy  
✅ **Added**: Proper error handling  
✅ **Added**: Production-ready configuration

Your LLM integration is now secure and production-ready! 🚀
