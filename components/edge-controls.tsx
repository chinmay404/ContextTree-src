"use client"

import { useState } from "react"
import type { Edge } from "reactflow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EdgeControlsProps {
  edge: Edge
  updateEdgeStyle: (style: any) => void
  onClose: () => void
}

export default function EdgeControls({ edge, updateEdgeStyle, onClose }: EdgeControlsProps) {
  const [label, setLabel] = useState(edge.data?.label || "")

  const handleColorChange = (color: string) => {
    updateEdgeStyle({ stroke: color })
  }

  const handleWidthChange = (width: string) => {
    updateEdgeStyle({ strokeWidth: Number.parseInt(width) })
  }

  const handleAnimatedChange = (checked: boolean) => {
    updateEdgeStyle({ animated: checked })
  }

  const handleLabelChange = () => {
    updateEdgeStyle({ label })
  }

  const handleStyleChange = (style: string) => {
    if (style === "dashed") {
      updateEdgeStyle({ strokeDasharray: "5 5" })
    } else if (style === "dotted") {
      updateEdgeStyle({ strokeDasharray: "2 2" })
    } else {
      updateEdgeStyle({ strokeDasharray: "none" })
    }
  }

  return (
    <div className="w-64 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Edge Settings</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 rounded-md">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="style">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="label">Label</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edge-color">Color</Label>
            <Select onValueChange={handleColorChange} defaultValue={edge.style?.stroke?.toString() || "#3b82f6"}>
              <SelectTrigger id="edge-color" className="h-8">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="#3b82f6">Blue</SelectItem>
                <SelectItem value="#10b981">Green</SelectItem>
                <SelectItem value="#ef4444">Red</SelectItem>
                <SelectItem value="#f59e0b">Orange</SelectItem>
                <SelectItem value="#8b5cf6">Purple</SelectItem>
                <SelectItem value="#6b7280">Gray</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edge-width">Width</Label>
            <Select onValueChange={handleWidthChange} defaultValue={(edge.style?.strokeWidth || 1.5).toString()}>
              <SelectTrigger id="edge-width" className="h-8">
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Thin</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">Thick</SelectItem>
                <SelectItem value="4">Very Thick</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edge-style">Line Style</Label>
            <Select
              onValueChange={handleStyleChange}
              defaultValue={
                edge.style?.strokeDasharray ? (edge.style.strokeDasharray === "5 5" ? "dashed" : "dotted") : "solid"
              }
            >
              <SelectTrigger id="edge-style" className="h-8">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Switch id="animated" checked={edge.animated} onCheckedChange={handleAnimatedChange} />
            <Label htmlFor="animated">Animated</Label>
          </div>
        </TabsContent>

        <TabsContent value="label" className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edge-label">Label Text</Label>
            <div className="flex gap-2">
              <Input
                id="edge-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Edge label"
                className="flex-1 h-8"
              />
              <Button size="sm" onClick={handleLabelChange} className="h-8">
                Set
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
