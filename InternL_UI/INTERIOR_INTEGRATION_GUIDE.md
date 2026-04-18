# Interior UI Integration Guide

This guide shows how to drop the Atelier interior into your existing ContextTree app. Four files to integrate:

- `atelier.css` — design tokens & ReactFlow overrides
- `atelier-nodes.tsx` — Entry, Branch, Context nodes
- `atelier-edge.tsx` — custom edge
- `AtelierChatPanel.tsx` — chat panel reference implementation

---

## Step 1 — Drop in the CSS

Open `app/globals.css` and append the contents of `atelier.css` at the bottom.

Do **not** remove anything you already have. The Atelier tokens are namespaced with `--at-` prefix so they won't collide with your existing `--color-*` tokens.

## Step 2 — Place the node components

```
components/
  nodes/
    atelier-nodes.tsx   ← new (drop this in)
    entry-node-minimal.tsx    ← keep for now; will be replaced in canvas-area
    branch-node-minimal.tsx
    context-node-minimal.tsx
  edges/
    atelier-edge.tsx    ← new
    custom-edge-minimal.tsx   ← keep for now
```

## Step 3 — Update canvas-area.tsx

In your `components/canvas-area.tsx`, swap the node types registry:

**Before:**
```tsx
import { EntryNodeMinimal as EntryNode } from "./nodes/entry-node-minimal";
import { BranchNodeMinimal as BranchNode } from "./nodes/branch-node-minimal";
import { ContextNodeMinimal as ContextNode } from "./nodes/context-node-minimal";
import { CustomEdgeMinimal as CustomEdge } from "./edges/custom-edge-minimal";

const nodeTypes = {
  entry: EntryNode,
  branch: BranchNode,
  context: ContextNode,
  // ...others
};
const edgeTypes = { custom: CustomEdge };
```

**After:**
```tsx
import {
  EntryNodeAtelier,
  BranchNodeAtelier,
  ContextNodeAtelier,
} from "./nodes/atelier-nodes";
import { AtelierEdge } from "./edges/atelier-edge";

const nodeTypes = {
  entry: EntryNodeAtelier,
  branch: BranchNodeAtelier,
  context: ContextNodeAtelier,
  group: GroupNode,              // keep your existing group node for now
  externalContext: ExternalContextNode,  // keep your existing
};
const edgeTypes = { custom: AtelierEdge };
```

## Step 4 — Add the Atelier class to the canvas container

Find the `<ReactFlow>` component or its wrapper. Add `atelier-canvas` as a className:

```tsx
<div className="atelier-canvas relative h-full w-full">
  <ReactFlow
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}
    edgeTypes={edgeTypes}
    // ...
  >
    <Background variant={BackgroundVariant.Dots} gap={24} size={0} color="transparent" />
    {/* ^ Hide ReactFlow's default dot background — we're using CSS grid now */}

    <Controls />
    <MiniMap
      nodeStrokeColor={(n) => {
        if (n.type === "entry") return "#2D5F3F";
        if (n.type === "branch") return "#C97B2F";
        if (n.type === "context") return "#4338CA";
        return "#6B7280";
      }}
      nodeColor={(n) => {
        if (n.type === "entry") return "#2D5F3F";
        if (n.type === "branch") return "#C97B2F";
        if (n.type === "context") return "#4338CA";
        return "#9CA3AF";
      }}
      maskColor="rgba(45, 95, 63, 0.08)"
    />
  </ReactFlow>
</div>
```

## Step 5 — Update your edge creation to pass edgeType

Wherever you create edges (forking, connecting nodes), pass an `edgeType` in the data:

```tsx
const newEdge: EdgeData = {
  _id: genId("edge"),
  from: sourceId,
  to: targetId,
  type: "custom",
  data: {
    edgeType: isBranch ? "branch" : "main",
    //       ^ "main" | "branch" | "context"
  },
};
```

If you don't pass `edgeType`, it defaults to `"main"` (moss green).

## Step 6 — Chat panel integration

The `AtelierChatPanel.tsx` is a **reference implementation** showing the visual language. Your existing `chat-panel.tsx` has complex state management (message loading, caching, fork events, text-selection handling) that I didn't try to rewrite.

**Two integration paths, pick one:**

### Path A (faster) — apply Atelier styles to your existing chat panel

Keep your existing `chat-panel.tsx`, just restyle it. Find each of these elements and replace the styling:

| Element | What to change |
|---|---|
| Outer container | `background: var(--at-paper-soft)`, `border-left: 1px solid var(--at-paper-edge)` |
| Header title | Fraunces 400, 17px |
| "Conversing with" label | Fraunces italic 11px, ink-muted |
| User message bubble | paper background, `border-radius: 10px 2px 10px 10px`, paper-edge border |
| AI message bubble | paper-soft background, `border-radius: 2px 10px 10px 10px`, no shadow |
| Input textarea | transparent, no border, hairline amber line appears on focus |
| Send button | moss-green solid, `36×36`, paper-colored icon |
| Model picker | `atelier-chip` class |

### Path B (cleaner) — replace your chat panel with AtelierChatPanel

Wrap your existing chat logic in the new component:

