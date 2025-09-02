#!/usr/bin/env node

const crypto = require("crypto");

// Generate a secure random secret for NextAuth
const secret = crypto.randomBytes(32).toString("hex");

console.log("Generated NextAuth Secret:");
console.log(secret);
console.log("\nAdd this to your .env.local file:");
console.log(`NEXTAUTH_SECRET=${secret}`);
