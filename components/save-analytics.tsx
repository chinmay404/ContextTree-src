// filepath: g:\ContextTree-src\components\save-analytics.tsx
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  X,
} from "lucide-react";
import { ConversationSaveAnalytics } from "@/lib/models/canvas";
import { getConversationSaveAnalytics } from "@/app/actions/canvas";

interface SaveAnalyticsProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChartData {
  date: string;
  saves: number;
  failures: number;
  avgTime: number;
}

export default function SaveAnalytics({
  conversationId,
  isOpen,
  onClose,
}: SaveAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ConversationSaveAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "7d"
  );
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen, conversationId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await getConversationSaveAnalytics(conversationId);
      setAnalytics(result);

      // Generate chart data (this would normally come from the backend)
      const mockChartData: ChartData[] = [];
      const days =
        timeRange === "7d"
          ? 7
          : timeRange === "30d"
          ? 30
          : timeRange === "90d"
          ? 90
          : 365;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockChartData.push({
          date: date.toISOString().split("T")[0],
          saves: Math.floor(Math.random() * 20) + 1,
          failures: Math.floor(Math.random() * 3),
          avgTime: Math.floor(Math.random() * 500) + 100,
        });
      }
      setChartData(mockChartData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSuccessRate = () => {
    if (!analytics || analytics.totalSaves === 0) return 0;
    return (
      ((analytics.totalSaves - analytics.failedSaves) / analytics.totalSaves) *
      100
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full m-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <BarChart3 className="mr-2" size={20} />
              Save Analytics
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) =>
                  setTimeRange(e.target.value as "7d" | "30d" | "90d" | "all")
                }
                className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[80vh]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading analytics...</p>
            </div>
          ) : analytics ? (
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total Saves
                      </p>
                      <p className="text-2xl font-bold text-blue-800">
                        {analytics.totalSaves}
                      </p>
                    </div>
                    <CheckCircle className="text-blue-500" size={24} />
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">
                        Failed Saves
                      </p>
                      <p className="text-2xl font-bold text-red-800">
                        {analytics.failedSaves}
                      </p>
                    </div>
                    <XCircle className="text-red-500" size={24} />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold text-green-800">
                        {getSuccessRate().toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="text-green-500" size={24} />
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Avg Save Time
                      </p>
                      <p className="text-2xl font-bold text-purple-800">
                        {analytics.averageSaveTime}ms
                      </p>
                    </div>
                    <Clock className="text-purple-500" size={24} />
                  </div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Save Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto Saves:</span>
                      <span className="font-medium">{analytics.autoSaves}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manual Saves:</span>
                      <span className="font-medium">
                        {analytics.manualSaves}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Data Size:</span>
                      <span className="font-medium">
                        {formatBytes(analytics.totalDataSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Data Size:</span>
                      <span className="font-medium">
                        {formatBytes(analytics.averageDataSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Save:</span>
                      <span className="font-medium">
                        {analytics.lastSaveTime
                          ? new Date(analytics.lastSaveTime).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Performance Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fastest Save:</span>
                      <span className="font-medium">
                        {formatDuration(analytics.fastestSaveTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slowest Save:</span>
                      <span className="font-medium">
                        {formatDuration(analytics.slowestSaveTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Error Rate:</span>
                      <span className="font-medium text-red-600">
                        {analytics.totalSaves > 0
                          ? (
                              (analytics.failedSaves / analytics.totalSaves) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data Compression:</span>
                      <span className="font-medium">
                        {analytics.compressionRatio
                          ? `${(analytics.compressionRatio * 100).toFixed(1)}%`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save History Chart */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Save Activity Over Time
                </h3>
                <div className="h-64 flex items-end justify-between gap-1 bg-gray-50 p-4 rounded">
                  {chartData.map((data, index) => {
                    const maxSaves = Math.max(...chartData.map((d) => d.saves));
                    const height = (data.saves / maxSaves) * 100;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center flex-1"
                      >
                        <div
                          className="bg-blue-500 w-full min-h-[4px] rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${data.date}: ${data.saves} saves, ${data.failures} failures`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                          {new Date(data.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                      <span>Successful Saves</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                      <span>Failed Saves</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Save Events */}
              {analytics.recentSaveEvents &&
                analytics.recentSaveEvents.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Recent Save Events
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {analytics.recentSaveEvents.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                        >
                          <div className="flex items-center">
                            {event.success ? (
                              <CheckCircle
                                size={16}
                                className="text-green-500 mr-2"
                              />
                            ) : (
                              <XCircle
                                size={16}
                                className="text-red-500 mr-2"
                              />
                            )}
                            <span className="text-sm">
                              {event.type === "auto"
                                ? "Auto-save"
                                : "Manual save"}
                            </span>
                            {!event.success && event.error && (
                              <span className="text-xs text-red-600 ml-2">
                                ({event.error})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock size={12} className="mr-1" />
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No analytics data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
