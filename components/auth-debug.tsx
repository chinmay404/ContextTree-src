"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthDebug() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setDebugInfo({
      currentUrl: window.location.href,
      baseUrl: window.location.origin,
      environment: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    });
  }, []);

  return (
    <div className="p-4 bg-gray-100 border rounded-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4">Auth Debug Info</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Current URL:</strong> {debugInfo.currentUrl}
        </div>
        <div>
          <strong>Base URL:</strong> {debugInfo.baseUrl}
        </div>
        <div>
          <strong>Environment:</strong> {debugInfo.environment}
        </div>

        {session && (
          <div className="mt-4">
            <div>
              <strong>User:</strong> {session.user?.email}
            </div>
            <div>
              <strong>User ID:</strong> {session.user?.id}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-x-2">
        {!session ? (
          <button
            onClick={() =>
              signIn("google", { callbackUrl: "http://localhost:3000/canvas" })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign In with Google
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "http://localhost:3000" })}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
