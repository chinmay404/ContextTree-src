#!/usr/bin/env node
/**
 * Migration: Rename legacy "test" collections to proper NextAuth + app collections
 * and remove unwanted leftovers.
 *
 * What it does (dry-run by default):
 *  1. Lists existing collections.
 *  2. If a collection named exactly "test" exists and likely contains user/account/session docs,
 *     it will propose renaming to one of: users | sessions | accounts (heuristic based on fields).
 *  3. If target collection already exists, it will merge (copy docs that don't already exist by _id / unique key).
 *  4. Optionally removes unwanted temp collections (names starting with: temp_, test_, dummy_, sandbox_).
 *
 * Usage:
 *   Dry run (recommended first):
 *     node scripts/migrate-test-collections.js
 *   Apply changes:
 *     node scripts/migrate-test-collections.js --apply
 *   Skip cleanup of temp collections:
 *     node scripts/migrate-test-collections.js --apply --skip-clean
 *
 * Environment:
 *   MONGODB_URI   (required)
 *   DB_NAME       (defaults to 'contexttree')
 */

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "contexttree";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SKIP_CLEAN = args.includes("--skip-clean");

function logStep(title) {
  console.log(`\n➡️  ${title}`);
}

function classifyTestCollectionSample(doc) {
  if (!doc || typeof doc !== "object") return "unknown";
  if (doc.sessionToken && doc.userId && doc.expires) return "sessions";
  if (doc.provider && doc.providerAccountId && doc.userId) return "accounts";
  if (doc.email && (doc.name || doc.image)) return "users";
  if (doc.title && doc.nodes && Array.isArray(doc.nodes)) return "canvases";
  return "unknown";
}

async function migrate() {
  console.log("🚀 Starting DB migration (test collections -> canonical)");
  console.log(`   Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set.");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // 1. List collections
    logStep("Listing existing collections");
    const existing = await db.listCollections().toArray();
    const names = existing.map((c) => c.name);
    console.log("   Collections:");
    names.forEach((n) => console.log("    -", n));

    // 2. Handle a generic 'test' collection
    if (names.includes("test")) {
      logStep("Analyzing 'test' collection");
      const sample = await db.collection("test").find({}).limit(5).toArray();
      if (sample.length === 0) {
        console.log("   'test' is empty – will drop instead of rename.");
        if (APPLY) {
          await db.collection("test").drop();
          console.log("   ✅ Dropped empty 'test' collection");
        } else {
          console.log("   (dry-run) Would drop 'test'");
        }
      } else {
        const classifications = sample.map(classifyTestCollectionSample);
        const tally = classifications.reduce((acc, k) => {
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});
        const likely = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
        console.log("   Sample classification counts:", tally);
        console.log(`   ➤ Likely type: ${likely}`);

        let target;
        switch (likely) {
          case "users":
            target = "users";
            break;
          case "sessions":
            target = "sessions";
            break;
          case "accounts":
            target = "accounts";
            break;
          case "canvases":
            target = "canvases";
            break;
          default:
            target = "users"; // fallback
            console.log(
              "   (unknown structure) Defaulting rename target to 'users'"
            );
        }

        if (target === "test") {
          console.log("   'test' already classified as 'test' – skipping.");
        } else if (!names.includes(target)) {
          console.log(`   Will rename 'test' -> '${target}'`);
          if (APPLY) {
            await db.collection("test").rename(target);
            console.log(`   ✅ Renamed 'test' to '${target}'`);
          } else {
            console.log(`   (dry-run) Would rename 'test' to '${target}'`);
          }
        } else {
          console.log(
            `   Target collection '${target}' already exists – will merge unique docs.`
          );
          const targetColl = db.collection(target);
          const testDocs = await db.collection("test").find({}).toArray();
          let inserted = 0,
            skipped = 0;
          for (const doc of testDocs) {
            // Determine uniqueness field
            let filter;
            if (target === "users") filter = { email: doc.email };
            else if (target === "sessions")
              filter = { sessionToken: doc.sessionToken };
            else if (target === "accounts")
              filter = {
                provider: doc.provider,
                providerAccountId: doc.providerAccountId,
              };
            else filter = { _id: doc._id };
            const exists = await targetColl.findOne(filter);
            if (exists) {
              skipped++;
              continue;
            }
            if (APPLY) {
              // Remove _id if clash
              try {
                await targetColl.insertOne(doc);
                inserted++;
              } catch (e) {
                // try without _id
                const clone = { ...doc };
                delete clone._id;
                await targetColl.insertOne(clone);
                inserted++;
              }
            } else {
              inserted++;
            }
          }
          console.log(
            `   Merge summary -> inserted: ${inserted}, skipped(existing): ${skipped}`
          );
          if (APPLY) {
            await db.collection("test").drop();
            console.log("   ✅ Dropped original 'test' after merge");
          } else {
            console.log("   (dry-run) Would drop 'test' after merge");
          }
        }
      }
    } else {
      logStep("No top-level 'test' collection found – skipping rename");
    }

    // 3. Remove unwanted temp collections
    if (!SKIP_CLEAN) {
      logStep("Scanning for removable temp/test collections");
      const removable = names.filter((n) =>
        /^(temp_|test_|dummy_|sandbox_)/i.test(n)
      );
      if (removable.length === 0) {
        console.log("   None found.");
      } else {
        console.log("   Found:", removable.join(", "));
        if (APPLY) {
          for (const name of removable) {
            try {
              await db.collection(name).drop();
              console.log(`   ✅ Dropped '${name}'`);
            } catch (e) {
              console.warn(`   ⚠️  Could not drop '${name}':`, e.message);
            }
          }
        } else {
          console.log("   (dry-run) Would drop:", removable.join(", "));
        }
      }
    } else {
      logStep("Skipping cleanup phase per --skip-clean");
    }

    console.log("\n✅ Migration script complete.");
    if (!APPLY) {
      console.log("ℹ️  Re-run with --apply to perform changes.");
    }
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

migrate();
