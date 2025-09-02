export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
}

export interface AssembledPrompt {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
  tokenCount: number
  contextSources: Array<{
    nodeId: string
    type: string
    content: string
    tokens: number
  }>
  metadata: {
    model: string
    temperature: number
    maxTokens: number
    timestamp: string
  }
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant"
  content: string
  nodeId?: string
  timestamp?: string
}

class PromptAssembler {
  private templates: Map<string, PromptTemplate> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: "standard",
        name: "Standard Chat",
        description: "Standard conversational format with system instructions",
        template: `{{system_instructions}}

{{context_data}}

{{conversation_history}}`,
        variables: ["system_instructions", "context_data", "conversation_history"],
      },
      {
        id: "rag",
        name: "RAG Enhanced",
        description: "Retrieval-Augmented Generation with context prioritization",
        template: `{{system_instructions}}

## Relevant Context:
{{rag_data}}

## Conversation Memory:
{{conversation_memory}}

## Additional Context:
{{custom_context}}

{{conversation_history}}`,
        variables: ["system_instructions", "rag_data", "conversation_memory", "custom_context", "conversation_history"],
      },
      {
        id: "structured",
        name: "Structured Response",
        description: "Template for structured, consistent responses",
        template: `{{system_instructions}}

## Instructions:
Please provide a structured response following this format:
1. Understanding: Summarize the user's request
2. Analysis: Analyze the relevant context
3. Response: Provide your answer
4. Next Steps: Suggest follow-up actions if applicable

## Context:
{{context_data}}

{{conversation_history}}`,
        variables: ["system_instructions", "context_data", "conversation_history"],
      },
    ]

    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template)
    })
  }

  // Estimate token count (rough approximation: 4 characters = 1 token)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  // Format conversation history
  private formatConversationHistory(messages: ConversationMessage[]): string {
    if (messages.length === 0) return ""

    return messages
      .map((msg) => {
        const role = msg.role === "assistant" ? "Assistant" : "User"
        return `${role}: ${msg.content}`
      })
      .join("\n\n")
  }

  // Assemble prompt using context manager data
  assemblePrompt(
    llmCallNodeId: string,
    assembledContext: any,
    conversationHistory: ConversationMessage[] = [],
    templateId = "standard",
    model = "gpt-4",
    temperature = 0.7,
    maxTokens = 1000,
  ): AssembledPrompt {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Prepare template variables
    const variables: Record<string, string> = {
      system_instructions: assembledContext.systemInstructions.join("\n\n"),
      rag_data: assembledContext.ragData.join("\n\n"),
      conversation_memory: assembledContext.conversationMemory.join("\n\n"),
      custom_context: assembledContext.customContext.join("\n\n"),
      context_data: [
        ...assembledContext.systemInstructions,
        ...assembledContext.ragData,
        ...assembledContext.conversationMemory,
        ...assembledContext.customContext,
      ].join("\n\n"),
      conversation_history: this.formatConversationHistory(conversationHistory),
    }

    // Replace template variables
    let assembledTemplate = template.template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      assembledTemplate = assembledTemplate.replace(regex, value || "")
    })

    // Clean up extra whitespace
    const fullPrompt = assembledTemplate.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

    // Extract system and user prompts
    const lines = fullPrompt.split("\n")
    const systemPrompt = variables.system_instructions || "You are a helpful assistant."
    const userPrompt =
      conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].content : "Hello"

    // Calculate context sources with token counts
    const contextSources = [
      ...assembledContext.systemInstructions.map((content: string, index: number) => ({
        nodeId: `system_${index}`,
        type: "system",
        content,
        tokens: this.estimateTokens(content),
      })),
      ...assembledContext.ragData.map((content: string, index: number) => ({
        nodeId: `rag_${index}`,
        type: "rag",
        content,
        tokens: this.estimateTokens(content),
      })),
      ...assembledContext.conversationMemory.map((content: string, index: number) => ({
        nodeId: `memory_${index}`,
        type: "memory",
        content,
        tokens: this.estimateTokens(content),
      })),
      ...assembledContext.customContext.map((content: string, index: number) => ({
        nodeId: `custom_${index}`,
        type: "custom",
        content,
        tokens: this.estimateTokens(content),
      })),
    ]

    const totalTokens = this.estimateTokens(fullPrompt)

    return {
      systemPrompt,
      userPrompt,
      fullPrompt,
      tokenCount: totalTokens,
      contextSources,
      metadata: {
        model,
        temperature,
        maxTokens,
        timestamp: new Date().toISOString(),
      },
    }
  }

  // Get available templates
  getTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }

  // Add custom template
  addTemplate(template: PromptTemplate) {
    this.templates.set(template.id, template)
  }

  // Remove template
  removeTemplate(templateId: string) {
    this.templates.delete(templateId)
  }

  // Preview prompt with sample data
  previewPrompt(templateId: string, sampleData: Record<string, string>): string {
    const template = this.templates.get(templateId)
    if (!template) return ""

    let preview = template.template
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      preview = preview.replace(regex, value)
    })

    return preview
  }

  // Validate prompt length against model limits
  validatePromptLength(
    prompt: AssembledPrompt,
    modelLimits: Record<string, number> = {},
  ): {
    isValid: boolean
    warnings: string[]
    suggestions: string[]
  } {
    const defaultLimits: Record<string, number> = {
      "gpt-4": 8192,
      "gpt-3.5-turbo": 4096,
      "claude-3": 100000,
      "gemini-pro": 30720,
    }

    const limits = { ...defaultLimits, ...modelLimits }
    const modelLimit = limits[prompt.metadata.model] || 4096
    const warnings: string[] = []
    const suggestions: string[] = []

    if (prompt.tokenCount > modelLimit) {
      warnings.push(`Prompt exceeds model limit (${prompt.tokenCount} > ${modelLimit} tokens)`)
      suggestions.push("Consider reducing context or splitting into multiple calls")
    }

    if (prompt.tokenCount > modelLimit * 0.8) {
      warnings.push(`Prompt is near model limit (${prompt.tokenCount}/${modelLimit} tokens)`)
      suggestions.push("Consider optimizing context to leave room for response")
    }

    return {
      isValid: prompt.tokenCount <= modelLimit,
      warnings,
      suggestions,
    }
  }
}

export const promptAssembler = new PromptAssembler()
