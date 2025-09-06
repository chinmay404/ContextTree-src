# OAuth Redirect URI Fix Guide

## The Problem
You're getting a `redirect_uri_mismatch` error because:
- Your app is running on `http://localhost:3000`
- But `NEXTAUTH_URL` was set to `https://v0-context-tree.vercel.app`
- Google OAuth redirect URIs don't include the localhost URLs

## Quick Fix Applied
✅ Updated `.env.local` to use `NEXTAUTH_URL=http://localhost:3000`

## Google OAuth Console Setup

### Step 1: Access Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project or create a new one

### Step 2: Navigate to Credentials
1. In the sidebar, go to "APIs & Services" → "Credentials"
2. Look for your OAuth 2.0 Client ID: `1079342085072-hs7eqp5qn1s9if263omtdjdufv93b4mv`

### Step 3: Update Authorized Redirect URIs
Add these URLs to support both local development and production:

```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
https://v0-context-tree.vercel.app/api/auth/callback/google
```

### Step 4: Save Changes
Click "Save" in the Google Cloud Console

## Environment Configuration

For **Local Development** (current setup):
```bash
NEXTAUTH_URL=http://localhost:3000
```

For **Production** (when deploying):
```bash
NEXTAUTH_URL=https://v0-context-tree.vercel.app
```

## Testing the Fix

1. Restart your development server:
   ```bash
   pnpm dev
   ```

2. Navigate to: http://localhost:3000/auth/signin

3. Try signing in with Google

## Common Issues & Solutions

### Issue: Still getting redirect_uri_mismatch
**Solution:** 
- Double-check the Google OAuth console has the correct redirect URIs
- Make sure you clicked "Save" in Google Cloud Console
- Try clearing browser cache and cookies

### Issue: NEXTAUTH_URL not updating
**Solution:**
- Restart your development server after changing `.env.local`
- Check that `.env.local` is in your project root directory

### Issue: Production deployment
**Solution:**
- For production, change `NEXTAUTH_URL` back to your production URL
- Use environment variables in your hosting platform (Vercel, etc.)

## Verification Steps

1. ✅ Local development server running on port 3000
2. ✅ NEXTAUTH_URL updated to localhost
3. ⏳ Google OAuth console updated (manual step required)
4. ⏳ Test OAuth sign-in flow

After updating Google OAuth settings, your authentication should work correctly!
