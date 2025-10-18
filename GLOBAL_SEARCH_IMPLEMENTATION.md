# Global Search Implementation Guide

## 🔍 Overview

A comprehensive, advanced search functionality has been implemented that allows users to search across **all canvases, nodes, models, and CHAT CONVERSATIONS** in the ContextTree application. The search is integrated with the top navigation bar and features keyboard shortcuts, smart navigation, and real-time results with **PRIORITY on chat message content**.

---

## ✨ Features Implemented

### 1. **Comprehensive Search Scope**

- **🔥 CHAT MESSAGES** (HIGHEST PRIORITY): Search through all conversation content
- **Canvas Titles**: Search by canvas name
- **Node Labels**: Search by node names
- **Model Names**: Search by LLM model (e.g., "gpt-oss-120b", "deepseek")
- **Smart Matching**: Shows all nodes in a canvas when canvas title matches

### 2. **Advanced Search Capabilities**

#### **Intelligent Result Ranking with Chat Priority**

Results are sorted by relevance with **chat messages as the highest priority**:

1. **🔥 CHAT MATCHES FIRST** (Most important - where you find actual conversation content)
   - Multiple matches show count (e.g., "Chat (3)" means 3 messages matched)
   - Shows preview snippet of the matched message
   - Highlighted in orange for visibility
2. **Exact matches** (node/canvas name exactly matches query)
3. **Label matches** (node names containing query)
4. **Canvas title matches** (showing all nodes in that canvas)
5. **Model matches** (nodes using specific models)
6. **Recent items** (sorted by last modified date)

#### **Visual Search Results**

Each result shows:

- **Node icon** (color-coded by type: Entry=blue, Branch=emerald, Context=violet)
- **Node label** (truncated if long)
- **Match type badge** (🔥 Chat=orange [MOST IMPORTANT], Canvas/Node/Model with color coding)
- **Message count** for chat matches (e.g., "Chat (3)")
- **Canvas location** (which canvas the node is in)
- **Model name** (LLM model used)
- **Preview text** (contextual information or chat snippet with orange highlight)

### 3. **Keyboard Navigation**

| Shortcut        | Action                      |
| --------------- | --------------------------- |
| `⌘K` / `Ctrl+K` | Open search dialog          |
| `↑` Arrow Up    | Navigate to previous result |
| `↓` Arrow Down  | Navigate to next result     |
| `Enter`         | Navigate to selected result |
| `Esc`           | Close search dialog         |

### 4. **Smart Navigation**

When you select a search result:

1. **Switches to the target canvas** automatically
2. **Selects the target node** in the canvas
3. **Opens the chat panel** for that node
4. **Closes the search dialog** smoothly
5. **Updates the UI** to reflect the selection

---

## 🎨 Design & UX

### Visual Design

- **Slate color scheme** matching the app aesthetic
- **Rounded-xl** corners for modern look
- **Shadow-2xl** on dialog for depth
- **Hover states** with smooth transitions
- **Selected state** with left border accent
- **Color-coded badges** for match types

### User Experience

- **Real-time search** (no submit button needed)
- **Instant results** as you type
- **Empty state** with helpful instructions
- **No results state** with suggestions
- **Result count** displayed in footer
- **Keyboard-first** design for power users

### Responsive Design

- **Mobile-friendly** dialog sizing
- **Scrollable results** with max height
- **Touch-friendly** click targets
- **Adaptive layout** for different screens

---

## 🚀 How to Use

### Opening Search

**Method 1: Keyboard Shortcut**

```
Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
```

**Method 2: Click Search Button**
Click the "Search" button in the top navbar (shows ⌘K hint)

### Searching

1. **Type your query** in the search input
2. **Results appear instantly** as you type
3. **Use arrow keys** to navigate results
4. **Press Enter** or **click a result** to navigate

### Search Examples

- `"authentication"` - Find chat conversations about authentication (PRIORITY)
- `"error"` - Find all chat messages mentioning errors (PRIORITY)
- `"how to"` - Find conversations with "how to" questions (PRIORITY)
- `"My Canvas"` - Find all nodes in "My Canvas"
- `"Entry Point"` - Find all Entry Point nodes
- `"gpt-oss"` - Find all nodes using GPT models
- `"deepseek"` - Find all nodes using DeepSeek models
- `"Branch"` - Find all branch nodes

---

## 📁 Files Created/Modified

### New Files

- `/components/global-search.tsx` - Main search component (350+ lines)

### Modified Files

- `/app/page.tsx` - Integrated search with:
  - Import statement for GlobalSearch
  - State management (`isSearchOpen`)
  - Keyboard shortcut handler (Cmd/Ctrl+K)
  - Navigation handler (`handleSearchNavigate`)
  - Search button click handler
  - GlobalSearch component rendering

---

## 🔧 Technical Implementation

### Search Algorithm

