/**
 * Simple script to test database connectivity and table existence
 * Run with: node scripts/test-db-connection.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  max: 1,
});

async function testConnection() {
  let client;
  
  try {
    console.log('Testing database connection...');
    console.log('Using connection string:', process.env.DATABASE_URL?.replace(/\/\/[^@]+@/, '//***@'));
    
    client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test query timeout
    await client.query('SET statement_timeout = 30000');
    
    // Check NextAuth tables
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [table]);
        
        if (result.rows.length > 0) {
          console.log(`✅ Table '${table}' exists`);
          
          // Count rows for context
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   └─ Contains ${countResult.rows[0].count} rows`);
        } else {
          console.log(`❌ Table '${table}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${table}':`, error.message);
      }
    }
    
    // Check canvas-related tables
    const canvasTables = ['canvases', 'nodes', 'messages'];
    
    for (const table of canvasTables) {
      try {
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [table]);
        
        if (result.rows.length > 0) {
          console.log(`✅ Canvas table '${table}' exists`);
          
          // Count rows for context
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   └─ Contains ${countResult.rows[0].count} rows`);
        } else {
          console.log(`ℹ️  Canvas table '${table}' does not exist (will be created by app)`);
        }
      } catch (error) {
        console.log(`❌ Error checking canvas table '${table}':`, error.message);
      }
    }
    
    console.log('\n🎉 Database connection test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Check if the database server is running and accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Suggestion: Check the database host/URL in your environment variables');
    } else if (error.code === '28P01') {
      console.log('💡 Suggestion: Check database credentials (username/password)');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Suggestion: Database connection is timing out - check network connectivity');
    }
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection().catch(console.error);
