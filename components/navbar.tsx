"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Save,
  ImageIcon,
  Download,
  Settings,
  Menu,
  X,
  Network,
  Zap,
  Share2,
  Link2Off,
  User,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { ThemeToggle } from "./theme-toggle"
import { motion } from "framer-motion"
import { signOut, useSession } from "next-auth/react"

interface NavbarProps {
  onSave: () => void
  onImageUpload: (file: File) => void
  onExport: () => void
  showConnectionMode?: boolean
  onCancelConnectionMode?: () => void
}

export default function Navbar({
  onSave,
  onImageUpload,
  onExport,
  showConnectionMode = false,
  onCancelConnectionMode,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { data: session } = useSession()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith("image/")) {
        onImageUpload(file)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        })
      }
      // Reset the input
      e.target.value = ""
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="bg-background/95 backdrop-blur-md border-b border-border py-3 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center gap-2 mr-6">
          <Network className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">ContextTree</h1>
        </div>
      </div>

      {/* Connection Mode Indicator */}
      {showConnectionMode && (
        <div className="absolute left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
          <span>Connection Mode</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-yellow-600/50 hover:bg-yellow-600"
            onClick={onCancelConnectionMode}
          >
            <Link2Off className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className="flex items-center gap-1 h-8 px-3 text-xs font-medium"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 h-8 px-3 text-xs font-medium"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Add Image</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-1 h-8 px-3 text-xs font-medium"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          className="flex items-center gap-1 h-8 px-3 text-xs font-medium bg-primary text-primary-foreground"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </Button>

        <div className="h-5 w-px bg-border mx-1"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full overflow-hidden border border-border">
              {session?.user?.image ? (
                <img
                  src={session.user.image || "/placeholder.svg"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center p-2">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                {session?.user?.image ? (
                  <img
                    src={session.user.image || "/placeholder.svg"}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email || "user@example.com"}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-1"></div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Canvas Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>About</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-8 w-8">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                  <User className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email || "user@example.com"}</p>
              </div>
            </div>

            <div className="h-px w-full bg-border my-2"></div>

            <Button variant="ghost" size="sm" onClick={onSave} className="flex items-center justify-start gap-2">
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

            <Button variant="ghost" size="sm" onClick={onExport} className="flex items-center justify-start gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>

            <Button variant="default" size="sm" className="flex items-center justify-start gap-2">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center justify-start gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center justify-start gap-2 text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </div>
  )
}
