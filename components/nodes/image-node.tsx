"use client"

import type React from "react"

import { memo, useState, useRef, useEffect, useCallback } from "react"
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from "@xyflow/react"
import { motion } from "framer-motion"
import { ImageIcon, Trash2, Move, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { debounce } from "lodash"

interface NodeParentInfo {
  id: string
  type: string
  label: string
}

// Update the ImageNodeData interface to include parents
interface ImageNodeData {
  imageUrl: string
  onDelete?: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
  style?: {
    width: number
    height: number
  }
  onDimensionsChange?: (id: string, dimensions: { width: number; height: number }) => void
  parents?: NodeParentInfo[]
}

function ImageNode({ id, data, selected }: NodeProps<ImageNodeData>) {
  const { imageUrl, onDelete, onResize, style = { width: 200, height: 150 }, onDimensionsChange } = data

  const [isResizing, setIsResizing] = useState(false)
  const [nodeWidth, setNodeWidth] = useState(style.width || 200)
  const [nodeHeight, setNodeHeight] = useState(style.height || 150)
  const [isHovered, setIsHovered] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const startSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  const resizeFrameRef = useRef<number | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    setNodeWidth(style.width || 200)
    setNodeHeight(style.height || 150)
  }, [style.width, style.height])

  // Debounced resize update to prevent too many state updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedResizeUpdate = useCallback(
    debounce((width: number, height: number) => {
      if (onResize) {
        onResize(id, width, height)
      }
    }, 100),
    [id, onResize],
  )

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    startPosRef.current = { x: e.clientX, y: e.clientY }
    startSizeRef.current = { width: nodeWidth, height: nodeHeight }

    document.addEventListener("mousemove", handleResize)
    document.addEventListener("mouseup", stopResize)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return

    // Cancel any pending animation frame
    if (resizeFrameRef.current !== null) {
      cancelAnimationFrame(resizeFrameRef.current)
    }

    // Use requestAnimationFrame to avoid layout thrashing
    resizeFrameRef.current = requestAnimationFrame(() => {
      const diffX = e.clientX - startPosRef.current.x
      const diffY = e.clientY - startPosRef.current.y

      const newWidth = Math.max(100, startSizeRef.current.width + diffX)
      const newHeight = Math.max(75, startSizeRef.current.height + diffY)

      setNodeWidth(newWidth)
      setNodeHeight(newHeight)
    })
  }

  const stopResize = () => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleResize)
    document.removeEventListener("mouseup", stopResize)

    // Only update the parent component if the size actually changed
    if (nodeWidth !== startSizeRef.current.width || nodeHeight !== startSizeRef.current.height) {
      debouncedResizeUpdate(nodeWidth, nodeHeight)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(id)
    }
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResize)
      document.removeEventListener("mouseup", stopResize)
      debouncedResizeUpdate.cancel()
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
    }
  }, [debouncedResizeUpdate])

  // Add error handler for ResizeObserver errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver")) {
        event.preventDefault()
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  // Update node dimensions for preview positioning
  useEffect(() => {
    if (nodeRef.current && onDimensionsChange) {
      const { width, height } = nodeRef.current.getBoundingClientRect()
      if (width && height && width > 0 && height > 0) {
        onDimensionsChange(id, { width, height })
        updateNodeInternals(id)
      }
    }
  }, [nodeWidth, nodeHeight, id, onDimensionsChange, updateNodeInternals])

  return (
    <motion.div
      ref={nodeRef}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
      className={`relative rounded-lg border ${
        selected ? "border-primary shadow-[0_0_0_1px] shadow-primary/20" : "border-border"
      } bg-card shadow-md transition-all duration-200 group hover:shadow-lg`}
      style={{
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-primary !border-2 !border-background transition-all"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-primary !border-2 !border-background transition-all"
      />

      <motion.div
        className="absolute top-2 right-2 z-10 flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered || selected ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            window.open(imageUrl, "_blank")
          }}
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button variant="destructive" size="icon" className="h-6 w-6" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-md">
        {imageUrl ? (
          <img src={imageUrl || "/placeholder.svg"} alt="Uploaded content" className="object-contain w-full h-full" />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs">Image</span>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={startResize}
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2) 75%, transparent 75%)",
          backgroundSize: "8px 8px",
        }}
      />

      {/* Move indicator */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered && !selected ? 0.7 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Move className="h-6 w-6 text-primary" />
      </motion.div>
    </motion.div>
  )
}

// Export both named and default
export { ImageNode }
export default memo(ImageNode)
