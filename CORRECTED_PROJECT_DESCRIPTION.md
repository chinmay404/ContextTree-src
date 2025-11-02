# 🧠 CONTEXTTREE - ACCURATE SYSTEM DESCRIPTION

## Overview
ContextTree is a visual, stateful orchestration layer for multi-LLM conversational workflows. It transforms traditional linear chat into a **tree-structured graph** of message-context relationships, enabling branching, comparison, and context isolation across multiple large language models (LLMs).

---

## 🔹 Core Abstraction: The Conversation Tree (Not Technically a DAG)

### What Your Description Claimed:
> "directed acyclic graph (DAG) of message-context relationships"

### Current Reality:
The system implements a **tree structure** (which is a special case of a DAG), not a full DAG:
- Each **node** represents a conversation branch with multiple messages
- Each **edge** represents parent-child relationships between nodes
- **Structure**: Tree-based (single parent per node), not arbitrary DAG
- **Branching**: Nodes can fork to create multiple child branches

### Actual Implementation:
```typescript
interface NodeData {
  _id: string;
  type: "entry" | "branch" | "context" | "llmCall" | "userMessage";
  chatMessages: ChatMessage[];  // Multiple messages per node
  parentNodeId?: string;        // Single parent reference
  forkedFromMessageId?: string; // Specific message that triggered fork
  model: string;                // LLM model for this node
}
```

**Key Point**: Each node contains a **conversation thread** (multiple messages), not a single message. The tree structure connects these conversation nodes.

---

## ⚙️ FUNCTIONAL MODEL

### 1. **Start Conversation** ✅
- User selects an LLM model and submits a prompt
- System creates an **entry node** with initial conversation
- Messages are stored within the node's `chatMessages` array
- **Status**: ✅ **IMPLEMENTED**

### 2. **Branching (Forking Context)** ✅ (Partially)

**What Your Description Claimed:**
> "At any node, a user can fork — i.e., duplicate the node's context chain"

**Current Reality:**
- ✅ Users **can fork** from any assistant message
- ✅ New branch nodes **inherit parent context** up to the fork point
- ✅ Fork creates **isolated conversation path**
- ⚠️ **BUT**: Context inheritance is implemented through parent-child relationships, not explicit "context chain reconstruction"

**Implementation:**
```typescript
// Fork creates new node with lineage metadata
const newNode = {
  type: "branch",
  parentNodeId: selectedNode,          // Links to parent
  forkedFromMessageId: assistantMsgId, // Specific message
  chatMessages: [],                     // Fresh conversation
  model: selectedForkModel             // Can use different model
};
```

**Status**: ✅ **IMPLEMENTED** (with architectural differences from description)

### 3. **Multi-Model Parallelization** ✅

**What Your Description Claimed:**
> "Users can select different models per branch — e.g., Path A → Llama 3, Path B → DeepSeek, Path C → Mixtral"

**Current Reality:**
- ✅ **FULLY IMPLEMENTED**
- Each node can use a different model
- ✅ Available models: LLaMA 3.3 70B, LLaMA 3.1 8B, Groq Compound, GPT OSS 120B, Gemma 2 9B, DeepSeek R1, Qwen 3 32B, and more
- ⚠️ **Clarification**: Models are accessed via **Groq API** (open-source), not multiple separate provider APIs

**LLM Integration:**
```typescript
// All models routed through unified API endpoint
const LLM_API_URL = process.env.LLM_API_URL;

// Model selection per node
MODEL_PROVIDERS = {
  top: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "groq/compound"],
  meta: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  groq: ["groq/compound", "groq/compound-mini"],
  google: ["gemma2-9b-it"],
  deepseek: ["deepseek-r1-distill-llama-70b"]
};
```

**Status**: ✅ **IMPLEMENTED** (primarily through Groq, not multiple providers)

---

## 🌳 CONTEXT MANAGEMENT ENGINE

### What Your Description Claimed:
> "Context Reconstruction: Rebuilds prompt lineage on any branch dynamically by traversing parent nodes"
> "Context Isolation: Ensures each branch only inherits up to its parent lineage"
> "Auto-Save & Versioning: Every mutation is persisted — creating a reproducible experiment log"

