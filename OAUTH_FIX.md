# 🚨 TEMPORARY LOCAL DEVELOPMENT SETUP

## If you can't access Google Cloud Console right now:

### Option 1: Create New OAuth App for Local Dev
1. Go to https://console.cloud.google.com/
2. Create a new OAuth 2.0 Client ID specifically for local development
3. Set Authorized redirect URIs to: http://localhost:3000/api/auth/callback/google
4. Use the new CLIENT_ID and CLIENT_SECRET in your .env.local

### Option 2: Use Different Port (Quick Test)
Try running on a different port that might already be configured:

```bash
npm run dev -- -p 3001
# or
pnpm dev -- -p 3001
```

Then update your .env NEXTAUTH_URL to:
```
NEXTAUTH_URL=http://localhost:3001
```

### Option 3: Test with Production Callback (Not Recommended)
Temporarily use production URL in your local .env:
```
NEXTAUTH_URL=https://v0-context-tree.vercel.app
```

But this will cause other issues, so only use for testing the OAuth flow.

## The Real Fix:
Add http://localhost:3000/api/auth/callback/google to your Google OAuth app's authorized redirect URIs.

Current redirect URIs probably only include:
- https://v0-context-tree.vercel.app/api/auth/callback/google

You need to ADD (not replace):
- http://localhost:3000/api/auth/callback/google
