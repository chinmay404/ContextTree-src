"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import {
  serializeMongoDoc,
  serializeCollection,
  serializeCursorResults,
  safeSerializeForClient,
  cleanForNextJs,
} from "@/lib/serialize-mongodb";
// Enhanced imports for improved saving
import type {
  SaveResult,
  SaveOptions,
  ConversationBackup,
  ConversationMetadata,
} from "@/lib/models/canvas";

interface SessionUserWithId {
  id?: string;
  email?: string | null;
}

// Helper function (internal, not exported, not necessarily async)
function mergeArraysById(arr1: any[], arr2: any[]): any[] {
  const merged = [...arr1];
  const ids = new Set(arr1.map((item) => item.id));
  arr2.forEach((item) => {
    if (!ids.has(item.id)) {
      merged.push(item);
      ids.add(item.id);
    }
  });
  return merged;
}

// Enhanced session creation with metrics
async function createCanvasSession(
  conversationId: string,
  userId: string
): Promise<string> {
  const sessionId = uuidv4();
  try {
    const database = await db();
    await database.collection("canvasSessions").insertOne({
      sessionId,
      userId,
      conversationId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      sessionMetrics: {
        totalActions: 0,
        saveEvents: 0,
        errorCount: 0,
        dataTransferred: 0,
      },
    });
    return sessionId;
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: createCanvasSession() - ❌ Error:",
      error.message
    );
    return "";
  }
}

// Enhanced session activity update with metrics
async function updateSessionActivity(
  sessionId: string,
  actionType?: string
): Promise<boolean> {
  try {
    const database = await db();
    const updateData: any = {
      lastActivity: new Date(),
      $inc: {
        "sessionMetrics.totalActions": 1,
      },
    };

    if (actionType === "save") {
      updateData.$inc["sessionMetrics.saveEvents"] = 1;
    } else if (actionType === "error") {
      updateData.$inc["sessionMetrics.errorCount"] = 1;
    }

    await database
      .collection("canvasSessions")
      .updateOne({ sessionId, isActive: true }, updateData);
    return true;
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: updateSessionActivity() - ❌ Error:",
      error.message
    );
    return false;
  }
}

// Create conversation backup
async function createConversationBackup(
  conversationData: any,
  userId: string,
  backupType: "auto" | "manual" | "scheduled" = "auto"
): Promise<ConversationBackup | null> {
  try {
    const database = await db();
    const backupId = uuidv4();

    // Calculate metadata
    const nodeCount = conversationData.nodes?.length || 0;
    const edgeCount = conversationData.edges?.length || 0;
    const messageCount =
      conversationData.nodes?.reduce((count: number, node: any) => {
        return count + (node.data?.messages?.length || 0);
      }, 0) || 0;

    const backupData = JSON.stringify(conversationData);
    const sizeBytes = Buffer.byteLength(backupData, "utf8");

    const backup: ConversationBackup = {
      id: backupId,
      conversationId: conversationData.id,
      userId,
      backupType,
      data: conversationData,
      createdAt: new Date(),
      sizeBytes,
      version: conversationData.version || 1,
      metadata: {
        nodeCount,
        edgeCount,
        messageCount,
      },
    };

    await database.collection("conversationBackups").insertOne(backup); // Update conversation metadata
    await updateConversationMetadata(conversationData.id, userId, {
      backup: {
        lastBackup: new Date(),
        backupSizeBytes: sizeBytes,
        $inc: { "backup.backupCount": 1 },
      },
    });

    // Serialize the backup object before returning to avoid MongoDB objects being passed to client
    return serializeMongoDoc(backup);
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: createConversationBackup() - ❌ Error:",
      error.message
    );
    return null;
  }
}

// Update conversation metadata
async function updateConversationMetadata(
  conversationId: string,
  userId: string,
  updates: any
): Promise<boolean> {
  try {
    const database = await db();
    await database
      .collection("conversationMetadata")
      .updateOne(
        { conversationId, userId },
        { $set: updates },
        { upsert: true }
      );
    return true;
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: updateConversationMetadata() - ❌ Error:",
      error.message
    );
    return false;
  }
}

