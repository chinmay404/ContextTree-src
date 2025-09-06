#!/usr/bin/env node
/**
 * Foreign Key Constraint Fix Script
 * 
 * This script specifically addresses the "sessions_user_id_fkey" constraint error
 * that occurs in NextAuth.js with PostgreSQL adapter.
 * 
 * The issue typically happens when:
 * 1. Tables are created in wrong order
 * 2. Orphaned records exist that violate constraints
 * 3. Data type mismatches between referenced columns
 * 
 * Usage:
 *   node scripts/fix-foreign-key-constraint.js                 # analyze only
 *   node scripts/fix-foreign-key-constraint.js --fix          # fix issues
 *   node scripts/fix-foreign-key-constraint.js --force-fix    # aggressive fix
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const FORCE_FIX = args.includes('--force-fix');

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.padEnd(7)} ${message}`);
}

async function main() {
  log('INFO', 'Starting foreign key constraint diagnosis and fix...');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Step 1: Diagnose the current state
    await diagnoseConstraints(pool);
    
    // Step 2: Check for orphaned records
    await checkOrphanedRecords(pool);
    
    // Step 3: Fix if requested
    if (FIX || FORCE_FIX) {
      await fixConstraints(pool, FORCE_FIX);
    } else {
      log('INFO', 'Run with --fix to apply fixes, or --force-fix for aggressive cleanup');
    }
    
    log('SUCCESS', 'Constraint diagnosis completed');
    
  } catch (error) {
    log('ERROR', `Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function diagnoseConstraints(pool) {
  log('INFO', 'Diagnosing constraint issues...');
  
  // Check table existence
  const tablesQuery = `
    SELECT 
      t.table_name,
      t.table_type
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_name IN ('users', 'accounts', 'sessions', 'verification_tokens')
    ORDER BY t.table_name;
  `;
  
  const tablesResult = await pool.query(tablesQuery);
  const existingTables = tablesResult.rows.map(row => row.table_name);
  
  log('INFO', `Found NextAuth tables: ${existingTables.join(', ')}`);
  
  // Check column data types
  const columnsQuery = `
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name IN ('users', 'accounts', 'sessions')
    AND c.column_name IN ('id', 'user_id')
    ORDER BY c.table_name, c.column_name;
  `;
  
  const columnsResult = await pool.query(columnsQuery);
  
  log('INFO', 'Column information:');
  columnsResult.rows.forEach(row => {
    log('INFO', `  ${row.table_name}.${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
  });
  
  // Check existing constraints
  const constraintsQuery = `
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('accounts', 'sessions')
    ORDER BY tc.table_name, tc.constraint_name;
  `;
  
  const constraintsResult = await pool.query(constraintsQuery);
  
  if (constraintsResult.rows.length > 0) {
    log('INFO', 'Existing foreign key constraints:');
    constraintsResult.rows.forEach(row => {
      log('INFO', `  ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} (${row.delete_rule})`);
    });
  } else {
    log('WARN', 'No foreign key constraints found on accounts/sessions tables');
  }
}

async function checkOrphanedRecords(pool) {
  log('INFO', 'Checking for orphaned records...');
  
  const checks = [
    {
      name: 'Orphaned accounts',
      query: `
        SELECT COUNT(*) as count 
        FROM accounts a 
        LEFT JOIN users u ON a.user_id = u.id 
        WHERE u.id IS NULL
      `
    },
    {
      name: 'Orphaned sessions',
      query: `
        SELECT COUNT(*) as count 
        FROM sessions s 
        LEFT JOIN users u ON s.user_id = u.id 
        WHERE u.id IS NULL
      `
    },
    {
      name: 'Sessions with NULL user_id',
      query: `
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE user_id IS NULL
      `
    },
    {
      name: 'Accounts with NULL user_id',
      query: `
        SELECT COUNT(*) as count 
        FROM accounts 
        WHERE user_id IS NULL
      `
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await pool.query(check.query);
      const count = parseInt(result.rows[0].count);
      
      if (count > 0) {
        log('WARN', `${check.name}: ${count} records`);
      } else {
        log('INFO', `${check.name}: 0 records (good)`);
      }
    } catch (error) {
      log('WARN', `Could not check ${check.name}: ${error.message}`);
    }
  }
}

async function fixConstraints(pool, forceFix = false) {
  log('INFO', `Fixing constraints (force: ${forceFix})...`);
  
  // Step 1: Drop existing problematic constraints
  const dropConstraints = [
    'sessions_user_id_fkey',
    'accounts_user_id_fkey'
  ];
  
  for (const constraintName of dropConstraints) {
    try {
      const tableName = constraintName.split('_')[0];
      await pool.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName}`);
      log('INFO', `Dropped constraint: ${constraintName}`);
    } catch (error) {
      log('WARN', `Could not drop ${constraintName}: ${error.message}`);
    }
  }
  
  // Step 2: Clean up orphaned records
  if (forceFix) {
    await cleanupOrphanedRecords(pool);
  }
  
  // Step 3: Ensure users table exists with proper structure
  await ensureUsersTable(pool);
  
  // Step 4: Re-create constraints
  await recreateConstraints(pool);
}

async function cleanupOrphanedRecords(pool) {
  log('INFO', 'Cleaning up orphaned records...');
  
  const cleanupQueries = [
    {
      name: 'Sessions with NULL user_id',
      query: `DELETE FROM sessions WHERE user_id IS NULL`
    },
    {
      name: 'Accounts with NULL user_id', 
      query: `DELETE FROM accounts WHERE user_id IS NULL`
    },
    {
      name: 'Orphaned sessions',
      query: `DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL)`
    },
    {
      name: 'Orphaned accounts',
      query: `DELETE FROM accounts WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL)`
    }
  ];
  
  for (const cleanup of cleanupQueries) {
    try {
      const result = await pool.query(cleanup.query);
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        log('INFO', `${cleanup.name}: deleted ${deletedCount} records`);
      } else {
        log('INFO', `${cleanup.name}: no records to delete`);
      }
    } catch (error) {
      log('WARN', `Failed to cleanup ${cleanup.name}: ${error.message}`);
    }
  }
}

async function ensureUsersTable(pool) {
  log('INFO', 'Ensuring users table exists with proper structure...');
  
  const createUsersSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      name text,
      image text,
      email_verified timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      canvas_ids text[] DEFAULT array[]::text[],
      canvas_count integer DEFAULT 0,
      total_nodes integer DEFAULT 0
    )
  `;
  
  try {
    await pool.query(createUsersSQL);
    log('SUCCESS', 'Users table ready');
  } catch (error) {
    log('ERROR', `Failed to create users table: ${error.message}`);
    throw error;
  }
}

async function recreateConstraints(pool) {
  log('INFO', 'Recreating foreign key constraints...');
  
  const constraints = [
    {
      name: 'accounts_user_id_fkey',
      sql: `
        ALTER TABLE accounts 
        ADD CONSTRAINT accounts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    },
    {
      name: 'sessions_user_id_fkey',
      sql: `
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `
    }
  ];
  
  for (const constraint of constraints) {
    try {
      await pool.query(constraint.sql);
      log('SUCCESS', `Created constraint: ${constraint.name}`);
    } catch (error) {
      log('ERROR', `Failed to create ${constraint.name}: ${error.message}`);
      
      // Try to provide helpful information
      if (error.message.includes('violates foreign key constraint')) {
        log('INFO', 'This error suggests orphaned records still exist');
        log('INFO', 'Try running with --force-fix to clean them up');
      }
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
