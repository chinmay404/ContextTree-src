"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from "react"
import { v4 as uuidv4 } from "uuid"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
}

interface ChatPanelProps {
  isExpanded: boolean
  setIsExpanded: Dispatch<SetStateAction<boolean>>
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isExpanded, setIsExpanded }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Scroll to the bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
  }

  const handleSendMessage = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()

      if (inputValue.trim()) {
        const newMessage: Message = {
          id: uuidv4(),
          sender: "user",
          text: inputValue,
        }

        setMessages((prevMessages) => [...prevMessages, newMessage])
        setInputValue("")

        // Simulate AI response after a short delay
        setTimeout(() => {
          const aiResponse: Message = {
            id: uuidv4(),
            sender: "ai",
            text: "This is a simulated AI response.",
          }
          setMessages((prevMessages) => [...prevMessages, aiResponse])
        }, 500)
      }
    },
    [inputValue, setMessages],
  )

  return (
    <div className={`flex flex-col h-full ${isExpanded ? "p-4" : "p-2"} transition-all duration-200`}>
      <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={chatContainerRef} className="flex flex-col space-y-2 p-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-bubble ${message.sender === "user" ? "user" : "ai"} ${
                  isExpanded
                    ? message.sender === "user"
                      ? "bg-primary text-primary-foreground max-w-[85%] md:max-w-[75%] p-4 shadow-sm"
                      : "bg-card/90 border border-border/70 shadow-sm max-w-[85%] md:max-w-[75%] p-4 hover:shadow-md transition-shadow duration-200"
                    : message.sender === "user"
                      ? "bg-primary text-primary-foreground max-w-[85%] p-3.5 shadow-sm"
                      : "bg-card/90 border border-border/70 shadow-sm max-w-[85%] p-3.5 hover:shadow-md transition-shadow duration-200"
                } relative`}
              >
                {message.text}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <form onSubmit={handleSendMessage} className="mt-4">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className={`flex-1 ${
              isExpanded
                ? "bg-background/80 border-muted-foreground/20 focus-visible:ring-primary/30 h-12 text-base shadow-sm rounded-full pl-4"
                : "bg-background/70 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary/30 shadow-sm hover:shadow transition-shadow duration-200 rounded-full pl-4"
            }`}
          />
          <Button
            type="submit"
            size={isExpanded ? "default" : "icon"}
            className={`${
              isExpanded
                ? "bg-primary text-primary-foreground hover:bg-primary/90 px-6 shadow-sm hover:shadow transition-shadow duration-200 rounded-full"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow transition-shadow duration-200"
            }`}
          >
            {isExpanded ? (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Send
              </span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel
