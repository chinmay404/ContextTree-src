"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  findConversationThreads,
  findOneConversationThread,
  insertOneConversationThread,
  updateOneConversationThread,
  deleteOneConversationThread,
  findThreadCheckpoints,
  findOneThreadCheckpoint,
  insertOneThreadCheckpoint,
  updateOneThreadCheckpoint,
  deleteOneThreadCheckpoint,
  findThreadNodes,
  insertOneThreadNode,
  updateOneThreadNode,
  deleteOneThreadNode,
  deleteManyThreadNodes,
} from "@/lib/db";
import type {
  ConversationThread,
  ThreadCheckpoint,
  ThreadNode,
} from "@/lib/models/canvas";
import { revalidatePath } from "next/cache";
import { safeSerializeForClient } from "@/lib/serialize-mongodb";
import { v4 as uuidv4 } from "uuid";

console.log("ACTION/THREADS: Module loaded.");

// Thread management functions
export async function createNewThread(title: string, description?: string) {
  console.log("ACTION/THREADS: createNewThread() called with title:", title);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const threadId = uuidv4();
    const newThread: ConversationThread = {
      threadId,
      userId,
      title: title.trim() || "New Conversation",
      description: description?.trim(),
      createdAt: new Date(),
      lastModified: new Date(),
      isActive: true,
      metadata: {
        totalNodes: 0,
        totalCheckpoints: 0,
        totalMessages: 0,
        tags: [],
      },
      settings: {
        autoCheckpoint: true,
        checkpointInterval: 10, // 10 minutes
        maxCheckpoints: 50,
      },
    };

    const result = await insertOneConversationThread(newThread);
    console.log(
      "ACTION/THREADS: createNewThread() - ✅ Thread created:",
      threadId
    );

    revalidatePath("/canvas");
    return safeSerializeForClient({
      success: true,
      threadId,
      thread: newThread,
    });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: createNewThread() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function getUserThreads() {
  console.log("ACTION/THREADS: getUserThreads() called");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const threads = await findConversationThreads(
      { userId },
      { sort: { lastModified: -1 } }
    );

    console.log(
      "ACTION/THREADS: getUserThreads() - ✅ Found threads:",
      threads.length
    );
    return safeSerializeForClient({
      success: true,
      threads,
    });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: getUserThreads() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
      threads: [],
    });
  }
}

