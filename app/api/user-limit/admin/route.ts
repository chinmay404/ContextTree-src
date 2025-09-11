import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { userLimitService } from "@/lib/user-limit";

// List of admin emails (you can move this to environment variables)
const ADMIN_EMAILS = [
  "admin@contexttree.com",
  "support@contexttree.com",
  // Add your admin emails here
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const stats = userLimitService.getStats();
    const activeUsers = userLimitService.getActiveUsers();

    return NextResponse.json({
      systemStats: {
        activeUsers: stats.activeUsers,
        maxUsers: stats.maxUsers,
        isLimited: stats.isLimited,
        utilizationPercent: Math.round(stats.utilizationPercent),
        status:
          stats.utilizationPercent > 90
            ? "high"
            : stats.utilizationPercent > 70
            ? "medium"
            : "low",
      },
      activeUserList: activeUsers,
      configuration: {
        maxActiveUsers: process.env.MAX_ACTIVE_USERS || "0",
        sessionTimeoutMinutes: 30,
        cleanupIntervalMinutes: 5,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting user limit stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const { action, userEmail } = await request.json();

    if (action === "remove_user" && userEmail) {
      userLimitService.removeUser(userEmail);
      return NextResponse.json({
        success: true,
        message: `User ${userEmail} removed from active sessions`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing user limits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
