import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Circle } from "lucide-react";

interface UserStatsProps {
  stats: {
    canvasCount: number;
    totalNodes: number;
    canvasIds: string[];
  } | null;
  userName?: string;
}

export function UserStats({ stats, userName }: UserStatsProps) {
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
  );
}
