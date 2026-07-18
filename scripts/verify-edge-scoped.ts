/**
 * Verifies the fix for the fork-destroying edge-write race:
 *  1. addEdge/removeEdge/updateEdge are scoped (never touch node rows)
 *  2. syncNodesToTables (via updateCanvas) no longer deletes node rows
 *     missing from a stale canvas snapshot
 *  3. getCanvas synthesizes type/parentNodeId for bare backend-created rows
 *
 * Run against a throwaway Postgres (NOT prod):
 *   $env:DATABASE_URL="postgresql://postgres:ctxdev@localhost:55432/edgefix"; npx tsx scripts/verify-edge-scoped.ts
 */
import { mongoService, pool } from "../lib/mongodb.ts";

const CANVAS = "cv_edgefix_1";
const USER = "edgefix@test.local";

let failures = 0;
function check(label: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.error(`  FAIL  ${label}`, extra ?? "");
  }
}

async function main() {
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "")) {
    throw new Error("Refusing to run: DATABASE_URL must point at localhost");
  }
  await mongoService.connect();

  // Clean slate
  await pool.query("delete from canvases where id=$1", [CANVAS]);
  await pool.query("delete from users where email=$1", [USER]);
  await pool.query(
    "insert into users (id, email) values ($1,$2) on conflict (email) do nothing",
    ["u_edgefix", USER]
  );

  const entry = {
    _id: "n_root",
    name: "Root",
    type: "entry",
    primary: true,
    chatMessages: [],
  };
  await pool.query(
    "insert into canvases (id, user_email, data) values ($1,$2,$3)",
    [CANVAS, USER, { _id: CANVAS, userId: USER, nodes: [entry], edges: [] }]
  );

  console.log("\n[1] addNode persists a typed branch row");
  const branch = {
    _id: "n_branch",
    name: "My Branch",
    type: "branch",
    primary: false,
    parentNodeId: "n_root",
    forkedFromMessageId: "m_1",
    systemPrompt: "You are a pirate.",
    chatMessages: [],
  };
  await mongoService.addNode(CANVAS, branch as any, USER);
  let row = await pool.query("select data from nodes where id='n_branch'");
  check("branch row exists", row.rowCount === 1);
  check("branch type persisted", row.rows[0]?.data?.type === "branch");

  console.log("\n[2] addEdge is scoped: cannot destroy a racing node row");
  const edge = { _id: "e_1", from: "n_root", to: "n_branch", meta: { condition: "Fork" } };
  const okAdd = await mongoService.addEdge(CANVAS, edge as any, USER);
  check("addEdge returns true", okAdd);
  row = await pool.query("select data from nodes where id='n_branch'");
  check("branch row SURVIVES edge write", row.rowCount === 1);
  check(
    "branch data untouched (systemPrompt intact)",
    row.rows[0]?.data?.systemPrompt === "You are a pirate."
  );
  let cv = await pool.query("select data from canvases where id=$1", [CANVAS]);
  let edges = cv.rows[0].data.edges || [];
  check("edge in canvas JSON", edges.some((e: any) => e._id === "e_1"));
  await mongoService.addEdge(CANVAS, edge as any, USER); // retry/duplicate
  cv = await pool.query("select data from canvases where id=$1", [CANVAS]);
  edges = (cv.rows[0].data.edges || []).filter((e: any) => e._id === "e_1");
  check("duplicate addEdge keeps ONE copy", edges.length === 1, edges.length);
  const et = await pool.query("select 1 from edges where id='e_1'");
  check("edge mirrored to edges table", et.rowCount === 1);

  console.log("\n[3] stale full-canvas save no longer deletes node rows");
  // Snapshot taken BEFORE a new node exists — the old syncNodesToTables
  // deleted any row missing from it.
  const staleSnapshot = await mongoService.getCanvas(CANVAS, USER);
  await mongoService.addNode(
    CANVAS,
    {
      _id: "n_racer",
      name: "Racer",
      type: "branch",
      primary: false,
      parentNodeId: "n_root",
      forkedFromMessageId: "m_2",
      chatMessages: [],
    } as any,
    USER
  );
  await mongoService.updateCanvas(CANVAS, staleSnapshot as any, USER);
  row = await pool.query("select data from nodes where id='n_racer'");
  check("racing node row survives stale full-canvas save", row.rowCount === 1);

  console.log("\n[4] removeEdge scoped + correct semantics");
  const okRemove = await mongoService.removeEdge(CANVAS, "e_1", USER);
  check("removeEdge returns true", okRemove);
  cv = await pool.query("select data from canvases where id=$1", [CANVAS]);
  check(
    "edge gone from canvas JSON",
    !(cv.rows[0].data.edges || []).some((e: any) => e._id === "e_1")
  );
  const et2 = await pool.query("select 1 from edges where id='e_1'");
  check("edge gone from edges table", et2.rowCount === 0);
  const okRemove2 = await mongoService.removeEdge(CANVAS, "e_1", USER);
  check("second removeEdge returns false", okRemove2 === false);
  row = await pool.query("select 1 from nodes where id='n_branch'");
  check("node rows untouched by removeEdge", row.rowCount === 1);

  console.log("\n[5] bare backend-created row hydrates as a chat branch");
  await pool.query(
    `insert into nodes (id, canvas_id, user_email, data, parent_node_id, is_primary)
     values ('n_bare', $1, $2, '{}'::jsonb, 'n_root', false)`,
    [CANVAS, USER]
  );
  const hydrated = await mongoService.getCanvas(CANVAS, USER);
  const bare = hydrated?.nodes.find((n: any) => n._id === "n_bare") as any;
  check("bare row present", Boolean(bare));
  check("bare row synthesized type=branch", bare?.type === "branch", bare?.type);
  check("bare row parentNodeId from column", bare?.parentNodeId === "n_root");
  const typed = hydrated?.nodes.find((n: any) => n._id === "n_branch") as any;
  check("typed row keeps its own type", typed?.type === "branch");

  console.log(failures ? `\n${failures} FAILURES` : "\nALL CHECKS PASSED");
  await pool.end();
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
