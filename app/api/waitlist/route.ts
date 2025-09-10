import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import rateLimit from "@/lib/rate-limit";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn("DATABASE_URL not set. Set it to your Postgres connection string.");
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Rate limiting: 5 requests per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500, // Max 500 different IPs tracked
});

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Initialize waitlist table
async function initWaitlistTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'pending'
      );
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
      CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
    `);
  } catch (error) {
    console.error("Failed to initialize waitlist table:", error);
  }
}

// Initialize table on module load
initWaitlistTable();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "127.0.0.1";
    
    try {
      await limiter.check(NextResponse, 5, ip); // 5 requests per interval
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { name, email } = body;

    // Input validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();

    // Validate name length
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Additional security headers for tracking
    const userAgent = request.headers.get("user-agent") || "";

    // Database transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if email already exists
      const existingUser = await client.query(
        "SELECT id, created_at FROM waitlist WHERE email = $1",
        [sanitizedEmail]
      );

      if (existingUser.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { 
            error: "This email is already on our waitlist",
            details: "You'll be notified when we launch!"
          },
          { status: 409 }
        );
      }

      // Insert new waitlist entry
      const result = await client.query(
        `INSERT INTO waitlist (name, email, ip_address, user_agent, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, created_at`,
        [sanitizedName, sanitizedEmail, ip, userAgent, "pending"]
      );

      await client.query("COMMIT");

      const newEntry = result.rows[0];

      // Log successful signup (for monitoring)
      console.log(`New waitlist signup: ${sanitizedEmail} (ID: ${newEntry.id})`);

      return NextResponse.json(
        {
          success: true,
          message: "Successfully joined the waitlist!",
          data: {
            id: newEntry.id,
            email: sanitizedEmail,
            createdAt: newEntry.created_at,
          },
        },
        { status: 201 }
      );

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database error during waitlist signup:", error);
      
      // Check for specific database errors
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return NextResponse.json(
          { error: "This email is already on our waitlist" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Unexpected error in waitlist API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to check waitlist stats (optional, for admin)
export async function GET(request: NextRequest) {
  try {
    // Simple auth check - you might want to implement proper admin auth
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_signups,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as signups_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as signups_this_week
      FROM waitlist
    `);

    return NextResponse.json({
      stats: result.rows[0],
    });

  } catch (error) {
    console.error("Error fetching waitlist stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