// Helper function to clean nodes for saving - using our serialization utility
function cleanNodesForSave(nodes: any[]) {
  if (!Array.isArray(nodes)) return [];
  return cleanForNextJs(nodes);
}

// Helper function to clean edges for saving - using our serialization utility
function cleanEdgesForSave(edges: any[]) {
  if (!Array.isArray(edges)) return [];
  return cleanForNextJs(edges);
}

// Calculate conversation statistics
function calculateConversationStats(conversationData: any) {
  const totalNodes = conversationData.nodes?.length || 0;
  const totalEdges = conversationData.edges?.length || 0;
  const totalMessages =
    conversationData.nodes?.reduce((count: number, node: any) => {
      return count + (node.data?.messages?.length || 0);
    }, 0) || 0;

  return { totalNodes, totalEdges, totalMessages };
}

// Enhanced saveConversation with backup, versioning, and better error handling
export async function saveConversation(
  conversationData: any,
  sessionId?: string,
  options: SaveOptions = {}
): Promise<SaveResult> {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();
    const conversationId = conversationData.id;

    // Get existing conversation for version control
    const existingConversation = await database
      .collection("conversations")
      .findOne({
        userId,
        conversationId,
      });

    // Create backup if requested or if major changes detected
    let backupId: string | undefined;
    if (
      options.createBackup ||
      (!existingConversation && conversationData.nodes?.length > 1)
    ) {
      const backup = await createConversationBackup(
        conversationData,
        userId,
        options.saveType || "manual"
      );
      backupId = backup?.id;
    }

    // Handle session management
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createCanvasSession(conversationId, userId);
    } else {
      await updateSessionActivity(currentSessionId, "save");
    }

    // Clean and validate data
    const cleanedNodes = cleanNodesForSave(conversationData.nodes);
    const cleanedEdges = cleanEdgesForSave(conversationData.edges);

    // Calculate statistics for metadata
    const stats = calculateConversationStats(conversationData);

    // Prepare conversation data with enhanced fields
    const canvasData: any = {
      userId,
      conversationId,
      name: conversationData.name,
      nodes: cleanedNodes,
      edges: cleanedEdges,
      lastModified: new Date(),
      createdAt: existingConversation?.createdAt || new Date(),
      version: existingConversation
        ? (existingConversation.version || 0) + 1
        : 1,
      statistics: stats,
      saveMetadata: {
        saveType: options.saveType || "manual",
        sessionId: currentSessionId,
        timestamp: new Date(),
        dataSize: Buffer.byteLength(
          JSON.stringify({ nodes: cleanedNodes, edges: cleanedEdges }),
          "utf8"
        ),
      },
    };

    // Optimistic locking with retry mechanism
    let conflictResolved = false;
    let retryCount = 0;
    const maxRetries = options.retryCount || 3;

    while (retryCount < maxRetries) {
      try {
        const updateResult = await database
          .collection("conversations")
          .updateOne(
            {
              userId,
              conversationId,
              $or: [
                { version: { $exists: false } },
                { version: canvasData.version - 1 },
              ],
            },
            { $set: canvasData },
            { upsert: true }
          );

        if (
          updateResult.matchedCount === 0 &&
          !updateResult.upsertedId &&
          existingConversation
        ) {
          // Version conflict detected
          const latestVersion = await database
            .collection("conversations")
            .findOne({
              userId,
              conversationId,
            });

          if (latestVersion && retryCount < maxRetries - 1) {
            // Attempt to merge changes
            canvasData.nodes = mergeArraysById(
              latestVersion.nodes || [],
              conversationData.nodes || []
            );
            canvasData.edges = mergeArraysById(
              latestVersion.edges || [],
              conversationData.edges || []
            );
            canvasData.version = (latestVersion.version || 0) + 1;
            conflictResolved = true;
            retryCount++;
            continue;
          } else {
            throw new Error("Unable to resolve version conflict");
          }
        }

        break; // Success, exit retry loop
      } catch (retryError: any) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw retryError;
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 100)
        );
      }
    }

    // Update conversation metadata
    await updateConversationMetadata(conversationId, userId, {
      analytics: {
        ...stats,
        lastActivity: new Date(),
        saveCount: existingConversation
          ? (existingConversation.saveCount || 0) + 1
          : 1,
        lastSaveType: options.saveType || "manual",
      },
      versioning: {
        currentVersion: canvasData.version,
        totalVersions: canvasData.version,
        lastVersionDate: new Date(),
      },
    }); // Update user canvas state
    await database.collection("userCanvas").updateOne(
      { userId },
      {
        $set: {
          userId,
          activeConversationId: conversationId,
          lastAccessed: new Date(),
          sessionId: currentSessionId,
        },
      },
      { upsert: true }
    );

    revalidatePath("/canvas");

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Update session metrics with data transfer info
    await updateSessionActivity(currentSessionId); // Return serialized response with ISO string dates instead of Date objects
    const now = new Date();
    // Use safeSerializeForClient to ensure all objects are properly serialized
    return safeSerializeForClient({
      success: true,
      sessionId: currentSessionId,
      version: canvasData.version,
      timestamp: now.toISOString(), // Convert Date to ISO string for serialization
      backupId,
      conflictResolved,
    });
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: saveConversation() - ❌ Error:",
      error.message,
      error.stack
    );

    // Update session error count
    if (sessionId) {
      await updateSessionActivity(sessionId, "error");
    }

    // Return serialized response with ISO string dates instead of Date objects
    const now = new Date();
    return {
      success: false,
      error: error.message,
      timestamp: now.toISOString(), // Convert Date to ISO string for serialization
    };
  }
}

