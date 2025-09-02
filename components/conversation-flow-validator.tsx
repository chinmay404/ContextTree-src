"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react"
import type { Node, Edge } from "reactflow"

interface ValidationIssue {
  id: string
  type: "error" | "warning" | "info"
  message: string
  nodeId?: string
  suggestion?: string
}

interface FlowValidatorProps {
  nodes: Node[]
  edges: Edge[]
  isVisible: boolean
  onClose: () => void
}

export function ConversationFlowValidator({ nodes, edges, isVisible, onClose }: FlowValidatorProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [isValidating, setIsValidating] = useState(false)

  const validateFlow = () => {
    setIsValidating(true)
    const foundIssues: ValidationIssue[] = []

    // Check for orphaned nodes
    const connectedNodeIds = new Set([...edges.map((e) => e.source), ...edges.map((e) => e.target)])

    nodes.forEach((node) => {
      if (!connectedNodeIds.has(node.id) && node.type !== "entry") {
        foundIssues.push({
          id: `orphaned-${node.id}`,
          type: "warning",
          message: `Node "${node.data.label}" is not connected to the flow`,
          nodeId: node.id,
          suggestion: "Connect this node to the conversation flow or remove it",
        })
      }
    })

    // Check for missing entry points
    const entryNodes = nodes.filter((n) => n.type === "entry")
    if (entryNodes.length === 0) {
      foundIssues.push({
        id: "no-entry",
        type: "error",
        message: "No entry point found in the conversation flow",
        suggestion: "Add an entry node to define where conversations begin",
      })
    }

    // Check for LLM calls without context
    const llmCallNodes = nodes.filter((n) => n.type === "llmCall")
    llmCallNodes.forEach((llmNode) => {
      const hasContextInput = edges.some(
        (e) => e.target === llmNode.id && nodes.find((n) => n.id === e.source)?.type === "context",
      )

      if (!hasContextInput) {
        foundIssues.push({
          id: `no-context-${llmNode.id}`,
          type: "warning",
          message: `LLM Call "${llmNode.data.label}" has no context connections`,
          nodeId: llmNode.id,
          suggestion: "Connect context nodes to provide instructions and data",
        })
      }
    })

    // Check for branches without conditions
    const branchNodes = nodes.filter((n) => n.type === "branch")
    branchNodes.forEach((branchNode) => {
      const outgoingEdges = edges.filter((e) => e.source === branchNode.id)
      if (outgoingEdges.length < 2) {
        foundIssues.push({
          id: `single-branch-${branchNode.id}`,
          type: "warning",
          message: `Branch "${branchNode.data.label}" has fewer than 2 output paths`,
          nodeId: branchNode.id,
          suggestion: "Add multiple paths or use a different node type",
        })
      }
    })

    // Check for conversation flow completeness
    const userMsgNodes = nodes.filter((n) => n.type === "userMsg")
    const botResponseNodes = nodes.filter((n) => n.type === "botResponse")

    if (userMsgNodes.length === 0) {
      foundIssues.push({
        id: "no-user-messages",
        type: "info",
        message: "No user message nodes found",
        suggestion: "Add user message nodes to define expected user inputs",
      })
    }

    if (botResponseNodes.length === 0) {
      foundIssues.push({
        id: "no-bot-responses",
        type: "info",
        message: "No bot response nodes found",
        suggestion: "Add bot response nodes to define expected AI outputs",
      })
    }

    // Check for dead ends
    nodes.forEach((node) => {
      const hasOutgoing = edges.some((e) => e.source === node.id)
      const hasIncoming = edges.some((e) => e.target === node.id)

      if (hasIncoming && !hasOutgoing && node.type !== "botResponse") {
        foundIssues.push({
          id: `dead-end-${node.id}`,
          type: "warning",
          message: `Node "${node.data.label}" is a dead end`,
          nodeId: node.id,
          suggestion: "Connect this node to continue the conversation flow",
        })
      }
    })

    setIssues(foundIssues)
    setIsValidating(false)
  }

  useEffect(() => {
    if (isVisible) {
      validateFlow()
    }
  }, [isVisible, nodes, edges])

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-orange-200 bg-orange-50"
      case "info":
        return "border-blue-200 bg-blue-50"
      default:
        return "border-green-200 bg-green-50"
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Flow Validation</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <Badge variant={issues.length === 0 ? "default" : "secondary"}>
              {issues.length === 0 ? "Flow Valid" : `${issues.length} Issues Found`}
            </Badge>
            <Button variant="outline" size="sm" onClick={validateFlow} disabled={isValidating}>
              {isValidating ? "Validating..." : "Re-validate"}
            </Button>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-medium text-green-900 mb-2">Flow is Valid!</h4>
              <p className="text-sm text-green-700">Your conversation flow has no validation issues.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {issues.map((issue) => (
                <Card key={issue.id} className={`p-3 ${getIssueColor(issue.type)}`}>
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                      {issue.suggestion && <p className="text-xs text-gray-600 mt-1">💡 {issue.suggestion}</p>}
                      {issue.nodeId && (
                        <Badge variant="outline" className="text-xs mt-2">
                          Node: {issue.nodeId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
