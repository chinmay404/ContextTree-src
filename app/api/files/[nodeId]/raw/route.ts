import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";

export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ nodeId: string }> }
  ) => {
    try {
      const user = await getCurrentUser();
      if (!user?.email) {
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 }
        );
      }

      const { nodeId } = await params;
      await mongoService.connect();
      const file = await mongoService.getExternalFileBinaryByNodeId(
        nodeId,
        user.email
      );

      if (!file || !file.data) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }

      const buffer =
        file.data instanceof Buffer ? file.data : Buffer.from(file.data);
      const fileName = file.file_name || "file";
      const contentType = file.file_type || "application/octet-stream";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "no-store",
          "X-File-Name": fileName,
          "X-File-Type": contentType,
        },
      });
    } catch (error) {
      console.error("Error serving raw file:", error);
      return NextResponse.json(
        { error: "Failed to load file" },
        { status: 500 }
      );
    }
  }
);
