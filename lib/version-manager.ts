export interface ConversationVersion {
  id: string
  name: string
  description: string
  timestamp: string
  author: string
  nodes: any[]
  edges: any[]
  metadata: {
    nodeCount: number
    edgeCount: number
    contextConnections: number
    isCheckpoint: boolean
    parentVersionId?: string
    branchName?: string
  }
}

export interface VersionBranch {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
  versions: ConversationVersion[]
  isActive: boolean
}

export interface VersionComparison {
  added: {
    nodes: any[]
    edges: any[]
  }
  removed: {
    nodes: any[]
    edges: any[]
  }
  modified: {
    nodes: Array<{ before: any; after: any }>
    edges: Array<{ before: any; after: any }>
  }
  summary: {
    nodesAdded: number
    nodesRemoved: number
    nodesModified: number
    edgesAdded: number
    edgesRemoved: number
    edgesModified: number
  }
}

class VersionManager {
  private versions: Map<string, ConversationVersion> = new Map()
  private branches: Map<string, VersionBranch> = new Map()
  private currentVersionId: string | null = null
  private currentBranchId = "main"

  constructor() {
    this.initializeMainBranch()
  }

  private initializeMainBranch() {
    const mainBranch: VersionBranch = {
      id: "main",
      name: "Main",
      description: "Primary conversation flow",
      color: "#3b82f6",
      createdAt: new Date().toISOString(),
      versions: [],
      isActive: true,
    }
    this.branches.set("main", mainBranch)
  }