```typescript
// Comprehensive matching with CHAT PRIORITY
Priority 1: Chat message content matches → HIGHEST PRIORITY
  - Searches through all chatMessages in node.data.chatMessages
  - Shows preview snippet with context (30 chars before/after match)
  - Displays message count if multiple matches
  - Highlighted in orange

Priority 2: Canvas title matches → Show all nodes in that canvas
Priority 3: Node label matches → Show that specific node
Priority 4: Model name matches → Show nodes using that model

// Ranking priority
1. Chat matches (ALWAYS FIRST, sorted by message count)
2. Exact matches (label/title === query)
3. Match type (label > title > model > content)
4. Last modified date (newer first)
```

### Navigation Flow

```typescript
handleSearchNavigate(canvasId, nodeId) {
  1. Switch to target canvas
  2. Wait 100ms for canvas to load
  3. Select target node
  4. Set node name for chat panel
  5. Close search dialog
}
```

### Performance Optimizations

- **useMemo** for search results (prevents unnecessary recalculations)
- **Debounced rendering** with keyboard navigation
- **Efficient filtering** using native JavaScript methods
- **Smart re-rendering** only when needed

---

## 🎯 Use Cases

### 1. **Finding Chat Conversations** (MOST POWERFUL)

_"I remember discussing authentication errors in a chat but can't remember which node."_

→ Search for "authentication error" and see all chat messages containing those words, with previews and the exact node location.

### 2. **Finding Debugging Conversations**

_"Where did I discuss that bug fix?"_

→ Search for "bug fix" to find all chat conversations mentioning it.

### 3. **Finding a Specific Node**

_"I remember creating a node called 'User Authentication' but can't remember which canvas it's in."_

→ Search for "User Authentication" and jump directly to it.

### 2. **Finding All Nodes Using a Model**

_"Which nodes am I using DeepSeek for?"_

→ Search for "deepseek" to see all nodes using that model.

### 3. **Quick Canvas Switching**

_"I need to switch to my 'E-commerce Flow' canvas."_

→ Search for "E-commerce" and select any node to switch to that canvas.

### 4. **Workflow Exploration**

_"What branch nodes do I have in my project?"_

→ Search for "branch" to see all branch-type nodes across all canvases.

---

## 🎨 UI Components Used

- **Dialog** - shadcn/ui dialog for modal overlay
- **Input** - shadcn/ui input for search field
- **Badge** - shadcn/ui badge for match type indicators
- **ScrollArea** - shadcn/ui scroll area for results list
- **Icons** - Lucide React icons (Search, FileText, GitBranch, etc.)

---

## 🔮 Future Enhancements (Possible)

### Search Features

- [ ] **Fuzzy matching** - Find results even with typos
- [ ] **Search filters** - Filter by node type, model, date
- [ ] **Search history** - Remember recent searches
- [ ] **Favorites** - Pin frequently accessed nodes

### Navigation Features

- [ ] **Breadcrumb trail** - Show path to selected node
- [ ] **Recent navigation** - Quick access to recently visited nodes
- [ ] **Canvas preview** - Mini preview of canvas on hover

### Performance

- [ ] **Search indexing** - Pre-index content for faster search
- [ ] **Virtual scrolling** - Handle thousands of results
- [ ] **Background search** - Search while typing without blocking UI

---

## 🐛 Troubleshooting

### Search not opening?

- Check if Cmd/Ctrl+K is being captured by browser
- Try clicking the Search button in navbar
- Check browser console for errors

### Results not showing?

- Verify canvases are loaded (`canvases` array has data)
- Check if search query is being trimmed correctly
- Ensure nodes have labels (not empty)

### Navigation not working?

- Verify `selectedCanvas` state is updating
- Check if canvas loads before node selection
- Ensure 100ms timeout is sufficient for canvas load

---

## ✅ Testing Checklist

- [x] Search opens with Cmd/Ctrl+K
- [x] Search opens with button click
- [x] Results appear as you type
- [x] Arrow keys navigate results
- [x] Enter navigates to selected result
- [x] Clicking result navigates correctly
- [x] Canvas switches properly
- [x] Node gets selected
- [x] Search closes after navigation
- [x] Empty state shows correctly
- [x] No results state shows correctly
- [x] Keyboard shortcuts work
- [x] Responsive on mobile

---

## 📊 Stats

- **Lines of Code**: ~350 in global-search.tsx
- **Search Scope**: All canvases + All nodes + All models
- **Keyboard Shortcuts**: 5 (Open, Up, Down, Enter, Esc)
- **Match Types**: 4 (Title, Label, Model, Content)
- **Result Sorting**: 3 levels (Exact, Type, Date)

---

## 🎉 Conclusion

The global search functionality provides a **powerful, intuitive way** to navigate your ContextTree workspace. With **keyboard-first design**, **intelligent ranking**, and **seamless navigation**, you can now find and jump to any node in seconds, no matter how large your project becomes.

**Happy Searching!** 🔍✨
