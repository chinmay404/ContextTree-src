import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import { withAuth } from "@/lib/auth-utils";

export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; nodeId: string }> }
) => {
  try {
    const user = (request as any).user;
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await mongoService.connect();
    const { canvasId, nodeId } = await params;

    const node = await mongoService.getNode(canvasId, nodeId, user.email);

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json(node);
  } catch (error) {
    console.error("Error fetching node:", error);
    return NextResponse.json(
      { error: "Failed to fetch node" },
      { status: 500 }
    );
  }
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; nodeId: string }> }
) {
  try {
    await mongoService.connect();

    const updates = await request.json();
    const { canvasId, nodeId } = await params;
    const success = await mongoService.updateNode(canvasId, nodeId, updates);

    if (!success) {
      return NextResponse.json(
        { error: "Node not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Node updated successfully" });
  } catch (error) {
    console.error("Error updating node:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; nodeId: string }> }
) {
  try {
    await mongoService.connect();

    const { canvasId, nodeId } = await params;
    const success = await mongoService.removeNode(canvasId, nodeId);

    if (!success) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Node deleted successfully" });
  } catch (error) {
    console.error("Error deleting node:", error);
    return NextResponse.json(
      { error: "Failed to delete node" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; nodeId: string }> }
) {
  try {
    await mongoService.connect();
    const updates = await request.json();
    const { canvasId, nodeId } = await params;

    const success = await mongoService.updateNode(canvasId, nodeId, updates);

    if (!success) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error patching node:", error);
    return NextResponse.json(
      { error: "Failed to patch node" },
      { status: 500 }
    );
  }
}
