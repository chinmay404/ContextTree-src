#!/usr/bin/env node
/**
 * Production Database Setup Script
 * 
 * This script ensures that all database tables are created correctly with proper
 * foreign key constraints for the NextAuth.js + PostgreSQL setup.
 * 
 * It handles the specific issue where sessions_user_id_fkey constraint fails
 * by ensuring proper table creation order and data cleanup.
 * 
 * Usage:
 *   node scripts/setup-production-db.js                # dry run
 *   node scripts/setup-production-db.js --apply        # apply changes
 *   node scripts/setup-production-db.js --fix-constraints # fix constraint issues
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FIX_CONSTRAINTS = args.includes('--fix-constraints');

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.padEnd(7)} ${message}`);
}

async function main() {
  log('INFO', `Starting database setup (${APPLY ? 'APPLY' : 'DRY-RUN'} mode)`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('SUCCESS', 'Database connection established');
    
    if (FIX_CONSTRAINTS || APPLY) {
      await fixConstraintIssues(pool);
      await createTablesInOrder(pool);
      await verifyConstraints(pool);
    } else {
      await analyzeCurrentState(pool);
    }
    
    log('SUCCESS', 'Database setup completed successfully');
    
  } catch (error) {
    log('ERROR', `Database setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function analyzeCurrentState(pool) {
  log('INFO', 'Analyzing current database state...');
  
  // Check if tables exist
  const tablesQuery = `
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'accounts', 'sessions', 'verification_tokens', 'canvases', 'nodes', 'messages')
    ORDER BY tablename;
  `;
  
  const tablesResult = await pool.query(tablesQuery);
  const existingTables = tablesResult.rows.map(row => row.tablename);
  
  log('INFO', `Found ${existingTables.length} existing tables: ${existingTables.join(', ')}`);
  
  // Check for constraint violations
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
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('accounts', 'sessions')
    ORDER BY tc.table_name, tc.constraint_name;
  `;
  
  const constraintsResult = await pool.query(constraintsQuery);
  
  if (constraintsResult.rows.length > 0) {
    log('INFO', 'Found foreign key constraints:');
    constraintsResult.rows.forEach(row => {
      log('INFO', `  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
  } else {
    log('WARN', 'No foreign key constraints found - this might be the issue');
  }
  
  // Check for orphaned records
  if (existingTables.includes('sessions') && existingTables.includes('users')) {
    const orphanedSessionsQuery = `
      SELECT COUNT(*) as count
      FROM sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE u.id IS NULL;
    `;
    
    const orphanedResult = await pool.query(orphanedSessionsQuery);
    const orphanedCount = parseInt(orphanedResult.rows[0].count);
    
    if (orphanedCount > 0) {
      log('WARN', `Found ${orphanedCount} orphaned session records`);
    } else {
      log('INFO', 'No orphaned session records found');
    }
  }
}

async function fixConstraintIssues(pool) {
  log('INFO', 'Fixing constraint issues...');
  
  // Drop problematic constraints first
  const dropConstraints = [
    'ALTER TABLE IF EXISTS sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey',
    'ALTER TABLE IF EXISTS accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey',
    'ALTER TABLE IF EXISTS canvases DROP CONSTRAINT IF EXISTS canvases_user_email_fkey',
    'ALTER TABLE IF EXISTS nodes DROP CONSTRAINT IF EXISTS nodes_canvas_id_fkey',
    'ALTER TABLE IF EXISTS nodes DROP CONSTRAINT IF EXISTS nodes_user_email_fkey',
    'ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_node_id_fkey',
    'ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_canvas_id_fkey',
    'ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_user_email_fkey'
  ];
  
  for (const sql of dropConstraints) {
    try {
      if (APPLY) {
        await pool.query(sql);
        log('INFO', `Executed: ${sql}`);
      } else {
        log('DRY-RUN', sql);
      }
    } catch (error) {
      log('WARN', `Failed to execute ${sql}: ${error.message}`);
    }
  }
  
  // Clean up orphaned records
  if (APPLY) {
    await cleanupOrphanedRecords(pool);
  }
}

async function cleanupOrphanedRecords(pool) {
  log('INFO', 'Cleaning up orphaned records...');
  
  const cleanupQueries = [
    // Remove sessions without valid users
    `DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL)`,
    
    // Remove accounts without valid users
    `DELETE FROM accounts WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL)`,
    
    // Remove canvases without valid users
    `DELETE FROM canvases WHERE user_email NOT IN (SELECT email FROM users WHERE email IS NOT NULL)`,
    
    // Remove nodes without valid canvases
    `DELETE FROM nodes WHERE canvas_id NOT IN (SELECT id FROM canvases WHERE id IS NOT NULL)`,
    
    // Remove messages without valid nodes
    `DELETE FROM messages WHERE node_id NOT IN (SELECT id FROM nodes WHERE id IS NOT NULL)`
  ];
  
  for (const sql of cleanupQueries) {
    try {
      const result = await pool.query(sql);
      log('INFO', `Cleaned up: ${result.rowCount || 0} records - ${sql.split(' ')[2]}`);
    } catch (error) {
      log('WARN', `Failed cleanup: ${error.message}`);
    }
  }
}

async function createTablesInOrder(pool) {
  log('INFO', 'Creating tables in proper order...');
  
  // Create tables in dependency order
  const tableCreationSQL = `
    -- Step 1: Create users table first (no dependencies)
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
    );
    
    -- Step 2: Create NextAuth tables that depend on users
    CREATE TABLE IF NOT EXISTS accounts (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      type text NOT NULL,
      provider text NOT NULL,
      provider_account_id text NOT NULL,
      refresh_token text,
      access_token text,
      expires_at bigint,
      token_type text,
      scope text,
      id_token text,
      session_state text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(provider, provider_account_id)
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      session_token text NOT NULL UNIQUE,
      user_id text NOT NULL,
      expires timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier text NOT NULL,
      token text NOT NULL,
      expires timestamptz NOT NULL,
      PRIMARY KEY (identifier, token)
    );
    
    -- Step 3: Create application tables
    CREATE TABLE IF NOT EXISTS canvases (
      id text PRIMARY KEY,
      user_email text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    
    CREATE TABLE IF NOT EXISTS nodes (
      id text PRIMARY KEY,
      canvas_id text NOT NULL,
      user_email text NOT NULL,
      data jsonb NOT NULL,
      parent_node_id text,
      forked_from_message_id text,
      is_primary boolean,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY,
      node_id text NOT NULL,
      canvas_id text NOT NULL,
      user_email text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      timestamp timestamptz NOT NULL DEFAULT now()
    );
  `;
  
  if (APPLY) {
    await pool.query(tableCreationSQL);
    log('SUCCESS', 'Tables created successfully');
  } else {
    log('DRY-RUN', 'Would create tables with proper structure');
  }
  
  // Create indexes
  const indexSQL = `
    CREATE INDEX IF NOT EXISTS idx_nodes_canvas ON nodes(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_node_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_forked_from ON nodes(forked_from_message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_node ON messages(node_id);
    CREATE INDEX IF NOT EXISTS idx_messages_canvas ON messages(canvas_id);
  `;
  
  if (APPLY) {
    await pool.query(indexSQL);
    log('SUCCESS', 'Indexes created successfully');
  } else {
    log('DRY-RUN', 'Would create indexes');
  }
}

async function verifyConstraints(pool) {
  log('INFO', 'Adding foreign key constraints...');
  
  const constraintSQL = `
    -- Add foreign key constraints
    ALTER TABLE accounts 
    ADD CONSTRAINT accounts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
    ALTER TABLE sessions 
    ADD CONSTRAINT sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
    ALTER TABLE canvases 
    ADD CONSTRAINT canvases_user_email_fkey 
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE;
    
    ALTER TABLE nodes 
    ADD CONSTRAINT nodes_canvas_id_fkey 
    FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE;
    
    ALTER TABLE nodes 
    ADD CONSTRAINT nodes_user_email_fkey 
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE;
    
    ALTER TABLE messages 
    ADD CONSTRAINT messages_node_id_fkey 
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE;
    
    ALTER TABLE messages 
    ADD CONSTRAINT messages_canvas_id_fkey 
    FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE;
    
    ALTER TABLE messages 
    ADD CONSTRAINT messages_user_email_fkey 
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE;
  `;
  
  if (APPLY) {
    try {
      await pool.query(constraintSQL);
      log('SUCCESS', 'Foreign key constraints added successfully');
    } catch (error) {
      log('ERROR', `Failed to add constraints: ${error.message}`);
      // Try adding constraints one by one
      await addConstraintsIndividually(pool);
    }
  } else {
    log('DRY-RUN', 'Would add foreign key constraints');
  }
}

async function addConstraintsIndividually(pool) {
  const constraints = [
    'ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'ALTER TABLE canvases ADD CONSTRAINT canvases_user_email_fkey FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE',
    'ALTER TABLE nodes ADD CONSTRAINT nodes_canvas_id_fkey FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE',
    'ALTER TABLE nodes ADD CONSTRAINT nodes_user_email_fkey FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE',
    'ALTER TABLE messages ADD CONSTRAINT messages_node_id_fkey FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE',
    'ALTER TABLE messages ADD CONSTRAINT messages_canvas_id_fkey FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE',
    'ALTER TABLE messages ADD CONSTRAINT messages_user_email_fkey FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE'
  ];
  
  for (const constraintSQL of constraints) {
    try {
      await pool.query(constraintSQL);
      log('SUCCESS', `Added constraint: ${constraintSQL.split(' ')[4]}`);
    } catch (error) {
      log('WARN', `Failed to add constraint: ${error.message}`);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
