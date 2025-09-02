"use client"

import type { Node, Edge } from "reactflow"
import type { ChatMessage } from "./storage"

export interface SimulationConfig {
  model: string
  temperature: number
  maxTokens: number
  delay: number
}

export interface SimulationResult {
  success: boolean
  response: string
  tokensUsed: number
  latency: number
  error?: string
}

export interface SimulationMetrics {
  totalSimulations: number
  successRate: number
  averageLatency: number
  totalTokens: number
  errorCount: number
}

class SimulationEngine {
  private metrics: SimulationMetrics = {
    totalSimulations: 0,
    successRate: 100,
    averageLatency: 0,
    totalTokens: 0,
    errorCount: 0,
  }

  private responseTemplates = {
    entry: [
      "Hello! I'm here to help you with any questions you might have.",
      "Welcome! How can I assist you today?",
      "Hi there! What can I help you with?",
      "Greetings! I'm ready to help you with your inquiry.",
    ],
    userMsg: [
      "I understand you're looking for help with that.",
      "Thank you for providing that information.",
      "I see what you're asking about.",
      "Let me help you with that request.",
    ],
    botResponse: [
      "Based on your request, here's what I can help you with...",
      "I'd be happy to assist you with that. Let me provide some information...",
      "That's a great question! Here's what I know about that topic...",
      "I can definitely help you with that. Here's the information you need...",
    ],
    context: [
      "Using the provided context, I can see that...",
      "Based on the available information...",
      "The context suggests that...",
      "From what I understand about your situation...",
    ],
    llmCall: [
      "Processing your request with advanced AI capabilities...",
      "Analyzing the information and generating a response...",
      "Using machine learning to provide the best answer...",
      "Applying natural language processing to understand your needs...",
    ],
    branch: [
      "Let me route this to the appropriate response path...",
      "Based on your input, I'll direct this conversation accordingly...",
      "Determining the best way to handle your request...",
      "Analyzing your needs to provide the most relevant response...",
    ],
  }

  private contextualResponses = {
    order: [
      "I can help you track your order. Please provide your order number.",
      "Let me look up your order information for you.",
      "I'll check the status of your order right away.",
    ],
    support: [
      "I'm here to provide technical support. What issue are you experiencing?",
      "Let me help you troubleshoot that problem.",
      "I can assist you with resolving this technical issue.",
    ],
    billing: [
      "I can help you with billing questions. What would you like to know?",
      "Let me review your billing information.",
      "I'll assist you with your payment or billing inquiry.",
    ],
    general: [
      "I'm here to help with any questions you might have.",
      "How can I assist you today?",
      "What information are you looking for?",
    ],
  }

  async simulateResponse(
    node: Node,
    context: {
      previousMessages: ChatMessage[]
      connectedNodes: Node[]
      edges: Edge[]
    },
    config: Partial<SimulationConfig> = {},
  ): Promise<SimulationResult> {
    const startTime = Date.now()

    // Default configuration
    const simConfig: SimulationConfig = {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 150,
      delay: 1000 + Math.random() * 2000, // 1-3 second delay
      ...config,
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, simConfig.delay))

    try {
      // Generate contextual response
      const response = this.generateContextualResponse(node, context, simConfig)
      const tokensUsed = this.estimateTokens(response)
      const latency = Date.now() - startTime

      // Update metrics
      this.updateMetrics(true, latency, tokensUsed)

      return {
        success: true,
        response,
        tokensUsed,
        latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime
      this.updateMetrics(false, latency, 0)

      return {
        success: false,
        response: "",
        tokensUsed: 0,
        latency,
        error: "Simulation failed",
      }
    }
  }

