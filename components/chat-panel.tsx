"use client"

import type React from "react"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { Bot, GitBranch, User, Link, ArrowRight, ArrowLeft, CornerDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "next-themes"

import "./chat-panel.css"

interface ChatPanelProps {
  messages: {
    id: string
    sender: "user" | "ai"
    content: string
    timestamp: string
  }[]
  isExpanded: boolean
  onCreateBranchNode?: (message: string) => void
  branchPoints: { [messageId: string]: string }
  connectionPoints: {
    [messageId: string]: {
      nodeId: string
      type: "mainNode" | "branchNode" | "connectionNode"
      direction: "incoming" | "outgoing"
    }
  }
  handleNavigateToNode: (nodeId: string) => void
  getNodeTypeName: (nodeType: string) => string
}

// Function to extract thinking content from a message
const extractThinking = (content: string): { thinking: string | null; content: string } => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/
  const match = content.match(thinkRegex)

  if (match && match[1]) {
    // Return the thinking content and the cleaned message content
    return {
      thinking: match[1].trim(),
      content: content.replace(thinkRegex, "").trim(),
    }
  }

  return { thinking: null, content }
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isExpanded,
  onCreateBranchNode,
  branchPoints,
  connectionPoints,
  handleNavigateToNode,
  getNodeTypeName,
}) => {
  const { theme } = useTheme()

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto p-4">
      {messages.map((message, index) => {
        const { thinking, content } = extractThinking(message.content)

        return (
          <div key={message.id} className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex flex-col group ${message.sender === "user" ? "items-end" : "items-start"}`}
            >
              {/* Thinking section */}
              {thinking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`mb-2 w-full max-w-[85%] md:max-w-[75%] ${message.sender === "user" ? "self-end" : "self-start"}`}
                >
                  <details className="bg-muted/30 rounded-lg border border-border/50 text-sm">
                    <summary className="cursor-pointer p-2 font-medium text-xs flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1">
                        <Bot className="h-3 w-3 text-primary" />
                      </span>
                      Thinking process
                    </summary>
                    <div className="p-3 pt-1 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                      {thinking}
                    </div>
                  </details>
                </motion.div>
              )}

              <div className="flex items-end gap-2 relative">
                {message.sender !== "user" && (
                  <div className="bg-primary/15 p-1.5 rounded-full shadow-sm">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`${
                    isExpanded
                      ? message.sender === "user"
                        ? "bg-primary text-primary-foreground max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm"
                        : "bg-card/90 border border-border/70 shadow-sm max-w-[85%] md:max-w-[75%] rounded-2xl p-4 hover:shadow-md transition-shadow duration-200"
                      : message.sender === "user"
                        ? "bg-primary text-primary-foreground max-w-[85%] rounded-2xl p-3.5 shadow-sm"
                        : "bg-card/90 border border-border/70 shadow-sm max-w-[85%] rounded-2xl p-3.5 hover:shadow-md transition-shadow duration-200"
                  } relative`}
                >
                  {message.sender === "user" ? (
                    <p className={`${isExpanded ? "text-base leading-relaxed" : "text-sm leading-relaxed"}`}>
                      {content}
                    </p>
                  ) : (
                    <div className={`${isExpanded ? "text-base" : "text-sm"} markdown-content`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={theme === "dark" ? vscDarkPlus : vs}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                className={`${className} bg-muted px-1 py-0.5 rounded text-sm font-mono`}
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          },
                          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-4 list-disc pl-6 last:mb-0">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-4 list-decimal pl-6 last:mb-0">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-md font-bold mb-2 mt-4">{children}</h3>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              {children}
                            </a>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="my-4 border-border" />,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full divide-y divide-border">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                          tr: ({ children }) => <tr>{children}</tr>,
                          th: ({ children }) => (
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => <td className="px-3 py-2 whitespace-nowrap">{children}</td>,
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Add plus icon for creating new node from message */}
                  {onCreateBranchNode && message.sender === "user" && (
                    <div
                      className="absolute -right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateBranchNode(message.content)
                        toast({
                          title: "Branch created",
                          description: "New branch node created from this message",
                        })
                      }}
                      title="Create branch from this message"
                    >
                      <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200">
                        <GitBranch className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  )}

                  {/* Add plus icon for creating new node from AI message */}
                  {onCreateBranchNode && message.sender === "ai" && (
                    <div
                      className="absolute -left-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateBranchNode(message.content)
                        toast({
                          title: "Branch created",
                          description: "New branch node created from this message",
                        })
                      }}
                      title="Create branch from this message"
                    >
                      <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200">
                        <GitBranch className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  )}
                </div>
                {message.sender === "user" && (
                  <div className="bg-primary/15 p-1.5 rounded-full shadow-sm">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
              <span className={`text-xs text-muted-foreground mt-1.5 px-2 ${isExpanded ? "opacity-70" : ""}`}>
                {format(new Date(message.timestamp), "h:mm a")}
              </span>
            </motion.div>

            {/* Branch indicator */}
            {branchPoints[message.id] && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={`flex my-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed ${
                    message.sender === "user"
                      ? "border-primary/30 text-primary"
                      : "border-orange-500/30 text-orange-500"
                  }`}
                  onClick={() => handleNavigateToNode(branchPoints[message.id])}
                >
                  <GitBranch className="h-3 w-3" />
                  <span>Branch created</span>
                  <CornerDownRight className="h-3 w-3 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Connection indicator */}
            {connectionPoints[message.id] && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={`flex my-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-1.5 h-7 px-2 py-1 text-xs rounded-md border border-dashed ${
                    connectionPoints[message.id].type === "mainNode"
                      ? "border-primary/30 text-primary"
                      : connectionPoints[message.id].type === "branchNode"
                        ? "border-orange-500/30 text-orange-500"
                        : "border-blue-500/30 text-blue-500"
                  }`}
                  onClick={() => handleNavigateToNode(connectionPoints[message.id].nodeId)}
                >
                  <Link className="h-3 w-3" />
                  <span>
                    {connectionPoints[message.id].direction === "outgoing" ? "Connected to" : "Connected from"}{" "}
                    {getNodeTypeName(connectionPoints[message.id].type)}
                  </span>
                  {connectionPoints[message.id].direction === "outgoing" ? (
                    <ArrowRight className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowLeft className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ChatPanel
