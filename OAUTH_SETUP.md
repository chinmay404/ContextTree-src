# ContextTree - OAuth Setup Guide

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API for your project

### 2. Create OAuth 2.0 Credentials

1. In the Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in the required fields:
     - App name: ContextTree
     - User support email: your email
     - App domain: `http://localhost:3000` (for development)
     - Developer contact: your email
4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: ContextTree
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### 3. Update Environment Variables

After creating the OAuth credentials, update your `.env.local` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-actual-google-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret-here
```

### 4. MongoDB Collections

NextAuth will automatically create the following collections in your MongoDB database:

- `accounts` - OAuth account information
- `sessions` - User sessions
- `users` - User profiles
- `verification_tokens` - Email verification tokens

### 5. Production Setup

For production deployment:

1. Update `NEXTAUTH_URL` in your environment variables to your production domain
2. Add your production domain to Google OAuth settings:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

## Security Features

- ✅ Secure session management with NextAuth.js
- ✅ MongoDB adapter for persistent sessions
- ✅ Protected API routes with authentication middleware
- ✅ User-specific canvas isolation
- ✅ Automatic user profile management
- ✅ CSRF protection
- ✅ JWT token encryption

## Usage

1. Start the development server: `pnpm dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign In" to authenticate with Google
4. Create and manage your conversation flows securely

## Troubleshooting

### Common Issues:

1. **OAuth Error: redirect_uri_mismatch**

   - Ensure the redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google`

2. **Database Connection Issues**

   - Verify your MongoDB URI in `.env.local`
   - Ensure the database user has read/write permissions

3. **Session Not Persisting**

   - Check that `NEXTAUTH_SECRET` is set in `.env.local`
   - Verify MongoDB connection is working

4. **Client ID/Secret Not Working**
   - Double-check the values from Google Cloud Console
   - Ensure no extra spaces or characters in `.env.local`

## Environment Variables Reference

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# MongoDB
MONGODB_URI=your-mongodb-connection-string
DB_NAME=contexttree
```
