import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt' as const,
    maxAge: 3 * 60 * 60, // 3 hours in seconds (3 * 60 minutes * 60 seconds)
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
      // If running locally, always redirect to local /canvas
      if (baseUrl.startsWith("http://localhost") || baseUrl.startsWith("https://localhost")) {
        return `${baseUrl}/canvas`;
      }
      // Always redirect to canvas after successful login
      if (url.startsWith("/api/auth/callback") || url.startsWith("/auth/login")) {
        return `${baseUrl}/canvas`
      }
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // Handle same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url
      }
      // Default to canvas
      return `${baseUrl}/canvas`
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