### Current Reality:

#### 1. **Context Management** ✅ (Simplified)
- ✅ Parent-child relationships tracked via `parentNodeId`
- ✅ Fork point tracked via `forkedFromMessageId`
- ⚠️ **BUT**: No explicit "context reconstruction engine" visible in codebase
- Context inheritance is **implicit** through message history, not explicit traversal

#### 2. **Context Isolation** ✅
- ✅ Each branch maintains independent `chatMessages`
- ✅ No cross-branch contamination
- ✅ Isolated conversation state per node

#### 3. **Auto-Save** ✅
```typescript
// Storage service automatically persists changes
storageService.saveCanvas(canvas);
storageService.updateNode(canvasId, nodeId, updates);

// Also persists to backend database
fetch(`/api/canvases/${canvasId}/nodes`, {
  method: "POST",
  body: JSON.stringify(newNode)
});
```

#### 4. **Versioning** ⚠️ (Partially Implemented)
- ✅ Version manager exists (`lib/version-manager.ts`)
- ✅ Supports version creation, branching, comparison, revert
- ⚠️ **BUT**: Not fully integrated into main canvas workflow
- ⚠️ Version history panel exists but appears to be a **separate feature**, not automatic for all changes

**Status**: 
- Context Management: ✅ **IMPLEMENTED** (simplified)
- Auto-Save: ✅ **IMPLEMENTED**
- Version Control: ⚠️ **PARTIALLY IMPLEMENTED** (exists but not fully integrated)

---

## 💬 VISUAL LAYER

### What Your Description Claimed:
> "Each message = node bubble, Arrows = context flow"

### Current Reality:
- ✅ **Nodes** represent conversation branches (not individual messages)
- ✅ **Edges** show parent-child relationships
- ✅ Visual graph using **React Flow** library
- ✅ Drag-and-drop node positioning
- ✅ Multiple node types: Entry, Branch, Context
- ✅ Side-by-side chat panels for viewing conversations

**Visual Features:**
- ✅ Node customization (colors, names, themes)
- ✅ Canvas zoom, pan, and layout persistence
- ✅ Viewport state saving
- ✅ Intelligent node positioning
- ✅ Multi-node selection

**Status**: ✅ **IMPLEMENTED** (with minor conceptual differences)

---

## 🧪 EXPERIMENTATION FEATURES

### What Your Description Claimed:
> "Experiment Mode (Upcoming): A parametric testing system..."
> "Context Linking (Upcoming): Link external data nodes..."

### Current Reality:

#### 1. **Experiment Mode** ❌ **NOT IMPLEMENTED**
- ❌ No parametric testing system
- ❌ No grid search functionality
- ❌ No automated parallel prompt execution
- ✅ Manual branching and comparison possible
- **Status**: ❌ **FEATURE NOT FOUND** (still in "upcoming" state)

#### 2. **Context Linking** ⚠️ (Partial)
- ✅ "Context" node type exists
- ⚠️ **BUT**: No clear external data integration visible
- ⚠️ No document upload or API output linking found
- **Status**: ⚠️ **BASIC STRUCTURE EXISTS** (not fully implemented)

#### 3. **What IS Implemented:**
- ✅ Manual forking and branching
- ✅ Multi-model comparison
- ✅ Export/Import canvas data
- ✅ Canvas notes for documentation
- ✅ Version history (separate feature)

---

## 🔍 COMPARISON: CLAIM vs REALITY

| Feature | Description Claimed | Current Status |
|---------|-------------------|----------------|
| **Structure** | DAG of messages | ✅ Tree of conversation nodes |
| **Branching** | Fork at any node | ✅ Fork from any assistant message |
| **Multi-Model** | Multiple providers | ⚠️ Multiple models via Groq only |
| **Context Reconstruction** | Dynamic traversal engine | ⚠️ Implicit through parent references |
| **Context Isolation** | Guaranteed per branch | ✅ Fully implemented |
| **Auto-Save** | All changes persist | ✅ Fully implemented |
| **Version Control** | Git-like for conversations | ⚠️ Exists but not fully integrated |
| **Visual Graph** | Node = message | ⚠️ Node = conversation branch |
| **Experiment Mode** | Parametric testing | ❌ Not implemented |
| **Context Linking** | External data nodes | ⚠️ Basic structure only |
| **Export/Import** | Reproducible trees | ✅ Fully implemented |

