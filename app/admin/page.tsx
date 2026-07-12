"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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

type Role = "admin" | "premium" | "normal";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  isStaticAdmin: boolean;
  createdAt: string | null;
  canvasCount: number;
  lastActiveAt: string | null;
}

const ROLE_OPTIONS: Role[] = ["normal", "premium", "admin"];

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

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`
    );
  }
  return res.json();
}

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

function UserRow({
  user,
  onRoleChange,
}: {
  user: AdminUser;
  onRoleChange: (email: string, role: Role) => void;
}) {
  const active =
    !!user.lastActiveAt &&
    Date.now() - new Date(user.lastActiveAt).getTime() < DAY_MS;
  const rel = relativeTime(user.lastActiveAt);
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-7 w-7 shrink-0 rounded-full"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted type-meta">
          {initial}
        </div>
      )}

      <div className="min-w-0 flex-1 basis-40">
        <div className="truncate type-ui">{user.name || "—"}</div>
        <div className="truncate type-meta">{user.email}</div>
      </div>

      <span className="flex shrink-0 items-center gap-1.5 type-meta">
        {active && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden
          />
        )}
        <span
          className={
            active ? "text-emerald-600 dark:text-emerald-400" : undefined
          }
        >
          {rel}
        </span>
      </span>

      <span
        className="shrink-0 type-mono text-muted-foreground"
        title={`${user.canvasCount} canvases`}
      >
        {user.canvasCount} cv
      </span>

      <select
        value={user.role}
        disabled={user.isStaticAdmin}
        title={
          user.isStaticAdmin
            ? "Static admin (lib/admin.ts) — role is locked"
            : "Change role"
        }
        onChange={(e) => onRoleChange(user.email, e.target.value as Role)}
        className="shrink-0 rounded-lg border border-border bg-muted px-2 py-1 type-ui disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  // DB role for signed-in users outside the static list ('admin' role in
  // users.role also unlocks this page). null = still checking.
  const [dbRole, setDbRole] = useState<string | null>(null);

  const isStaticAdmin =
    status === "authenticated" && isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (status !== "authenticated" || isStaticAdmin) return;
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setDbRole(data?.role ?? "normal");
      })
      .catch(() => {
        if (!cancelled) setDbRole("normal");
      });
    return () => {
      cancelled = true;
    };
  }, [status, isStaticAdmin]);

  const isAdmin = isStaticAdmin || dbRole === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    fetchJson("/api/admin/stats")
      .then((data) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch((err) => {
        if (!cancelled) setStatsError(String(err?.message || err));
      });

    fetchJson("/api/admin/users")
      .then((data) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch((err) => {
        if (!cancelled) setUsersError(String(err?.message || err));
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const handleRoleChange = async (email: string, role: Role) => {
    const previous = users;
    // Optimistic: flip the row now, revert if the PATCH fails.
    setUsers(
      (current) =>
        current?.map((u) => (u.email === email ? { ...u, role } : u)) ??
        current
    );
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      toast.success(`${email} → ${role}`);
    } catch (err) {
      setUsers(previous);
      toast.error(
        `Role change failed: ${String((err as Error)?.message || err)}`
      );
    }
  };

  // Still resolving: session, or the DB-role check for a signed-in user
  // who isn't a static admin.
  if (
    status === "loading" ||
    (status === "authenticated" && !isStaticAdmin && dbRole === null)
  ) {
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
            <p className="mt-3 type-meta text-muted-foreground">
              {status === "unauthenticated"
                ? "You are not signed in."
                : `Signed in as ${session?.user?.email ?? "(no email in session)"} — not an admin account.`}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Toaster position="bottom-right" />

      <main className="mx-auto max-w-4xl px-6 py-12 pb-24">
        <h1 className="type-heading">Admin</h1>
        <p className="mt-1 type-meta">
          Platform overview
        </p>
        {statsError && (
          <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 type-meta text-destructive">
            Stats failed: {statsError}
          </p>
        )}
        {usersError && (
          <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 type-meta text-destructive">
            Users failed: {usersError}
          </p>
        )}

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

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="type-ui font-semibold">Users</h2>
            <span className="type-meta">
              {users ? `${users.length} accounts` : "loading…"}
            </span>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            {users === null && !usersError && (
              <p className="px-4 py-6 type-meta">Loading users…</p>
            )}
            {users !== null && users.length === 0 && (
              <p className="px-4 py-6 type-meta">No users found.</p>
            )}
            {users !== null && users.length > 0 && (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <UserRow
                    key={user.id || user.email}
                    user={user}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

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
