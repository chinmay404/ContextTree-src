"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, Save, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useOnClickOutside } from "@/hooks/use-click-outside"

interface NodeNotesProps {
  nodeId: string
  notes: Record<string, string>
  onSaveNote: (nodeId: string, note: string) => void
}

export default function NodeNotes({ nodeId, notes, onSaveNote }: NodeNotesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const notesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (nodeId && notes[nodeId]) {
      setNoteContent(notes[nodeId])
    } else {
      setNoteContent("")
    }
    setHasUnsavedChanges(false)
  }, [nodeId, notes])

  const handleSave = () => {
    onSaveNote(nodeId, noteContent)
    setHasUnsavedChanges(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value)
    setHasUnsavedChanges(true)
  }

  useOnClickOutside(notesRef, () => setIsOpen(false))

  return (
    <div className="relative" ref={notesRef}>
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 h-8 ${
          notes[nodeId] ? "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10" : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <StickyNote className="h-4 w-4" />
        <span>{notes[nodeId] ? "View Note" : "Add Note"}</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 w-64 bg-card border border-border rounded-md shadow-md z-[100]"
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium">Node Notes</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3">
              <Textarea
                value={noteContent}
                onChange={handleChange}
                placeholder="Add notes about this node..."
                className="min-h-[100px] text-sm resize-none"
              />
              <div className="flex justify-end mt-3">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Note</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
