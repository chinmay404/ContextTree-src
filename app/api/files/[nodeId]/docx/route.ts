import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import mammoth from "mammoth";

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
      const result = await mammoth.convertToHtml({ buffer });

      return NextResponse.json({
        html: result.value,
        warnings: result.messages || [],
        fileName: file.file_name || "document.docx",
      });
    } catch (error) {
      console.error("Error rendering docx:", error);
      return NextResponse.json(
        { error: "Failed to render document" },
        { status: 500 }
      );
    }
  }
);
