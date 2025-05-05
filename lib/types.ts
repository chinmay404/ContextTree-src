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
