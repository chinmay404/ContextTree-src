
import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { buildFilesIngestUrl, resolveLlmApiUrl } from "@/lib/llm-backend";
import { mongoService } from "@/lib/mongodb";
import type { ExternalFileData } from "@/lib/storage";
import { logUploadEvent } from "@/lib/server-side-logger";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const llmApiUrl = resolveLlmApiUrl();

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

    const markUploadFailure = async (message: string) => {
      try {
        await mongoService.updateNode(
          canvasId,
          nodeId,
          {
            contextContract: message,
            data: {
              ...(nodeData.data || {}),
              loading: false,
              error: message,
              fileId,
            },
          } as any,
          user.email
        );
      } catch (patchError) {
        logUploadEvent("WARN", "Failed to persist upload error state", patchError);
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

    if (!llmApiUrl) {
      const message = "Document processing backend is not configured";
      logUploadEvent("ERROR", message, { fileId });
      await markUploadFailure(message);
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const backendUrl = buildFilesIngestUrl(llmApiUrl);
    logUploadEvent("INFO", `Triggering ingestion: ${backendUrl}`, { fileId });

    const ingestPayload = {
      file_id: fileId,
      user_email: user.email,
      node_id: nodeId,
      canvas_id: canvasId,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const ingestResponse = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ingestPayload),
        signal: controller.signal,
      });

      if (!ingestResponse.ok) {
        const detail = (await ingestResponse.text().catch(() => "")).trim();
        const message =
          detail ||
          `Document processing backend responded with ${ingestResponse.status}`;
        logUploadEvent("ERROR", "Ingest trigger response not OK", {
          fileId,
          status: ingestResponse.status,
          detail: message,
        });
        await markUploadFailure(message);
        return NextResponse.json({ error: message }, { status: 502 });
      }

      logUploadEvent("INFO", "Ingest trigger successful", { fileId });
    } catch (ingestError) {
      const message =
        ingestError instanceof Error && ingestError.name === "AbortError"
          ? "Timed out while starting document processing"
          : "Failed to reach document processing backend";
      logUploadEvent("ERROR", message, ingestError);
      await markUploadFailure(message);
      return NextResponse.json({ error: message }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    logUploadEvent('INFO', `Upload completed successfully`, { fileId, user: user.email });

    return NextResponse.json({
        success: true,
        fileId: fileId,
        fileName: file.name,
        nodeId,
        processing: true,
      });

  } catch (error) {
    logUploadEvent('ERROR', "Error processing file upload", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process file",
      },
      { status: 500 }

    );
  }
});
