import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import type { EdgeData } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    await mongoService.connect();

    const edge: EdgeData = await request.json();

    if (!edge._id || !edge.from || !edge.to) {
      return NextResponse.json(
        { error: "Edge _id, from, and to are required" },
        { status: 400 }
      );
    }

    const { canvasId } = await params;
    const success = await mongoService.addEdge(canvasId, edge);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to add edge" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Edge added successfully", edge },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding edge:", error);
    return NextResponse.json({ error: "Failed to add edge" }, { status: 500 });
  }
}
