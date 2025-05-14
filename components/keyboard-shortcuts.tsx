"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  const shortcuts = [
    { key: "Ctrl+F", description: "Toggle full-screen mode" },
    { key: "Esc", description: "Exit full-screen mode" },
    { key: "R", description: "Toggle reading mode (in full-screen)" },
    { key: "Ctrl+Enter", description: "Send message" },
    { key: "↑", description: "Navigate to previous message" },
    { key: "↓", description: "Navigate to next message" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5">
          <Keyboard className="h-3.5 w-3.5" />
          <span>Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and control the interface more efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted rounded border border-border">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
