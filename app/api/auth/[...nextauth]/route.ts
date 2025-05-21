import NextAuth from "next-auth"
import { authOptions as authOptionsFromLib } from "@/lib/auth"

// Re-export authOptions to maintain compatibility with existing imports
export const authOptions = authOptionsFromLib

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
