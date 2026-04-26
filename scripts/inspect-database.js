#!/usr/bin/env node

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "contexttree";

async function displayDatabaseState() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required.");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("📊 Current Database State:");
    console.log("==========================");

    // Check users collection
    const users = await db.collection("users").find({}).toArray();
    console.log(`\n👥 Users Collection (${users.length} documents):`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     - ID: ${user._id}`);
      console.log(`     - Canvases: ${user.canvasCount || 0}`);
      console.log(`     - Total Nodes: ${user.totalNodes || 0}`);
      console.log(`     - Created: ${user.createdAt}`);
    });

    // Check canvases collection
    const canvases = await db.collection("canvases").find({}).toArray();
    console.log(`\n🎨 Canvases Collection (${canvases.length} documents):`);
    canvases.forEach((canvas, index) => {
      console.log(`  ${index + 1}. "${canvas.title}" (ID: ${canvas._id})`);
      console.log(`     - Owner: ${canvas.userId}`);
      console.log(`     - Nodes: ${canvas.nodes?.length || 0}`);
      console.log(`     - Edges: ${canvas.edges?.length || 0}`);
      console.log(`     - Created: ${canvas.createdAt}`);
    });

    // Check sessions collection
    const sessions = await db.collection("sessions").find({}).toArray();
    console.log(`\n🔐 Sessions Collection (${sessions.length} documents):`);
    sessions.forEach((session, index) => {
      console.log(`  ${index + 1}. User ID: ${session.userId}`);
      console.log(`     - Expires: ${session.expires}`);
    });

    // Check accounts collection
    const accounts = await db.collection("accounts").find({}).toArray();
    console.log(`\n🔗 Accounts Collection (${accounts.length} documents):`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. Provider: ${account.provider}`);
      console.log(`     - User ID: ${account.userId}`);
      console.log(`     - Provider Account ID: ${account.providerAccountId}`);
    });

    console.log("\n✅ Database inspection complete!");
  } catch (error) {
    console.error("❌ Error inspecting database:", error);
  } finally {
    await client.close();
  }
}

displayDatabaseState();
