#!/usr/bin/env node
/**
 * Fix initPromise references in auth.ts
 */

const fs = require("fs");
const path = require("path");

const authFilePath = path.join(__dirname, "..", "lib", "auth.ts");

try {
  let content = fs.readFileSync(authFilePath, "utf8");

  // Replace all instances of 'await initPromise' with 'await getInitializationPromise()'
  content = content.replace(
    /await initPromise/g,
    "await getInitializationPromise()"
  );

  fs.writeFileSync(authFilePath, content);

  console.log("✅ Successfully updated all initPromise references in auth.ts");
} catch (error) {
  console.error("❌ Error updating auth.ts:", error.message);
}
