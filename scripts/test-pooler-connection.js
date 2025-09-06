#!/usr/bin/env node
/**
 * Test Supabase Pooler Connection
 * 
 * This script tests the Supabase pooler connection specifically
 */

const { Pool } = require('pg');

async function testPoolerConnection() {
  console.log('🔍 Testing Supabase Pooler Connection...');
  
  const poolerUrl = 'postgresql://postgres.svdikokcujvmalfrpida:rNneb6YI8vJPaqQH@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
  
  const pool = new Pool({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
  });
  
  try {
    console.log('📡 Connecting to Supabase pooler...');
    const client = await pool.connect();
    console.log('✅ Pooler connection successful!');
    
    // Test basic functionality
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log(`📋 Database: ${result.rows[0].current_database}`);
    console.log(`👤 User: ${result.rows[0].current_user}`);
    console.log(`🔧 PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
    
    // Test table access
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `);
    console.log(`📊 Public tables found: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    // Test users table specifically
    const usersCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (usersCheck.rows.length > 0) {
      console.log('\n👤 Users table structure:');
      usersCheck.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
      });
    }
    
    client.release();
    console.log('\n✅ All tests passed! The pooler connection is working correctly.');
    
  } catch (error) {
    console.error('❌ Pooler connection failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      severity: error.severity,
      detail: error.detail
    });
    
    if (error.code === '08006') {
      console.error('\n💡 Authentication error - check credentials');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS resolution error - check hostname');
    }
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testPoolerConnection().catch(console.error);
}
