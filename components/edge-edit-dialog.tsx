"use client"

import { useState, useEffect } from "react"
import type { Edge } from "reactflow"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"

interface EdgeEditDialogProps {
  edge: Edge
  isOpen: boolean
  onClose: () => void
  onUpdate: (edgeId: string, data: any) => void
  onDelete: (edgeId: string) => void
}

const edgeStyles = [
  { value: "solid", label: "Solid", style: { strokeDasharray: undefined } },
  { value: "dashed", label: "Dashed", style: { strokeDasharray: "5,5" } },
  { value: "dotted", label: "Dotted", style: { strokeDasharray: "2,2" } },
]

const edgeColors = [
  { value: "#164e63", label: "Primary", color: "#164e63" },
  { value: "#6366f1", label: "Secondary", color: "#6366f1" },
  { value: "#d97706", label: "Warning", color: "#d97706" },
  { value: "#dc2626", label: "Danger", color: "#dc2626" },
  { value: "#059669", label: "Success", color: "#059669" },
]

export function EdgeEditDialog({ edge, isOpen, onClose, onUpdate, onDelete }: EdgeEditDialogProps) {
  const [condition, setCondition] = useState("")
  const [priority, setPriority] = useState(1)
  const [strokeColor, setStrokeColor] = useState("#164e63")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [strokeStyle, setStrokeStyle] = useState("solid")

  useEffect(() => {
    if (edge?.data) {
      setCondition(edge.data.condition || "")
      setPriority(edge.data.priority || 1)
      setStrokeColor(edge.data.style?.stroke || "#164e63")
      setStrokeWidth(edge.data.style?.strokeWidth || 2)
      setStrokeStyle(edge.data.style?.strokeDasharray ? "dashed" : "solid")
    }
  }, [edge])

  const handleSave = () => {
    const selectedStyle = edgeStyles.find((s) => s.value === strokeStyle)
    const updatedData = {
      condition,
      priority,
      style: {
        stroke: strokeColor,
        strokeWidth,
        ...selectedStyle?.style,
      },
    }
    onUpdate(edge.id, updatedData)
  }

  const handleDelete = () => {
    onDelete(edge.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Edge Condition</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="condition">Condition</Label>
            <Textarea
              id="condition"
              placeholder="Enter condition logic (e.g., 'If user asks about order')"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="strokeWidth">Line Width</Label>
              <Input
                id="strokeWidth"
                type="number"
                min="1"
                max="5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Select value={strokeColor} onValueChange={setStrokeColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {edgeColors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.color }} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="style">Style</Label>
              <Select value={strokeStyle} onValueChange={setStrokeStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {edgeStyles.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div className="h-12 bg-muted rounded flex items-center justify-center">
              <svg width="100" height="20">
                <line
                  x1="10"
                  y1="10"
                  x2="90"
                  y2="10"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={edgeStyles.find((s) => s.value === strokeStyle)?.style.strokeDasharray}
                />
              </svg>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
