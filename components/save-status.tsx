"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, CloudOff } from "lucide-react"

interface SaveStatusProps {
  isSaving: boolean
  lastSaved: Date | null
  isOnline: boolean
}

export default function SaveStatus({ isSaving, lastSaved, isOnline }: SaveStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>("")

  useEffect(() => {
    if (!lastSaved) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastSaved.getTime()

      if (diffMs < 60000) {
        setTimeAgo("just now")
      } else if (diffMs < 3600000) {
        const minutes = Math.floor(diffMs / 60000)
        setTimeAgo(`${minutes}m ago`)
      } else {
        const hours = Math.floor(diffMs / 3600000)
        setTimeAgo(`${hours}h ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000)

    return () => clearInterval(interval)
  }, [lastSaved])

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
        <span>Saving...</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center text-green-500 text-sm">
        <CheckCircle size={16} className="mr-1" />
        <span>Saved {timeAgo}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center text-amber-500 text-sm">
      <AlertCircle size={16} className="mr-1" />
      <span>Not saved</span>
    </div>
  )
}
