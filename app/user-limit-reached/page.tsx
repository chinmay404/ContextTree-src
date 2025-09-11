"use client";

import { Suspense } from "react";
import UserLimitReachedContent from "./content";

export default function UserLimitReachedPage() {
  return (
    <Suspense fallback={<UserLimitReachedFallback />}>
      <UserLimitReachedContent />
    </Suspense>
  );
}

function UserLimitReachedFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="border-0 shadow-xl bg-white/95 backdrop-blur-sm rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-light text-slate-900 mb-2">
              Loading...
            </h3>
            <p className="text-slate-600 text-sm">Checking system status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
