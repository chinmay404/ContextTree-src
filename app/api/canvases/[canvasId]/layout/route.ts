import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";

interface LayoutNodePayload {
  id: string;
  position: { x: number; y: number };
}

interface LayoutPayload {
  nodes?: LayoutNodePayload[];
  viewport?: { x: number; y: number; zoom: number };
}

export const PATCH = withAuth(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ canvasId: string }> }
  ) => {
    try {
      const user = await getCurrentUser();
      if (!user?.email) {
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 }
        );
      }

      await mongoService.connect();

      const { canvasId } = await params;
      const body = (await request.json()) as LayoutPayload;

      const nodes = Array.isArray(body?.nodes) ? body.nodes : [];
      const viewport = body?.viewport;

      const updatedCanvas = await mongoService.updateCanvasLayout(
        canvasId,
        { nodes, viewport },
        user.email
      );

      if (!updatedCanvas) {
        return NextResponse.json(
          { error: "Canvas not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json({ canvas: updatedCanvas });
    } catch (error) {
      console.error("Error updating canvas layout:", error);
      return NextResponse.json(
        { error: "Failed to update canvas layout" },
        { status: 500 }
      );
    }
  }
);
