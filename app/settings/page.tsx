"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Bell, Shield, Eye, CheckCircle2, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"

export default function Settings() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  // Privacy settings
  const [shareUsageData, setShareUsageData] = useState(true)
  const [showProfileToOthers, setShowProfileToOthers] = useState(true)

  const handleSaveSettings = async () => {
    setIsLoading(true)
    setError("")
    setSuccess(false)

    try {
      // In a real implementation, this would call an API endpoint to save the settings
      // For now, we'll just simulate success after a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSuccess(true)
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>

        <Tabs defaultValue="appearance">
          <TabsList className="mb-8">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your settings have been saved successfully.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how ContextTree looks for you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      onClick={() => setTheme("light")}
                    >
                      <div className="h-24 bg-white border border-gray-200 rounded-md mb-3 flex items-center justify-center text-black">
                        Light Mode
                      </div>
                      <p className="text-sm font-medium">Light</p>
                    </div>
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      onClick={() => setTheme("dark")}
                    >
                      <div className="h-24 bg-gray-900 border border-gray-800 rounded-md mb-3 flex items-center justify-center text-white">
                        Dark Mode
                      </div>
                      <p className="text-sm font-medium">Dark</p>
                    </div>
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      onClick={() => setTheme("system")}
                    >
                      <div className="h-24 bg-gradient-to-r from-white to-gray-900 border border-gray-200 rounded-md mb-3 flex items-center justify-center">
                        <span className="bg-white text-black px-2 py-1 rounded-l-md">Light</span>
                        <span className="bg-gray-900 text-white px-2 py-1 rounded-r-md">Dark</span>
                      </div>
                      <p className="text-sm font-medium">System</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>Manage your privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="share-usage-data">Share Usage Data</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
                    </div>
                    <Switch id="share-usage-data" checked={shareUsageData} onCheckedChange={setShareUsageData} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="show-profile">Profile Visibility</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Allow other users to see your profile</p>
                    </div>
                    <Switch id="show-profile" checked={showProfileToOthers} onCheckedChange={setShowProfileToOthers} />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