---

## 🧰 TARGET USERS (Accurate)

Your target users section is **accurate**:
1. ✅ Researchers - model comparison, documentation
2. ✅ Developers - prototyping, debugging
3. ✅ Product Teams - testing scenarios, exploring patterns

---

## 💾 TECHNICAL IMPLEMENTATION (Actual Architecture)

### Frontend
- ✅ **React** with Next.js 14
- ✅ **React Flow** for visual graph rendering
- ✅ **TypeScript** for type safety
- ✅ **Tailwind CSS** with shadcn/ui components
- ✅ **localStorage** + **PostgreSQL** for persistence

### Backend
- ✅ **Next.js API Routes** (Node.js runtime)
- ✅ **PostgreSQL** database (via Supabase or direct connection)
- ⚠️ **Single LLM API endpoint** (not multiple provider routing)

### LLM Integration
- ⚠️ **Primary**: Groq API (10+ open-source models)
- ⚠️ **NOT**: Direct OpenAI, Anthropic, Google APIs 
- ✅ Server-side proxy for LLM calls (`/api/llm/route.ts`)

### Data Model
```typescript
CanvasData {
  nodes: NodeData[]      // Conversation branches
  edges: EdgeData[]      // Parent-child connections
  settings: { defaultModel }
  viewportState: { x, y, zoom }
}

NodeData {
  type: "entry" | "branch" | "context"
  chatMessages: ChatMessage[]
  parentNodeId?: string
  forkedFromMessageId?: string
  model: string
}
```

---

## 🧩 THE PHILOSOPHY (Accurate)

Your philosophical description is **spot-on**:
> "ContextTree isn't just about forking chats. It's about preserving reasoning structure — turning every LLM session into data that can be analyzed, compared, and improved."

This **is accurate** and captures the vision well.

---

## 🚧 CURRENT STATE: BETA (Accurate)

Your assessment is correct:
- ✅ Core features live (branching, multi-model, context preservation)
- ✅ Some stability issues may occur
- ✅ Actively collecting user feedback
- ✅ Access: https://contexttree.vercel.app/

---

## 📝 CORRECTED TL;DR

**ContextTree** = Visual conversation tree builder for multi-model LLM interactions

**What it DOES:**
- ✅ Fork conversations at any point
- ✅ Compare multiple LLM models visually
- ✅ Preserve context automatically per branch
- ✅ Export/import conversation trees
- ✅ Visual node-based interface

**What it's NOT (yet):**
- ❌ Full parametric experiment harness
- ❌ Multi-provider LLM routing (uses Groq primarily)
- ❌ External data/document integration
- ⚠️ Full Git-like version control (exists but separate)

**Architecture:**
- Tree structure (not arbitrary DAG)
- Nodes = conversation branches (not individual messages)
- Single LLM API proxy (Groq-based)
- Client-side + server-side hybrid

---

## 🎯 RECOMMENDATIONS

### For Accurate Marketing:
1. Say "conversation **tree**" not "DAG"
2. Say "10+ models via Groq" not "multiple providers"
3. Say "version history available" not "Git-like versioning" (unless you integrate it fully)
4. Mark "Experiment Mode" as **planned feature**
5. Clarify nodes contain **conversation threads**, not single messages

### For Development Priority:
1. ✅ Core branching: **Done**
2. ⚠️ Integrate version history into main workflow
3. ❌ Implement experiment mode (if claimed)
4. ⚠️ Add true multi-provider support (or clarify Groq-only)
5. ❌ External data linking (if claimed)

---

## ✅ CONCLUSION

Your project description captures the **vision and philosophy** excellently, but contains **technical inaccuracies** regarding:
- Current implementation state (DAG vs tree, message vs conversation node)
- LLM provider architecture (single proxy vs multi-provider)
- Version control integration (exists but not primary feature)
- Upcoming features presented as current (experiment mode)

**The core value proposition is accurate:**
> Visual, branching, context-aware multi-model chat interface

Just adjust the technical details to match the actual implementation!
