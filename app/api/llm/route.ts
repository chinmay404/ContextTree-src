import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  buildChatBaseUrl,
  isKnownUntrustedSSL,
  resolveLlmApiUrl,
} from "@/lib/llm-backend";
import https from "https";

// Force Node.js runtime for HTTPS agent functionality
export const runtime = "nodejs";

interface LLMRequest {
  canvasId: string;
  nodeId: string;
  model: string;
  message: string;
  message_id?: string;
  parentNodeId?: string | null;
  forkedFromMessageId?: string | null;
  isPrimary?: boolean;
  // External-context node IDs currently attached to this chat node.
  // Sending [] explicitly disables external context for this turn; omitting
  // the field falls back to the persisted canvas edges on the backend.
  contextNodeIds?: string[];
}

// Create an HTTPS agent that bypasses SSL verification for self-signed certs
const createHttpsAgent = () => new https.Agent({ rejectUnauthorized: false });

export async function POST(request: NextRequest) {
  try {
    const llmApiUrl = resolveLlmApiUrl();

    // Authenticate user
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!llmApiUrl || llmApiUrl.trim() === "") {
      return NextResponse.json(
        { error: "LLM service not available" },
        { status: 503 }
      );
    }

    const payload: LLMRequest = await request.json();
    (payload as any).user_id = user.email;

    if (!payload.canvasId || !payload.nodeId || !payload.message) {
      return NextResponse.json(
        { error: "Missing required fields: canvasId, nodeId, message" },
        { status: 400 }
      );
    }

    const isUntrustedSSL = isKnownUntrustedSSL(llmApiUrl);

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ContextTree/1.0",
      },
      body: JSON.stringify(payload),
    };

    if (isUntrustedSSL && llmApiUrl.startsWith("https://")) {
      // @ts-ignore - Node.js specific
      fetchOptions.agent = createHttpsAgent();
    }

    const baseUrl = buildChatBaseUrl(llmApiUrl);
    const streamUrl = `${baseUrl}stream`;

    // Try streaming endpoint first
    let response: Response;
    try {
      response = await fetch(streamUrl, fetchOptions);
    } catch (streamError) {
      // Network error on stream endpoint — fall back to sync
      response = await fetch(baseUrl, fetchOptions);
      return handleLLMResponse(response);
    }

    if (response.status === 404 || response.status === 405) {
      response = await fetch(baseUrl, fetchOptions);
      return handleLLMResponse(response);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      // ── Pass the SSE stream directly to the browser ──────────────────────
      // The frontend reads tokens in real time; no buffering here.
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    return handleLLMResponse(response);

  } catch (error) {
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (process.env.NODE_ENV !== "production") {
        errorMessage = `Internal server error: ${error.message}`;
      }
      if (error.message.includes("CERT") || error.message.includes("SSL")) {
        errorMessage = "SSL certificate error";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "LLM service unavailable";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout";
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function handleLLMResponse(response: Response): Promise<NextResponse> {
  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: response.status >= 500 ? "Service temporarily unavailable" : "Invalid request", details: errorText },
      { status: response.status >= 500 ? 503 : 400 }
    );
  }

  try {
    const data = await response.json();
    return NextResponse.json({
      message: data.message || data.response || data.content || "No response received",
      model: data.model,
      summary: data.summary,
    });
  } catch {
    try {
      const text = await response.text();
      return NextResponse.json({ message: text || "Received empty response" });
    } catch {
      return NextResponse.json(
        { error: "Invalid response format from LLM service" },
        { status: 502 }
      );
    }
  }
}