export async function getUserConversations() {
  // console.log("ACTION/CANVAS: getUserConversations() called.")
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: getUserConversations() - Authentication required.")
      throw new Error("Authentication required");
    }
    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    // console.log("ACTION/CANVAS: getUserConversations() - User:", userId)

    const database = await db();
    const conversationsQuery = database
      .collection("conversations")
      .find({ userId }, { sort: { lastModified: -1 } });

    const userCanvasDoc = await database
      .collection("userCanvas")
      .findOne({ userId });

    // Properly serialize the userCanvas document
    const userCanvas = serializeMongoDoc(userCanvasDoc);

    let currentSessionId = userCanvas?.sessionId;

    if (
      userCanvas?.activeConversationId &&
      (!currentSessionId || currentSessionId === "")
    ) {
      // console.log("ACTION/CANVAS: getUserConversations() - No active session, creating new one.")
      currentSessionId = await createCanvasSession(
        userCanvas.activeConversationId,
        userId
      );
      if (currentSessionId) {
        await database
          .collection("userCanvas")
          .updateOne(
            { userId },
            { $set: { sessionId: currentSessionId } },
            { upsert: true }
          );
      }
    }

    // Use the safe serialization helper
    const conversations = await serializeCursorResults(conversationsQuery);

    const resultData = safeSerializeForClient({
      success: true,
      conversations: conversations.map((conv: any) => ({
        id: conv.conversationId,
        name: conv.name,
        nodes: cleanForNextJs(conv.nodes),
        edges: cleanForNextJs(conv.edges),
        lastModified: conv.lastModified, // Already serialized to ISO string
        createdAt: conv.createdAt, // Already serialized to ISO string
        version: conv.version || 1,
      })),
      activeConversationId: userCanvas?.activeConversationId,
      sessionId: currentSessionId,
      userCanvasLastAccessed: userCanvas?.lastAccessed,
    });

    console.log(
      "Data returned by getUserConversations:",
      JSON.stringify(resultData, null, 2)
    );
    return resultData;
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: getUserConversations() - ❌ Error:",
      error.message,
      error.stack
    );
    return { success: false, error: error.message, conversations: [] };
  }
}

