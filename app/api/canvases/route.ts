import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import type { CanvasData } from "@/lib/storage";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    await mongoService.connect();

    // Get user's canvases and stats
    const canvases = await mongoService.getUserCanvases(user.email);
    const stats = await mongoService.getUserStats(user.email);

    return NextResponse.json({
      canvases,
      userStats: stats,
    });
  } catch (error) {
    console.error("Error fetching canvases:", error);
    return NextResponse.json(
      { error: "Failed to fetch canvases" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    await mongoService.connect();
    const canvas: CanvasData = await request.json();

    // Ensure the canvas belongs to the authenticated user
    canvas.userId = user.email;

    if (!canvas._id) {
      return NextResponse.json(
        { error: "Canvas _id is required" },
        { status: 400 }
      );
    }

    const createdCanvas = await mongoService.createCanvas(canvas);
    const stats = await mongoService.getUserStats(user.email);

    return NextResponse.json(
      {
        canvas: createdCanvas,
        userStats: stats,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating canvas:", error);
    return NextResponse.json(
      { error: "Failed to create canvas" },
      { status: 500 }
    );
  }
});
