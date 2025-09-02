import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize NextAuth-related tables (idempotent) before any adapter queries.
const initPromise = (async () => {
  await pool.query(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      name text,
      image text,
      email_verified timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      canvas_ids text[] default array[]::text[],
      canvas_count integer default 0,
      total_nodes integer default 0
    );
    create table if not exists accounts (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      type text not null,
      provider text not null,
      provider_account_id text not null,
      refresh_token text,
      access_token text,
      expires_at bigint,
      token_type text,
      scope text,
      id_token text,
      session_state text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(provider, provider_account_id)
    );
    create table if not exists sessions (
      id text primary key,
      session_token text not null unique,
      user_id text not null references users(id) on delete cascade,
      expires timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists verification_tokens (
      identifier text not null,
      token text not null,
      expires timestamptz not null,
      primary key (identifier, token)
    );
  `);
})();

function pgAdapter() {
  return {
    createUser: async (user) => {
      await initPromise;
      const id = user.id || crypto.randomUUID();
      await pool.query(
        `insert into users (id, email, name, image, created_at, updated_at)
         values ($1,$2,$3,$4,now(),now())
         on conflict (email) do update set name=excluded.name, image=excluded.image, updated_at=now()`,
        [id, user.email, user.name ?? null, user.image ?? null]
      );
      return { id, ...user } as any;
    },
    getUser: async (id) => {
      await initPromise;
      const r = await pool.query(
        "select id, email, name, image, email_verified from users where id=$1",
        [id]
      );
      return r.rowCount
        ? {
            id: r.rows[0].id,
            email: r.rows[0].email,
            name: r.rows[0].name,
            image: r.rows[0].image,
            emailVerified: r.rows[0].email_verified,
          }
        : null;
    },
    getUserByEmail: async (email) => {
      await initPromise;
      const r = await pool.query(
        "select id, email, name, image, email_verified from users where email=$1",
        [email]
      );
      return r.rowCount
        ? {
            id: r.rows[0].id,
            email: r.rows[0].email,
            name: r.rows[0].name,
            image: r.rows[0].image,
            emailVerified: r.rows[0].email_verified,
          }
        : null;
    },
    getUserByAccount: async ({ provider, providerAccountId }) => {
      await initPromise;
      const r = await pool.query(
        `select u.id, u.email, u.name, u.image, u.email_verified
         from accounts a join users u on u.id=a.user_id
         where a.provider=$1 and a.provider_account_id=$2`,
        [provider, providerAccountId]
      );
      return r.rowCount
        ? {
            id: r.rows[0].id,
            email: r.rows[0].email,
            name: r.rows[0].name,
            image: r.rows[0].image,
            emailVerified: r.rows[0].email_verified,
          }
        : null;
    },
    updateUser: async (user) => {
      await initPromise;
      await pool.query(
        `update users set name=$2, image=$3, updated_at=now() where id=$1`,
        [user.id, user.name ?? null, user.image ?? null]
      );
      return user as any;
    },
    deleteUser: async (id) => {
      await initPromise;
      await pool.query("delete from users where id=$1", [id]);
    },
    linkAccount: async (account) => {
      await initPromise;
      await pool.query(
        `insert into accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())
         on conflict (provider, provider_account_id) do update set access_token=excluded.access_token, refresh_token=excluded.refresh_token, expires_at=excluded.expires_at, scope=excluded.scope, id_token=excluded.id_token, updated_at=now()`,
        [
          crypto.randomUUID(),
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ]
      );
    },
    unlinkAccount: async ({ provider, providerAccountId }) => {
      await initPromise;
      await pool.query(
        "delete from accounts where provider=$1 and provider_account_id=$2",
        [provider, providerAccountId]
      );
    },
    createSession: async (session) => {
      await initPromise;
      const id = crypto.randomUUID();
      await pool.query(
        `insert into sessions (id, session_token, user_id, expires, created_at, updated_at) values ($1,$2,$3,$4,now(),now())`,
        [id, session.sessionToken, session.userId, session.expires]
      );
      return { ...session, id } as any;
    },
    getSessionAndUser: async (sessionToken) => {
      await initPromise;
      const r = await pool.query(
        `select s.id as session_id, s.session_token, s.user_id, s.expires, u.id as u_id, u.email, u.name, u.image, u.email_verified
         from sessions s join users u on u.id=s.user_id where s.session_token=$1`,
        [sessionToken]
      );
      if (!r.rowCount) return null;
      const row = r.rows[0];
      return {
        session: {
          id: row.session_id,
          sessionToken: row.session_token,
          userId: row.user_id,
          expires: row.expires,
        },
        user: {
          id: row.u_id,
          email: row.email,
          name: row.name,
          image: row.image,
          emailVerified: row.email_verified,
        },
      } as any;
    },
    updateSession: async (session) => {
      await initPromise;
      await pool.query(
        `update sessions set expires=$2, updated_at=now() where session_token=$1`,
        [session.sessionToken, session.expires]
      );
      return session as any;
    },
    deleteSession: async (sessionToken) => {
      await initPromise;
      await pool.query("delete from sessions where session_token=$1", [
        sessionToken,
      ]);
    },
    createVerificationToken: async (token) => {
      await initPromise;
      await pool.query(
        `insert into verification_tokens (identifier, token, expires) values ($1,$2,$3)`,
        [token.identifier, token.token, token.expires]
      );
      return token;
    },
    useVerificationToken: async ({ identifier, token }) => {
      await initPromise;
      const r = await pool.query(
        `delete from verification_tokens where identifier=$1 and token=$2 returning identifier, token, expires`,
        [identifier, token]
      );
      return r.rowCount ? r.rows[0] : null;
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: pgAdapter() as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Send properties to the client, like an access_token and user id from a provider
      if (session?.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ user, token }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
};
