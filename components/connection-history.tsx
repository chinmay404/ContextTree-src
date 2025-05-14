"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link, ArrowRight, MessageSquare, GitBranch, ImageIcon, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ConnectionEvent {
  id: string
  timestamp: number
  type: "connect" | "disconnect"
  sourceId: string
  targetId: string
  sourceType: string
  targetType: string
  sourceLabel: string
  targetLabel: string
}

interface ConnectionHistoryProps {
  connectionEvents: ConnectionEvent[]
  onNavigateToNode: (nodeId: string) => void
}

export default function ConnectionHistory({ connectionEvents, onNavigateToNode }: ConnectionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filteredEvents, setFilteredEvents] = useState<ConnectionEvent[]>([])
  const [filter, setFilter] = useState<"all" | "connect" | "disconnect">("all")

  useEffect(() => {
    if (filter === "all") {
      setFilteredEvents(connectionEvents)
    } else {
      setFilteredEvents(connectionEvents.filter((event) => event.type === filter))
    }
  }, [connectionEvents, filter])

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "mainNode":
        return <MessageSquare className="h-3.5 w-3.5 text-primary" />
      case "branchNode":
        return <GitBranch className="h-3.5 w-3.5 text-orange-500" />
      case "imageNode":
        return <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
      default:
        return <MessageSquare className="h-3.5 w-3.5" />
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-border rounded-md shadow-sm bg-card/90 backdrop-blur-sm overflow-hidden"
    >
      <div
        className="p-3 border-b border-border flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Connection History</h3>
          {!isExpanded && filteredEvents.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filteredEvents.length}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 border-b border-border flex items-center gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "connect" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("connect")}
              >
                Connections
              </Button>
              <Button
                variant={filter === "disconnect" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("disconnect")}
              >
                Disconnections
              </Button>
            </div>

            <ScrollArea className="h-[200px] p-2">
              {filteredEvents.length > 0 ? (
                <div className="space-y-2">
                  {filteredEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-2 rounded-md border text-xs ${
                        event.type === "connect"
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-red-500/20 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${event.type === "connect" ? "text-green-500" : "text-red-500"}`}>
                          {event.type === "connect" ? "Connected" : "Disconnected"}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{formatTime(event.timestamp)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => onNavigateToNode(event.sourceId)}
                        >
                          {getNodeIcon(event.sourceType)}
                          <span className="truncate max-w-[80px]">{event.sourceLabel}</span>
                        </div>

                        {event.type === "connect" ? (
                          <ArrowRight className="h-3 w-3 text-green-500" />
                        ) : (
                          <Link className="h-3 w-3 text-red-500" />
                        )}

                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => onNavigateToNode(event.targetId)}
                        >
                          {getNodeIcon(event.targetType)}
                          <span className="truncate max-w-[80px]">{event.targetLabel}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No connection events to display
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