export async function deleteConversation(conversationId: string) {
  // console.log("ACTION/CANVAS: deleteConversation() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: deleteConversation() - Authentication required.")
      throw new Error("Authentication required");
    }
    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();
    await database
      .collection("conversations")
      .deleteOne({ userId, conversationId });
    revalidatePath("/canvas");
    return { success: true };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: deleteConversation() - ❌ Error:",
      error.message,
      error.stack
    );
    return { success: false, error: error.message };
  }
}

export async function setActiveConversation(conversationId: string) {
  // console.log("ACTION/CANVAS: setActiveConversation() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: setActiveConversation() - Authentication required.")
      throw new Error("Authentication required");
    }
    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();
    await database.collection("userCanvas").updateOne(
      { userId },
      {
        $set: {
          activeConversationId: conversationId,
          lastAccessed: new Date(),
        },
      },
      { upsert: true }
    );

    // Create a new session for the active conversation if none exists
    const userCanvas = await database
      .collection("userCanvas")
      .findOne({ userId });
    let currentSessionId = userCanvas?.sessionId;
    if (!currentSessionId || currentSessionId === "") {
      currentSessionId = await createCanvasSession(conversationId, userId);
      if (currentSessionId) {
        await database
          .collection("userCanvas")
          .updateOne(
            { userId },
            { $set: { sessionId: currentSessionId } },
            { upsert: true }
          );
      }
    }
    revalidatePath("/canvas");
    return { success: true };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: setActiveConversation() - ❌ Error:",
      error.message,
      error.stack
    );
    return { success: false, error: error.message };
  }
}

export async function trackInteraction(
  conversationId: string,
  actionType: string,
  entityId: string,
  metadata: any,
  sessionId: string
) {
  // console.log("ACTION/CANVAS: trackInteraction() - ConversationId:", conversationId, "Action:", actionType)
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: trackInteraction() - Authentication required.")
      throw new Error("Authentication required");
    }
    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();
    await database.collection("canvasInteractions").insertOne({
      userId,
      conversationId,
      actionType,
      entityId,
      metadata,
      timestamp: new Date(),
      sessionId,
    });
    return { success: true };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: trackInteraction() - ❌ Error:",
      error.message,
      error.stack
    );
    return { success: false, error: error.message };
  }
}

export async function getInteractionHistory(
  conversationId: string,
  limit = 100
) {
  // console.log("ACTION/CANVAS: getInteractionHistory() - ConversationId:", conversationId)
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // console.warn("ACTION/CANVAS: getInteractionHistory() - Authentication required.")
      throw new Error("Authentication required");
    }
    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();
    const history = await database
      .collection("canvasInteractions")
      .find({ userId, conversationId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Convert Date objects to ISO strings and properly handle ObjectIds
    const serializableHistory = history.map((item: any) => {
      // Always convert _id to string
      const itemId = item._id ? item._id.toString() : null;

      return {
        _id: itemId,
        userId: item.userId,
        conversationId: item.conversationId,
        actionType: item.actionType,
        entityId: item.entityId,
        metadata: item.metadata,
        timestamp: item.timestamp ? item.timestamp.toISOString() : null,
        sessionId: item.sessionId,
      };
    });

    return { success: true, history: serializableHistory };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: getInteractionHistory() - ❌ Error:",
      error.message,
      error.stack
    );
    return { success: false, error: error.message, history: [] };
  }
}

