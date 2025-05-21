"use client"

import { Button } from "@/components/ui/button"

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
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="font-semibold">CanvasGPT</div>
        <div className="ml-auto flex items-center gap-2">
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
          {!isSaving && lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
          <Button size="sm" onClick={onExport}>
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
