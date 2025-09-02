import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

// For API route protection
export function withAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const session = await getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add user to request context
    (req as any).user = session.user;

    return handler(req, ...args);
  };
}
