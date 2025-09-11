import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { userLimitService } from "@/lib/user-limit";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const accessCheck = userLimitService.canUserAccess(user.email);
    const stats = userLimitService.getStats();

    return NextResponse.json({
      canAccess: accessCheck.success,
      message: accessCheck.message,
      stats: {
        activeUsers: stats.activeUsers,
        maxUsers: stats.maxUsers,
        isLimited: stats.isLimited,
        utilizationPercent: Math.round(stats.utilizationPercent),
      },
    });
  } catch (error) {
    console.error("Error checking user limit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
