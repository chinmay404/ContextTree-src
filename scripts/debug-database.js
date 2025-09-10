const { MongoClient } = require("mongodb");

async function inspectDatabase() {
  const uri =
    "mongodb+srv://chinmaypisal:Sirius17188@contexttree.4g4brxh.mongodb.net/?retryWrites=true&w=majority&appName=ContextTree";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("contexttree");

    // Check users collection
    const users = await db.collection("users").find({}).toArray();
    console.log("\n=== USERS ===");
    console.log(`Total users: ${users.length}`);
    users.forEach((user) => {
      console.log(`User: ${user.email}`);
      console.log(`Canvas Count: ${user.canvasCount || 0}`);
      console.log(`Total Nodes: ${user.totalNodes || 0}`);
      console.log(`Canvas IDs: ${JSON.stringify(user.canvasIds || [])}`);
      console.log("---");
    });

    // Check canvases collection
    const canvases = await db.collection("canvases").find({}).toArray();
    console.log("\n=== CANVASES ===");
    console.log(`Total canvases: ${canvases.length}`);
    canvases.forEach((canvas) => {
      console.log(`Canvas ID: ${canvas._id}`);
      console.log(`User ID: ${canvas.userId}`);
      console.log(`Title: ${canvas.title}`);
      console.log(`Nodes: ${canvas.nodes?.length || 0}`);
      console.log(`Edges: ${canvas.edges?.length || 0}`);
      console.log(`Created: ${canvas.createdAt}`);
      console.log("---");
    });

    // Check sessions to see active users
    const sessions = await db.collection("sessions").find({}).toArray();
    console.log("\n=== ACTIVE SESSIONS ===");
    console.log(`Total sessions: ${sessions.length}`);
    sessions.forEach((session) => {
      console.log(`Session: ${session.sessionToken}`);
      console.log(`User ID: ${session.userId}`);
      console.log(`Expires: ${session.expires}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

inspectDatabase();
