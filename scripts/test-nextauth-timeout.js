#!/usr/bin/env node
/**
 * Test NextAuth Database Connection with Timeout Handling
 */

require("dotenv").config();
const { Pool } = require("pg");

async function testNextAuthConnection() {
  console.log("🧪 Testing NextAuth Database Connection...");
  console.log(
    `📍 Database URL: ${process.env.DATABASE_URL?.replace(
      /:([^:@]{1,}):/,
      ":***:"
    )}`
  );

  // Use the same configuration as auth.ts
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
    console.log("🔍 Testing basic query...");
    const queryStart = Date.now();
    const result = await client.query("SELECT current_database(), version()");
    const queryTime = Date.now() - queryStart;

    console.log(`✅ Query successful in ${queryTime}ms`);
    console.log(`📋 Database: ${result.rows[0].current_database}`);
    console.log(`🔧 PostgreSQL: ${result.rows[0].version.split(" ")[1]}`);

    // Test NextAuth table queries
    console.log("🔍 Testing NextAuth table structure...");
    const tableTest = Date.now();

    const usersCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    const tableTestTime = Date.now() - tableTest;
    console.log(`✅ Table query successful in ${tableTestTime}ms`);

    if (usersCheck.rows.length > 0) {
      console.log("📊 Users table structure:");
      usersCheck.rows.forEach((col) => {
        console.log(
          `   - ${col.column_name}: ${col.data_type} (${
            col.is_nullable === "YES" ? "nullable" : "not null"
          })`
        );
      });

      // Test user creation (like NextAuth would do)
      const testEmail = `test-timeout-${Date.now()}@example.com`;
      const userTestStart = Date.now();

      const userResult = await client.query(
        `
        INSERT INTO users (email, name, image, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
        ON CONFLICT (email) DO UPDATE SET updated_at = now()
        RETURNING id, email
      `,
        [testEmail, "Test User", "https://example.com/avatar.jpg"]
      );

      const userTestTime = Date.now() - userTestStart;
      console.log(`✅ User creation test successful in ${userTestTime}ms`);
      console.log(`👤 Created user ID: ${userResult.rows[0].id}`);

      // Clean up test user
      await client.query("DELETE FROM users WHERE email = $1", [testEmail]);
      console.log("🧹 Test user cleaned up");
    } else {
      console.log(
        "⚠️ Users table not found - will be created on first NextAuth request"
      );
    }

    console.log("\n✅ All tests passed! NextAuth should work correctly.");
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);

    if (error.message.includes("timeout")) {
      console.error("\n💡 Timeout suggestions:");
      console.error("1. Check your internet connection");
      console.error("2. Verify Supabase project is not paused");
      console.error("3. Try increasing connectionTimeoutMillis in auth.ts");
      console.error("4. Consider using direct connection instead of pooler");
    }

    if (error.code === "08006") {
      console.error("\n💡 Authentication error suggestions:");
      console.error("1. Check database password in .env");
      console.error("2. Verify Supabase project settings");
      console.error("3. Check if database user has proper permissions");
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

if (require.main === module) {
  testNextAuthConnection().catch(console.error);
}
