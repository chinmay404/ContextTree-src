"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ApiKeySettingsDialog } from "@/components/api-key-settings-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  KeyRound,
  Layers3,
  LogOut,
  Mail,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type UserStatsState = {
  canvasCount: number;
  totalNodes: number;
  canvasIds: string[];
};

type FeedbackReport = {
  id: string;
  title: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "closed";
  created_at: string;
};

const formatRelativeDate = (value?: string) => {
  if (!value) return "Recently";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

const statusStyles: Record<FeedbackReport["status"], string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  investigating: "bg-indigo-50 text-indigo-700 border-indigo-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);
  const [userStats, setUserStats] = useState<UserStatsState | null>(null);
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthenticated || !user?.email) {
        setIsLoadingData(false);
        return;
      }

      try {
        const [canvasResponse, reportsResponse] = await Promise.all([
          fetch("/api/canvases"),
          fetch("/api/reports?userOnly=true"),
        ]);

        if (canvasResponse.ok) {
          const canvasData = await canvasResponse.json();
          setUserStats(canvasData.userStats || null);
        }

        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json();
          setFeedbackReports(reportsData.reports || []);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProfileData();
  }, [isAuthenticated, user?.email]);

  const averageNodesPerCanvas = useMemo(() => {
    if (!userStats?.canvasCount) return 0;
    return Math.round(userStats.totalNodes / userStats.canvasCount);
  }, [userStats]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <Card className="w-full max-w-lg rounded-3xl border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 px-8 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Profile</h1>
              <p className="mt-2 text-slate-600">
                Sign in to see your account, API keys, and feedback history.
              </p>
            </div>
            <Button
              onClick={() => router.push("/")}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_35%),linear-gradient(to_bottom,#f8fafc,#ffffff)] text-slate-900">
      <ApiKeySettingsDialog
        open={isApiKeysOpen}
        onOpenChange={setIsApiKeysOpen}
      />

      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to app
            </Button>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">
              Profile
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <div className="grid gap-6">
          <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-[0_25px_60px_-40px_rgba(15,23,42,0.22)]">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_35%),linear-gradient(to_bottom_right,#ffffff,#f8fafc)] px-7 py-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-5">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                      <AvatarImage src={user.image || ""} alt={user.name || ""} />
                      <AvatarFallback className="bg-slate-900 text-xl font-semibold text-white">
                        {user.name
                          ?.split(" ")
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                          {user.name || "ContextTree user"}
                        </h1>
                        <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          Verified account
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>Member since {new Date().getFullYear()}</span>
                        </div>
                      </div>

                      <p className="max-w-2xl text-sm leading-6 text-slate-600">
                        Manage your keys, track your workspace usage, and leave product feedback from one place.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsApiKeysOpen(true)}
                      className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <KeyRound className="mr-2 h-4 w-4 text-indigo-500" />
                      Manage API keys
                    </Button>

                    <FeedbackDialog defaultContext="Profile page">
                      <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                        <MessageSquareQuote className="mr-2 h-4 w-4" />
                        Send feedback
                      </Button>
                    </FeedbackDialog>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-7 py-6 md:grid-cols-3">
                {[
                  {
                    label: "Canvases",
                    value: userStats?.canvasCount ?? 0,
                    icon: Layers3,
                    accent: "text-indigo-600",
                  },
                  {
                    label: "Total nodes",
                    value: userStats?.totalNodes ?? 0,
                    icon: BarChart3,
                    accent: "text-violet-600",
                  },
                  {
                    label: "Avg. nodes / canvas",
                    value: averageNodesPerCanvas,
                    icon: Sparkles,
                    accent: "text-emerald-600",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">
                        {item.label}
                      </span>
                      <item.icon className={`h-4.5 w-4.5 ${item.accent}`} />
                    </div>
                    <div className="text-3xl font-semibold tracking-tight text-slate-950">
                      {isLoadingData ? "—" : item.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[24px] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">
                  Account overview
                </CardTitle>
                <CardDescription>
                  The details that matter for day-to-day use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <span className="text-sm text-slate-600">Authentication</span>
                  <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
                    OAuth
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <span className="text-sm text-slate-600">Current access</span>
                  <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <span className="text-sm text-slate-600">Feedback submitted</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {feedbackReports.length}
                  </span>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-800">
                    Quick actions
                  </p>
                  <div className="grid gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsApiKeysOpen(true)}
                      className="justify-start rounded-xl border-slate-200 hover:bg-slate-50"
                    >
                      <KeyRound className="mr-2 h-4 w-4 text-indigo-500" />
                      Update API keys
                    </Button>
                    <FeedbackDialog defaultContext="Profile page">
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-xl border-slate-200 hover:bg-slate-50"
                      >
                        <MessageSquareQuote className="mr-2 h-4 w-4 text-indigo-500" />
                        Leave product feedback
                      </Button>
                    </FeedbackDialog>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/")}
                      className="justify-start rounded-xl border-slate-200 hover:bg-slate-50"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4 text-slate-500" />
                      Return to workspace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-slate-950">
                    Recent feedback
                  </CardTitle>
                  <CardDescription>
                    Everything you've sent us from the product so far.
                  </CardDescription>
                </div>
                <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                  {feedbackReports.length} total
                </Badge>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <LoadingSpinner size="sm" text="Loading feedback..." />
                  </div>
                ) : feedbackReports.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                    <MessageSquareQuote className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900">
                      No feedback yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      If something feels rough, confusing, or promising, send it through here and we’ll keep it attached to your account.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbackReports.slice(0, 6).map((report) => (
                      <div
                        key={report.id}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {report.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={`rounded-full border ${statusStyles[report.status]}`}>
                              {report.status}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {formatRelativeDate(report.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                          {report.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
