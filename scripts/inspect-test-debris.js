// Read-only: count test-suite debris rows in the DB (test users use
// @example.com emails). Used before/after cleanup.
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const dbUrl = envFile
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length)
  .trim();

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  for (const [label, sql] of [
    ["users", "select email, created_at from users where email like '%@example.com' order by created_at desc limit 50"],
    ["canvases", "select id, user_email, created_at from canvases where user_email like '%@example.com' order by created_at desc limit 50"],
    ["nodes", "select count(*) as n, min(created_at) as oldest, max(created_at) as newest from nodes where user_email like '%@example.com'"],
    ["messages", "select count(*) as n, min(timestamp) as oldest, max(timestamp) as newest from messages where user_email like '%@example.com'"],
  ]) {
    const { rows } = await pool.query(sql);
    console.log(`=== ${label} ===`);
    console.log(JSON.stringify(rows, null, 1));
  }
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
