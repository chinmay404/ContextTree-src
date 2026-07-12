import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import type { NodeData } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    // Auth + ownership: this route was previously unauthenticated, letting
    // anyone add a node to any canvas by guessing its id. Now the caller
    // must own the canvas.
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    await mongoService.connect();

    const node: NodeData = await request.json();

    if (!node._id) {
      return NextResponse.json(
        { error: "Node _id is required" },
        { status: 400 }
      );
    }

    // Only forked conversation nodes require lineage metadata.
    const requiresLineage =
      !node.primary && (node.type === "branch" || node.type === "context");

    if (requiresLineage) {
      if (!node.parentNodeId || !node.forkedFromMessageId) {
        return NextResponse.json(
          {
            error:
              "Non-primary nodes must include parentNodeId and forkedFromMessageId",
          },
          { status: 400 }
        );
      }
    }

    const { canvasId } = await params;

    // Ownership check: getCanvas is user-scoped and returns null if the
    // canvas does not belong to this user.
    const owned = await mongoService.getCanvas(canvasId, user.email);
    if (!owned) {
      return NextResponse.json(
        { error: "Canvas not found or access denied" },
        { status: 404 }
      );
    }

    const success = await mongoService.addNode(canvasId, node);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to add node" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Node added successfully", node },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding node:", error);
    return NextResponse.json({ error: "Failed to add node" }, { status: 500 });
  }
}
