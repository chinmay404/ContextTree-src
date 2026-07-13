// ─── Premium gating (Founding license) ───────────────────────
// Single source of truth for premium checks. UI that gates features on
// premium should import from here so wiring billing later is one change.

export const isPremiumUser = () => false; // TODO: wire to billing

export const PREMIUM_TOOLTIP = "Founding license — coming soon";

// ─── Async role lookup (users.role via /api/me) ───────────────
// Client-side helper with a module-level cache: one network hit per page
// load, no matter how many gated components ask. The premium dialogs still
// use the synchronous isPremiumUser() above — they migrate to fetchMyRole()
// next, at which point isPremiumUser can be retired.
let myRolePromise: Promise<string> | null = null;

export function fetchMyRole(): Promise<string> {
  if (!myRolePromise) {
    myRolePromise = fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.role;
        return role === "admin" || role === "premium" ? role : "normal";
      })
      .catch(() => {
        myRolePromise = null; // don't cache failures
        return "normal";
      });
  }
  return myRolePromise;
}

// Entitlement = paid Founding license (premium) OR admin (admins get
// everything a Founding license unlocks, by owner decision 2026-07-13).
export const isPremiumRole = (role?: string | null): boolean =>
  role === "premium" || role === "admin";
