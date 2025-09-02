#!/usr/bin/env node
/**
 * Reset Database Script
 *
 * Goals:
 *  - Drop ALL collections not in the whitelist (unwanted/test/temp collections)
 *  - Wipe (delete documents from) whitelisted collections to start clean
 *  - Provide a DRY-RUN by default for safety
 *  - Optionally preserve user accounts (flag)
 *
 * Whitelist (structure we keep):
 *   users, accounts, sessions, verification_tokens, canvases
 *
 * Usage:
 *   node scripts/reset-database.js                 # dry run
 *   node scripts/reset-database.js --apply         # perform actions
 *   node scripts/reset-database.js --apply --keep-users   # keep existing user docs
 *   node scripts/reset-database.js --apply --keep-canvases # keep existing canvases
 *
 * Environment:
 *   MONGODB_URI (required if not using fallback)
 *   DB_NAME (defaults to contexttree)
 */

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://chinmaypisal:Sirius17188@contexttree.4g4brxh.mongodb.net/?retryWrites=true&w=majority&appName=ContextTree"; // TODO: remove hardcoded fallback for production security
const DB_NAME = process.env.DB_NAME || "contexttree";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const KEEP_USERS = args.includes("--keep-users");
const KEEP_CANVASES = args.includes("--keep-canvases");

const WHITELIST = new Set([
  "users",
  "accounts",
  "sessions",
  "verification_tokens",
  "canvases",
]);

function log(step, msg) {
  console.log(`${step.padEnd(10)} ${msg}`);
}

async function main() {
  console.log("🚀 DB Reset (" + (APPLY ? "APPLY" : "DRY-RUN") + ")\n");
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set.");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // List collections
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    log("INFO", `Found ${names.length} collections.`);
    names.forEach((n) => log("COLL", n));

    // Determine unwanted collections
    const unwanted = names.filter((n) => !WHITELIST.has(n));
    if (unwanted.length === 0) {
      log("INFO", "No unwanted collections to drop.");
    } else {
      console.log("\n🧹 Unwanted collections (will be DROPPED):");
      unwanted.forEach((u) => log("DROP", u));
      if (APPLY) {
        for (const coll of unwanted) {
          try {
            await db.collection(coll).drop();
            log("DONE", `Dropped ${coll}`);
          } catch (e) {
            log("WARN", `Failed dropping ${coll}: ${e.message}`);
          }
        }
      } else {
        log("DRY-RUN", "No collections actually dropped.");
      }
    }

    // Wipe whitelisted collections
    console.log("\n🧻 Whitelisted collections (data will be cleared):");
    for (const coll of WHITELIST) {
      const exists = names.includes(coll) || unwanted.includes(coll) === false; // existence check
      if (!exists) {
        log("SKIP", `${coll} (does not exist yet)`);
        continue;
      }
      if (coll === "users" && KEEP_USERS) {
        log("KEEP", "users (preserved by flag)");
        continue;
      }
      if (coll === "canvases" && KEEP_CANVASES) {
        log("KEEP", "canvases (preserved by flag)");
        continue;
      }
      if (APPLY) {
        try {
          await db.collection(coll).deleteMany({});
          log("CLEARED", coll);
        } catch (e) {
          log("WARN", `Failed clearing ${coll}: ${e.message}`);
        }
      } else {
        log("DRY-RUN", `Would clear ${coll}`);
      }
    }

    // Ensure core collections exist (create with no docs if missing)
    for (const coll of WHITELIST) {
      const exists =
        (await db.listCollections({ name: coll }).toArray()).length > 0;
      if (!exists && APPLY) {
        await db.createCollection(coll);
        log("CREATE", `Created empty ${coll}`);
      } else if (!exists) {
        log("DRY-RUN", `Would create ${coll}`);
      }
    }

    console.log(`\n✅ Reset ${APPLY ? "completed" : "simulation complete"}.`);
    if (!APPLY) console.log("ℹ️  Re-run with --apply to execute changes.");
  } catch (err) {
    console.error("❌ Error during reset:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
