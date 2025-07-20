"use client";

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  ImageIcon,
  Download,
  Settings,
  Menu,
  X,
  Zap,
  Share2,
  Link2Off,
  User,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { ThemeToggle } from "./theme-toggle";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";

interface NavbarProps {
  onSave: () => void;
  onImageUpload: (file: File) => void;
  onExport: () => void;
  showConnectionMode?: boolean;
  onCancelConnectionMode?: () => void;
}

export default function Navbar({
  onSave,
  onImageUpload,
  onExport,
  showConnectionMode = false,
  onCancelConnectionMode,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        onImageUpload(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
      }
      // Reset the input
      e.target.value = "";
    }
  };

  return (
    <div className="bg-gradient-to-r from-white/95 via-white/90 to-blue-50/80 backdrop-blur-xl border border-gray-200/60 rounded-xl py-3 px-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center">
        <div className="flex items-center gap-3 mr-6">
          <div className="relative">
            <img
              src="/contexttree-logo.png"
              alt="ContextTree Logo"
              className="h-8 w-8 rounded-lg shadow-sm"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            ContextTree
          </h1>
        </div>
      </div>

      {/* Connection Mode Indicator */}
      {showConnectionMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg"
        >
          <span className="animate-pulse">●</span>
          <span>Connection Mode Active</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
            onClick={onCancelConnectionMode}
          >
            <Link2Off className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-white/50 border-gray-200/60 hover:bg-white/80 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-white/50 border-gray-200/60 hover:bg-white/80 hover:border-green-300/60 hover:shadow-sm transition-all duration-200"
        >
          <ImageIcon className="h-4 w-4" />
          <span>Add Image</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-white/50 border-gray-200/60 hover:bg-white/80 hover:border-purple-300/60 hover:shadow-sm transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>

        <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-2"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full overflow-hidden border-2 border-gray-200/60 hover:border-blue-300/60 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image || "/placeholder.svg"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-xl rounded-xl"
          >
            <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
              <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white shadow-sm">
                {session?.user?.image ? (
                  <img
                    src={session.user.image || "/placeholder.svg"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {session?.user?.name || "Guest User"}
                </p>
                <p className="text-xs text-gray-600">
                  {session?.user?.email || "Not signed in"}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="hover:bg-blue-50/50">
              <User className="h-4 w-4 mr-2" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 hover:bg-red-50/50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-2"></div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-white/60 hover:shadow-sm transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-xl rounded-xl"
          >
            <DropdownMenuItem className="flex items-center gap-2 hover:bg-blue-50/50">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Canvas Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="hover:bg-gray-50/50">
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-gray-50/50">
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-gray-50/50">
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-8 w-8"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full right-0 left-0 bg-background border-b border-border shadow-md p-4 z-50 md:hidden"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center p-2 bg-muted/50 rounded-md">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                {session?.user?.image ? (
                  <img
                    src={session.user.image || "/placeholder.svg"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src="/diverse-avatars.png"
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {session?.user?.name || "Guest User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email || "Not signed in"}
                </p>
              </div>
            </div>

            <div className="h-px w-full bg-border my-2"></div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="flex items-center justify-start gap-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-start gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Add Image</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="flex items-center justify-start gap-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              className="flex items-center justify-start gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center justify-start gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center justify-start gap-2 text-red-500"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
