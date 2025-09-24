import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { mongoService } from "@/lib/mongodb";
import { nanoid } from "nanoid";

// POST /api/reports - Create a new bug report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { title, description, browserInfo, userEmail, userName } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (title.length > 100 || description.length > 1000) {
      return NextResponse.json(
        { error: "Field length exceeds maximum allowed" },
        { status: 400 }
      );
    }

    // Use session email instead of the one from the request for security
    const reportData = {
      id: nanoid(),
      userEmail: session.user.email,
      userName: session.user.name || "Anonymous",
      title: title.trim(),
      description: description.trim(),
      severity: "medium", // Default severity
      stepsToReproduce: "User did not provide steps",
      expectedBehavior: "Normal functionality",
      actualBehavior: "Bug occurred",
      browserInfo: browserInfo?.trim() || null,
      additionalInfo: null,
    };

    const report = await mongoService.createBugReport(reportData);

    return NextResponse.json({
      message: "Bug report submitted successfully",
      reportId: report.id,
    });
  } catch (error) {
    console.error("Error creating bug report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/reports - Get bug reports (for user or admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userOnly = searchParams.get("userOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let reports;

    if (userOnly) {
      // Get reports for the current user only
      reports = await mongoService.getBugReportsByUser(session.user.email);
    } else {
      // For admin functionality - get all reports
      // Only allow admin user to see all reports
      if (session.user.email !== "chinmaypisal1718@gmail.com") {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
      reports = await mongoService.getAllBugReports(limit, offset);
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching bug reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
