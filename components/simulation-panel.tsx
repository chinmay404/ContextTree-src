"use client"

import { useState, useEffect } from "react"
import type { Node, Edge } from "reactflow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RotateCcw, Zap, Clock, Target, TrendingUp } from "lucide-react"
import { simulationEngine, type SimulationResult } from "@/lib/simulation-engine"

interface SimulationPanelProps {
  nodes: Node[]
  edges: Edge[]
  selectedNode: string | null
  isRunning: boolean
  onRunningChange: (running: boolean) => void
  onNodeExecute: (nodeId: string, result: SimulationResult) => void
}

export function SimulationPanel({
  nodes,
  edges,
  selectedNode,
  isRunning,
  onRunningChange,
  onNodeExecute,
}: SimulationPanelProps) {
  const [executionResults, setExecutionResults] = useState<Record<string, SimulationResult>>({})
  const [currentExecutingNode, setCurrentExecutingNode] = useState<string | null>(null)
  const [executionProgress, setExecutionProgress] = useState(0)
  const [metrics, setMetrics] = useState(simulationEngine.getMetrics())

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(simulationEngine.getMetrics())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStartSimulation = async () => {
    if (!selectedNode) return

    onRunningChange(true)
    setExecutionResults({})
    setExecutionProgress(0)

    try {
      await simulationEngine.executeFlow(
        selectedNode,
        nodes,
        edges,
        (nodeId, result) => {
          setCurrentExecutingNode(nodeId)
          setExecutionResults((prev) => ({ ...prev, [nodeId]: result }))
          onNodeExecute(nodeId, result)

          const completed = Object.keys(executionResults).length + 1
          const total = nodes.length
          setExecutionProgress((completed / total) * 100)
        },
        (results) => {
          setCurrentExecutingNode(null)
          setExecutionProgress(100)
          onRunningChange(false)
        },
      )
    } catch (error) {
      console.error("[v0] Simulation failed:", error)
      onRunningChange(false)
    }
  }

  const handleStopSimulation = () => {
    onRunningChange(false)
    setCurrentExecutingNode(null)
    setExecutionProgress(0)
  }

  const handleResetSimulation = () => {
    setExecutionResults({})
    setCurrentExecutingNode(null)
    setExecutionProgress(0)
    simulationEngine.resetMetrics()
    setMetrics(simulationEngine.getMetrics())
  }

  const handleSingleNodeSimulation = async () => {
    if (!selectedNode) return

    const node = nodes.find((n) => n.id === selectedNode)
    if (!node) return

    setCurrentExecutingNode(selectedNode)

    const context = {
      previousMessages: [],
      connectedNodes: nodes.filter((n) => edges.some((e) => e.source === selectedNode && e.target === n.id)),
      edges: edges.filter((e) => e.source === selectedNode),
    }

    const result = await simulationEngine.simulateResponse(node, context)
    setExecutionResults((prev) => ({ ...prev, [selectedNode]: result }))
    onNodeExecute(selectedNode, result)
    setCurrentExecutingNode(null)
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Simulation Engine
        </h3>
        <p className="text-sm text-muted-foreground">
          {selectedNode ? `Ready to simulate from node ${selectedNode}` : "Select a node to start simulation"}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={isRunning ? handleStopSimulation : handleStartSimulation}
            disabled={!selectedNode}
            className="flex-1 gap-2"
            variant={isRunning ? "destructive" : "default"}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? "Stop Flow" : "Run Flow"}
          </Button>
          <Button onClick={handleSingleNodeSimulation} disabled={!selectedNode || isRunning} variant="outline">
            <Target className="h-4 w-4" />
          </Button>
          <Button onClick={handleResetSimulation} disabled={isRunning} variant="outline">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Execution Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Execution Progress</span>
              <span>{Math.round(executionProgress)}%</span>
            </div>
            <Progress value={executionProgress} className="h-2" />
            {currentExecutingNode && (
              <Badge variant="secondary" className="animate-pulse">
                Executing: {nodes.find((n) => n.id === currentExecutingNode)?.data?.label || currentExecutingNode}
              </Badge>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="results" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="flex-1 m-4 mt-4 space-y-3">
          {Object.keys(executionResults).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No simulation results yet</p>
              <p className="text-sm">Run a simulation to see results</p>
            </div>
          ) : (
            Object.entries(executionResults).map(([nodeId, result]) => {
              const node = nodes.find((n) => n.id === nodeId)
              return (
                <Card key={nodeId} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>{node?.data?.label || nodeId}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {result.latency}ms
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.tokensUsed} tokens
                    </Badge>
                  </div>

                  {result.success ? (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{result.response}</p>
                  ) : (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">Error: {result.error}</p>
                  )}
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 m-4 mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{metrics.totalSimulations}</div>
                <div className="text-sm text-muted-foreground">Total Runs</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(metrics.averageLatency)}ms</div>
                <div className="text-sm text-muted-foreground">Avg Latency</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.totalTokens}</div>
                <div className="text-sm text-muted-foreground">Total Tokens</div>
              </Card>
            </div>

            {metrics.errorCount > 0 && (
              <Card className="p-3 text-center border-destructive">
                <div className="text-2xl font-bold text-destructive">{metrics.errorCount}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </Card>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Metrics update in real-time during simulation</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
