"use client"
import { useState } from "react"
import type React from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Send, RotateCcw, X, Bot, User } from "lucide-react"
import type { Node, Edge } from "reactflow"

interface ConversationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  nodeId?: string
  timestamp: string
}

interface ConversationTesterProps {
  nodes: Node[]
  edges: Edge[]
  isVisible: boolean
  onClose: () => void
  onNodeHighlight?: (nodeId: string | null) => void
}

export function ConversationTester({ nodes, edges, isVisible, onClose, onNodeHighlight }: ConversationTesterProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [currentInput, setCurrentInput] = useState("")
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const startConversation = () => {
    const entryNode = nodes.find((n) => n.type === "entry")
    if (entryNode) {
      setCurrentNodeId(entryNode.id)
      onNodeHighlight?.(entryNode.id)
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: entryNode.data.content || "Hello! How can I help you today?",
          nodeId: entryNode.id,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  const sendMessage = async () => {
    if (!currentInput.trim()) return

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setCurrentInput("")
    setIsProcessing(true)

    // Simulate conversation flow processing
    setTimeout(() => {
      // Find next node in the flow (simplified logic)
      const nextEdge = edges.find((e) => e.source === currentNodeId)
      if (nextEdge) {
        const nextNode = nodes.find((n) => n.id === nextEdge.target)
        if (nextNode) {
          setCurrentNodeId(nextNode.id)
          onNodeHighlight?.(nextNode.id)

          if (nextNode.type === "botResponse") {
            const botMessage: ConversationMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content:
                nextNode.data.content || nextNode.data.expectedResponse || "I understand. Let me help you with that.",
              nodeId: nextNode.id,
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, botMessage])
          }
        }
      }
      setIsProcessing(false)
    }, 1000)
  }

  const resetConversation = () => {
    setMessages([])
    setCurrentInput("")
    setCurrentNodeId(null)
    onNodeHighlight?.(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Conversation Tester</h3>
            {currentNodeId && (
              <Badge variant="outline" className="text-xs">
                Current: {nodes.find((n) => n.id === currentNodeId)?.data.label}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetConversation}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Test Your Conversation Flow</h4>
                <p className="text-sm text-gray-600 mb-4">Start a conversation to test your flow design</p>
                <Button onClick={startConversation}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === "user" ? "bg-blue-100" : "bg-purple-100"
                          }`}
                        >
                          {message.role === "user" ? (
                            <User className="h-4 w-4 text-blue-700" />
                          ) : (
                            <Bot className="h-4 w-4 text-purple-700" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {message.nodeId && (
                            <p className="text-xs opacity-70 mt-1">
                              Node: {nodes.find((n) => n.id === message.nodeId)?.data.label}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-purple-700" />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isProcessing}
                  />
                  <Button onClick={sendMessage} disabled={isProcessing || !currentInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
