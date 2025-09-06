#!/usr/bin/env node
/**
 * Fix NextAuth PostgreSQL Password Column Issue
 * 
 * This script fixes the issue where the users table has a NOT NULL password column
 * that conflicts with OAuth authentication (where users don't have passwords).
 * 
 * Usage:
 *   node scripts/fix-password-column.js --dry-run    # Preview changes
 *   node scripts/fix-password-column.js --apply      # Apply changes
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || !args.includes('--apply');
const APPLY = args.includes('--apply');

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'INFO' ? '📋' : level === 'SUCCESS' ? '✅' : level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️' : '🔧';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    log('INFO', 'Starting NextAuth password column fix...');
    
    if (DRY_RUN) {
      log('WARNING', 'DRY RUN MODE - No changes will be made');
      log('INFO', 'Use --apply flag to actually apply changes');
    }
    
    // Check current users table structure
    log('INFO', 'Checking current users table structure...');
    const usersStructure = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      AND column_name = 'password';
    `);
    
    if (usersStructure.rows.length === 0) {
      log('SUCCESS', 'No password column found in users table - no fix needed!');
      return;
    }
    
    const passwordColumn = usersStructure.rows[0];
    log('INFO', `Found password column: ${passwordColumn.data_type}, nullable: ${passwordColumn.is_nullable}`);
    
    if (passwordColumn.is_nullable === 'YES') {
      log('SUCCESS', 'Password column is already nullable - no fix needed!');
      return;
    }
    
    // Check if there are any users with non-null passwords
    const usersWithPasswords = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE password IS NOT NULL AND password != '';
    `);
    
    const passwordUserCount = parseInt(usersWithPasswords.rows[0].count);
    log('INFO', `Found ${passwordUserCount} users with passwords`);
    
    if (passwordUserCount > 0) {
      log('WARNING', `There are ${passwordUserCount} users with passwords`);
      log('WARNING', 'These passwords will remain but the column will be made nullable');
      log('WARNING', 'This allows OAuth users to be created without passwords');
    }
    
    // Generate the SQL to fix the issue
    const fixSQL = `
      -- Make password column nullable to support OAuth authentication
      ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      
      -- Add comment to document the change
      COMMENT ON COLUMN users.password IS 'Password for local auth users (NULL for OAuth users)';
    `;
    
    log('INFO', 'SQL to be executed:');
    console.log(fixSQL);
    
    if (APPLY) {
      log('INFO', 'Applying fix...');
      
      // Execute the fix
      await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL');
      await pool.query(`COMMENT ON COLUMN users.password IS 'Password for local auth users (NULL for OAuth users)'`);
      
      log('SUCCESS', 'Password column fix applied successfully!');
      
      // Verify the fix
      const verifyResult = await pool.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name = 'password';
      `);
      
      if (verifyResult.rows[0]?.is_nullable === 'YES') {
        log('SUCCESS', 'Verification: Password column is now nullable ✓');
      } else {
        log('ERROR', 'Verification failed: Password column is still NOT NULL');
      }
      
    } else {
      log('WARNING', 'Dry run complete. Use --apply to actually make these changes.');
    }
    
  } catch (error) {
    log('ERROR', `Error during fix: ${error.message}`);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
