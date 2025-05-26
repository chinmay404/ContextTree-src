"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useTheme } from "next-themes"
import { Lightbulb } from "lucide-react"
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import SyntaxHighlighter from "react-syntax-highlighter"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatPanelProps {
  messages: { sender: "user" | "ai"; content: string }[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  isExpanded?: boolean
  thinking?: string | null
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading, isExpanded = false, thinking }) => {
  const [input, setInput] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSendMessage = () => {
    if (input.trim() !== "") {
      onSendMessage(input)
      setInput("")
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault() // Prevent newline in input
      handleSendMessage()
    }
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

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={chatContainerRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const { thinking, content } = extractThinking(message.content)

            return (
              <div key={index} className="flex items-start gap-2">
                {message.sender === "user" ? (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/avatars/01.png" alt="Your Avatar" />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/next.svg" alt="AI Avatar" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col">
                  <div className="rounded-md p-3 shadow-sm w-fit max-w-[600px]">
                    {message.sender === "user" ? (
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
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-foreground underline underline-offset-2"
                              >
                                {children}
                              </a>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary-foreground/30 pl-3 italic my-2">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="my-2 border-primary-foreground/20" />,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            br: () => <br />,
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      </div>
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
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3">{children}</h3>,
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2 hover:opacity-80"
                              >
                                {children}
                              </a>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-3">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="my-3 border-border" />,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3">
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
                            td: ({ children }) => <td className="px-3 py-2">{children}</td>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            br: () => <br />,
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {thinking && message.sender !== "user" && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Lightbulb className="w-4 h-4 animate-pulse" />
                      Thinking...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex items-start gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/next.svg" alt="AI Avatar" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="rounded-md p-3 shadow-sm w-fit max-w-[600px]">
                  <p className={`${isExpanded ? "text-base" : "text-sm"} leading-relaxed`}>
                    {thinking ? thinking : "Loading..."}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Lightbulb className="w-4 h-4 animate-pulse" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            Send
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
