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

export const availableModels: AIModel[] = [
  { id: "gemma2-9b-it", name: "Gemma 2 9B IT", provider: "Google" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", provider: "Meta" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", provider: "Meta" },
  { id: "llama3-70b-8192", name: "Llama 3 70B 8192", provider: "Meta" },
  { id: "llama3-8b-8192", name: "Llama 3 8B 8192", provider: "Meta" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill Llama 70B", provider: "DeepSeek" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17B", provider: "Meta" },
  { id: "mistral-saba-24b", name: "Mistral Saba 24B", provider: "Mistral AI" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", provider: "Meta" },
  { id: "qwen-qwq-32b", name: "Qwen QWQ 32B", provider: "Alibaba" },
]
