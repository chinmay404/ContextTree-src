export interface UserProfile {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin: Date;
  subscription?: {
    plan: "free" | "pro" | "enterprise";
    status: "active" | "cancelled" | "expired";
    expiresAt?: Date;
  };
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  defaultModel: string;
  canvasSettings: {
    snapToGrid: boolean;
    showMinimap: boolean;
    animateEdges: boolean;
  };
  notifications: {
    email: boolean;
    browser: boolean;
  };
  // Enhanced save preferences
  savePreferences: {
    enableAutoSave: boolean;
    autoSaveIntervalMs: number;
    maxBackupCount: number;
    enableCloudSync: boolean;
    saveOnExit: boolean;
    compressionEnabled: boolean;
  };
}

export interface ConversationMetadata {
  conversationId: string;
  userId: string;
  tags: string[];
  isPublic: boolean;
  collaborators: string[];
  analytics: {
    totalNodes: number;
    totalEdges: number;
    totalMessages: number;
    lastActivity: Date;
    timeSpent: number; // in minutes
    saveCount: number; // Track how many times saved
    autoSaveCount: number; // Track auto-saves vs manual saves
    lastSaveType: "auto" | "manual" | "backup";
  };
  backup: {
    lastBackup: Date;
    backupCount: number;
    lastAutoBackup: Date;
    backupSizeBytes: number;
  };
  // Version control
  versioning: {
    currentVersion: number;
    totalVersions: number;
    lastVersionDate: Date;
  };
}

export interface CanvasSession {
  id: string;
  userId: string;
  conversationId: string;
  startTime: Date;
  lastActivity: Date;
  deviceInfo: string;
  isActive: boolean;
  // Enhanced session tracking
  sessionMetrics: {
    totalActions: number;
    saveEvents: number;
    errorCount: number;
    dataTransferred: number; // bytes
  };
}

// New interfaces for enhanced saving
export interface SaveResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  version?: number;
  timestamp?: Date;
  backupId?: string;
  conflictResolved?: boolean;
}

export interface ConversationBackup {
  id: string;
  conversationId: string;
  userId: string;
  backupType: "auto" | "manual" | "scheduled";
  data: any; // The actual conversation data
  createdAt: Date;
  sizeBytes: number;
  version: number;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    messageCount: number;
  };
}

export interface SaveOptions {
  force?: boolean; // Force save even if no changes
  createBackup?: boolean; // Create backup before saving
  skipValidation?: boolean; // Skip data validation
  retryCount?: number; // Number of retries on failure
  sessionId?: string; // Associated session ID
  saveType?: "auto" | "manual" | "backup";
}
