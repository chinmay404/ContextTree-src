// Read-only: why does a node exist in the nodes table but not on the canvas?
// Checks the canvases.data jsonb blob, the edges table, and the node's rows.
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
const CANVAS = "canvas_1784881725968";
const NODE = "node_1784888295783_8gvzyl";

(async () => {
  const blob = await pool.query(
    `select jsonb_array_length(coalesce(data->'nodes','[]'::jsonb)) as blob_nodes,
            (select jsonb_agg(n->>'_id') from jsonb_array_elements(coalesce(data->'nodes','[]'::jsonb)) n) as blob_node_ids,
            jsonb_array_length(coalesce(data->'edges','[]'::jsonb)) as blob_edges,
            (select jsonb_agg(e->>'_id') from jsonb_array_elements(coalesce(data->'edges','[]'::jsonb)) e) as blob_edge_ids,
            updated_at
     from canvases where id=$1`,
    [CANVAS]
  );
  console.log("=== canvas blob ===");
  console.log(JSON.stringify(blob.rows[0], null, 1));

  const edges = await pool.query(
    "select id, from_node, to_node, created_at from edges where canvas_id=$1 order by created_at",
    [CANVAS]
  );
  console.log("=== edges table ===");
  for (const e of edges.rows)
    console.log(e.id, "|", e.from_node, "->", e.to_node, "|", e.created_at.toISOString());

  const node = await pool.query(
    "select id, created_at, updated_at, data->>'name' as name, data->>'type' as type, data->>'parentNodeId' as parent_in_data from nodes where id=$1",
    [NODE]
  );
  console.log("=== vanished node row ===");
  console.log(JSON.stringify(node.rows[0], null, 1));

  const msgs = await pool.query(
    "select id, role, position, timestamp, inherited, left(content,40) as content from messages where node_id=$1 order by position",
    [NODE]
  );
  console.log("=== vanished node messages ===");
  for (const m of msgs.rows)
    console.log(JSON.stringify({ pos: m.position, role: m.role, inh: m.inherited, id: m.id.slice(0, 28), ts: m.timestamp.toISOString(), content: m.content }));

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