  // Create a new version
  createVersion(
    name: string,
    description: string,
    nodes: any[],
    edges: any[],
    isCheckpoint = false,
    branchId = this.currentBranchId,
  ): ConversationVersion {
    const version: ConversationVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      description,
      timestamp: new Date().toISOString(),
      author: "User", // In a real app, this would come from auth
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        contextConnections: edges.filter((e) => e.data?.condition === "Context Link").length,
        isCheckpoint,
        parentVersionId: this.currentVersionId || undefined,
        branchName: this.branches.get(branchId)?.name,
      },
    }

    this.versions.set(version.id, version)

    // Add to branch
    const branch = this.branches.get(branchId)
    if (branch) {
      branch.versions.push(version)
    }

    this.currentVersionId = version.id
    return version
  }

  // Create a new branch from current version
  createBranch(name: string, description: string, fromVersionId?: string): VersionBranch {
    const sourceVersionId = fromVersionId || this.currentVersionId
    const sourceVersion = sourceVersionId ? this.versions.get(sourceVersionId) : null

    const branch: VersionBranch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      description,
      color: this.generateBranchColor(),
      createdAt: new Date().toISOString(),
      versions: [],
      isActive: false,
    }

    // If creating from existing version, copy it to new branch
    if (sourceVersion) {
      const branchVersion: ConversationVersion = {
        ...sourceVersion,
        id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: `${name} - Initial`,
        description: `Branched from ${sourceVersion.name}`,
        timestamp: new Date().toISOString(),
        metadata: {
          ...sourceVersion.metadata,
          parentVersionId: sourceVersion.id,
          branchName: name,
        },
      }
      branch.versions.push(branchVersion)
      this.versions.set(branchVersion.id, branchVersion)
    }

    this.branches.set(branch.id, branch)
    return branch
  }

  // Switch to a different branch
  switchBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId)
    if (!branch) return false

    // Deactivate current branch
    const currentBranch = this.branches.get(this.currentBranchId)
    if (currentBranch) {
      currentBranch.isActive = false
    }

    // Activate new branch
    branch.isActive = true
    this.currentBranchId = branchId

    // Set current version to latest in branch
    if (branch.versions.length > 0) {
      this.currentVersionId = branch.versions[branch.versions.length - 1].id
    }

    return true
  }

  // Get version by ID
  getVersion(versionId: string): ConversationVersion | null {
    return this.versions.get(versionId) || null
  }

  // Get all versions for a branch
  getBranchVersions(branchId: string): ConversationVersion[] {
    const branch = this.branches.get(branchId)
    return branch ? branch.versions : []
  }

  // Get all branches
  getBranches(): VersionBranch[] {
    return Array.from(this.branches.values())
  }

  // Compare two versions
  compareVersions(versionId1: string, versionId2: string): VersionComparison | null {
    const version1 = this.versions.get(versionId1)
    const version2 = this.versions.get(versionId2)

    if (!version1 || !version2) return null

    const comparison: VersionComparison = {
      added: { nodes: [], edges: [] },
      removed: { nodes: [], edges: [] },
      modified: { nodes: [], edges: [] },
      summary: {
        nodesAdded: 0,
        nodesRemoved: 0,
        nodesModified: 0,
        edgesAdded: 0,
        edgesRemoved: 0,
        edgesModified: 0,
      },
    }

    // Compare nodes
    const nodes1Map = new Map(version1.nodes.map((n) => [n.id, n]))
    const nodes2Map = new Map(version2.nodes.map((n) => [n.id, n]))

    // Find added nodes
    version2.nodes.forEach((node) => {
      if (!nodes1Map.has(node.id)) {
        comparison.added.nodes.push(node)
        comparison.summary.nodesAdded++
      }
    })

    // Find removed nodes
    version1.nodes.forEach((node) => {
      if (!nodes2Map.has(node.id)) {
        comparison.removed.nodes.push(node)
        comparison.summary.nodesRemoved++
      }
    })

    // Find modified nodes
    version1.nodes.forEach((node1) => {
      const node2 = nodes2Map.get(node1.id)
      if (node2 && JSON.stringify(node1) !== JSON.stringify(node2)) {
        comparison.modified.nodes.push({ before: node1, after: node2 })
        comparison.summary.nodesModified++
      }
    })

    // Compare edges (similar logic)
    const edges1Map = new Map(version1.edges.map((e) => [e.id, e]))
    const edges2Map = new Map(version2.edges.map((e) => [e.id, e]))

    version2.edges.forEach((edge) => {
      if (!edges1Map.has(edge.id)) {
        comparison.added.edges.push(edge)
        comparison.summary.edgesAdded++
      }
    })

    version1.edges.forEach((edge) => {
      if (!edges2Map.has(edge.id)) {
        comparison.removed.edges.push(edge)
        comparison.summary.edgesRemoved++
      }
    })

    version1.edges.forEach((edge1) => {
      const edge2 = edges2Map.get(edge1.id)
      if (edge2 && JSON.stringify(edge1) !== JSON.stringify(edge2)) {
        comparison.modified.edges.push({ before: edge1, after: edge2 })
        comparison.summary.edgesModified++
      }
    })

    return comparison
  }

  // Revert to a specific version
  revertToVersion(versionId: string): ConversationVersion | null {
    const version = this.versions.get(versionId)
    if (!version) return null

    // Create a new version based on the reverted version
    const revertedVersion = this.createVersion(
      `Reverted to ${version.name}`,
      `Reverted to version from ${new Date(version.timestamp).toLocaleString()}`,
      version.nodes,
      version.edges,
      false,
    )

    return revertedVersion
  }

  // Delete a version
  deleteVersion(versionId: string): boolean {
    const version = this.versions.get(versionId)
    if (!version) return false

    // Remove from versions map
    this.versions.delete(versionId)

    // Remove from branch
    this.branches.forEach((branch) => {
      branch.versions = branch.versions.filter((v) => v.id !== versionId)
    })

    // Update current version if deleted
    if (this.currentVersionId === versionId) {
      const currentBranch = this.branches.get(this.currentBranchId)
      if (currentBranch && currentBranch.versions.length > 0) {
        this.currentVersionId = currentBranch.versions[currentBranch.versions.length - 1].id
      } else {
        this.currentVersionId = null
      }
    }

    return true
  }

  // Export version data
  exportVersion(versionId: string): string | null {
    const version = this.versions.get(versionId)
    if (!version) return null

    return JSON.stringify(version, null, 2)
  }

  // Import version data
  importVersion(versionData: string, branchId = this.currentBranchId): ConversationVersion | null {
    try {
      const version: ConversationVersion = JSON.parse(versionData)
      version.id = `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` // Generate new ID
      version.timestamp = new Date().toISOString()

      this.versions.set(version.id, version)

      const branch = this.branches.get(branchId)
      if (branch) {
        branch.versions.push(version)
      }

      return version
    } catch (error) {
      return null
    }
  }

  // Get current version
  getCurrentVersion(): ConversationVersion | null {
    return this.currentVersionId ? this.versions.get(this.currentVersionId) || null : null
  }

  // Get current branch
  getCurrentBranch(): VersionBranch | null {
    return this.branches.get(this.currentBranchId) || null
  }

  private generateBranchColor(): string {
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Clear all data
  clear() {
    this.versions.clear()
    this.branches.clear()
    this.currentVersionId = null
    this.currentBranchId = "main"
    this.initializeMainBranch()
  }

  // Export all data for persistence
  exportAll() {
    return {
      versions: Array.from(this.versions.entries()),
      branches: Array.from(this.branches.entries()),
      currentVersionId: this.currentVersionId,
      currentBranchId: this.currentBranchId,
    }
  }

  // Import all data from persistence
  importAll(data: any) {
    if (data.versions) {
      this.versions = new Map(data.versions)
    }
    if (data.branches) {
      this.branches = new Map(data.branches)
    }
    if (data.currentVersionId) {
      this.currentVersionId = data.currentVersionId
    }
    if (data.currentBranchId) {
      this.currentBranchId = data.currentBranchId
    }
  }
}

export const versionManager = new VersionManager()
