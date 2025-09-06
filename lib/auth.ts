import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";

// Enhanced pool configuration for production environments
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5, // Limit connections for serverless environments
});

// Add error handling for pool
pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

// Initialize NextAuth-related tables (idempotent) before any adapter queries.
// Updated to work with existing users table structure and prevent conflicts
const initPromise = (async () => {
  let client;
  try {
    // Get a client from the pool with timeout
    client = await pool.connect();

    // Check if users table already exists with different structure
    const existingUsersTable = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      AND column_name = 'password'
    `);

    const hasPasswordColumn = existingUsersTable.rows.length > 0;

    if (!hasPasswordColumn) {
      // Step 1: Create users table only if it doesn't exist or doesn't have password column
      // This means it's the NextAuth-only table structure
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id text PRIMARY KEY,
          email text UNIQUE NOT NULL,
          name text,
          image text,
          email_verified timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          canvas_ids text[] DEFAULT array[]::text[],
          canvas_count integer DEFAULT 0,
          total_nodes integer DEFAULT 0
        );
      `);
    } else {
      // Users table exists with password column - ensure password is nullable
      await client
        .query(
          `
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
      `
        )
        .catch(() => {
          // Ignore error if already nullable
        });
    }

    // Step 2: Create verification_tokens table (no foreign keys)
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier text NOT NULL,
        token text NOT NULL,
        expires timestamptz NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `);

    // Step 3: Ensure accounts table exists and has the right structure
    // Check if accounts table exists first
    const accountsTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'accounts' AND table_schema = 'public'
    `);

    if (accountsTableCheck.rows.length === 0) {
      // Create accounts table if it doesn't exist
      await client.query(`
        CREATE TABLE accounts (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          type text NOT NULL,
          provider text NOT NULL,
          provider_account_id text NOT NULL,
          refresh_token text,
          access_token text,
          expires_at bigint,
          token_type text,
          scope text,
          id_token text,
          session_state text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(provider, provider_account_id)
        );
      `);
    }

    // Step 4: Ensure sessions table exists and has the right structure
    const sessionsTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions' AND table_schema = 'public'
    `);

    if (sessionsTableCheck.rows.length === 0) {
      // Create sessions table if it doesn't exist
      await client.query(`
        CREATE TABLE sessions (
          id text PRIMARY KEY,
          session_token text NOT NULL UNIQUE,
          user_id text NOT NULL,
          expires timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
    }

    // Step 5: Add foreign key constraints if they don't exist (only for new tables)
    // For existing tables, we assume they may have different constraint names
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'accounts_user_id_fkey'
          ) THEN
            ALTER TABLE accounts 
            ADD CONSTRAINT accounts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sessions_user_id_fkey'
          ) THEN
            ALTER TABLE sessions 
            ADD CONSTRAINT sessions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
    } catch (constraintError) {
      // Ignore constraint errors - they may already exist with different names
      console.log('Foreign key constraints may already exist:', constraintError.message);
    }
          scope text,
          id_token text,
          session_state text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(provider, provider_account_id)
        );
      `);
    }

    // Step 4: Ensure sessions table exists and has the right structure
    const sessionsTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions' AND table_schema = 'public'
    `);

    if (sessionsTableCheck.rows.length === 0) {
      // Create sessions table if it doesn't exist
      await pool.query(`
        CREATE TABLE sessions (
          id text PRIMARY KEY,
          session_token text NOT NULL UNIQUE,
          user_id text NOT NULL,
          expires timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
    }

    // Step 5: Add foreign key constraints if they don't exist (only for new tables)
    // For existing tables, we assume they may have different constraint names
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'accounts_user_id_fkey'
          ) THEN
            ALTER TABLE accounts 
            ADD CONSTRAINT accounts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'sessions_user_id_fkey'
          ) THEN
            ALTER TABLE sessions 
            ADD CONSTRAINT sessions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
    } catch (constraintError) {
      // Ignore constraint errors - they may already exist with different names
      console.log('Foreign key constraints may already exist:', constraintError.message);
    }

  } catch (error) {
    console.error('NextAuth table initialization error:', error);
    // Log but don't throw - allow the adapter to continue trying
    // The setup scripts can be run separately to fix issues
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
})();

function pgAdapter() {
  return {
    createUser: async (user) => {
      await initPromise;

      // For existing table structure, let PostgreSQL generate the ID via sequence
      // Handle the existing users table structure (no password column needed for OAuth)
      const userName = user.name || user.email?.split("@")[0] || "User";

      // Insert without password column since it doesn't exist in this table
      const insertQuery = `
        insert into users (email, name, image, created_at, updated_at)
        values ($1,$2,$3,now(),now())
        on conflict (email) do update set 
          name=COALESCE(excluded.name, users.name), 
          image=excluded.image, 
          updated_at=now()
        RETURNING id
      `;

      const result = await pool.query(insertQuery, [
        user.email,
        userName,
        user.image ?? null,
      ]);

      const userId = result.rows[0].id;
      return { id: userId, ...user } as any;
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
