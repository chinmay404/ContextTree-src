import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; edgeId: string }> }
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

    const { canvasId, edgeId } = await params;
    console.log("Deleting edge:", edgeId, "from canvas:", canvasId);

    // Check if canvas exists and user has access
    const canvas = await mongoService.getCanvas(canvasId, session.user.email);
    if (!canvas) {
      return NextResponse.json(
        { error: "Canvas not found or access denied" },
        { status: 404 }
      );
    }

    const success = await mongoService.removeEdge(canvasId, edgeId, session.user.email);

    if (!success) {
      return NextResponse.json(
        { error: "Edge not found or failed to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Edge deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting edge:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; edgeId: string }> }
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

    const updates = await request.json();
    const { canvasId, edgeId } = await params;
    console.log("Updating edge:", edgeId, "in canvas:", canvasId, "with:", updates);

    // Check if canvas exists and user has access
    const canvas = await mongoService.getCanvas(canvasId, session.user.email);
    if (!canvas) {
      return NextResponse.json(
        { error: "Canvas not found or access denied" },
        { status: 404 }
      );
    }

    const success = await mongoService.updateEdge(canvasId, edgeId, updates, session.user.email);

    if (!success) {
      return NextResponse.json(
        { error: "Edge not found or failed to update" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Edge updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating edge:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