// Get conversation backups
export async function getConversationBackups(
  conversationId: string,
  limit: number = 10
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    const backupsQuery = database
      .collection("conversationBackups")
      .find({ conversationId, userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Use our utility to safely serialize MongoDB results
    const backups = await serializeCursorResults(backupsQuery);

    // Further process and ensure all nested objects are also serialized
    return safeSerializeForClient({
      success: true,
      backups: backups.map((backup) => ({
        id: backup.id,
        conversationId: backup.conversationId,
        userId: backup.userId,
        backupType: backup.backupType,
        data: cleanForNextJs(backup.data),
        createdAt: backup.createdAt,
        sizeBytes: backup.sizeBytes,
        version: backup.version,
        metadata: cleanForNextJs(backup.metadata),
      })),
    });
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: getConversationBackups() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message, backups: [] };
  }
}

// Restore conversation from backup
export async function restoreConversationFromBackup(
  conversationId: string,
  backupId: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    // Get the backup
    const backupDoc = await database
      .collection("conversationBackups")
      .findOne({ id: backupId, conversationId, userId });

    if (!backupDoc) {
      throw new Error("Backup not found");
    }

    // Serialize the MongoDB document
    const backup = serializeMongoDoc(backupDoc);

    // Save the backup data as current conversation with incremented version
    const currentConversationDoc = await database
      .collection("conversations")
      .findOne({ conversationId, userId });

    // Serialize the MongoDB document
    const currentConversation = serializeMongoDoc(currentConversationDoc);

    const restoredData = {
      ...cleanForNextJs(backup.data),
      version: (currentConversation?.version || 0) + 1,
      lastModified: new Date(),
      restoredFrom: {
        backupId,
        restoredAt: new Date(),
        originalVersion: backup.version,
      },
    };

    const result = await saveConversation(
      cleanForNextJs(restoredData),
      undefined,
      {
        saveType: "manual",
        createBackup: true,
      }
    );

    return safeSerializeForClient(result);
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: restoreConversationFromBackup() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message };
  }
}

// Auto-save with enhanced trigger detection
export async function autoSaveConversation(
  conversationData: any,
  sessionId: string,
  triggerType: "timer" | "action" | "exit" = "timer"
) {
  try {
    // Check if auto-save is needed (compare with last saved version)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Authentication required" };
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    const lastSaved = await database
      .collection("conversations")
      .findOne({ conversationId: conversationData.id, userId });

    // Check if there are meaningful changes
    const hasChanges =
      !lastSaved ||
      JSON.stringify(lastSaved.nodes) !==
        JSON.stringify(conversationData.nodes) ||
      JSON.stringify(lastSaved.edges) !==
        JSON.stringify(conversationData.edges) ||
      lastSaved.name !== conversationData.name;

    if (!hasChanges) {
      return { success: true, skipped: true, reason: "No changes detected" };
    }

    // Perform auto-save
    const result = await saveConversation(conversationData, sessionId, {
      saveType: "auto",
      createBackup: triggerType === "exit", // Create backup on exit
    });

    // Update metadata with auto-save info
    if (result.success) {
      await updateConversationMetadata(conversationData.id, userId, {
        "analytics.autoSaveCount": 1,
        "analytics.lastActivity": new Date(),
      });
    }
    return safeSerializeForClient(result);
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: autoSaveConversation() - ❌ Error:",
      error.message
    );
    return safeSerializeForClient({ success: false, error: error.message });
  }
}

// Get user's save preferences
export async function getUserSavePreferences() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    const userProfile = await database
      .collection("userProfiles")
      .findOne({ userId });

    const defaultPreferences = {
      enableAutoSave: true,
      autoSaveIntervalMs: 10000, // 10 seconds
      maxBackupCount: 50,
      enableCloudSync: true,
      saveOnExit: true,
      compressionEnabled: false,
    };

    return {
      success: true,
      preferences:
        userProfile?.preferences?.savePreferences || defaultPreferences,
    };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: getUserSavePreferences() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message, preferences: null };
  }
}

// Update user's save preferences
export async function updateUserSavePreferences(newPreferences: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    await database.collection("userProfiles").updateOne(
      { userId },
      {
        $set: {
          "preferences.savePreferences": newPreferences,
          lastModified: new Date(),
        },
      },
      { upsert: true }
    );

    revalidatePath("/canvas");
    return { success: true };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: updateUserSavePreferences() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message };
  }
}

