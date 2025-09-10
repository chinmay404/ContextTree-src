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
      console.log(
        `- ${user.email} (${user.name}) - Canvases: ${
          user.canvasCount || 0
        }, Nodes: ${user.totalNodes || 0}`
      );
    });

    // Check canvases collection
    const canvases = await db.collection("canvases").find({}).toArray();
    console.log("\n=== CANVASES ===");
    console.log(`Total canvases: ${canvases.length}`);
    canvases.forEach((canvas) => {
      console.log(
        `- ${canvas.title || canvas._id} (User: ${canvas.userId}) - Nodes: ${
          canvas.nodes?.length || 0
        }, Edges: ${canvas.edges?.length || 0}`
      );
    });

    // Check accounts collection (NextAuth)
    const accounts = await db.collection("accounts").find({}).toArray();
    console.log("\n=== ACCOUNTS (NextAuth) ===");
    console.log(`Total accounts: ${accounts.length}`);

    // Check sessions collection (NextAuth)
    const sessions = await db.collection("sessions").find({}).toArray();
    console.log("\n=== SESSIONS (NextAuth) ===");
    console.log(`Active sessions: ${sessions.length}`);
    sessions.forEach((session) => {
      console.log(
        `- Session: ${session.sessionToken.substring(0, 10)}... (User: ${
          session.userId
        }) - Expires: ${session.expires}`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("\nConnection closed");
  }
}

inspectDatabase();
