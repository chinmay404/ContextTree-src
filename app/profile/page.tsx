"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserStats } from "@/components/user-stats";
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
import {
  User,
  Mail,
  Calendar,
  BarChart3,
  Activity,
  ArrowLeft,
  Settings,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = useState<{
    canvasCount: number;
    totalNodes: number;
    canvasIds: string[];
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const loadUserStats = async () => {
      if (!isAuthenticated || !user?.email) {
        setIsLoadingStats(false);
        return;
      }

      try {
        const response = await fetch("/api/canvases");
        if (response.ok) {
          const data = await response.json();
          setUserStats(data.userStats || null);
        }
      } catch (error) {
        console.error("Error loading user stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (isAuthenticated) {
      loadUserStats();
    }
  }, [isAuthenticated, user?.email]);

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Profile
          </h1>
          <p className="text-slate-600 mb-4">
            Please sign in to view your profile
          </p>
          <Button onClick={() => router.push("/")} variant="default">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to ContextTree
              </Button>
              <div className="h-6 w-px bg-slate-300" />
              <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-6">
          {/* User Info Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarImage src={user.image || ""} alt={user.name || ""} />
                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl text-slate-900">
                      {user.name || "User"}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 mb-3">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {new Date().getFullYear()}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="self-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* ContextTree Statistics */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  ContextTree Statistics
                </CardTitle>
                <CardDescription>
                  Your canvas and node activity overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="sm" text="Loading stats..." />
                  </div>
                ) : userStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {userStats.canvasCount}
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Canvases
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {userStats.totalNodes}
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Nodes
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-700">
                        Quick Stats
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            Avg. nodes per canvas:
                          </span>
                          <span className="font-medium">
                            {userStats.canvasCount > 0
                              ? Math.round(
                                  userStats.totalNodes / userStats.canvasCount
                                )
                              : 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            Active workspaces:
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {userStats.canvasCount > 0
                              ? "Active"
                              : "No canvases"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No statistics available</p>
                    <p className="text-sm">
                      Create your first canvas to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Overview */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                  Activity Overview
                </CardTitle>
                <CardDescription>
                  Recent activity and usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600">Last Active</span>
                  <span className="text-sm font-medium text-slate-900">
                    Today
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600">Account Status</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    Active
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600">Authentication</span>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700"
                  >
                    OAuth 2.0
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Actions */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Account Actions</CardTitle>
              <CardDescription>Manage your account and data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start h-12">
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
                <Button variant="outline" className="justify-start h-12">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button
                  variant="default"
                  className="justify-start h-12"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to App
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
