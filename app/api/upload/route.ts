
import { type NextRequest, NextResponse } from "next/server";
import { withAuth, getCurrentUser } from "@/lib/auth-utils";
import mammoth from "mammoth";
import { mongoService } from "@/lib/mongodb";
import type { ExternalFileData } from "@/lib/storage";


// Minimal polyfills so pdf.js (used by pdf-parse) does not crash in Node.
// We avoid heavy canvas deps; pdf-parse only needs these constructors to exist.
const g: any = globalThis as any;
if (!g.DOMMatrix) {
  g.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    is2D = true;
    constructor() {}
  };
}
if (!g.Path2D) {
  g.Path2D = class Path2D {};
}
if (!g.ImageData) {
  g.ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}

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

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // New Flow: Forward file to External LLM API for processing
    if (!LLM_API_URL) {
       console.error("LLM_API_URL is missing");
       return NextResponse.json(
         { error: "Processing service unavailable" },
         { status: 503 }
       );
    }

    // Construct the external processing URL
    // Assumption: The external API has a /process-doc endpoint or similar.
    // If LLM_API_URL ends with /chat, we might want to replace it.
    // For now, let's assume LLM_API_URL is the base URL or we append /process-doc
    // If LLM_API_URL is e.g. "http://localhost:8000/v1/chat/completions", we need to be careful.
    // Let's assume the user has a separate endpoint or we can use a convention.
    // I will try to use the base URL if possible or just append /upload if the URL seems to be a base.
    
    // Simple heuristic: Remove 'chat' or 'completions' from the end and add 'process-doc'
    let processUrl = LLM_API_URL;
    if (processUrl.includes('/chat')) {
        processUrl = processUrl.substring(0, processUrl.indexOf('/chat'));
    }
    processUrl = processUrl.replace(/\/+$/, '') + '/process-doc'; 
    
    console.log(`Forwarding file to external API: ${processUrl}`);
    
    const externalFormData = new FormData();
    externalFormData.append('file', file);
    externalFormData.append('nodeId', nodeId);
    externalFormData.append('canvasId', canvasId);
    externalFormData.append('userEmail', user.email);

    // Bypassing SSL check for development if needed (reusing logic from llm route)
    const isUntrustedSSL =
      processUrl.includes("localhost") ||
      processUrl.includes("127.0.0.1") || 
      processUrl.includes("duckdns.org") ||
      processUrl.includes("18.213.206.235");

    const fetchOptions: RequestInit = {
        method: 'POST',
        body: externalFormData,
    };
    
    if (isUntrustedSSL && processUrl.startsWith("https://")) {
         const { Agent } = await import("https");
         // @ts-ignore
         fetchOptions.agent = new Agent({ rejectUnauthorized: false });
    }

    const response = await fetch(processUrl, fetchOptions);

    if (!response.ok) {
        const errText = await response.text();
        console.error(`External API error: ${response.status} ${errText}`);
        throw new Error(`External processing failed: ${errText}`);
    }

    const result = await response.json();
    // Expected result: { content: "extracted text", ...otherMetadata }

    // Save to DB
    if (nodeId && canvasId) {
      const fileData: ExternalFileData = {
        id: crypto.randomUUID(),
        userEmail: user.email,
        nodeId: nodeId,
        canvasId: canvasId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: result.content || "", // Content from external API
        processed: true, // It is processed by the external API
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const nodeData: any = {
          _id: nodeId,
          type: "externalContext",
          primary: false,
          chatMessages: [],
          runningSummary: "",
          contextContract: result.content || "",
          model: "system",
          createdAt: new Date().toISOString(),
          data: {
              label: file.name,
              content: result.content || "",
              fileType: file.type,
              size: file.size,
          }
      };

      await mongoService.createExternalNodeAndFile(nodeData, fileData);
    }

    return NextResponse.json({
      fileName: file.name,
      fileType: file.type,
      content: result.content || "",
      size: file.size
    });

  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
});

