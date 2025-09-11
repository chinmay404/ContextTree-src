import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";

// Server-side LLM API endpoint (not exposed to client)
const LLM_API_URL =
  process.env.LLM_API_URL || process.env.NEXT_PUBLIC_LLM_API_URL;

interface LLMRequest {
  canvasId: string;
  nodeId: string;
  model: string;
  message: string;
}

interface LLMResponse {
  message: string;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Validate LLM API URL
    if (!LLM_API_URL || LLM_API_URL.trim() === "") {
      console.error("LLM API URL not configured");
      return NextResponse.json(
        { error: "LLM service not available" },
        { status: 503 }
      );
    }

    const payload: LLMRequest = await request.json();

    // Validate required fields
    if (!payload.canvasId || !payload.nodeId || !payload.message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add rate limiting check (optional)
    // You can implement rate limiting logic here

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ContextTree/1.0",
      },
      body: JSON.stringify(payload),
    };

    // Handle SSL certificate issues for development
    // In production, ensure your LLM API has a valid SSL certificate
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isUntrustedSSL =
      LLM_API_URL.includes("18.213.206.235") ||
      LLM_API_URL.includes("localhost");

    if (isDevelopment && isUntrustedSSL && LLM_API_URL.startsWith("https://")) {
      // Only bypass SSL in development for known test endpoints
      const originalRejectUnauthorized =
        process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      try {
        const response = await fetch(LLM_API_URL, fetchOptions);
        return await handleLLMResponse(response);
      } finally {
        // Restore original setting
        if (originalRejectUnauthorized !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    } else {
      // Normal fetch for production with valid SSL
      const response = await fetch(LLM_API_URL, fetchOptions);
      return await handleLLMResponse(response);
    }
  } catch (error) {
    console.error("LLM proxy error:", error);

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleLLMResponse(response: Response): Promise<NextResponse> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`LLM API error (${response.status}):`, errorText);

    return NextResponse.json(
      {
        error: "LLM service error",
        details:
          response.status >= 500
            ? "Service temporarily unavailable"
            : "Invalid request",
      },
      { status: response.status >= 500 ? 503 : 400 }
    );
  }

  const data = await response.json();

  // Sanitize response data before returning
  const sanitizedResponse: LLMResponse = {
    message:
      data.message || data.response || data.content || "No response received",
    model: data.model,
  };

  return NextResponse.json(sanitizedResponse);
}
