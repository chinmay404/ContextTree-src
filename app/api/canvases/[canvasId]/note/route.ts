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
				return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
			}

			await mongoService.connect();

			const { canvasId } = await params;
			const canvas = await mongoService.getCanvas(canvasId, user.email);

			if (!canvas) {
				return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
			}

			return NextResponse.json({ note: canvas.note ?? null });
		} catch (error) {
			console.error("Error fetching canvas note:", error);
			return NextResponse.json({ error: "Failed to fetch canvas note" }, { status: 500 });
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
				return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
			}

			await mongoService.connect();

			const { canvasId } = await params;
			const body = await request.json();
			const note = body?.note ?? null;

			if (!note) {
				return NextResponse.json({ error: "Missing note payload" }, { status: 400 });
			}

			// Update only the note field on the canvas
			const updated = await mongoService.updateCanvas(
				canvasId,
				{ note },
				user.email
			);

			if (!updated) {
				return NextResponse.json({ error: "Canvas not found or access denied" }, { status: 404 });
			}

			return NextResponse.json({ note: updated.note ?? null });
		} catch (error) {
			console.error("Error updating canvas note:", error);
			return NextResponse.json({ error: "Failed to update canvas note" }, { status: 500 });
		}
	}
);

