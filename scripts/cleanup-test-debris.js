// One-shot cleanup: remove test-suite debris (rows owned by @example.com
// test users) that leaked into the DB because the backend test suite's
// module-level pool bound to .env DATABASE_URL. Everything is scoped to the
// synthetic @example.com email domain used only by the test suite.
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [label, sql] of [
      ["messages", "delete from messages where user_email like '%@example.com'"],
      ["external_files", "delete from external_files where user_email like '%@example.com'"],
      ["edges", "delete from edges where user_email like '%@example.com'"],
      ["nodes", "delete from nodes where user_email like '%@example.com'"],
      ["canvases", "delete from canvases where user_email like '%@example.com'"],
      ["users", "delete from users where email like '%@example.com'"],
    ]) {
      const res = await client.query(sql);
      console.log(`${label}: deleted ${res.rowCount}`);
    }
    await client.query("COMMIT");
    console.log("done");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
