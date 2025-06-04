"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  CloudOff,
  Clock,
  Archive,
  Settings,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  SaveResult,
  ConversationSaveAnalytics,
  UserSavePreferences,
} from "@/lib/models/canvas";

interface SaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  isOnline: boolean;
  saveResult?: SaveResult;
  analytics?: ConversationSaveAnalytics;
  preferences?: UserSavePreferences;
  hasUnsavedChanges?: boolean;
  backupCount?: number;
  onShowPreferences?: () => void;
  onShowBackups?: () => void;
  onManualSave?: () => void;
}

export default function SaveStatus({
  isSaving,
  lastSaved,
  isOnline,
  saveResult,
  analytics,
  preferences,
  hasUnsavedChanges = false,
  backupCount = 0,
  onShowPreferences,
  onShowBackups,
  onManualSave,
}: SaveStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();

      if (diffMs < 60000) {
        setTimeAgo("just now");
      } else if (diffMs < 3600000) {
        const minutes = Math.floor(diffMs / 60000);
        setTimeAgo(`${minutes}m ago`);
      } else if (diffMs < 86400000) {
        const hours = Math.floor(diffMs / 3600000);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diffMs / 86400000);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  const getSaveStatusIcon = () => {
    if (!isOnline) return <CloudOff size={16} className="text-amber-500" />;
    if (isSaving)
      return (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
      );
    if (saveResult?.success === false)
      return <AlertCircle size={16} className="text-red-500" />;
    if (hasUnsavedChanges)
      return <Clock size={16} className="text-yellow-500" />;
    if (lastSaved) return <CheckCircle size={16} className="text-green-500" />;
    return <AlertCircle size={16} className="text-amber-500" />;
  };

  const getSaveStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSaving) return "Saving...";
    if (saveResult?.success === false)
      return `Save failed: ${saveResult.error || "Unknown error"}`;
    if (hasUnsavedChanges) return "Unsaved changes";
    if (lastSaved) return `Saved ${timeAgo}`;
    return "Not saved";
  };

  const getSaveStatusColor = () => {
    if (!isOnline) return "text-amber-500";
    if (isSaving) return "text-blue-500";
    if (saveResult?.success === false) return "text-red-500";
    if (hasUnsavedChanges) return "text-yellow-500";
    if (lastSaved) return "text-green-500";
    return "text-amber-500";
  };
  return (
    <div className="relative">
      <div
        className={`flex items-center text-sm cursor-pointer hover:opacity-80 transition-opacity ${getSaveStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {getSaveStatusIcon()}
        <span className="ml-1">{getSaveStatusText()}</span>
        {backupCount > 0 && (
          <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
            {backupCount} backups
          </span>
        )}
      </div>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg p-4 min-w-80 z-50">
          <div className="space-y-3">
            {/* Save Status Details */}
            <div className="border-b pb-2">
              <h3 className="font-medium text-gray-800 mb-2">Save Status</h3>
              <div className="flex items-center text-sm">
                {getSaveStatusIcon()}
                <span className={`ml-2 ${getSaveStatusColor()}`}>
                  {getSaveStatusText()}
                </span>
              </div>
              {saveResult?.version && (
                <div className="text-xs text-gray-500 mt-1">
                  Version: {saveResult.version}
                </div>
              )}
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="border-b pb-2">
                <h4 className="font-medium text-gray-700 mb-1">
                  Save Analytics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Total saves: {analytics.totalSaves}</div>
                  <div>Failed saves: {analytics.failedSaves}</div>
                  <div>Auto saves: {analytics.autoSaves}</div>
                  <div>Manual saves: {analytics.manualSaves}</div>
                  <div>Avg save time: {analytics.averageSaveTime}ms</div>
                  <div>
                    Data size: {Math.round(analytics.totalDataSize / 1024)}KB
                  </div>
                </div>
              </div>
            )}

            {/* Auto-save Preferences */}
            {preferences?.savePreferences && (
              <div className="border-b pb-2">
                <h4 className="font-medium text-gray-700 mb-1">
                  Auto-save Settings
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Enabled:{" "}
                    {preferences.savePreferences.autoSaveEnabled ? "Yes" : "No"}
                  </div>
                  <div>
                    Interval:{" "}
                    {preferences.savePreferences.autoSaveInterval / 1000}s
                  </div>
                  <div>
                    Max backups: {preferences.savePreferences.maxBackups}
                  </div>
                  <div>
                    Backup retention:{" "}
                    {preferences.savePreferences.backupRetentionDays} days
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {onManualSave && (
                <button
                  onClick={() => {
                    onManualSave();
                    setShowDetails(false);
                  }}
                  className="flex items-center px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                  disabled={isSaving}
                >
                  <RefreshCw size={12} className="mr-1" />
                  Save Now
                </button>
              )}

              {onShowBackups && backupCount > 0 && (
                <button
                  onClick={() => {
                    onShowBackups();
                    setShowDetails(false);
                  }}
                  className="flex items-center px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  <Archive size={12} className="mr-1" />
                  Backups
                </button>
              )}

              {onShowPreferences && (
                <button
                  onClick={() => {
                    onShowPreferences();
                    setShowDetails(false);
                  }}
                  className="flex items-center px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  <Settings size={12} className="mr-1" />
                  Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
