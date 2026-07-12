import { SignJWT } from "jose";

/**
 * Service-to-service auth with the FastAPI backend (V2 architecture §2).
 *
 * For every proxied request we mint a short-lived HS256 JWT whose `sub` is
 * the authenticated user's id. The backend verifies it with the shared
 * BACKEND_JWT_SECRET and takes identity ONLY from this token — never from
 * the request body.
 */

const TOKEN_TTL_SECONDS = 60;

export async function mintBackendToken(userId: string): Promise<string> {
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    throw new Error("BACKEND_JWT_SECRET is not configured");
  }
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}
