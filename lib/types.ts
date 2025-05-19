export type Message = {
  id: string
  sender: "user" | "ai"
  content: string
  timestamp: number
}

export type Conversation = {
  id: string
  name: string
  nodes: any[]
  edges: any[]
  userId?: string // Add userId to associate conversations with users
}

export type NodeParentInfo = {
  id: string
  type: string
  label: string
}

export type AIModel = {
  id: string
  name: string
  provider: string
}

export type User = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export const availableModels: AIModel[] = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
  { id: "llama-3-70b", name: "Llama 3 70B", provider: "Meta" },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI" },
]
