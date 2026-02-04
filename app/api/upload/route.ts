
import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";
import type { ExternalFileData } from "@/lib/storage";
import { logUploadEvent } from "@/lib/server-side-logger";

const LLM_API_URL = process.env.LLM_API_URL || process.env.NEXT_PUBLIC_LLM_API_URL;

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      logUploadEvent('ERROR', 'Upload attempt without authentication');
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    logUploadEvent('INFO', `Upload started for user: ${user.email}`);

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
      logUploadEvent('ERROR', 'No file found in request', { user: user.email });
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    logUploadEvent('INFO', `Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`, { user: user.email });

     // Server-side limit check (10MB)
    if (file.size > 10 * 1024 * 1024) {
        logUploadEvent('WARN', `File too large: ${file.name}`, { size: file.size, user: user.email });
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
    try {
        await mongoService.createExternalNodeAndFile(nodeData, fileData, buffer);
        logUploadEvent('INFO', `File saved to DB: ${fileId}`, { user: user.email });
    } catch (dbError) {
        logUploadEvent('ERROR', `Failed to save file to DB: ${fileId}`, dbError);
        throw dbError; // Re-throw to be caught by outer try-catch
    }

    // Trigger Python Backend Ingestion (Fire & Forget)
    if (LLM_API_URL) {
        // We construct the URL for the Python backend
        let backendUrl = LLM_API_URL;
        if (backendUrl.includes('/chat')) {
            backendUrl = backendUrl.substring(0, backendUrl.indexOf('/chat'));
        }
        backendUrl = backendUrl.replace(/\/+$/, '') + '/files/ingest';

        logUploadEvent('INFO', `Triggering ingestion: ${backendUrl}`, { fileId });

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
        }).then(res => {
            if (!res.ok) {
                 logUploadEvent('WARN', `Ingest trigger response not OK: ${res.status}`, { fileId });
            } else {
                 logUploadEvent('INFO', `Ingest trigger successful`, { fileId });
            }
        }).catch(err => {
            logUploadEvent('WARN', "Trigger ingest failed (backend might be offline)", err);
        });
    } else {
         logUploadEvent('WARN', "LLM_API_URL not set - skipping ingestion trigger", { fileId });
    }

    logUploadEvent('INFO', `Upload completed successfully`, { fileId, user: user.email });

    return NextResponse.json({
        success: true,
        fileId: fileId,
        fileName: file.name
    });

  } catch (error) {
    logUploadEvent('ERROR', "Error processing file upload", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }

    );
  }
});
