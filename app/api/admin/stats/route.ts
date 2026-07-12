import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/mongodb";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { isAdminUser } from "@/lib/roles";

// pg requires the Node.js runtime
export const runtime = "nodejs";

// Each stat is fetched independently: a missing table (or any query
// failure) yields null for that stat instead of failing the payload.
async function countOrNull(sql: string): Promise<number | null> {
  try {
    const res = await pool.query(sql);
    return Number(res.rows[0]?.count ?? 0);
  } catch (error) {
    console.error("Admin stat query failed:", sql, error);
    return null;
  }
}

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // DB-role admins (users.role = 'admin') get access alongside the
    // static ADMIN_EMAILS list.
    if (!(await isAdminUser(user.email))) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // No mongoService.connect() here: its init DDL trips over legacy table
    // shapes (e.g. bug_reports without a status column -> 500) and the
    // tables we count already exist. countOrNull degrades per-stat instead.
    const [
      totalUsers,
      usersLast7Days,
      totalCanvases,
      canvasesUpdatedLast24h,
      totalNodes,
      totalMessages,
      messagesLast24h,
    ] = await Promise.all([
      countOrNull("select count(*) from users"),
      countOrNull(
        "select count(*) from users where created_at > now() - interval '7 days'"
      ),
      countOrNull("select count(*) from canvases"),
      countOrNull(
        "select count(*) from canvases where updated_at > now() - interval '24 hours'"
      ),
      countOrNull("select count(*) from nodes"),
      countOrNull("select count(*) from messages"),
      countOrNull(
        "select count(*) from messages where timestamp > now() - interval '24 hours'"
      ),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        usersLast7Days,
        totalCanvases,
        canvasesUpdatedLast24h,
        totalNodes,
        totalMessages,
        messagesLast24h,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch admin stats",
        detail: String((error as Error)?.message || error).slice(0, 300),
      },
      { status: 500 }
    );
  }
});
