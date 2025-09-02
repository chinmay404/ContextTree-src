"use client"
import { useState, useEffect, useCallback } from "react"
import { promptAssembler, type AssembledPrompt, type ConversationMessage } from "@/lib/prompt-assembler"
import { contextManager } from "@/lib/context-manager"

export function usePromptAssembly(llmCallNodeId?: string) {
  const [assembledPrompt, setAssembledPrompt] = useState<AssembledPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assemblePrompt = useCallback(
    async (
      templateId = "standard",
      conversationHistory: ConversationMessage[] = [],
      model = "gpt-4",
      temperature = 0.7,
      maxTokens = 1000,
    ) => {
      if (!llmCallNodeId) return

      setIsLoading(true)
      setError(null)

      try {
        const assembledContext = contextManager.assembleContext(llmCallNodeId)
        const prompt = promptAssembler.assemblePrompt(
          llmCallNodeId,
          assembledContext,
          conversationHistory,
          templateId,
          model,
          temperature,
          maxTokens,
        )
        setAssembledPrompt(prompt)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assemble prompt")
        setAssembledPrompt(null)
      } finally {
        setIsLoading(false)
      }
    },
    [llmCallNodeId],
  )

  const validatePrompt = useCallback(() => {
    if (!assembledPrompt) return null
    return promptAssembler.validatePromptLength(assembledPrompt)
  }, [assembledPrompt])

  const copyPromptToClipboard = useCallback(() => {
    if (assembledPrompt) {
      navigator.clipboard.writeText(assembledPrompt.fullPrompt)
    }
  }, [assembledPrompt])

  const getTokenCount = useCallback(() => {
    return assembledPrompt?.tokenCount || 0
  }, [assembledPrompt])

  const getContextSources = useCallback(() => {
    return assembledPrompt?.contextSources || []
  }, [assembledPrompt])

  useEffect(() => {
    if (llmCallNodeId) {
      assemblePrompt()
    }
  }, [llmCallNodeId, assemblePrompt])

  return {
    assembledPrompt,
    isLoading,
    error,
    assemblePrompt,
    validatePrompt,
    copyPromptToClipboard,
    getTokenCount,
    getContextSources,
  }
}
