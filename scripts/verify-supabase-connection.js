#!/usr/bin/env node
/**
 * Supabase Connection Verification Script
 * 
 * This script tests different Supabase connection configurations to find the correct one
 */

const { Pool } = require('pg');

async function verifySupabaseConnection() {
  console.log('🔍 Verifying Supabase connection...');
  
  // Test different hostname variations - there seems to be a typo in your current one
  const configurations = [
    {
      name: 'Current configuration',
      url: 'postgresql://postgres:rNneb6YI8vJPaqQH@db.svdikokcujvmalfrpida.supabase.co:5432/postgres'
    },
    {
      name: 'Fixed hostname (removed extra "c")',
      url: 'postgresql://postgres:rNneb6YI8vJPaqQH@db.svdikokcrujvmalfrpida.supabase.co:5432/postgres'
    },
    {
      name: 'Direct IP connection',
      host: 'db.svdikokcrujvmalfrpida.supabase.co',
      user: 'postgres',
      password: 'rNneb6YI8vJPaqQH',
      database: 'postgres',
      port: 5432,
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Alternative pooler connection',
      url: 'postgresql://postgres.svdikokcrujvmalfrpida:rNneb6YI8vJPaqQH@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
    }
  ];
  
  for (const config of configurations) {
    try {
      console.log(`\n🔗 Testing: ${config.name}`);
      
      let pool;
      if (config.url) {
        pool = new Pool({
          connectionString: config.url,
          connectionTimeoutMillis: 10000,
          ssl: { rejectUnauthorized: false }
        });
      } else {
        pool = new Pool({
          ...config,
          connectionTimeoutMillis: 10000
        });
      }
      
      console.log('   Attempting connection...');
      const client = await pool.connect();
      console.log('✅ Connection successful!');
      
      // Test a simple query
      const result = await client.query('SELECT current_database(), current_user, version()');
      console.log(`   📋 Database: ${result.rows[0].current_database}`);
      console.log(`   👤 User: ${result.rows[0].current_user}`);
      console.log(`   🔧 PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      
      // Test if we can see tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      console.log(`   📊 Public tables found: ${tables.rows.length}`);
      
      client.release();
      await pool.end();
      
      console.log(`\n✅ SUCCESS! Use this configuration:`);
      if (config.url) {
        console.log(`DATABASE_URL=${config.url}`);
      } else {
        console.log(`DATABASE_URL=postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
      }
      
      return config;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.code) {
        console.log(`   Error code: ${error.code}`);
      }
      if (error.code === '08006') {
        console.log('   💡 This is an authentication error - check credentials');
      }
      if (error.code === 'ENOTFOUND') {
        console.log('   💡 This is a DNS resolution error - check hostname');
      }
    }
  }
  
  console.log('\n❌ Could not connect with any configuration.');
  console.log('\n📋 Next steps:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → Database');
  console.log('4. Check the connection string and reset password if needed');
  console.log('5. Make sure the database is not paused');
}

// Run the verification
if (require.main === module) {
  verifySupabaseConnection().catch(console.error);
}
