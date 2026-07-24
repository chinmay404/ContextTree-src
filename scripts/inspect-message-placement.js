// Diagnostic: dump node/message placement for the most recent canvas to
// verify where messages actually landed (node_id, position, timestamp)
// versus what the getCanvas hydration filter exposes. Read-only.
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
  const { rows: canvases } = await pool.query(
    `select id, user_email, data->>'name' as name, updated_at
     from canvases order by updated_at desc limit 5`
  );
  console.log("=== recent canvases ===");
  for (const c of canvases)
    console.log(c.id, "|", c.name, "|", c.user_email, "|", c.updated_at.toISOString());

  const canvasId = canvases[0].id;
  console.log("\n=== nodes for", canvasId, "===");
  const { rows: nodes } = await pool.query(
    `select id, is_primary, is_initialized, parent_node_id, created_at,
            data->>'name' as name, data->>'model' as model, data->>'type' as type
     from nodes where canvas_id=$1 order by created_at`,
    [canvasId]
  );
  for (const n of nodes)
    console.log(
      JSON.stringify({
        id: n.id,
        name: n.name,
        model: n.model,
        type: n.type,
        is_primary: n.is_primary,
        is_init: n.is_initialized,
        parent: n.parent_node_id,
        created_at: n.created_at && n.created_at.toISOString(),
      })
    );

  const nodeIds = nodes.map((n) => n.id);
  console.log("\n=== messages (all rows for these nodes) ===");
  const { rows: msgs } = await pool.query(
    `select m.id, m.node_id, m.role, left(m.content, 60) as content,
            m.timestamp, m.position
     from messages m where m.node_id = any($1::text[])
     order by m.node_id, m.position asc nulls last, m.timestamp asc`,
    [nodeIds]
  );
  for (const m of msgs)
    console.log(
      JSON.stringify({
        node: m.node_id.slice(0, 24),
        pos: m.position,
        role: m.role,
        ts: m.timestamp && m.timestamp.toISOString(),
        id: m.id.slice(0, 32),
        content: m.content.replace(/\n/g, " "),
      })
    );

  console.log("\n=== hydration filter result (what getCanvas exposes per node) ===");
  const { rows: visible } = await pool.query(
    `select m.node_id, count(*) as visible_count
     from messages m join nodes n on n.id = m.node_id
     where m.node_id = any($1::text[])
       and (n.is_primary is not false or m.timestamp >= n.created_at)
     group by m.node_id`,
    [nodeIds]
  );
  console.log(visible);

  console.log("\n=== column types ===");
  const { rows: cols } = await pool.query(
    `select table_name, column_name, data_type from information_schema.columns
     where table_name in ('messages','nodes') and column_name in ('timestamp','created_at','position')
     order by table_name, column_name`
  );
  console.log(cols);

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
