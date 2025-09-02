"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Copy, AlertTriangle, CheckCircle } from "lucide-react"
import { promptAssembler, type AssembledPrompt, type PromptTemplate } from "@/lib/prompt-assembler"
import { contextManager } from "@/lib/context-manager"

interface PromptPreviewPanelProps {
  llmCallNodeId: string | null
  isVisible: boolean
  onClose: () => void
}

export function PromptPreviewPanel({ llmCallNodeId, isVisible, onClose }: PromptPreviewPanelProps) {
  const [assembledPrompt, setAssembledPrompt] = useState<AssembledPrompt | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState("standard")
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setTemplates(promptAssembler.getTemplates())
  }, [])

  useEffect(() => {
    if (!llmCallNodeId || !isVisible) return

    setIsLoading(true)
    try {
      const assembledContext = contextManager.assembleContext(llmCallNodeId)
      const prompt = promptAssembler.assemblePrompt(
        llmCallNodeId,
        assembledContext,
        [], // TODO: Get actual conversation history
        selectedTemplate,
      )
      setAssembledPrompt(prompt)
    } catch (error) {
      console.error("Failed to assemble prompt:", error)
    } finally {
      setIsLoading(false)
    }
  }, [llmCallNodeId, selectedTemplate, isVisible])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const validation = assembledPrompt ? promptAssembler.validatePromptLength(assembledPrompt) : null

  if (!isVisible || !llmCallNodeId) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <h3 className="font-medium">Prompt Preview</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Template Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Validation Status */}
        {validation && (
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">{validation.isValid ? "Valid Prompt" : "Prompt Issues"}</span>
            </div>
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-xs text-orange-600 mb-1">
                {warning}
              </div>
            ))}
            {validation.suggestions.map((suggestion, index) => (
              <div key={index} className="text-xs text-blue-600">
                💡 {suggestion}
              </div>
            ))}
          </Card>
        )}

        {/* Token Count */}
        {assembledPrompt && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">{assembledPrompt.tokenCount} tokens</Badge>
            <Badge variant="outline">{assembledPrompt.contextSources.length} sources</Badge>
          </div>
        )}

        {/* Prompt Tabs */}
        {assembledPrompt && (
          <Tabs defaultValue="full" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="full">Full</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="mt-4">
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Complete Prompt</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(assembledPrompt.fullPrompt)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="h-64">
                  <pre className="text-xs whitespace-pre-wrap text-gray-700">{assembledPrompt.fullPrompt}</pre>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="mt-4">
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">System Prompt</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(assembledPrompt.systemPrompt)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="h-64">
                  <pre className="text-xs whitespace-pre-wrap text-gray-700">{assembledPrompt.systemPrompt}</pre>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="mt-4">
              <div className="space-y-2">
                {assembledPrompt.contextSources.map((source, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {source.type} ({source.tokens} tokens)
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(source.content)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                      {source.content.substring(0, 200)}
                      {source.content.length > 200 && "..."}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isLoading && <div className="text-center py-8 text-sm text-gray-500">Assembling prompt...</div>}
      </div>
    </div>
  )
}
