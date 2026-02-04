import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import { mongoService } from "@/lib/mongodb";

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

    const body = await request.json();
    const nodeId = body?.nodeId as string | undefined;
    const canvasId = body?.canvasId as string | undefined;
    const fileId = body?.fileId as string | undefined;

    if (!nodeId || !canvasId) {
      return NextResponse.json(
        { error: "nodeId and canvasId are required" },
        { status: 400 }
      );
    }

    await mongoService.connect();
    const canvas = await mongoService.getCanvas(canvasId, user.email);
    if (!canvas) {
      return NextResponse.json(
        { error: "Canvas not found" },
        { status: 404 }
      );
    }

    const node = canvas.nodes.find((n) => n._id === nodeId);
    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    let resolvedFileId = typeof fileId === "string" ? fileId : undefined;
    if (!resolvedFileId) {
      const fileRecord = await mongoService.getExternalFileByNodeId(
        nodeId,
        user.email
      );
      resolvedFileId = fileRecord?.id;
    }

    if (!resolvedFileId) {
      return NextResponse.json(
        { error: "File not found for node" },
        { status: 404 }
      );
    }

    const nextData = {
      ...(node.data || {}),
      loading: true,
      error: undefined,
      fileId: resolvedFileId,
    };

    await mongoService.updateNode(
      canvasId,
      nodeId,
      { data: nextData, contextContract: "Processing..." },
      user.email
    );

    if (!LLM_API_URL) {
      return NextResponse.json({
        success: true,
        warning: "LLM_API_URL not configured",
      });
    }

    let backendUrl = LLM_API_URL;
    if (backendUrl.includes("/chat")) {
      backendUrl = backendUrl.substring(0, backendUrl.indexOf("/chat"));
    }
    backendUrl = backendUrl.replace(/\/+$/, "") + "/files/ingest";

    const ingestPayload = {
      file_id: resolvedFileId,
      user_email: user.email,
      node_id: nodeId,
      canvas_id: canvasId,
    };

    fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ingestPayload),
    }).catch((err) =>
      console.warn("Trigger ingest failed (backend might be offline):", err)
    );

    return NextResponse.json({ success: true, fileId: resolvedFileId });
  } catch (error) {
    console.error("Error retrying file ingestion:", error);
    return NextResponse.json(
      { error: "Failed to retry file processing" },
      { status: 500 }
    );
  }
});
