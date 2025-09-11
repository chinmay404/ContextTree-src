import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Circle, Activity } from "lucide-react";

interface UserStatsProps {
  stats: {
    canvasCount: number;
    totalNodes: number;
    canvasIds: string[];
  } | null;
  userName?: string;
}

interface SystemStats {
  activeUsers: number;
  maxUsers: number;
  isLimited: boolean;
  utilizationPercent: number;
}

export function UserStats({ stats, userName }: UserStatsProps) {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    // Fetch system stats
    const fetchSystemStats = async () => {
      try {
        const response = await fetch("/api/user-limit/check");
        if (response.ok) {
          const data = await response.json();
          setSystemStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
      }
    };

    fetchSystemStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (utilization: number) => {
    if (utilization >= 90) return "text-red-600 bg-red-50";
    if (utilization >= 70) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const getStatusText = (utilization: number) => {
    if (utilization >= 90) return "High Load";
    if (utilization >= 70) return "Moderate Load";
    return "Available";
  };

  if (!stats) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {userName || "User"} Profile
          </CardTitle>
          <CardDescription>Loading statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-slate-200 rounded w-16"></div>
            <div className="h-4 bg-slate-200 rounded w-20"></div>
            <div className="h-4 bg-slate-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {userName || "User"} Profile
          </CardTitle>
          <CardDescription>Your ContextTree statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {stats.canvasCount} Canvas{stats.canvasCount !== 1 ? "es" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                {stats.totalNodes} Node{stats.totalNodes !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Average nodes per canvas:{" "}
            {stats.canvasCount > 0
              ? Math.round((stats.totalNodes / stats.canvasCount) * 10) / 10
              : 0}
          </div>
        </CardContent>
      </Card>

      {/* System Status Card */}
      {systemStats && systemStats.isLimited && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
              <Activity className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-blue-700">
                  Active Users: {systemStats.activeUsers}/{systemStats.maxUsers}
                </div>
                <div className="w-32 bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        systemStats.utilizationPercent,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${getStatusColor(
                  systemStats.utilizationPercent
                )} border-0 text-xs`}
              >
                {getStatusText(systemStats.utilizationPercent)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