// Cleanup old backups based on user preferences
export async function cleanupOldBackups(conversationId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    // Get user preferences for max backup count
    const preferences = await getUserSavePreferences();
    const maxBackupCount = preferences.preferences?.maxBackupCount || 50;

    const filter: any = { userId };
    if (conversationId) {
      filter.conversationId = conversationId;
    }

    // Get total backup count
    const totalBackups = await database
      .collection("conversationBackups")
      .countDocuments(filter);

    if (totalBackups > maxBackupCount) {
      const excessCount = totalBackups - maxBackupCount;

      // Delete oldest backups
      const oldestBackups = await database
        .collection("conversationBackups")
        .find(filter)
        .sort({ createdAt: 1 })
        .limit(excessCount)
        .toArray();

      const backupIds = oldestBackups.map((backup) => backup.id);

      await database.collection("conversationBackups").deleteMany({
        id: { $in: backupIds },
      });

      return { success: true, deletedCount: excessCount };
    }

    return { success: true, deletedCount: 0 };
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: cleanupOldBackups() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message };
  }
}

// Get conversation save history and analytics
export async function getConversationSaveAnalytics(conversationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }

    const userId =
      (session.user as SessionUserWithId).id || session.user.email || "";
    const database = await db();

    // Get conversation metadata
    const metadataDoc = await database
      .collection("conversationMetadata")
      .findOne({ conversationId, userId });

    // Get session data - manually fetch and serialize to ensure proper handling
    // This avoids the issue with MongoDB ObjectId and Date objects
    const sessionsData = await database
      .collection("canvasSessions")
      .find({ conversationId, userId })
      .sort({ startTime: -1 })
      .limit(10)
      .toArray();

    // Get recent backups
    const backupsData = await database
      .collection("conversationBackups")
      .find({ conversationId, userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Carefully serialize all MongoDB objects
    const serializedMetadata = metadataDoc
      ? serializeMongoDoc(metadataDoc)
      : {};

    // Explicitly map session fields to avoid any MongoDB-specific objects
    const serializedSessions = sessionsData.map((session) => ({
      // Convert _id to string
      _id: session._id ? session._id.toString() : null,
      sessionId: session.sessionId,
      userId: session.userId,
      conversationId: session.conversationId,
      createdAt: session.createdAt ? session.createdAt.toISOString() : null,
      lastActivity: session.lastActivity
        ? session.lastActivity.toISOString()
        : null,
      isActive: session.isActive,
      // Safely serialize any nested metrics
      sessionMetrics: session.sessionMetrics
        ? {
            totalActions: session.sessionMetrics.totalActions || 0,
            saveEvents: session.sessionMetrics.saveEvents || 0,
            errorCount: session.sessionMetrics.errorCount || 0,
            dataTransferred: session.sessionMetrics.dataTransferred || 0,
          }
        : {},
      // Handle other potential fields
      startTime: session.startTime ? session.startTime.toISOString() : null,
    }));

    // Explicitly map backup fields
    const serializedBackups = backupsData.map((backup) => ({
      id: backup.id,
      backupType: backup.backupType,
      createdAt: backup.createdAt ? backup.createdAt.toISOString() : null,
      sizeBytes: backup.sizeBytes,
      version: backup.version,
    }));

    // Perform a final serialization to catch any remaining non-serializable objects
    return JSON.parse(
      JSON.stringify({
        success: true,
        analytics: {
          metadata: serializedMetadata.analytics || {},
          versioning: serializedMetadata.versioning || {},
          recentSessions: serializedSessions,
          recentBackups: serializedBackups,
        },
      })
    );
  } catch (error: any) {
    console.error(
      "ACTION/CANVAS: getConversationSaveAnalytics() - ❌ Error:",
      error.message
    );
    return { success: false, error: error.message };
  }
}
