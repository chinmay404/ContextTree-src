# Database Foreign Key Constraint Fix

## Problem Description

The application was encountering the following error:

```
foreign key constraint "sessions_user_id_fkey" cannot be implemented
Error [GetUserByAccountError]: foreign key constraint "sessions_user_id_fkey" cannot be implemented
```

This error occurs in NextAuth.js when using PostgreSQL adapter, typically due to:

1. **Table Creation Order**: Tables with foreign keys being created before their referenced tables
2. **Orphaned Records**: Existing records that violate the foreign key constraints
3. **Concurrent Initialization**: Multiple initialization attempts creating conflicting constraints
4. **Data Type Mismatches**: Inconsistent column types between referenced columns

## Root Cause Analysis

The issue was in the database initialization code in `lib/auth.ts` where all tables were being created in a single SQL statement with foreign key constraints. This approach can fail when:

- The `users` table creation hasn't completed before `sessions` table tries to reference it
- There are existing orphaned records in `sessions` or `accounts` tables
- Multiple instances try to initialize the database simultaneously

## Solution Implemented

### 1. Updated Database Initialization (`lib/auth.ts`)

**Changes Made:**
- Split table creation into sequential steps
- Create `users` table first (no dependencies)
- Create tables with foreign keys second
- Add constraints separately using conditional SQL
- Added error handling to prevent initialization failures

**Key Improvements:**
```typescript
// Step 1: Create users table first
await pool.query(`CREATE TABLE IF NOT EXISTS users (...)`);

// Step 2: Create verification_tokens (no foreign keys)
await pool.query(`CREATE TABLE IF NOT EXISTS verification_tokens (...)`);

// Step 3: Create accounts and sessions (without constraints initially)
await pool.query(`CREATE TABLE IF NOT EXISTS accounts (...)`);
await pool.query(`CREATE TABLE IF NOT EXISTS sessions (...)`);

// Step 4: Add constraints conditionally
await pool.query(`
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'sessions_user_id_fkey') THEN
      ALTER TABLE sessions 
      ADD CONSTRAINT sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END $$;
`);
```

### 2. Production Database Setup Script (`scripts/setup-production-db.js`)

**Features:**
- Comprehensive database analysis and setup
- Dry-run mode for safe testing
- Orphaned record cleanup
- Constraint verification
- Individual constraint addition with error handling

**Usage:**
```bash
# Analyze current state
node scripts/setup-production-db.js

# Apply fixes
node scripts/setup-production-db.js --apply

# Fix constraint issues specifically
node scripts/setup-production-db.js --fix-constraints
```

### 3. Foreign Key Constraint Fix Script (`scripts/fix-foreign-key-constraint.js`)

**Features:**
- Targeted diagnosis of constraint issues
- Orphaned record detection and cleanup
- Force fix option for aggressive cleanup
- Detailed constraint recreation

**Usage:**
```bash
# Analyze constraint issues
node scripts/fix-foreign-key-constraint.js

# Fix constraint issues
node scripts/fix-foreign-key-constraint.js --fix

# Aggressive cleanup and fix
node scripts/fix-foreign-key-constraint.js --force-fix
```

## Immediate Fix Steps

If you're experiencing this issue right now, follow these steps:

### Step 1: Run the Constraint Fix Script
```bash
# First, analyze the issue
node scripts/fix-foreign-key-constraint.js

# If orphaned records are found, clean them up
node scripts/fix-foreign-key-constraint.js --force-fix
```

### Step 2: If the Above Doesn't Work, Use the Production Setup Script
```bash
# Run a comprehensive database setup
node scripts/setup-production-db.js --apply --fix-constraints
```

### Step 3: Restart Your Application
After running the fix scripts, restart your Next.js application to ensure the new initialization code takes effect.

## Prevention Measures

### Environment Variables
Ensure these environment variables are properly set:
```env
DATABASE_URL=your_postgresql_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=your_application_url
NEXTAUTH_SECRET=your_nextauth_secret
```

### Database Monitoring
- Monitor for orphaned records periodically
- Check constraint violations in logs
- Ensure database connection stability

### Code Best Practices
- Always create tables in dependency order
- Use conditional constraint addition
- Implement proper error handling in initialization
- Test database initialization in development

## Troubleshooting

### If the Error Persists
1. Check database logs for specific constraint violation details
2. Verify all environment variables are set correctly
3. Ensure database user has proper permissions
4. Run the diagnostic scripts to identify remaining issues

### Common Issues
- **Permission Errors**: Database user lacks CREATE/ALTER permissions
- **Connection Issues**: DATABASE_URL is incorrect or database is unreachable
- **Data Corruption**: Existing data violates new constraints

### Manual Database Reset (Last Resort)
If all else fails, you can manually reset the NextAuth tables:

```sql
-- WARNING: This will delete all user sessions and accounts
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
-- Keep users table to preserve user data
```

Then run the setup script:
```bash
node scripts/setup-production-db.js --apply
```

## Related Files

- `lib/auth.ts` - NextAuth configuration with improved initialization
- `scripts/setup-production-db.js` - Comprehensive database setup
- `scripts/fix-foreign-key-constraint.js` - Constraint-specific fixes
- `lib/mongodb.ts` - Application database operations (separate from auth)

## Testing

After implementing the fix:

1. Test user authentication flow
2. Verify session management works
3. Check that user data persists correctly
4. Monitor logs for any remaining constraint errors

## Future Improvements

- Consider using database migrations instead of dynamic table creation
- Implement health checks for database constraints
- Add automated testing for database initialization
- Consider using a database schema management tool
