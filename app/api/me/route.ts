import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { getUserRole } from "@/lib/roles";

// pg (via lib/roles) requires the Node.js runtime
export const runtime = "nodejs";

// Who am I: session email + effective role ('admin' | 'premium' | 'normal').
// Client-side gating (lib/premium.ts fetchMyRole) reads this.
export const GET = withAuth(async (_request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 }
    );
  }

  const role = await getUserRole(user.email);
  return NextResponse.json({ email: user.email, role });
});
