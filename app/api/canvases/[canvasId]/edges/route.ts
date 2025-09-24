import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import type { EdgeData } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await mongoService.connect();

    const edge: EdgeData = await request.json();
    console.log("Adding edge:", edge);

    if (!edge._id || !edge.from || !edge.to) {
      return NextResponse.json(
        { error: "Edge _id, from, and to are required" },
        { status: 400 }
      );
    }

    const { canvasId } = await params;
    console.log("Adding edge to canvas:", canvasId);

    // Check if canvas exists and user has access
    const canvas = await mongoService.getCanvas(canvasId, session.user.email);
    if (!canvas) {
      return NextResponse.json(
        { error: "Canvas not found or access denied" },
        { status: 404 }
      );
    }

    const success = await mongoService.addEdge(
      canvasId,
      edge,
      session.user.email
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to add edge to canvas" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Edge added successfully", edge },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding edge:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
