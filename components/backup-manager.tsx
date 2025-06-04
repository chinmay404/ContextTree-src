// filepath: g:\ContextTree-src\components\backup-manager.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Archive,
  Download,
  RotateCcw,
  Trash2,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  X,
  Search,
} from "lucide-react";
import { ConversationBackup } from "@/lib/models/canvas";
import {
  getConversationBackups,
  restoreConversationFromBackup,
  cleanupOldBackups,
} from "@/app/actions/canvas";

interface BackupManagerProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (backupId: string) => void;
}

export default function BackupManager({
  conversationId,
  isOpen,
  onClose,
  onRestore,
}: BackupManagerProps) {
  const [backups, setBackups] = useState<ConversationBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | "version">("date");
  const [selectedBackup, setSelectedBackup] =
    useState<ConversationBackup | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen, conversationId]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const result = await getConversationBackups(conversationId);
      setBackups(result);
    } catch (error) {
      console.error("Failed to load backups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backup: ConversationBackup) => {
    if (
      !confirm(
        `Are you sure you want to restore the backup from ${backup.createdAt.toLocaleString()}? This will replace the current conversation.`
      )
    ) {
      return;
    }

    setRestoring(backup.id);
    try {
      const result = await restoreConversationFromBackup(
        conversationId,
        backup.id
      );
      if (result.success) {
        onRestore?.(backup.id);
        alert("Backup restored successfully!");
        onClose();
      } else {
        alert(`Failed to restore backup: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to restore backup:", error);
      alert("Failed to restore backup");
    } finally {
      setRestoring(null);
    }
  };

  const handleCleanup = async () => {
    if (
      !confirm(
        "Are you sure you want to clean up old backups? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await cleanupOldBackups(conversationId);
      await loadBackups();
      alert("Old backups cleaned up successfully!");
    } catch (error) {
      console.error("Failed to cleanup backups:", error);
      alert("Failed to cleanup backups");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredBackups = backups
    .filter(
      (backup) =>
        searchQuery === "" ||
        backup.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        backup.trigger.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "size":
          return b.size - a.size;
        case "version":
          return b.version - a.version;
        default:
          return 0;
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <Archive className="mr-2" size={20} />
              Conversation Backups
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="mt-3 flex gap-3 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search backups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "date" | "size" | "version")
              }
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="size">Sort by Size</option>
              <option value="version">Sort by Version</option>
            </select>

            {/* Cleanup Button */}
            <button
              onClick={handleCleanup}
              className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center"
            >
              <Trash2 size={14} className="mr-1" />
              Cleanup
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading backups...</p>
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Archive size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No backups found</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try adjusting your search query</p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredBackups.map((backup) => (
                <div key={backup.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar size={14} className="mr-1" />
                          {backup.createdAt.toLocaleString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText size={14} className="mr-1" />v
                          {backup.version}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          {formatFileSize(backup.size)}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {backup.trigger}
                        </span>
                        {backup.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {backup.description}
                          </p>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        Messages: {backup.messageCount} | Tokens:{" "}
                        {backup.tokenCount?.toLocaleString() || "N/A"}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowPreview(true);
                        }}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRestore(backup)}
                        disabled={restoring === backup.id}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
                      >
                        {restoring === backup.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        ) : (
                          <RotateCcw size={12} className="mr-1" />
                        )}
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && selectedBackup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Backup Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Created:</strong>{" "}
                      {selectedBackup.createdAt.toLocaleString()}
                    </div>
                    <div>
                      <strong>Version:</strong> {selectedBackup.version}
                    </div>
                    <div>
                      <strong>Size:</strong>{" "}
                      {formatFileSize(selectedBackup.size)}
                    </div>
                    <div>
                      <strong>Trigger:</strong> {selectedBackup.trigger}
                    </div>
                    <div>
                      <strong>Messages:</strong> {selectedBackup.messageCount}
                    </div>
                    <div>
                      <strong>Tokens:</strong>{" "}
                      {selectedBackup.tokenCount?.toLocaleString() || "N/A"}
                    </div>
                  </div>

                  {selectedBackup.description && (
                    <div>
                      <strong>Description:</strong>
                      <p className="mt-1 text-gray-600">
                        {selectedBackup.description}
                      </p>
                    </div>
                  )}

                  {selectedBackup.metadata && (
                    <div>
                      <strong>Metadata:</strong>
                      <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedBackup.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      handleRestore(selectedBackup);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center"
                  >
                    <RotateCcw size={14} className="mr-1" />
                    Restore This Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
