// ─── User roles (server-only) ─────────────────────────────────
// Role lives in users.role: 'admin' | 'premium' | null/'normal' = normal.
// The column is added lazily by /api/admin/users (NOT in mongodb.ts init —
// that DDL path 500s on a legacy bug_reports table shape), so every query
// here degrades to 'normal' if the column doesn't exist yet.
//
// Static ADMIN_EMAILS (lib/admin.ts) always count as admin regardless of
// the DB value — they are the bootstrap that can't be locked out.

import { pool } from "@/lib/mongodb";
import { isAdminEmail } from "@/lib/admin";

export type UserRole = "admin" | "premium" | "normal";

export async function getUserRole(
  email?: string | null
): Promise<UserRole> {
  if (!email) return "normal";
  if (isAdminEmail(email)) return "admin";
  try {
    const res = await pool.query(
      "select role from users where lower(email) = lower($1) limit 1",
      [email]
    );
    const role = res.rows[0]?.role;
    return role === "admin" || role === "premium" ? role : "normal";
  } catch (error) {
    // Pre-migration (no role column) or transient DB failure → normal.
    console.error("getUserRole failed:", error);
    return "normal";
  }
}

export async function isAdminUser(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  return (await getUserRole(email)) === "admin";
}
