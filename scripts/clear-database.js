#!/usr/bin/env node

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://chinmaypisal:Sirius17188@contexttree.4g4brxh.mongodb.net/?retryWrites=true&w=majority&appName=ContextTree";
const DB_NAME = "contexttree";

async function clearDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("🗑️  Clearing existing data...");

    // Clear NextAuth collections
    await db.collection("users").deleteMany({});
    await db.collection("accounts").deleteMany({});
    await db.collection("sessions").deleteMany({});
    await db.collection("verification_tokens").deleteMany({});

    // Clear application data
    await db.collection("canvases").deleteMany({});

    console.log("✅ Database cleared successfully!");
    console.log("📊 Collections cleared:");
    console.log("   - users");
    console.log("   - accounts");
    console.log("   - sessions");
    console.log("   - verification_tokens");
    console.log("   - canvases");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
  } finally {
    await client.close();
  }
}

clearDatabase();
