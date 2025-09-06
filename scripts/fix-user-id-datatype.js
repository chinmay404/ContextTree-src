#!/usr/bin/env node
/**
 * Fix User ID Data Type Migration Script
 * 
 * This script fixes the data type mismatch between:
 * - users.id (currently integer, should be text)
 * - sessions.user_id (currently text)
 * - accounts.user_id (currently integer, should be text)
 * 
 * This migration will:
 * 1. Drop all foreign key constraints
 * 2. Convert users.id from integer to text
 * 3. Convert accounts.user_id from integer to text to match
 * 4. Recreate all foreign key constraints
 * 
 * Usage:
 *   node scripts/fix-user-id-datatype.js --dry-run    # preview changes
 *   node scripts/fix-user-id-datatype.js --fix        # apply changes
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FIX = args.includes('--fix');

if (!DRY_RUN && !FIX) {
  console.log('Usage:');
  console.log('  node scripts/fix-user-id-datatype.js --dry-run    # preview changes');
  console.log('  node scripts/fix-user-id-datatype.js --fix        # apply changes');
  process.exit(1);
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.padEnd(7)} ${message}`);
}

async function main() {
  log('INFO', 'Starting User ID data type migration...');
  log('INFO', `Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'APPLY CHANGES'}`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Step 1: Analyze current state
    await analyzeCurrentState(pool);
    
    if (FIX) {
      // Step 2: Execute migration
      await executeMigration(pool);
    }
    
    log('SUCCESS', 'Migration completed successfully');
    
  } catch (error) {
    log('ERROR', `Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function analyzeCurrentState(pool) {
  log('INFO', 'Analyzing current database state...');
  
  // Check current data types
  const columnsQuery = `
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name IN ('users', 'accounts', 'sessions')
    AND c.column_name IN ('id', 'user_id')
    ORDER BY c.table_name, c.column_name;
  `;
  
  const columnsResult = await pool.query(columnsQuery);
  
  log('INFO', 'Current column data types:');
  columnsResult.rows.forEach(row => {
    log('INFO', `  ${row.table_name}.${row.column_name}: ${row.data_type}`);
  });
  
  // Check row counts
  const tables = ['users', 'accounts', 'sessions'];
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      log('INFO', `  ${table}: ${result.rows[0].count} rows`);
    } catch (error) {
      log('WARN', `  ${table}: could not count rows (${error.message})`);
    }
  }
  
  // Check existing constraints
  const constraintsQuery = `
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('accounts', 'sessions')
    ORDER BY tc.table_name;
  `;
  
  const constraintsResult = await pool.query(constraintsQuery);
  
  log('INFO', 'Current foreign key constraints:');
  constraintsResult.rows.forEach(row => {
    log('INFO', `  ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
  });
}

async function executeMigration(pool) {
  log('INFO', 'Executing migration...');
  
  // Start transaction
  await pool.query('BEGIN');
  
  try {
    // Step 1: Drop all foreign key constraints
    log('INFO', 'Step 1: Dropping foreign key constraints...');
    
    const dropConstraints = [
      'ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey',
      'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey'
    ];
    
    for (const sql of dropConstraints) {
      await pool.query(sql);
      log('INFO', `  Executed: ${sql}`);
    }
    
    // Step 2: Convert users.id from integer to text
    log('INFO', 'Step 2: Converting users.id from integer to text...');
    
    // We need to convert the ID values to text format
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN id TYPE text USING id::text
    `);
    log('INFO', '  Converted users.id to text type');
    
    // Step 3: Convert accounts.user_id from integer to text  
    log('INFO', 'Step 3: Converting accounts.user_id from integer to text...');
    
    await pool.query(`
      ALTER TABLE accounts 
      ALTER COLUMN user_id TYPE text USING user_id::text
    `);
    log('INFO', '  Converted accounts.user_id to text type');
    
    // Step 4: Recreate foreign key constraints
    log('INFO', 'Step 4: Recreating foreign key constraints...');
    
    const createConstraints = [
      `ALTER TABLE accounts 
       ADD CONSTRAINT accounts_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
      
      `ALTER TABLE sessions 
       ADD CONSTRAINT sessions_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
    ];
    
    for (const sql of createConstraints) {
      await pool.query(sql);
      log('SUCCESS', `  Created constraint successfully`);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    log('SUCCESS', 'Migration completed successfully');
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    log('ERROR', `Migration failed, rolled back: ${error.message}`);
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
