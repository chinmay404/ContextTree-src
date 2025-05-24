import { CheckCircle, CloudOff, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SaveStatusProps {
  isSaving: boolean
  lastSaved: Date | null
  isOnline: boolean
  autoSaveEnabled?: boolean
}

export function SaveStatus({ isSaving, lastSaved, isOnline, autoSaveEnabled = false }: SaveStatusProps) {
  const timeAgo = lastSaved ? formatDistanceToNow(lastSaved, { addSuffix: true }) : null

  if (!isOnline) {
    return (
      <div className="flex items-center text-amber-500 text-sm">
        <CloudOff size={16} className="mr-1" />
        <span>Offline</span>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className="flex items-center text-blue-500 text-sm">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
        <span>Auto-saving...</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center text-green-500 text-sm">
        <CheckCircle size={16} className="mr-1" />
        <span>Auto-saved {timeAgo}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center text-amber-500 text-sm">
      <AlertCircle size={16} className="mr-1" />
      <span>{autoSaveEnabled ? "Waiting to auto-save..." : "Not saved"}</span>
    </div>
  )
}
