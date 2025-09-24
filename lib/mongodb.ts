// Postgres-backed drop-in replacement exposing the same API surface as the prior Mongo service.
// All imports across the app keep using `mongoService` without code changes.

import { Pool } from "pg";
import type { CanvasData, NodeData, EdgeData } from "./storage";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn(
    "DATABASE_URL not set. Set it to your Postgres connection string."
  );
}

// Single shared pool
const pool = new Pool({ connectionString: DATABASE_URL });

async function init() {
  // Create tables if they don't exist. Intentionally simple – no migrations required per request.
  await pool.query(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      name text,
      image text,
      email_verified timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      canvas_ids text[] default array[]::text[],
      canvas_count integer default 0,
      total_nodes integer default 0
    );
    create table if not exists canvases (
      id text primary key,
      user_email text not null references users(email) on delete cascade,
      data jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists nodes (
      id text primary key,
      canvas_id text not null references canvases(id) on delete cascade,
      user_email text not null references users(email) on delete cascade,
      data jsonb not null,
      parent_node_id text,
      forked_from_message_id text,
      is_primary boolean,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  -- Backfill for pre-existing nodes table without new columns
  alter table if exists nodes add column if not exists canvas_id text;
  alter table if exists nodes add column if not exists user_email text;
  alter table if exists nodes add column if not exists data jsonb;
  alter table if exists nodes add column if not exists created_at timestamptz default now();
  alter table if exists nodes add column if not exists updated_at timestamptz default now();
  alter table if exists nodes add column if not exists parent_node_id text;
  alter table if exists nodes add column if not exists forked_from_message_id text;
  alter table if exists nodes add column if not exists is_primary boolean;
    create index if not exists idx_nodes_canvas on nodes(canvas_id);
    create index if not exists idx_nodes_parent on nodes(parent_node_id);
    create index if not exists idx_nodes_forked_from on nodes(forked_from_message_id);
    create table if not exists edges (
      id text primary key,
      canvas_id text not null references canvases(id) on delete cascade,
      user_email text not null references users(email) on delete cascade,
      from_node text not null,
      to_node text not null,
      data jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists idx_edges_canvas on edges(canvas_id);
    create index if not exists idx_edges_from on edges(from_node);
    create index if not exists idx_edges_to on edges(to_node);
    create table if not exists messages (
      id text primary key,
      node_id text not null references nodes(id) on delete cascade,
      canvas_id text not null references canvases(id) on delete cascade,
      user_email text not null references users(email) on delete cascade,
      role text not null,
      content text not null,
      timestamp timestamptz not null default now()
    );
  -- Backfill for pre-existing messages table without new columns
  alter table if exists messages add column if not exists node_id text;
  alter table if exists messages add column if not exists canvas_id text;
  alter table if exists messages add column if not exists user_email text;
  alter table if exists messages add column if not exists role text;
  alter table if exists messages add column if not exists content text;
  alter table if exists messages add column if not exists timestamp timestamptz default now();
    create index if not exists idx_messages_node on messages(node_id);
    create index if not exists idx_messages_canvas on messages(canvas_id);
    create table if not exists bug_reports (
      id text primary key,
      user_email text not null references users(email) on delete cascade,
      user_name text not null,
      title text not null,
      description text not null,
      severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
      steps_to_reproduce text not null,
      expected_behavior text not null,
      actual_behavior text not null,
      browser_info text,
      additional_info text,
      status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists idx_bug_reports_user on bug_reports(user_email);
    create index if not exists idx_bug_reports_severity on bug_reports(severity);
    create index if not exists idx_bug_reports_status on bug_reports(status);
    create index if not exists idx_bug_reports_created on bug_reports(created_at);
  -- Backfill: ensure columns exist if an older version created canvases without them
  alter table if exists canvases add column if not exists data jsonb;
  alter table if exists canvases add column if not exists user_email text;
  -- Legacy backfill for timestamp columns if original table lacked them
  alter table if exists canvases add column if not exists created_at timestamptz default now();
  alter table if exists canvases add column if not exists updated_at timestamptz default now();
  update canvases set created_at = now() where created_at is null;
  update canvases set updated_at = now() where updated_at is null;
    create table if not exists accounts (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      type text not null,
      provider text not null,
      provider_account_id text not null,
      refresh_token text,
      access_token text,
      expires_at bigint,
      token_type text,
      scope text,
      id_token text,
      session_state text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(provider, provider_account_id)
    );
    create table if not exists sessions (
      id text primary key,
      session_token text not null unique,
      user_id text not null references users(id) on delete cascade,
      expires timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists verification_tokens (
      identifier text not null,
      token text not null,
      expires timestamptz not null,
      primary key (identifier, token)
    );
  `);
}

let initPromise: Promise<void> | null = null;
async function ensureInit() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

export interface User {
  email: string;
  name?: string;
  image?: string;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  canvasIds: string[];
  canvasCount: number;
  totalNodes: number;
}

export interface UserStats {
  canvasCount: number;
  totalNodes: number;
  canvasIds: string[];
}

export async function connectToMongoDB() {
  // Compatibility shim – returns a dummy object; callers only awaited the promise previously.
  await ensureInit();
  return {} as any;
}
export async function disconnectFromMongoDB() {
  // Optional: keep pool open for function reuse; NOT terminating to avoid cold starts.
}

export class MongoDBService {
  // Kept for API parity; no-op.
  async connect(): Promise<void> {
    await ensureInit();
  }

  async getNode(
    canvasId: string,
    nodeId: string,
    userEmail: string
  ): Promise<NodeData | null> {
    await ensureInit();
    if (!userEmail) return null;
    const res = await pool.query(
      `select n.id, n.data from nodes n
       inner join canvases c on c.id = n.canvas_id
       where n.id=$1 and n.canvas_id=$2 and c.user_email=$3`,
      [nodeId, canvasId, userEmail]
    );
    if (!res.rowCount) return null;
    const n = { ...(res.rows[0].data || {}), _id: res.rows[0].id } as any;
    // Attach messages (flat form) for convenience
    const mRows = await pool.query(
      "select id, role, content, timestamp from messages where node_id=$1",
      [nodeId]
    );
    (n as any).chatMessages = mRows.rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp?.toISOString?.() || m.timestamp,
    }));
    return n as NodeData;
  }

  // Helper to map DB row -> CanvasData
  private rowToCanvas(row: any): CanvasData {
    return row?.data as CanvasData;
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    await ensureInit();
    const res = await pool.query(
      "select email, name, image, email_verified, created_at, updated_at, canvas_ids, canvas_count, total_nodes from users where email=$1",
      [email]
    );
    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      email: r.email,
      name: r.name || undefined,
      image: r.image || undefined,
      emailVerified: r.email_verified || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      canvasIds: r.canvas_ids || [],
      canvasCount: r.canvas_count || 0,
      totalNodes: r.total_nodes || 0,
    };
  }

  private async ensureUser(email: string) {
    await pool.query(
      `insert into users (id, email, created_at, updated_at)
       values ($1,$2,now(),now())
       on conflict (email) do nothing`,
      [crypto.randomUUID(), email]
    );
  }

  async updateUserStats(email: string): Promise<void> {
    await ensureInit();
    await this.ensureUser(email);
    const canvases = await this.getUserCanvases(email);
    const canvasCount = canvases.length;
    const canvasIds = canvases.map((c) => c._id);
    const totalNodes = canvases.reduce(
      (sum, c) => sum + (c.nodes?.length || 0),
      0
    );
    await pool.query(
      `update users set canvas_ids=$2, canvas_count=$3, total_nodes=$4, updated_at=now() where email=$1`,
      [email, canvasIds, canvasCount, totalNodes]
    );
  }

  async getUserStats(email: string): Promise<UserStats> {
    await this.updateUserStats(email);
    const user = await this.getUserByEmail(email);
    return {
      canvasCount: user?.canvasCount || 0,
      totalNodes: user?.totalNodes || 0,
      canvasIds: user?.canvasIds || [],
    };
  }

  // Canvas operations
  async createCanvas(canvas: CanvasData): Promise<CanvasData> {
    await ensureInit();
    await this.ensureUser(canvas.userId);
    const now = new Date();
    const enriched = {
      ...canvas,
      createdAt: canvas.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await pool.query(
      `insert into canvases (id, user_email, data, created_at, updated_at) values ($1,$2,$3,now(),now()) on conflict (id) do update set data=excluded.data, updated_at=now()`,
      [enriched._id, enriched.userId, enriched]
    );
    await this.syncNodesToTables(enriched);
    await this.updateUserStats(canvas.userId);
    return enriched;
  }

  async getCanvas(
    canvasId: string,
    userEmail?: string
  ): Promise<CanvasData | null> {
    await ensureInit();
    if (!userEmail) return null; // enforce isolation
    const res = await pool.query(
      "select data from canvases where id=$1 and user_email=$2",
      [canvasId, userEmail]
    );
    if (res.rowCount === 0) return null;
    const base = this.rowToCanvas(res.rows[0]);
    // Hydrate nodes/messages if normalized records exist
    const nodeRows = await pool.query(
      "select id, data from nodes where canvas_id=$1",
      [canvasId]
    );
    if (nodeRows.rowCount > 0) {
      // Load normalized messages
      const msgRows = await pool.query(
        "select id, node_id, role, content, timestamp from messages where canvas_id=$1",
        [canvasId]
      );
      const byNode: Record<string, any[]> = {};
      for (const m of msgRows.rows) {
        (byNode[m.node_id] ||= []).push({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString?.() || m.timestamp,
        });
      }
      // Merge strategy: keep any embedded nodes not yet normalized (race during creation)
      const embedded = Array.isArray(base.nodes) ? base.nodes : [];
      const normalizedIds = new Set<string>();
      const normalized = nodeRows.rows.map((r) => {
        normalizedIds.add(r.id);
        const n = { ...(r.data || {}), _id: r.id } as any;
        // If embedded version had chatMessages in turn format preserve if DB empty
        const existingEmbedded = embedded.find((e: any) => e._id === r.id);
        const dbMsgs = byNode[r.id] || [];
        (n as any).chatMessages = dbMsgs.length
          ? dbMsgs
          : existingEmbedded?.chatMessages || [];
        return n;
      });
      const orphanEmbedded = embedded.filter(
        (e: any) => !normalizedIds.has(e._id)
      );
      base.nodes = [...normalized, ...orphanEmbedded];
    }
    return base;
  }

  async updateCanvas(
    canvasId: string,
    updates: Partial<CanvasData>,
    userEmail?: string
  ): Promise<CanvasData | null> {
    const current = await this.getCanvas(canvasId, userEmail);
    if (!current) return null;
    const merged: CanvasData = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as CanvasData;
    await pool.query(
      `update canvases set data=$3, updated_at=now() where id=$1 and user_email=$2`,
      [canvasId, current.userId, merged]
    );
    await this.syncNodesToTables(merged);
    if (userEmail) await this.updateUserStats(userEmail);
    return merged;
  }

  async deleteCanvas(canvasId: string, userEmail?: string): Promise<boolean> {
    const params: any[] = [canvasId];
    if (!userEmail) return false;
    const res = await pool.query(
      "delete from canvases where id=$1 and user_email=$2",
      [canvasId, userEmail]
    );
    if (userEmail && res.rowCount > 0) await this.updateUserStats(userEmail);
    return res.rowCount > 0;
  }

  async getUserCanvases(userEmail: string): Promise<CanvasData[]> {
    await ensureInit();
    try {
      const res = await pool.query(
        "select data from canvases where user_email=$1 order by updated_at desc",
        [userEmail]
      );
      return res.rows.map((r) => this.rowToCanvas(r));
    } catch (err: any) {
      if (err?.code === "42703") {
        // column missing
        const all = await pool.query("select data from canvases");
        return all.rows
          .map((r) => this.rowToCanvas(r))
          .filter((c) => c.userId === userEmail);
      }
      throw err;
    }
  }

  // Node operations (manipulate JSON in app layer)
  async updateNode(
    canvasId: string,
    nodeId: string,
    updates: Partial<NodeData>,
    userEmail?: string
  ): Promise<boolean> {
    await ensureInit();
    // Fast path: update normalized node row if exists
    const nodeRow = await pool.query(
      "select id from nodes where id=$1 and canvas_id=$2",
      [nodeId, canvasId]
    );
    if (nodeRow.rowCount) {
      // Fetch existing data json to merge
      const existing = await pool.query("select data from nodes where id=$1", [
        nodeId,
      ]);
      const merged = { ...(existing.rows[0].data || {}), ...updates };
      await pool.query(
        "update nodes set data=$2, parent_node_id=$3, forked_from_message_id=$4, is_primary=$5, updated_at=now() where id=$1",
        [
          nodeId,
          merged,
          (merged as any).parentNodeId || null,
          (merged as any).forkedFromMessageId || null,
          !!(merged as any).primary,
        ]
      );
      // Also patch embedded canvas JSON (best effort)
      const cRes = await pool.query("select data from canvases where id=$1", [
        canvasId,
      ]);
      if (cRes.rowCount) {
        const canvasData = cRes.rows[0].data;
        const idx = canvasData.nodes.findIndex((n: any) => n._id === nodeId);
        if (idx !== -1) {
          canvasData.nodes[idx] = { ...canvasData.nodes[idx], ...updates };
          await pool.query(
            "update canvases set data=$2, updated_at=now() where id=$1",
            [canvasId, canvasData]
          );
        }
      }
      return true;
    }
    // Fallback to legacy JSON update
    const canvas = await this.getCanvas(canvasId, userEmail);
    if (!canvas) return false;
    const idx = canvas.nodes.findIndex((n) => n._id === nodeId);
    if (idx === -1) return false;
    canvas.nodes[idx] = { ...canvas.nodes[idx], ...updates } as NodeData;
    canvas.updatedAt = new Date().toISOString();
    await this.updateCanvas(canvasId, canvas, userEmail || canvas.userId);
    return true;
  }

  async addNode(
    canvasId: string,
    node: NodeData,
    userEmail?: string
  ): Promise<boolean> {
    await ensureInit();
    // Insert directly when normalized tables exist
    const canvasRow = await pool.query(
      "select user_email, data from canvases where id=$1",
      [canvasId]
    );
    if (!canvasRow.rowCount) return false;
    const userEmailEff = userEmail || canvasRow.rows[0].user_email;
    const nodeData = { ...node } as any;
    const messages = nodeData.chatMessages || [];
    delete nodeData.chatMessages;
    await pool.query(
      `insert into nodes (id, canvas_id, user_email, data, parent_node_id, forked_from_message_id, is_primary, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,now(),now())
       on conflict (id) do update set data=excluded.data, parent_node_id=excluded.parent_node_id, forked_from_message_id=excluded.forked_from_message_id, is_primary=excluded.is_primary, updated_at=now()`,
      [
        node._id,
        canvasId,
        userEmailEff,
        nodeData,
        (node as any).parentNodeId || null,
        (node as any).forkedFromMessageId || null,
        !!node.primary,
      ]
    );
    if (messages.length) {
      const insertValues = messages.map((m) =>
        pool.query(
          `insert into messages (id, node_id, canvas_id, user_email, role, content, timestamp) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
          [
            m.id,
            node._id,
            canvasId,
            userEmailEff,
            m.role,
            m.content,
            m.timestamp || new Date().toISOString(),
          ]
        )
      );
      await Promise.all(insertValues);
    }
    // Update embedded canvas JSON nodes array minimally
    const canvasData = canvasRow.rows[0].data;
    if (!canvasData.nodes.find((n: any) => n._id === node._id)) {
      canvasData.nodes.push(node);
      await pool.query(
        "update canvases set data=$2, updated_at=now() where id=$1",
        [canvasId, canvasData]
      );
    }
    return true;
  }

  async removeNode(
    canvasId: string,
    nodeId: string,
    userEmail?: string
  ): Promise<boolean> {
    await ensureInit();
    // Delete normalized node (cascade removes messages)
    const del = await pool.query(
      "delete from nodes where id=$1 and canvas_id=$2",
      [nodeId, canvasId]
    );
    if (!del.rowCount) return false;
    // Update embedded JSON
    const cRes = await pool.query("select data from canvases where id=$1", [
      canvasId,
    ]);
    if (cRes.rowCount) {
      const canvasData = cRes.rows[0].data;
      canvasData.nodes = canvasData.nodes.filter((n: any) => n._id !== nodeId);
      canvasData.edges = canvasData.edges.filter(
        (e: any) => e.from !== nodeId && e.to !== nodeId
      );
      await pool.query(
        "update canvases set data=$2, updated_at=now() where id=$1",
        [canvasId, canvasData]
      );
    }
    return true;
  }

  // Edge operations
  async addEdge(
    canvasId: string,
    edge: EdgeData,
    userEmail?: string
  ): Promise<boolean> {
    const canvas = await this.getCanvas(canvasId, userEmail);
    if (!canvas) return false;
    canvas.edges.push(edge);
    canvas.updatedAt = new Date().toISOString();
    await this.updateCanvas(canvasId, canvas, userEmail || canvas.userId);
    return true;
  }

  async removeEdge(
    canvasId: string,
    edgeId: string,
    userEmail?: string
  ): Promise<boolean> {
    const canvas = await this.getCanvas(canvasId, userEmail);
    if (!canvas) return false;
    const before = canvas.edges.length;
    canvas.edges = canvas.edges.filter((e) => e._id !== edgeId);
    if (canvas.edges.length === before) return false;
    canvas.updatedAt = new Date().toISOString();
    await this.updateCanvas(canvasId, canvas, userEmail || canvas.userId);
    return true;
  }

  async updateEdge(
    canvasId: string,
    edgeId: string,
    updates: any,
    userEmail?: string
  ): Promise<boolean> {
    const canvas = await this.getCanvas(canvasId, userEmail);
    if (!canvas) return false;
    const idx = canvas.edges.findIndex((e) => e._id === edgeId);
    if (idx === -1) return false;
    canvas.edges[idx] = { ...canvas.edges[idx], ...updates, _id: edgeId };
    canvas.updatedAt = new Date().toISOString();
    await this.updateCanvas(canvasId, canvas, userEmail || canvas.userId);
    return true;
  }

  async updateNodeMessages(
    canvasId: string,
    nodeId: string,
    messages: any[],
    userEmail?: string
  ): Promise<boolean> {
    await ensureInit();
    const nodeRow = await pool.query(
      "select id from nodes where id=$1 and canvas_id=$2",
      [nodeId, canvasId]
    );
    if (nodeRow.rowCount) {
      await pool.query("delete from messages where node_id=$1", [nodeId]);
      const flat = this.flattenMessages(messages);
      for (const msg of flat) {
        await pool.query(
          `insert into messages (id, node_id, canvas_id, user_email, role, content, timestamp) values ($1,$2,$3,(select user_email from canvases where id=$3),$4,$5,$6) on conflict (id) do update set role=excluded.role, content=excluded.content, timestamp=excluded.timestamp`,
          [msg.id, nodeId, canvasId, msg.role, msg.content, msg.timestamp]
        );
      }
      // Patch embedded JSON
      const cRes = await pool.query("select data from canvases where id=$1", [
        canvasId,
      ]);
      if (cRes.rowCount) {
        const canvasData = cRes.rows[0].data;
        const idx = canvasData.nodes.findIndex((n: any) => n._id === nodeId);
        if (idx !== -1) {
          canvasData.nodes[idx].chatMessages = messages; // preserve original structure (turns or flat) for UI
          await pool.query(
            "update canvases set data=$2, updated_at=now() where id=$1",
            [canvasId, canvasData]
          );
        }
      }
      return true;
    }
    // fallback legacy path
    const canvas = await this.getCanvas(canvasId, userEmail);
    if (!canvas) return false;
    const idx = canvas.nodes.findIndex((n) => n._id === nodeId);
    if (idx === -1) return false;
    (canvas.nodes[idx] as any).chatMessages = messages;
    canvas.updatedAt = new Date().toISOString();
    await this.updateCanvas(canvasId, canvas, userEmail || canvas.userId);
    return true;
  }

  // Normalize nodes + messages into dedicated tables for querying
  private async syncNodesToTables(canvas: CanvasData) {
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          "select id from nodes where canvas_id=$1",
          [canvas._id]
        );
        const existingIds = new Set(existing.rows.map((r) => r.id));
        const currentIds = new Set(canvas.nodes.map((n) => n._id));
        // Delete removed nodes cascades messages
        for (const rowId of existingIds) {
          if (!currentIds.has(rowId)) {
            await client.query("delete from nodes where id=$1", [rowId]);
          }
        }
        for (const node of canvas.nodes) {
          const nodeData = { ...node } as any;
          delete nodeData.chatMessages;
          await client.query(
            `insert into nodes (id, canvas_id, user_email, data, parent_node_id, forked_from_message_id, is_primary, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,now(),now())
             on conflict (id) do update set data=excluded.data, parent_node_id=excluded.parent_node_id, forked_from_message_id=excluded.forked_from_message_id, is_primary=excluded.is_primary, updated_at=now()`,
            [
              node._id,
              canvas._id,
              canvas.userId,
              nodeData,
              (node as any).parentNodeId || null,
              (node as any).forkedFromMessageId || null,
              !!node.primary,
            ]
          );
          // Replace messages for node
          await client.query("delete from messages where node_id=$1", [
            node._id,
          ]);
          for (const msg of this.flattenMessages(node.chatMessages || [])) {
            await client.query(
              `insert into messages (id, node_id, canvas_id, user_email, role, content, timestamp)
               values ($1,$2,$3,$4,$5,$6,$7)
               on conflict (id) do update set role=excluded.role, content=excluded.content, timestamp=excluded.timestamp`,
              [
                msg.id,
                node._id,
                canvas._id,
                canvas.userId,
                msg.role,
                msg.content,
                msg.timestamp,
              ]
            );
          }
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("syncNodesToTables error", e);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("syncNodesToTables connection error", err);
    }
  }

  // Accept both ChatMessage shape {id, role, content, timestamp} and ChatTurn shape {id, user?, assistant?}
  private flattenMessages(
    raw: any[]
  ): { id: string; role: string; content: string; timestamp: string }[] {
    const out: {
      id: string;
      role: string;
      content: string;
      timestamp: string;
    }[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (item.role && item.content) {
        out.push({
          id: item.id,
          role: item.role,
          content: item.content,
          timestamp: item.timestamp || new Date().toISOString(),
        });
      } else if (item.user || item.assistant) {
        if (item.user) {
          out.push({
            id: item.id + "_u",
            role: "user",
            content: item.user.content,
            timestamp: item.user.timestamp || new Date().toISOString(),
          });
        }
        if (item.assistant) {
          out.push({
            id: item.id + "_a",
            role: "assistant",
            content: item.assistant.content,
            timestamp: item.assistant.timestamp || new Date().toISOString(),
          });
        }
      }
    }
    return out;
  }

  // Bug Reports methods
  async createBugReport(reportData: {
    id: string;
    userEmail: string;
    userName: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    stepsToReproduce: string;
    expectedBehavior: string;
    actualBehavior: string;
    browserInfo?: string;
    additionalInfo?: string;
  }) {
    try {
      await pool.query(
        `INSERT INTO bug_reports (
          id, user_email, user_name, title, description, severity,
          steps_to_reproduce, expected_behavior, actual_behavior,
          browser_info, additional_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          reportData.id,
          reportData.userEmail,
          reportData.userName,
          reportData.title,
          reportData.description,
          reportData.severity,
          reportData.stepsToReproduce,
          reportData.expectedBehavior,
          reportData.actualBehavior,
          reportData.browserInfo || null,
          reportData.additionalInfo || null,
        ]
      );
      return reportData;
    } catch (error) {
      console.error("Error creating bug report:", error);
      throw error;
    }
  }

  async getBugReportsByUser(userEmail: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM bug_reports 
         WHERE user_email = $1 
         ORDER BY created_at DESC`,
        [userEmail]
      );
      return result.rows;
    } catch (error) {
      console.error("Error fetching user bug reports:", error);
      throw error;
    }
  }

  async getAllBugReports(limit = 50, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT * FROM bug_reports 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error("Error fetching bug reports:", error);
      throw error;
    }
  }

  async updateBugReportStatus(
    id: string,
    status: "open" | "investigating" | "resolved" | "closed"
  ) {
    try {
      const result = await pool.query(
        `UPDATE bug_reports 
         SET status = $1, updated_at = now() 
         WHERE id = $2 
         RETURNING *`,
        [status, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error updating bug report status:", error);
      throw error;
    }
  }

  async getBugReportById(id: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM bug_reports WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error fetching bug report by ID:", error);
      throw error;
    }
  }
}

export const mongoService = new MongoDBService();
