#!/usr/bin/env node
/**
 * Test NextAuth Database Integration
 * 
 * This script tests if NextAuth can successfully create users in the database
 * without encountering the password column constraint error.
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function testNextAuthIntegration() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
  });
  
  try {
    console.log('🧪 Testing NextAuth Database Integration...');
    
    // Test creating a user like NextAuth would for OAuth
    const testEmail = `test-oauth-${Date.now()}@example.com`;
    const testName = 'Test OAuth User';
    const testImage = 'https://example.com/avatar.jpg';
    
    console.log(`📝 Testing user creation for: ${testEmail}`);
    
    // This simulates what NextAuth does when an OAuth user signs in
    const insertQuery = `
      INSERT INTO users (email, name, image, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (email) DO UPDATE SET 
        name=COALESCE(excluded.name, users.name), 
        image=excluded.image, 
        updated_at=now()
      RETURNING id, email, name, image
    `;
    
    const result = await pool.query(insertQuery, [
      testEmail,
      testName,
      testImage,
    ]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User created successfully!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Image: ${user.image}`);
      
      // Clean up the test user
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
      console.log('🧹 Test user cleaned up');
      
    } else {
      console.log('❌ No user returned from insert query');
    }
    
    console.log('\n✅ NextAuth integration test completed successfully!');
    console.log('   OAuth users can now be created without password constraint errors.');
    
  } catch (error) {
    console.error('❌ NextAuth integration test failed:', error.message);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    if (error.message.includes('password') && error.message.includes('not-null')) {
      console.error('\n🔧 The password column is still NOT NULL. Run the fix script:');
      console.error('   node scripts/fix-password-column.js --apply');
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testNextAuthIntegration().catch(console.error);
}
