"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface NodeNotesProps {
  nodeId: string
  notes: string
  onSaveNote: (nodeId: string, notes: string) => void
}

export function NodeNotes({ nodeId, notes, onSaveNote }: NodeNotesProps) {
  const [currentNotes, setCurrentNotes] = useState(notes)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setCurrentNotes(notes)
  }, [notes])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNotes(e.target.value)
  }

  const handleSave = () => {
    onSaveNote(nodeId, currentNotes)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setCurrentNotes(notes)
    setIsEditing(false)
  }

  return (
    <div>
      <h3>Notes</h3>
      {isEditing ? (
        <div>
          <textarea value={currentNotes} onChange={handleInputChange} style={{ width: "100%", minHeight: "100px" }} />
          <div>
            <button onClick={handleSave}>Save</button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <p>{currentNotes || "No notes added."}</p>
          <button onClick={handleEdit}>Edit</button>
        </div>
      )}
    </div>
  )
}
