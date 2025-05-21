"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession, signIn, signOut } from "next-auth/react"
import { Save, Upload, Download, X, Menu, LogOut, LogIn } from "lucide-react"
import { useRef } from "react"
import ThemeToggle from "./theme-toggle"

interface NavbarProps {
  onSave: () => void
  onImageUpload: (file: File) => void
  onExport: () => void
  showConnectionMode: boolean
  onCancelConnectionMode: () => void
  isSaving?: boolean
  lastSaved?: Date | null
}

export default function Navbar({
  onSave,
  onImageUpload,
  onExport,
  showConnectionMode,
  onCancelConnectionMode,
  isSaving = false,
  lastSaved = null,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onImageUpload(files[0])
    }
  }

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>Access all the features of ContextTree.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Button onClick={onSave} className="w-full" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Canvas"}
              </Button>
              <Button onClick={onExport} className="w-full">
                Export Canvas
              </Button>
              <Button onClick={handleImageUpload} className="w-full">
                Upload Image
              </Button>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-bold">ContextTree</h1>
      </div>
      <div className="flex items-center gap-2">
        {showConnectionMode && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-100 px-3 py-1 dark:bg-yellow-900">
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Connection Mode</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelConnectionMode}>
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel connection mode</span>
            </Button>
          </div>
        )}
        <div className="hidden md:flex md:items-center md:gap-2">
          {lastSaved && <span className="text-xs text-muted-foreground">Last saved: {formatLastSaved(lastSaved)}</span>}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onSave} disabled={isSaving}>
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="sr-only">Save canvas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save canvas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleImageUpload}>
                  <Upload className="h-4 w-4" />
                  <span className="sr-only">Upload image</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload image</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onExport}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Export canvas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export canvas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ThemeToggle />
        {session ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => signIn("google")}>
                  <LogIn className="h-4 w-4" />
                  <span className="sr-only">Sign in</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign in</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        aria-hidden="true"
      />
    </header>
  )
}
