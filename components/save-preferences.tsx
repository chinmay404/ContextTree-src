// filepath: g:\ContextTree-src\components\save-preferences.tsx
"use client";

import { useState, useEffect } from "react";
import { Settings, Save, X, Clock, Archive, Shield, Zap } from "lucide-react";
import { UserSavePreferences } from "@/lib/models/canvas";
import {
  getUserSavePreferences,
  updateUserSavePreferences,
} from "@/app/actions/canvas";

interface SavePreferencesProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (preferences: UserSavePreferences) => void;
}

export default function SavePreferences({
  userId,
  isOpen,
  onClose,
  onSave,
}: SavePreferencesProps) {
  const [preferences, setPreferences] = useState<UserSavePreferences | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    autoSaveEnabled: true,
    autoSaveInterval: 30000, // 30 seconds
    maxBackups: 10,
    backupRetentionDays: 30,
    saveOnExit: true,
    compressBackups: true,
    enableConflictResolution: true,
    showSaveNotifications: true,
    retryFailedSaves: true,
    maxRetryAttempts: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, userId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const userPrefs = await getUserSavePreferences(userId);
      if (userPrefs?.savePreferences) {
        setPreferences(userPrefs);
        setFormData({
          autoSaveEnabled: userPrefs.savePreferences.autoSaveEnabled,
          autoSaveInterval: userPrefs.savePreferences.autoSaveInterval,
          maxBackups: userPrefs.savePreferences.maxBackups,
          backupRetentionDays: userPrefs.savePreferences.backupRetentionDays,
          saveOnExit: userPrefs.savePreferences.saveOnExit,
          compressBackups: userPrefs.savePreferences.compressBackups,
          enableConflictResolution:
            userPrefs.savePreferences.enableConflictResolution,
          showSaveNotifications:
            userPrefs.savePreferences.showSaveNotifications,
          retryFailedSaves: userPrefs.savePreferences.retryFailedSaves,
          maxRetryAttempts: userPrefs.savePreferences.maxRetryAttempts,
          retryDelay: userPrefs.savePreferences.retryDelay,
        });
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedPreferences: UserSavePreferences = {
        ...preferences,
        savePreferences: formData,
      } as UserSavePreferences;

      const result = await updateUserSavePreferences(
        userId,
        updatedPreferences
      );
      if (result.success) {
        setPreferences(updatedPreferences);
        setHasChanges(false);
        onSave?.(updatedPreferences);
        alert("Save preferences updated successfully!");
      } else {
        alert(`Failed to update preferences: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences?.savePreferences) {
      setFormData({
        autoSaveEnabled: preferences.savePreferences.autoSaveEnabled,
        autoSaveInterval: preferences.savePreferences.autoSaveInterval,
        maxBackups: preferences.savePreferences.maxBackups,
        backupRetentionDays: preferences.savePreferences.backupRetentionDays,
        saveOnExit: preferences.savePreferences.saveOnExit,
        compressBackups: preferences.savePreferences.compressBackups,
        enableConflictResolution:
          preferences.savePreferences.enableConflictResolution,
        showSaveNotifications:
          preferences.savePreferences.showSaveNotifications,
        retryFailedSaves: preferences.savePreferences.retryFailedSaves,
        maxRetryAttempts: preferences.savePreferences.maxRetryAttempts,
        retryDelay: preferences.savePreferences.retryDelay,
      });
    }
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <Settings className="mr-2" size={20} />
              Save Preferences
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh] p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading preferences...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Auto-save Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Zap className="mr-2" size={18} />
                  Auto-save Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Enable Auto-save
                      </label>
                      <p className="text-xs text-gray-500">
                        Automatically save changes as you work
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.autoSaveEnabled}
                      onChange={(e) =>
                        handleInputChange("autoSaveEnabled", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-save Interval (seconds)
                    </label>
                    <select
                      value={formData.autoSaveInterval / 1000}
                      onChange={(e) =>
                        handleInputChange(
                          "autoSaveInterval",
                          parseInt(e.target.value) * 1000
                        )
                      }
                      disabled={!formData.autoSaveEnabled}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Save on Exit
                      </label>
                      <p className="text-xs text-gray-500">
                        Save automatically when closing the browser
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.saveOnExit}
                      onChange={(e) =>
                        handleInputChange("saveOnExit", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Show Save Notifications
                      </label>
                      <p className="text-xs text-gray-500">
                        Display notifications when saves complete
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showSaveNotifications}
                      onChange={(e) =>
                        handleInputChange(
                          "showSaveNotifications",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Backup Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Archive className="mr-2" size={18} />
                  Backup Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Backups to Keep
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.maxBackups}
                      onChange={(e) =>
                        handleInputChange(
                          "maxBackups",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Older backups will be automatically deleted
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Backup Retention (days)
                    </label>
                    <select
                      value={formData.backupRetentionDays}
                      onChange={(e) =>
                        handleInputChange(
                          "backupRetentionDays",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Compress Backups
                      </label>
                      <p className="text-xs text-gray-500">
                        Reduce storage space by compressing backup data
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.compressBackups}
                      onChange={(e) =>
                        handleInputChange("compressBackups", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Error Handling Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Shield className="mr-2" size={18} />
                  Error Handling
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Enable Conflict Resolution
                      </label>
                      <p className="text-xs text-gray-500">
                        Automatically handle save conflicts
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableConflictResolution}
                      onChange={(e) =>
                        handleInputChange(
                          "enableConflictResolution",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Retry Failed Saves
                      </label>
                      <p className="text-xs text-gray-500">
                        Automatically retry saves that fail
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.retryFailedSaves}
                      onChange={(e) =>
                        handleInputChange("retryFailedSaves", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Retry Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.maxRetryAttempts}
                      onChange={(e) =>
                        handleInputChange(
                          "maxRetryAttempts",
                          parseInt(e.target.value)
                        )
                      }
                      disabled={!formData.retryFailedSaves}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retry Delay (milliseconds)
                    </label>
                    <select
                      value={formData.retryDelay}
                      onChange={(e) =>
                        handleInputChange(
                          "retryDelay",
                          parseInt(e.target.value)
                        )
                      }
                      disabled={!formData.retryFailedSaves}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value={500}>500ms</option>
                      <option value={1000}>1 second</option>
                      <option value={2000}>2 seconds</option>
                      <option value={5000}>5 seconds</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
