import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";

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
  request: Request,
  context: { params: Promise<{ canvasId: string; nodeId: string }> }
) {
  const { canvasId, nodeId } = await context.params;
  const { name, color, textColor, dotColor } = await request.json();
  await mongoService.connect();
  const success = await mongoService.updateNode(canvasId, nodeId, {
    name,
    color,
    textColor,
    dotColor,
  });
  if (!success) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
