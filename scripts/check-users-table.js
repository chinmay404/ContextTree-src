#!/usr/bin/env node
/**
 * Check Supabase Users Table Structure
 */

const { Pool } = require("pg");

const SUPABASE_URL =
  "postgresql://postgres.svdikokcujvmalfrpida:rNneb6YI8vJPaqQH@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

async function checkTableStructure() {
  console.log("🔍 Checking Supabase users table structure...");

  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    max: 1,
  });

  let client;
  try {
    client = await pool.connect();

    // Check users table structure
    const structure = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log("\n📊 Users table structure:");
    structure.rows.forEach((col) => {
      const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const length = col.character_maximum_length
        ? `(${col.character_maximum_length})`
        : "";
      const defaultVal = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : "";
      console.log(
        `   - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`
      );
    });

    // Check constraints
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'users' 
      AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    console.log("\n🔗 Table constraints:");
    constraints.rows.forEach((constraint) => {
      console.log(
        `   - ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`
      );
    });

    // Check if there's a sequence for id
    const sequences = await client.query(`
      SELECT 
        sequence_name,
        data_type,
        increment_by,
        last_value
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      AND sequence_name LIKE '%users%'
    `);

    if (sequences.rows.length > 0) {
      console.log("\n🔢 Related sequences:");
      sequences.rows.forEach((seq) => {
        console.log(
          `   - ${seq.sequence_name}: ${seq.data_type}, increment: ${seq.increment_by}`
        );
      });
    }

    // Check current user count
    const userCount = await client.query("SELECT COUNT(*) as count FROM users");
    console.log(`\n👥 Current users: ${userCount.rows[0].count}`);

    // Test ID generation approaches
    console.log("\n🧪 Testing ID generation approaches...");

    // Approach 1: Let sequence generate ID
    try {
      const testEmail1 = `test-seq-${Date.now()}@example.com`;
      const result1 = await client.query(
        `
        INSERT INTO users (email, name, image, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
        RETURNING id
      `,
        [testEmail1, "Test Sequence User", "https://example.com/avatar.jpg"]
      );

      console.log(`✅ Sequence approach worked: ID ${result1.rows[0].id}`);
      await client.query("DELETE FROM users WHERE email = $1", [testEmail1]);
    } catch (error) {
      console.log(`❌ Sequence approach failed: ${error.message}`);

      // Approach 2: Generate UUID manually
      try {
        const testEmail2 = `test-uuid-${Date.now()}@example.com`;
        const { v4: uuidv4 } = require("crypto");
        const uuid = crypto.randomUUID();

        const result2 = await client.query(
          `
          INSERT INTO users (id, email, name, image, created_at, updated_at)
          VALUES ($1, $2, $3, $4, now(), now())
          RETURNING id
        `,
          [uuid, testEmail2, "Test UUID User", "https://example.com/avatar.jpg"]
        );

        console.log(`✅ UUID approach worked: ID ${result2.rows[0].id}`);
        await client.query("DELETE FROM users WHERE email = $1", [testEmail2]);
      } catch (error2) {
        console.log(`❌ UUID approach also failed: ${error2.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking table structure:", error.message);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

if (require.main === module) {
  checkTableStructure().catch(console.error);
}
