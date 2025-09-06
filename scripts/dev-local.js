#!/usr/bin/env node
/**
 * Development Server with Forced Local Environment
 */

const fs = require("fs");
const path = require("path");

// Force load .env file and override system environment
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");

  console.log("🔧 Loading local .env file...");

  envLines.forEach((line) => {
    if (line.trim() && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=");
        process.env[key.trim()] = value.trim();

        if (key.trim() === "DATABASE_URL") {
          console.log(
            `✅ Set ${key.trim()}: ${value.replace(/:([^:@]{1,}):/, ":***:")}`
          );
        } else if (["NEXTAUTH_URL", "GOOGLE_CLIENT_ID"].includes(key.trim())) {
          console.log(`✅ Set ${key.trim()}: ${value.trim()}`);
        }
      }
    }
  });
}

// Now start the Next.js dev server
const { spawn } = require("child_process");

console.log("\n🚀 Starting Next.js development server...");
const devServer = spawn("pnpm", ["dev"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

devServer.on("exit", (code) => {
  console.log(`\nDevelopment server exited with code ${code}`);
});