  private generateContextualResponse(
    node: Node,
    context: {
      previousMessages: ChatMessage[]
      connectedNodes: Node[]
      edges: Edge[]
    },
    config: SimulationConfig,
  ): string {
    const nodeType = node.type || "botResponse"
    const nodeContent = node.data?.content || ""
    const nodeLabel = node.data?.label || ""

    // Analyze context for keywords
    const allText = [nodeContent, nodeLabel, ...context.previousMessages.map((m) => m.content)].join(" ").toLowerCase()

    let responseCategory: keyof typeof this.contextualResponses = "general"

    if (allText.includes("order") || allText.includes("purchase") || allText.includes("delivery")) {
      responseCategory = "order"
    } else if (allText.includes("support") || allText.includes("help") || allText.includes("problem")) {
      responseCategory = "support"
    } else if (allText.includes("billing") || allText.includes("payment") || allText.includes("charge")) {
      responseCategory = "billing"
    }

    // Get base response template
    const templates =
      this.responseTemplates[nodeType as keyof typeof this.responseTemplates] || this.responseTemplates.botResponse
    const contextualTemplates = this.contextualResponses[responseCategory]

    // Choose response based on temperature (randomness)
    const useContextual = Math.random() < 0.7 // 70% chance to use contextual response
    const responsePool = useContextual ? contextualTemplates : templates

    let baseResponse = responsePool[Math.floor(Math.random() * responsePool.length)]

    // Add model-specific variations
    if (config.model.includes("gpt-4")) {
      baseResponse = this.enhanceResponseForGPT4(baseResponse, nodeContent)
    } else if (config.model.includes("gpt-3.5")) {
      baseResponse = this.enhanceResponseForGPT35(baseResponse)
    }

    // Apply temperature effects
    if (config.temperature > 0.8) {
      baseResponse = this.addCreativeVariation(baseResponse)
    } else if (config.temperature < 0.3) {
      baseResponse = this.makeResponseMoreDirect(baseResponse)
    }

    // Limit response length based on maxTokens
    const maxLength = config.maxTokens * 4 // Rough character to token ratio
    if (baseResponse.length > maxLength) {
      baseResponse = baseResponse.substring(0, maxLength - 3) + "..."
    }

    return baseResponse
  }

  private enhanceResponseForGPT4(response: string, nodeContent: string): string {
    if (nodeContent) {
      return `${response} Based on the context: "${nodeContent.substring(0, 50)}${nodeContent.length > 50 ? "..." : ""}", I can provide more detailed assistance.`
    }
    return `${response} I can provide detailed, nuanced assistance with your request.`
  }

  private enhanceResponseForGPT35(response: string): string {
    return `${response} I'm here to help you efficiently.`
  }

  private addCreativeVariation(response: string): string {
    const variations = ["Interestingly, ", "You know what? ", "Here's a thought: ", "Let me put it this way: "]
    const variation = variations[Math.floor(Math.random() * variations.length)]
    return variation + response.toLowerCase()
  }

  private makeResponseMoreDirect(response: string): string {
    return response.replace(/I'd be happy to|I can|Let me/, "I will")
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  private updateMetrics(success: boolean, latency: number, tokens: number): void {
    this.metrics.totalSimulations++
    this.metrics.totalTokens += tokens

    if (!success) {
      this.metrics.errorCount++
    }

    this.metrics.successRate =
      ((this.metrics.totalSimulations - this.metrics.errorCount) / this.metrics.totalSimulations) * 100
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2
  }

  // Flow execution simulation
  async executeFlow(
    startNodeId: string,
    nodes: Node[],
    edges: Edge[],
    onNodeExecute?: (nodeId: string, result: SimulationResult) => void,
    onFlowComplete?: (results: Record<string, SimulationResult>) => void,
  ): Promise<Record<string, SimulationResult>> {
    const results: Record<string, SimulationResult> = {}
    const executionQueue: string[] = [startNodeId]
    const executed = new Set<string>()

    while (executionQueue.length > 0) {
      const currentNodeId = executionQueue.shift()!

      if (executed.has(currentNodeId)) continue

      const currentNode = nodes.find((n) => n.id === currentNodeId)
      if (!currentNode) continue

      // Simulate execution
      const context = {
        previousMessages: [],
        connectedNodes: nodes.filter((n) => edges.some((e) => e.source === currentNodeId && e.target === n.id)),
        edges: edges.filter((e) => e.source === currentNodeId),
      }

      const result = await this.simulateResponse(currentNode, context)
      results[currentNodeId] = result
      executed.add(currentNodeId)

      if (onNodeExecute) {
        onNodeExecute(currentNodeId, result)
      }

      // Find next nodes to execute
      const nextEdges = edges.filter((e) => e.source === currentNodeId)
      for (const edge of nextEdges) {
        if (!executed.has(edge.target)) {
          executionQueue.push(edge.target)
        }
      }

      // Add delay between node executions
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (onFlowComplete) {
      onFlowComplete(results)
    }

    return results
  }

  getMetrics(): SimulationMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = {
      totalSimulations: 0,
      successRate: 100,
      averageLatency: 0,
      totalTokens: 0,
      errorCount: 0,
    }
  }

  // Simulate different error conditions
  simulateError(errorType: "timeout" | "rate_limit" | "model_error" | "network"): SimulationResult {
    const errors = {
      timeout: "Request timed out after 30 seconds",
      rate_limit: "Rate limit exceeded. Please try again later",
      model_error: "Model is currently unavailable",
      network: "Network connection error",
    }

    this.updateMetrics(false, 5000, 0)

    return {
      success: false,
      response: "",
      tokensUsed: 0,
      latency: 5000,
      error: errors[errorType],
    }
  }
}

export const simulationEngine = new SimulationEngine()
