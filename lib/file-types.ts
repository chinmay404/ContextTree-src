// Allowed external-context file types (owner decision 2026-07-17):
// documents only — PDF, plain text/markdown, and Word. Enforced in the
// composer picker, the canvas drop handler, and server-side in /api/upload;
// the backend ingester rejects anything else as defense in depth.
export const ALLOWED_CONTEXT_FILE_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".md",
  ".doc",
  ".docx",
] as const;

export const CONTEXT_FILE_ACCEPT = ALLOWED_CONTEXT_FILE_EXTENSIONS.join(",");

export const MAX_CONTEXT_FILE_MB = 10;

export function isAllowedContextFile(fileName: string): boolean {
  const lower = (fileName || "").toLowerCase();
  return ALLOWED_CONTEXT_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
