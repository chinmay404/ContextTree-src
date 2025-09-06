#!/usr/bin/env node
/**
 * Test which DATABASE_URL NextJS is actually using
 */

// This simulates how NextJS loads environment variables
require("dotenv").config({ path: ".env" });

console.log("🔍 Environment Variable Check:");
console.log("📍 DATABASE_URL from process.env:");
console.log(
  process.env.DATABASE_URL?.replace(/:([^:@]{1,}):/, ":***:") || "NOT SET"
);

if (process.env.DATABASE_URL?.includes("supabase")) {
  console.log("✅ Using Supabase connection (correct)");
} else if (process.env.DATABASE_URL?.includes("neon")) {
  console.log("⚠️ Using Neon connection (should be Supabase)");
} else {
  console.log("❓ Unknown database connection");
}

console.log("\n🔧 Other relevant environment variables:");
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || "NOT SET"}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || "NOT SET"}`);
console.log(
  `GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}... (${
    process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET"
  })`
);
