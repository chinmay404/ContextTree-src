"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  GitBranch,
  History,
  Plus,
  Download,
  RotateCcw,
  ContrastIcon as Compare,
  Bookmark,
  X,
  Calendar,
  User,
} from "lucide-react"
import { versionManager, type ConversationVersion, type VersionBranch } from "@/lib/version-manager"
import type { Node, Edge } from "reactflow"

interface VersionHistoryPanelProps {
  nodes: Node[]
  edges: Edge[]
  isVisible: boolean
  onClose: () => void
  onLoadVersion: (nodes: Node[], edges: Edge[]) => void
}

export function VersionHistoryPanel({ nodes, edges, isVisible, onClose, onLoadVersion }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ConversationVersion[]>([])
  const [branches, setBranches] = useState<VersionBranch[]>([])
  const [currentBranch, setCurrentBranch] = useState<VersionBranch | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [newVersionName, setNewVersionName] = useState("")
  const [newVersionDescription, setNewVersionDescription] = useState("")
  const [newBranchName, setNewBranchName] = useState("")
  const [newBranchDescription, setNewBranchDescription] = useState("")

  useEffect(() => {
    if (isVisible) {
      refreshData()
    }
  }, [isVisible])

  const refreshData = () => {
    setBranches(versionManager.getBranches())
    setCurrentBranch(versionManager.getCurrentBranch())
    const currentBranchId = versionManager.getCurrentBranch()?.id || "main"
    setVersions(versionManager.getBranchVersions(currentBranchId))
  }

  const createVersion = () => {
    if (!newVersionName.trim()) return

    versionManager.createVersion(newVersionName, newVersionDescription, nodes, edges, false)
    setNewVersionName("")
    setNewVersionDescription("")
    refreshData()
  }

  const createCheckpoint = () => {
    const name = `Checkpoint ${new Date().toLocaleString()}`
    versionManager.createVersion(name, "Auto-generated checkpoint", nodes, edges, true)
    refreshData()
  }

  const createBranch = () => {
    if (!newBranchName.trim()) return

    versionManager.createBranch(newBranchName, newBranchDescription)
    setNewBranchName("")
    setNewBranchDescription("")
    refreshData()
  }

  const switchBranch = (branchId: string) => {
    versionManager.switchBranch(branchId)
    refreshData()
  }

  const loadVersion = (version: ConversationVersion) => {
    onLoadVersion(version.nodes, version.edges)
  }

  const revertToVersion = (versionId: string) => {
    const revertedVersion = versionManager.revertToVersion(versionId)
    if (revertedVersion) {
      onLoadVersion(revertedVersion.nodes, revertedVersion.edges)
      refreshData()
    }
  }

  const exportVersion = (versionId: string) => {
    const exportData = versionManager.exportVersion(versionId)
    if (exportData) {
      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `conversation-flow-${versionId}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId].slice(-2),
    )
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h3 className="font-medium">Version History</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="versions" className="flex-1 flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="flex-1 p-4 space-y-4">
          {/* Create Version */}
          <Card className="p-3">
            <h4 className="font-medium mb-2">Create Version</h4>
            <div className="space-y-2">
              <Input
                placeholder="Version name..."
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)..."
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createVersion} disabled={!newVersionName.trim()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={createCheckpoint}>
                  <Bookmark className="h-3 w-3 mr-1" />
                  Checkpoint
                </Button>
              </div>
            </div>
          </Card>

          {/* Current Branch */}
          {currentBranch && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentBranch.color }}></div>
              <span className="font-medium">{currentBranch.name}</span>
              <Badge variant="outline" className="text-xs">
                {versions.length} versions
              </Badge>
            </div>
          )}

          {/* Version List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {versions
                .slice()
                .reverse()
                .map((version) => (
                  <Card
                    key={version.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedVersions.includes(version.id) ? "ring-2 ring-primary" : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleVersionSelection(version.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-sm">{version.name}</h5>
                          {version.metadata.isCheckpoint && <Bookmark className="h-3 w-3 text-indigo-500" />}
                        </div>
                        {version.description && <p className="text-xs text-gray-600 mt-1">{version.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(version.timestamp).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.author}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {version.metadata.nodeCount}N
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {version.metadata.edgeCount}E
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" onClick={() => loadVersion(version)}>
                        Load
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => revertToVersion(version.id)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportVersion(version.id)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </ScrollArea>

          {/* Compare Versions */}
          {selectedVersions.length === 2 && (
            <Card className="p-3">
              <Button size="sm" className="w-full">
                <Compare className="h-3 w-3 mr-2" />
                Compare Selected Versions
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="branches" className="flex-1 p-4 space-y-4">
          {/* Create Branch */}
          <Card className="p-3">
            <h4 className="font-medium mb-2">Create Branch</h4>
            <div className="space-y-2">
              <Input
                placeholder="Branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)..."
                value={newBranchDescription}
                onChange={(e) => setNewBranchDescription(e.target.value)}
              />
              <Button size="sm" onClick={createBranch} disabled={!newBranchName.trim()}>
                <GitBranch className="h-3 w-3 mr-1" />
                Create Branch
              </Button>
            </div>
          </Card>

          {/* Branch List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {branches.map((branch) => (
                <Card
                  key={branch.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    branch.isActive ? "ring-2 ring-primary bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => switchBranch(branch.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: branch.color }}></div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{branch.name}</h5>
                      {branch.description && <p className="text-xs text-gray-600">{branch.description}</p>}
                    </div>
                    {branch.isActive && <Badge className="text-xs">Active</Badge>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{branch.versions.length} versions</span>
                    <span>{new Date(branch.createdAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