export async function getThreadById(threadId: string) {
  console.log(
    "ACTION/THREADS: getThreadById() called with threadId:",
    threadId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const thread = await findOneConversationThread({ threadId, userId });
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Get thread checkpoints
    const checkpoints = await findThreadCheckpoints(
      { threadId, userId },
      { sort: { createdAt: -1 } }
    );

    // Get thread nodes
    const nodes = await findThreadNodes(
      { threadId, userId },
      { sort: { createdAt: 1 } }
    );

    console.log(
      "ACTION/THREADS: getThreadById() - ✅ Thread found with",
      checkpoints.length,
      "checkpoints and",
      nodes.length,
      "nodes"
    );
    return safeSerializeForClient({
      success: true,
      thread,
      checkpoints,
      nodes,
    });
  } catch (error: any) {
    console.error("ACTION/THREADS: getThreadById() - ❌ Error:", error.message);
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function updateThread(
  threadId: string,
  updates: Partial<ConversationThread>
) {
  console.log("ACTION/THREADS: updateThread() called for threadId:", threadId);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const updateData = {
      ...updates,
      lastModified: new Date(),
    };
    delete (updateData as any).threadId;
    delete (updateData as any).userId;
    delete (updateData as any).createdAt;

    const result = await updateOneConversationThread(
      { threadId, userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("Thread not found");
    }

    console.log("ACTION/THREADS: updateThread() - ✅ Thread updated");
    revalidatePath("/canvas");
    return safeSerializeForClient({ success: true });
  } catch (error: any) {
    console.error("ACTION/THREADS: updateThread() - ❌ Error:", error.message);
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function deleteThread(threadId: string) {
  console.log("ACTION/THREADS: deleteThread() called for threadId:", threadId);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    // Delete thread nodes first
    await deleteManyThreadNodes({ threadId, userId });

    // Delete thread checkpoints
    const checkpoints = await findThreadCheckpoints({ threadId, userId });
    for (const checkpoint of checkpoints) {
      await deleteOneThreadCheckpoint({
        checkpointId: checkpoint.checkpointId,
        userId,
      });
    }

    // Delete the thread
    const result = await deleteOneConversationThread({ threadId, userId });

    if (result.deletedCount === 0) {
      throw new Error("Thread not found");
    }

    console.log(
      "ACTION/THREADS: deleteThread() - ✅ Thread and related data deleted"
    );
    revalidatePath("/canvas");
    return safeSerializeForClient({ success: true });
  } catch (error: any) {
    console.error("ACTION/THREADS: deleteThread() - ❌ Error:", error.message);
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

// Checkpoint management functions
export async function createCheckpoint(
  threadId: string,
  name: string,
  canvasData: any,
  description?: string
) {
  console.log(
    "ACTION/THREADS: createCheckpoint() called for threadId:",
    threadId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    // Verify thread exists
    const thread = await findOneConversationThread({ threadId, userId });
    if (!thread) {
      throw new Error("Thread not found");
    }

    const checkpointId = uuidv4();
    const checkpoint: ThreadCheckpoint = {
      checkpointId,
      threadId,
      userId,
      name: name.trim() || `Checkpoint ${new Date().toLocaleString()}`,
      description: description?.trim(),
      createdAt: new Date(),
      canvasData: {
        nodes: canvasData.nodes || [],
        edges: canvasData.edges || [],
        viewport: canvasData.viewport || { x: 0, y: 0, zoom: 1 },
      },
      metadata: {
        nodeCount: canvasData.nodes?.length || 0,
        edgeCount: canvasData.edges?.length || 0,
        version: 1,
        isAutoCheckpoint: false,
      },
    };

    await insertOneThreadCheckpoint(checkpoint);

    // Update thread metadata
    await updateOneConversationThread(
      { threadId, userId },
      {
        $set: { lastModified: new Date() },
        $inc: { "metadata.totalCheckpoints": 1 },
      }
    );

    console.log(
      "ACTION/THREADS: createCheckpoint() - ✅ Checkpoint created:",
      checkpointId
    );
    revalidatePath("/canvas");
    return safeSerializeForClient({
      success: true,
      checkpointId,
      checkpoint,
    });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: createCheckpoint() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function loadCheckpoint(checkpointId: string) {
  console.log(
    "ACTION/THREADS: loadCheckpoint() called for checkpointId:",
    checkpointId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const checkpoint = await findOneThreadCheckpoint({ checkpointId, userId });
    if (!checkpoint) {
      throw new Error("Checkpoint not found");
    }

    console.log("ACTION/THREADS: loadCheckpoint() - ✅ Checkpoint loaded");
    return safeSerializeForClient({
      success: true,
      checkpoint,
    });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: loadCheckpoint() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function deleteCheckpoint(checkpointId: string) {
  console.log(
    "ACTION/THREADS: deleteCheckpoint() called for checkpointId:",
    checkpointId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    const checkpoint = await findOneThreadCheckpoint({ checkpointId, userId });
    if (!checkpoint) {
      throw new Error("Checkpoint not found");
    }

    await deleteOneThreadCheckpoint({ checkpointId, userId });

    // Update thread metadata
    await updateOneConversationThread(
      { threadId: checkpoint.threadId, userId },
      {
        $set: { lastModified: new Date() },
        $inc: { "metadata.totalCheckpoints": -1 },
      }
    );

    console.log("ACTION/THREADS: deleteCheckpoint() - ✅ Checkpoint deleted");
    revalidatePath("/canvas");
    return safeSerializeForClient({ success: true });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: deleteCheckpoint() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

// Node management functions
export async function addNodeToThread(
  threadId: string,
  nodeData: Partial<ThreadNode>
) {
  console.log(
    "ACTION/THREADS: addNodeToThread() called for threadId:",
    threadId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id || session.user.email!;

    // Verify thread exists
    const thread = await findOneConversationThread({ threadId, userId });
    if (!thread) {
      throw new Error("Thread not found");
    }

    const nodeId = uuidv4();
    const node: ThreadNode = {
      nodeId,
      threadId,
      checkpointId: nodeData.checkpointId,
      userId,
      nodeType: nodeData.nodeType || "message",
      content: nodeData.content || "",
      position: nodeData.position || { x: 0, y: 0 },
      connections: nodeData.connections || { incoming: [], outgoing: [] },
      createdAt: new Date(),
      lastModified: new Date(),
      metadata: {
        isSystemNode: nodeData.metadata?.isSystemNode || false,
        parentNodeId: nodeData.metadata?.parentNodeId,
        depth: nodeData.metadata?.depth || 0,
        tokens: nodeData.metadata?.tokens,
        model: nodeData.metadata?.model,
      },
    };

    await insertOneThreadNode(node);

    // Update thread metadata
    await updateOneConversationThread(
      { threadId, userId },
      {
        $set: { lastModified: new Date() },
        $inc: {
          "metadata.totalNodes": 1,
          "metadata.totalMessages": nodeData.nodeType === "message" ? 1 : 0,
        },
      }
    );

    console.log("ACTION/THREADS: addNodeToThread() - ✅ Node added:", nodeId);
    revalidatePath("/canvas");
    return safeSerializeForClient({
      success: true,
      nodeId,
      node,
    });
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: addNodeToThread() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

export async function updateThreadNode(
  nodeId: string,
  updates: Partial<ThreadNode>
) {
  console.log("ACTION/THREADS: updateThreadNode() called with nodeId:", nodeId);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }

    const result = await updateOneThreadNode(nodeId, updates);
    if (!result) {
      throw new Error("Thread node not found");
    }

    revalidatePath("/canvas");

    return safeSerializeForClient({
      success: true,
      node: result,
    });
  } catch (error: any) {
    console.error("ACTION/THREADS: updateThreadNode() error:", error.message);
    return safeSerializeForClient({
      success: false,
      error: error.message,
    });
  }
}

// Additional exports for better API compatibility
export async function getThread(threadId: string) {
  return getThreadById(threadId);
}

export async function getThreadCheckpoints(threadId: string) {
  console.log(
    "ACTION/THREADS: getThreadCheckpoints() called with threadId:",
    threadId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }

    const checkpoints = await findThreadCheckpoints({ threadId });

    return safeSerializeForClient(checkpoints);
  } catch (error: any) {
    console.error(
      "ACTION/THREADS: getThreadCheckpoints() error:",
      error.message
    );
    throw new Error(error.message);
  }
}

export async function getThreadNodes(threadId: string) {
  console.log(
    "ACTION/THREADS: getThreadNodes() called with threadId:",
    threadId
  );
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Authentication required");
    }

    const nodes = await findThreadNodes({ threadId });

    return safeSerializeForClient(nodes);
  } catch (error: any) {
    console.error("ACTION/THREADS: getThreadNodes() error:", error.message);
    throw new Error(error.message);
  }
}
