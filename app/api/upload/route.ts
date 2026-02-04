
import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import type { ExternalFileData } from "@/lib/storage";

const LLM_API_URL = process.env.LLM_API_URL || process.env.NEXT_PUBLIC_LLM_API_URL;

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const nodeId = formData.get("nodeId") as string;
    const canvasId = formData.get("canvasId") as string;
    const positionRaw = formData.get("position") as string | null;
    let position: { x: number; y: number } | undefined;
    if (positionRaw) {
      try {
        const parsed = JSON.parse(positionRaw);
        if (
          parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        ) {
          position = { x: parsed.x, y: parsed.y };
        }
      } catch {
        position = undefined;
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

     // Server-side limit check (10MB)
    if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 10MB." },
            { status: 413 }
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = crypto.randomUUID();

    // Prepare Data
    const fileData: ExternalFileData = {
        id: fileId,
        userEmail: user.email,
        nodeId: nodeId,
        canvasId: canvasId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: "", // Will be populated by Python backend
        processed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
      
    const nodeData: any = {
          _id: nodeId,
          type: "externalContext",
          primary: false,
          chatMessages: [],
          runningSummary: "",
          contextContract: "Processing...",
          model: "system",
          createdAt: new Date().toISOString(),
          position,
          data: {
              label: file.name,
              content: "",
              fileType: file.type,
              size: file.size,
              loading: true,
              fileId: fileId
          }
    };

    // Save to Postgres (Binary + Metadata)
    await mongoService.createExternalNodeAndFile(nodeData, fileData, buffer);

    // Trigger Python Backend Ingestion (Fire & Forget)
    if (LLM_API_URL) {
        // We construct the URL for the Python backend
        let backendUrl = LLM_API_URL;
        if (backendUrl.includes('/chat')) {
            backendUrl = backendUrl.substring(0, backendUrl.indexOf('/chat'));
        }
        backendUrl = backendUrl.replace(/\/+$/, '') + '/files/ingest';

        console.log(`Triggering ingestion: ${backendUrl}`);

        const ingestPayload = { 
            file_id: fileId,
            user_email: user.email,
            node_id: nodeId,
            canvas_id: canvasId
        };

        // Fire and forget - don't await to keep UI snappy
        fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ingestPayload)
        }).catch(err => console.warn("Trigger ingest failed (backend might be offline):", err));
    }

    return NextResponse.json({
        success: true,
        fileId: fileId,
        fileName: file.name
    });

  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
});
