"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isAdminEmail } from "@/lib/admin";

interface AdminStats {
  totalUsers: number | null;
  usersLast7Days: number | null;
  totalCanvases: number | null;
  canvasesUpdatedLast24h: number | null;
  totalNodes: number | null;
  totalMessages: number | null;
  messagesLast24h: number | null;
}

const STAT_CARDS: { key: keyof AdminStats; label: string }[] = [
  { key: "totalUsers", label: "Total users" },
  { key: "usersLast7Days", label: "New users · 7d" },
  { key: "totalCanvases", label: "Total canvases" },
  { key: "canvasesUpdatedLast24h", label: "Active canvases · 24h" },
  { key: "totalNodes", label: "Total nodes" },
  { key: "totalMessages", label: "Total messages" },
  { key: "messagesLast24h", label: "Messages · 24h" },
];

const UPCOMING_SECTIONS: { title: string; description: string }[] = [
  {
    title: "Users",
    description: "List accounts, adjust quotas, deactivate users.",
  },
  {
    title: "Usage",
    description: "Per-model token spend across the platform.",
  },
  {
    title: "Billing",
    description: "Founding licenses and payment status.",
  },
  {
    title: "Flags",
    description: "Feature toggles rolled out per account.",
  },
];

function TopBar() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Context Tree
        </Link>
      </div>
    </header>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  const isAdmin =
    status === "authenticated" && isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <main className="mx-auto max-w-4xl px-6 py-12">
          <p className="type-meta">Loading…</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="type-heading">Not authorized</h1>
            <p className="mt-2 type-meta">
              This page is restricted to administrators.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />

      <main className="mx-auto max-w-4xl px-6 py-12 pb-24">
        <h1 className="type-heading">Admin</h1>
        <p className="mt-1 type-meta">
          Platform overview{statsError ? " — stats unavailable" : ""}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, label }) => {
            const value = stats ? stats[key] : undefined;
            return (
              <div
                key={key}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="text-2xl font-semibold">
                  {value === undefined ? "…" : value === null ? "—" : value}
                </div>
                <div className="mt-1 type-meta">{label}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {UPCOMING_SECTIONS.map(({ title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="type-ui font-semibold">{title}</h2>
                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 type-meta">
                  Coming soon
                </span>
              </div>
              <p className="mt-1.5 type-meta">{description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
