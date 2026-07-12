import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/mongodb";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { isAdminEmail } from "@/lib/admin";
import { isAdminUser } from "@/lib/roles";

// pg requires the Node.js runtime
export const runtime = "nodejs";

const VALID_ROLES = ["admin", "premium", "normal"] as const;
type Role = (typeof VALID_ROLES)[number];

// Lazy, idempotent migration: the users table predates roles. Cheap no-op
// once the column exists. Deliberately NOT in mongodb.ts init — that DDL
// path 500s on a legacy bug_reports table shape (see stats route).
async function ensureRoleColumn(): Promise<void> {
  try {
    await pool.query(
      "alter table if exists users add column if not exists role text"
    );
  } catch (error) {
    console.error("ensureRoleColumn failed:", error);
  }
}

// Shared admin gate: 401 without a session email, 403 unless the caller is
// a static ADMIN_EMAILS member or has users.role = 'admin'.
async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 }
    );
  }
  if (!(await isAdminUser(user.email))) {
    return NextResponse.json(
      { error: "Access denied. Admin privileges required." },
      { status: 403 }
    );
  }
  return null;
}

// lastActiveAt = latest of the user's most recent message and their
// users.updated_at (greatest() ignores the null when a user has no
// messages). canvasCount is the live count of their canvases.
const USERS_SQL = `
  select
    u.id,
    u.email,
    u.name,
    u.image,
    coalesce(u.role, 'normal') as role,
    u.created_at,
    coalesce(c.canvas_count, u.canvas_count, 0) as canvas_count,
    greatest(m.last_message_at, u.updated_at) as last_active_at
  from users u
  left join (
    select user_email, count(*)::int as canvas_count
    from canvases
    group by user_email
  ) c on c.user_email = u.email
  left join (
    select user_email, max(timestamp) as last_message_at
    from messages
    group by user_email
  ) m on m.user_email = u.email
  order by last_active_at desc nulls last
`;

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  created_at: string | Date;
  canvas_count: number | string | null;
  last_active_at: string | Date | null;
}

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    await ensureRoleColumn();

    const res = await pool.query(USERS_SQL);
    const users = res.rows.map((row: UserRow) => {
      const isStaticAdmin = isAdminEmail(row.email);
      const dbRole: Role =
        row.role === "admin" || row.role === "premium" ? row.role : "normal";
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        image: row.image,
        // Static admins always read as admin, whatever the DB says.
        role: isStaticAdmin ? "admin" : dbRole,
        isStaticAdmin,
        createdAt: row.created_at,
        canvasCount: Number(row.canvas_count ?? 0),
        lastActiveAt: row.last_active_at,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        detail: String((error as Error)?.message || error).slice(0, 300),
      },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim() : "";
    const role = body?.role as Role;
    if (!email || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          error:
            "Body must be { email, role } with role one of admin | premium | normal",
        },
        { status: 400 }
      );
    }

    if (isAdminEmail(email) && role !== "admin") {
      return NextResponse.json(
        {
          error: `${email} is a static admin (lib/admin.ts) and cannot be changed here.`,
        },
        { status: 403 }
      );
    }

    await ensureRoleColumn();

    const res = await pool.query(
      "update users set role = $1 where lower(email) = lower($2) returning email",
      [role, email]
    );
    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: `No user with email ${email}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, email, role });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      {
        error: "Failed to update role",
        detail: String((error as Error)?.message || error).slice(0, 300),
      },
      { status: 500 }
    );
  }
});
