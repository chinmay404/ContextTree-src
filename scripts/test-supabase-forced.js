#!/usr/bin/env node
/**
 * Test NextAuth with Forced Supabase Connection
 */

const { Pool } = require("pg");
const crypto = require("crypto");

// Force the Supabase URL (from your .env file)
const SUPABASE_URL =
  "postgresql://postgres.svdikokcujvmalfrpida:rNneb6YI8vJPaqQH@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

async function testSupabaseConnection() {
  console.log("🧪 Testing Supabase Connection (forced URL)...");
  console.log(
    `📍 Using Supabase URL: ${SUPABASE_URL.replace(/:([^:@]{1,}):/, ":***:")}`
  );

  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 10000,
    max: 1,
    allowExitOnIdle: true,
  });

  let client;
  try {
    console.log("🔗 Attempting to connect...");
    const startTime = Date.now();

    client = await pool.connect();
    const connectTime = Date.now() - startTime;

    console.log(`✅ Connection successful in ${connectTime}ms`);

    // Test basic query
    const result = await client.query("SELECT current_database(), version()");
    console.log(`📋 Database: ${result.rows[0].current_database}`);
    console.log(`🔧 PostgreSQL: ${result.rows[0].version.split(" ")[1]}`);

    // Test NextAuth simulation
    const testEmail = `test-supabase-${Date.now()}@example.com`;
    const testId = crypto.randomUUID();

    const userResult = await client.query(
      `
      INSERT INTO users (id, email, name, image, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING id, email
    `,
      [
        testId,
        testEmail,
        "Test Supabase User",
        "https://example.com/avatar.jpg",
      ]
    );

    console.log(`✅ NextAuth simulation successful!`);
    console.log(`👤 User ID: ${userResult.rows[0].id}`);

    // Clean up
    await client.query("DELETE FROM users WHERE email = $1", [testEmail]);
    console.log("🧹 Test user cleaned up");

    console.log("\n✅ Supabase connection is working correctly!");
    console.log("\n🔧 Next steps for production:");
    console.log("1. Set DATABASE_URL in Vercel environment variables to:");
    console.log(`   ${SUPABASE_URL}`);
    console.log("2. Make sure NEXTAUTH_URL is set to your production domain");
  } catch (error) {
    console.error("❌ Supabase connection test failed:", error.message);
    console.error("Error code:", error.code);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

if (require.main === module) {
  testSupabaseConnection().catch(console.error);
}
