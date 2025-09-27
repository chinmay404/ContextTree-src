"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomAccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the sign-in page
    router.replace("/auth/signin");
  }, [router]);

  // Show a loading message while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
