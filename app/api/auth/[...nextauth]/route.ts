import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"
import type { Session, User } from "next-auth"

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
    async jwt({ token, user }: { token: JWT, user?: User }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      // Ensure all properties of the user object are serializable
      const serializableUser: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      } = {};

      if (token.id) {
        serializableUser.id = token.id as string;
      }
      if (token.name) {
        serializableUser.name = token.name;
      }
      if (token.email) {
        serializableUser.email = token.email;
      }
      if (token.picture) {
        serializableUser.image = token.picture;
      }

      session.user = serializableUser;
      return session;
    },
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
