import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import https from "https";

// Force Node.js runtime for HTTPS agent functionality
export const runtime = "nodejs";

// Bypassing SSL check for expired certificates (Critical fix)
if (process.env.NODE_ENV !== 'production' || process.env.vercel !== 'production') {
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
// Also apply it unconditionally if we detect duckdns to be sure
if ((process.env.LLM_API_URL || "").includes("duckdns.org")) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}


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

// Create an HTTPS agent that bypasses SSL verification for development
const createHttpsAgent = () => {
  return new https.Agent({
    rejectUnauthorized: false,
  });
};

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

    // Prepare fetch options with SSL handling
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isUntrustedSSL =
      LLM_API_URL.includes("18.213.206.235") ||
      LLM_API_URL.includes("localhost") ||
      LLM_API_URL.includes("127.0.0.1") ||
      LLM_API_URL.includes("duckdns.org");

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ContextTree/1.0",
      },
      body: JSON.stringify(payload),
    };

    // Add SSL bypass for known self-signed/expired endpoints
    if (isUntrustedSSL && LLM_API_URL.startsWith("https://")) {
      // @ts-ignore - Node.js specific agent property
      fetchOptions.agent = createHttpsAgent();
    }

    console.log(`LLM API call to: ${LLM_API_URL.replace(/\/[^\/]*$/, "/***")}`);

    try {
      const response = await fetch(LLM_API_URL, fetchOptions);
      return await handleLLMResponse(response);
    } catch (fetchError) {
      console.error("LLM fetch error:", fetchError);

      // Try alternative approach for SSL issues
      if (isDevelopment && LLM_API_URL.startsWith("https://")) {
        console.log("Attempting HTTP fallback for development...");
        const httpUrl = LLM_API_URL.replace("https://", "http://");
        try {
          const httpResponse = await fetch(httpUrl, {
            ...fetchOptions,
            // Remove agent for HTTP
            agent: undefined,
          });
          return await handleLLMResponse(httpResponse);
        } catch (httpError) {
          console.error("HTTP fallback also failed:", httpError);
        }
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("LLM proxy error details:", error);

    // Provide more specific error information for debugging
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      // In development, return the actual error message
      if (process.env.NODE_ENV !== 'production') {
          errorMessage = `Internal server error: ${error.message}`;
      }

      if (error.message.includes("CERT") || error.message.includes("SSL")) {
        errorMessage = "SSL certificate error";
        console.error(
          "SSL Certificate issue. In development, this should be handled automatically."
        );
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "LLM service unavailable";
        console.error(
          "Cannot connect to LLM service. Check if the service is running."
        );
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout";
        console.error("LLM service request timed out.");
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function handleLLMResponse(response: Response): Promise<NextResponse> {
  console.log(`LLM API response status: ${response.status}`);

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

  try {
    const data = await response.json();
    console.log("LLM API response received successfully");

    // Sanitize response data before returning
    const sanitizedResponse: LLMResponse = {
      message:
        data.message || data.response || data.content || "No response received",
      model: data.model,
    };

    return NextResponse.json(sanitizedResponse);
  } catch (parseError) {
    console.error("Failed to parse LLM response as JSON:", parseError);

    // Try to get response as text
    try {
      const textResponse = await response.text();
      return NextResponse.json({
        message: textResponse || "Received empty response",
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid response format from LLM service" },
        { status: 502 }
      );
    }
  }
}
