import { type NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for HTTPS agent functionality
export const runtime = "nodejs";

const LLM_API_URL =
  process.env.LLM_API_URL || process.env.NEXT_PUBLIC_LLM_API_URL;

export async function GET(request: NextRequest) {
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    llmApiUrl: LLM_API_URL
      ? LLM_API_URL.replace(/\/[^\/]*$/, "/***")
      : "Not configured",
    tests: [] as any[],
  };

  // Test 1: Check if URL is configured
  testResults.tests.push({
    name: "LLM API URL Configuration",
    status: LLM_API_URL ? "PASS" : "FAIL",
    details: LLM_API_URL
      ? "URL is configured"
      : "LLM_API_URL not found in environment",
  });

  if (!LLM_API_URL) {
    return NextResponse.json(testResults);
  }

  // Test 2: Try to connect to the LLM service
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // SSL handling logic matching main route
    const isUntrustedSSL =
      LLM_API_URL.includes("18.213.206.235") ||
      LLM_API_URL.includes("localhost") ||
      LLM_API_URL.includes("127.0.0.1");

    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ContextTree-HealthCheck/1.0",
      },
      body: JSON.stringify({
        canvasId: "health-check",
        nodeId: "health-check",
        model: "test",
        message: "Health check ping",
      }),
      signal: controller.signal,
      // @ts-ignore - For SSL bypass in development with IP addresses only
      agent:
        process.env.NODE_ENV !== "production" && isUntrustedSSL
          ? new (require("https").Agent)({ rejectUnauthorized: false })
          : undefined,
    });

    clearTimeout(timeoutId);

    testResults.tests.push({
      name: "LLM API Connection",
      status: response.ok ? "PASS" : "PARTIAL",
      details: `HTTP ${response.status} - ${response.statusText}`,
      responseTime: "< 5s",
    });

    if (response.ok) {
      try {
        const data = await response.json();
        testResults.tests.push({
          name: "LLM API Response Format",
          status:
            data.message || data.response || data.content ? "PASS" : "WARN",
          details: data.message
            ? "Valid response format"
            : "Unexpected response structure",
        });
      } catch {
        testResults.tests.push({
          name: "LLM API Response Format",
          status: "WARN",
          details: "Response is not valid JSON",
        });
      }
    }
  } catch (error: any) {
    testResults.tests.push({
      name: "LLM API Connection",
      status: "FAIL",
      details: error.message || "Connection failed",
      error: error.name,
    });

    // Test HTTP fallback ONLY for IP addresses in development
    if (
      LLM_API_URL.startsWith("https://") &&
      process.env.NODE_ENV !== "production" &&
      isUntrustedSSL
    ) {
      try {
        const httpUrl = LLM_API_URL.replace("https://", "http://");
        const httpResponse = await fetch(httpUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "ContextTree-HealthCheck/1.0",
          },
          body: JSON.stringify({
            canvasId: "health-check",
            nodeId: "health-check",
            model: "test",
            message: "Health check ping via HTTP",
          }),
        });

        testResults.tests.push({
          name: "LLM API HTTP Fallback",
          status: httpResponse.ok ? "PASS" : "PARTIAL",
          details: `HTTP ${httpResponse.status} via HTTP fallback`,
        });
      } catch (httpError: any) {
        testResults.tests.push({
          name: "LLM API HTTP Fallback",
          status: "FAIL",
          details: httpError.message || "HTTP fallback also failed",
        });
      }
    }
  }

  return NextResponse.json(testResults);
}
