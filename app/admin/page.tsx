"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bug, Clock, User, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface BugReport {
  id: string;
  user_email: string;
  user_name: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  browser_info?: string;
  additional_info?: string;
  status: "open" | "investigating" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
}

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors = {
  open: "bg-gray-100 text-gray-800",
  investigating: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-purple-100 text-purple-800",
};

export default function AdminBugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        throw new Error("Failed to fetch reports");
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch bug reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      setUpdatingStatus(reportId);
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchReports(); // Refresh the list
        toast({
          title: "Status Updated",
          description: `Report status changed to ${newStatus}`,
        });
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (!isAuthenticated || user?.email !== "chinmaypisal1718@gmail.com") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {!isAuthenticated
                ? "Please sign in to view bug reports."
                : "You don't have permission to access this page."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading bug reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bug className="h-8 w-8 text-orange-600" />
            Bug Reports Admin
          </h1>
          <p className="text-slate-600 mt-2">
            Manage and track bug reports from users
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              All Reports ({reports.length})
            </h2>
            {reports.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bug className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No bug reports yet.</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedReport?.id === report.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-2">
                        {report.title}
                      </CardTitle>
                      <div className="flex gap-2 ml-2">
                        <Badge className={severityColors[report.severity]}>
                          {report.severity}
                        </Badge>
                        <Badge className={statusColors[report.status]}>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {report.user_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {report.description}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Report Details */}
          <div className="sticky top-6">
            {selectedReport ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {selectedReport.title}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge
                        className={severityColors[selectedReport.severity]}
                      >
                        {selectedReport.severity}
                      </Badge>
                      <Badge className={statusColors[selectedReport.status]}>
                        {selectedReport.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Reported by {selectedReport.user_name} (
                    {selectedReport.user_email}) on{" "}
                    {new Date(selectedReport.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-slate-700">
                      {selectedReport.description}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Steps to Reproduce
                    </h4>
                    <Textarea
                      value={selectedReport.steps_to_reproduce}
                      readOnly
                      className="min-h-[100px] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">
                        Expected Behavior
                      </h4>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        {selectedReport.expected_behavior}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">
                        Actual Behavior
                      </h4>
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        {selectedReport.actual_behavior}
                      </p>
                    </div>
                  </div>

                  {selectedReport.browser_info && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">
                        Browser Info
                      </h4>
                      <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded">
                        {selectedReport.browser_info}
                      </p>
                    </div>
                  )}

                  {selectedReport.additional_info && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">
                        Additional Information
                      </h4>
                      <p className="text-sm text-slate-700">
                        {selectedReport.additional_info}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Update Status
                    </h4>
                    <div className="flex gap-2">
                      <Select
                        value={selectedReport.status}
                        onValueChange={(value) =>
                          updateReportStatus(selectedReport.id, value)
                        }
                        disabled={updatingStatus === selectedReport.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">
                            Investigating
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      {updatingStatus === selectedReport.id && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Updating...
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">
                    Select a bug report to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
