import { type NextRequest, NextResponse } from "next/server";
import { mongoService, pool } from "@/lib/mongodb";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { isAdminEmail } from "@/lib/admin";

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

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    await mongoService.connect();

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
