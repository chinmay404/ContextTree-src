import { type NextRequest, NextResponse } from "next/server";
import { mongoService } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth-utils";

interface IncomingMessage {
  id?: string; // optional on input, generated if missing
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatTurn {
  id: string; // turn id
  user?: { content: string; timestamp: string };
  assistant?: { content: string; timestamp: string };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string; nodeId: string }> }
) {
  try {
    await mongoService.connect();

    const { canvasId, nodeId } = await params;
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log(
      `Attempting to save message for canvas: ${canvasId}, node: ${nodeId}`
    );

    const message: IncomingMessage = await request.json();

    if (!message || !message.role || !message.content) {
      console.error("Invalid message payload:", message);
      return NextResponse.json(
        { error: "Invalid message payload" },
        { status: 400 }
      );
    }

    // Fetch canvas
    const canvas = await mongoService.getCanvas(canvasId, user.email);
    if (!canvas) {
      console.error(`Canvas not found: ${canvasId}`);
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    console.log(`Canvas found with ${canvas.nodes?.length || 0} nodes`);
    console.log(
      "Node IDs in canvas:",
      canvas.nodes?.map((n: any) => n._id) || []
    );

    let node: any = canvas.nodes.find((n: any) => n._id === nodeId);
    if (!node) {
      // Race condition: canvas JSON not yet updated after node POST. Poll normalized table.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && !node; attempt++) {
        await new Promise((r) => setTimeout(r, 80 * attempt));
        const refreshed = await mongoService.getCanvas(canvasId, user.email);
        node = refreshed?.nodes.find((n: any) => n._id === nodeId);
      }
    }
    if (!node) {
      console.error(
        `Node still not found after retries: ${nodeId} in canvas ${canvasId}`
      );
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    console.log(
      `Node found: ${node._id}, current message count: ${
        node.chatMessages?.length || 0
      }`
    );

    const raw = node.chatMessages || [];
    const genId = () =>
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

    // Convert legacy flat messages (with role) into turns if needed
    let turns: ChatTurn[];
    if (raw.length && (raw[0] as any).role) {
      const legacy = raw as any[];
      turns = [];
      for (let i = 0; i < legacy.length; i++) {
        const m = legacy[i];
        if (m.role === "user") {
          const next = legacy[i + 1];
          if (next && next.role === "assistant") {
            turns.push({
              id: m.id || genId(),
              user: {
                content: m.content,
                timestamp: m.timestamp || new Date().toISOString(),
              },
              assistant: {
                content: next.content,
                timestamp: next.timestamp || new Date().toISOString(),
              },
            });
            i++; // consume assistant
          } else {
            turns.push({
              id: m.id || genId(),
              user: {
                content: m.content,
                timestamp: m.timestamp || new Date().toISOString(),
              },
            });
          }
        } else if (m.role === "assistant") {
          turns.push({
            id: m.id || genId(),
            assistant: {
              content: m.content,
              timestamp: m.timestamp || new Date().toISOString(),
            },
          });
        }
      }
    } else {
      turns = raw as ChatTurn[]; // already in new format or empty
    }

    const ts = message.timestamp || new Date().toISOString();
    if (message.role === "user") {
      turns.push({
        id: message.id || genId(),
        user: { content: message.content, timestamp: ts },
      });
    } else if (message.role === "assistant") {
      // attach assistant reply to last user-only turn
      let attached = false;
      for (let i = turns.length - 1; i >= 0; i--) {
        if (turns[i].user && !turns[i].assistant) {
          turns[i].assistant = { content: message.content, timestamp: ts };
          attached = true;
          break;
        }
      }
      if (!attached) {
        turns.push({
          id: message.id || genId(),
          assistant: { content: message.content, timestamp: ts },
        });
      }
    }

    // IMPORTANT: pass user.email so that if the node hasn't yet been normalized
    // into the dedicated nodes/messages tables (legacy / pre-migration canvas),
    // the fallback path that patches the embedded canvas JSON can still work.
    // Previously this was omitted which caused updateNodeMessages to return false
    // (getCanvas required a userEmail) and messages silently failed to persist.
    const success = await mongoService.updateNodeMessages(
      canvasId,
      nodeId,
      turns as any,
      user.email
    );

    if (!success) {
      console.error("Failed to update node messages in MongoDB");
      return NextResponse.json(
        { error: "Failed to update node messages" },
        { status: 500 }
      );
    }

    console.log(`Message saved successfully. Total turns: ${turns.length}`);
    return NextResponse.json({ messages: turns });
  } catch (error) {
    console.error("Error appending message:", error);
    return NextResponse.json(
      { error: "Failed to append message" },
      { status: 500 }
    );
  }
}
