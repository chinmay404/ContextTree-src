// Single source of truth for admin access. Client-safe (no server imports):
// the API routes use it for enforcement, the UI uses it only to decide
// whether to render admin entry points.

export const ADMIN_EMAILS = ["chinmaypisal1718@gmail.com"];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());
