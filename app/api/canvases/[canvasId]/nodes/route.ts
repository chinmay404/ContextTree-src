import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import type { NodeData } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    await mongoService.connect();

    const node: NodeData = await request.json();

    if (!node._id) {
      return NextResponse.json(
        { error: "Node _id is required" },
        { status: 400 }
      );
    }

    // For any non-primary node, ensure lineage metadata exists
    if (!node.primary && node.type !== "group") {
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
