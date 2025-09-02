import { NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";

export async function PATCH(request: Request, context: { params: any }) {
  const params = await context.params;
  const { canvasId, edgeId } = params;
  const { name } = await request.json();
  await mongoService.connect();
  const success = await mongoService.updateEdge(canvasId, edgeId, { name });
  if (!success) {
    return NextResponse.json({ error: "Edge not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
