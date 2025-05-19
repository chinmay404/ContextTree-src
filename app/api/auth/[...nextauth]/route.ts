import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

// Determine the base URL for callbacks
const baseUrl =
  process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

console.log("NextAuth Base URL:", baseUrl)
console.log("Google Client ID set:", !!process.env.GOOGLE_CLIENT_ID)
console.log("Google Client Secret set:", !!process.env.GOOGLE_CLIENT_SECRET)
console.log("NextAuth Secret set:", !!process.env.NEXTAUTH_SECRET)
console.log("MongoDB URI set:", !!process.env.MONGODB_URI)

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          id: user.id,
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        // @ts-ignore
        session.accessToken = token.accessToken
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect Callback:", { url, baseUrl })

      // Always redirect to canvas after successful login
      return `${baseUrl}/canvas`
    },
  },
  debug: true,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