```tsx
// components/chat-panel-atelier-wrapper.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import AtelierChatPanel, { type Message } from "./AtelierChatPanel";
import { storageService } from "@/lib/storage";
import { ALL_MODELS, getDefaultModel } from "@/lib/models";

export function ChatPanelAtelierWrapper({
  selectedNode,
  selectedNodeName,
  selectedCanvas,
  onClose,
}: {
  selectedNode: string | null;
  selectedNodeName?: string;
  selectedCanvas?: string | null;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel());
  const [isStreaming, setIsStreaming] = useState(false);

  // Plug your existing message loading, sending, forking logic here
  // ...

  const handleSend = useCallback(async (content: string) => {
    // Your existing send logic
  }, [selectedNode, selectedCanvas]);

  const handleFork = useCallback((messageId: string) => {
    // Your existing fork logic
  }, []);

  if (!selectedNode) {
    return <div>No node selected</div>;
  }

  return (
    <AtelierChatPanel
      nodeName={selectedNodeName || "Untitled"}
      nodeType="branch"  // derive from your canvas data
      messages={messages}
      selectedModel={selectedModel}
      availableModels={ALL_MODELS}
      onSendMessage={handleSend}
      onForkFromMessage={handleFork}
      onModelChange={setSelectedModel}
      onClose={onClose}
      isStreaming={isStreaming}
    />
  );
}
```

I recommend **Path A** — it takes 2-3 hours instead of 1-2 days. Path B is cleaner long-term but a bigger refactor.

---

## Visual verification — what to look for

After integration, your canvas should look radically different:

- **Background**: warm off-white (#FBF9F4) with a faint grid, not pure white
- **Entry nodes**: white paper cards with a 3px moss-green ribbon on the left, Fraunces italic "Main thread" label
- **Branch nodes**: slightly darker paper cards with a 2px amber ribbon, "Branch · 02 ↳ from Main"
- **Context nodes**: cross-hatched paper cards with a 2px indigo ribbon, "Reference · PDF"
- **Edges**: moss-green solid for main thread, amber dashed for branches, indigo dotted for context
- **Controls**: a single horizontal bar in the bottom-right, paper-colored, thin border
- **Minimap**: paper-soft background with colored dots by node type

**The one-sentence test:** when you open the app, does it feel like the same brand as the landing page? If yes, you nailed it. If it still feels like a Vercel admin panel, something's off.

---

## Troubleshooting

**Q: My nodes are still using the old dark-gradient styling.**
Check `nodeTypes` registry in `canvas-area.tsx`. Make sure you're importing `EntryNodeAtelier` etc., not `EntryNodeMinimal`.

**Q: The ReactFlow controls look unchanged.**
The CSS overrides use `!important` but only apply if `atelier.css` is loaded. Verify it's imported in `globals.css` and that the `.atelier-canvas` class wraps your ReactFlow.

**Q: The grid background doesn't show.**
Make sure the `.atelier-canvas` wrapper is the positioned parent. ReactFlow adds its own background that can cover yours. In `<Background>` use `color="transparent"` and `size={0}`.

**Q: Fraunces isn't loading in the nodes.**
Ensure you've added Fraunces to your root layout (as per the earlier integration guide). In nodes, we reference it via `var(--at-font-serif)`, which falls back to Georgia if Fraunces isn't available — so the design still works, just less distinctively.

**Q: The handles (connection dots) don't appear on hover.**
The handle class uses `group-hover` — make sure the parent `<NodeCard>` has the `group` class (it does in the provided code, but custom modifications might break it).

**Q: My existing nodes have custom colors (user-set via themes).**
Current nodes accept `color`, `textColor`, `dotColor` props for user customization. The Atelier nodes ignore these by design — the whole point is a cohesive single aesthetic. If you want to preserve user theming, either: (a) drop the customization feature as I'd recommend, or (b) gate the Atelier styling behind a "classic mode" toggle and keep the themed nodes available.

---

## What this unlocks

Once the interior matches the landing page brand, you can:

1. **Screenshot-worthy product** — every view of the product is a potential social share. Right now the dark-slate interior doesn't photograph well; the Atelier will.
2. **Consistent brand identity** — landing + app + marketing emails + docs all share the same language.
3. **Calm attention** — warm paper and moss green are literally easier on the eyes for long sessions than cold blue-gray. Users will stay in the app longer.
4. **Differentiation** — nobody else in the AI tool space looks like this. You're the only "academic notebook" AI product.

---

## What's intentionally NOT in this update

- Onboarding flow
- Settings / preferences page
- User profile UI
- Shared / collaborative UI
- Mobile app version
- Landing auth pages (signin/signup) — these should match the landing page, not the Atelier interior

These can follow later using the same token system.

---

## Final nudge

Ship this even if imperfect. 80% of the value is in the paper background + new node designs + edge colors. Those can be done in a weekend.

Polish (spring bounces, flow dots, command palette) can follow in week 2-3.

**What matters now:** someone lands on the homepage, clicks "Start learning free," logs in, and thinks *"oh — it's the same place."* That's the bar. Hit it, and everything else is iteration.
