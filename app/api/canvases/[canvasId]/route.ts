import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";

export const GET = withAuth(
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
      const canvas = await mongoService.getCanvas(canvasId, user.email);

      if (!canvas) {
        return NextResponse.json(
          { error: "Canvas not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ canvas });
    } catch (error) {
      console.error("Error fetching canvas:", error);
      return NextResponse.json(
        { error: "Failed to fetch canvas" },
        { status: 500 }
      );
    }
  }
);

export const PUT = withAuth(
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
      const updates = await request.json();
      const updatedCanvas = await mongoService.updateCanvas(
        canvasId,
        updates,
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
      console.error("Error updating canvas:", error);
      return NextResponse.json(
        { error: "Failed to update canvas" },
        { status: 500 }
      );
    }
  }
);

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
      const updates = await request.json();

      // Add updatedAt timestamp for partial updates
      const partialUpdates = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const updatedCanvas = await mongoService.updateCanvas(
        canvasId,
        partialUpdates,
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
      console.error("Error updating canvas:", error);
      return NextResponse.json(
        { error: "Failed to update canvas" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
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
      const deleted = await mongoService.deleteCanvas(canvasId, user.email);

      if (!deleted) {
        return NextResponse.json(
          { error: "Canvas not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Canvas deleted successfully" });
    } catch (error) {
      console.error("Error deleting canvas:", error);
      return NextResponse.json(
        { error: "Failed to delete canvas" },
        { status: 500 }
      );
    }
  }
);
