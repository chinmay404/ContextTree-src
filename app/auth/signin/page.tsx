"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Network, PowerOff } from "lucide-react";

function ShutdownContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 font-bold text-xl tracking-tight absolute left-1/2 transform -translate-x-1/2">
            <Network className="w-5 h-5" />
            <span>ContextTree</span>
          </div>

          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-lg space-y-10 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <PowerOff className="h-8 w-8 text-gray-700" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              ContextTree has been shut down
            </h1>
            <p className="text-gray-500 leading-relaxed text-pretty">
              Sign-in is no longer available. The backend for this project has
              been turned off, so accounts and live features won&apos;t work
              anymore.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-left">
            <h2 className="text-sm font-semibold text-black mb-2">
              The honest reason
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              I built ContextTree and put a lot into it, but I couldn&apos;t get
              enough people to actually use it to justify keeping the servers
              running. Rather than leave a half-working product up, I&apos;ve
              decided to retire the backend. The frontend stays online as a
              showcase of what it was.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mt-3">
              Thanks to everyone who gave it a try. It meant a lot.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push("/")}
              variant="default"
              className="h-12 px-6 text-base font-medium bg-black text-white hover:bg-gray-800 transition-all"
            >
              Return home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ShutdownContent />
    </Suspense>
  );
}
