// Single source of truth for admin access. Client-safe (no server imports):
// the API routes use it for enforcement, the UI uses it only to decide
// whether to render admin entry points.
//
// Add more admins either here or via NEXT_PUBLIC_ADMIN_EMAILS in Vercel
// (comma-separated, requires a redeploy — it's inlined at build time).

const ENV_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = Array.from(
  new Set(["chinmaypisal1718@gmail.com", ...ENV_ADMINS])
);

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());
