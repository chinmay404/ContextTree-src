# Tree Layout Feature 🌳

## Overview

The canvas now includes an **automatic tree layout** feature that organizes all your nodes in a hierarchical structure with one click!

## Location

**Top-Left Corner** of the canvas:

```
┌─────────────────────────────────────────┐
│ [Tree Layout] [Effects]       [Palette] │ ← Buttons here
│                                          │
│                                          │
│           Your Canvas                    │
│                                          │
│                                          │
│                            [Shift Help] │
└─────────────────────────────────────────┘
```

## Features

### 🎯 Smart Tree Organization

- **Hierarchical Layout**: Automatically detects parent-child relationships from edges
- **Entry Node Root**: Places entry node at the top of the tree
- **Balanced Distribution**: Centers children under parents
- **Orphan Handling**: Positions disconnected nodes to the side

### 📏 Intelligent Spacing

- **Horizontal Spacing**: 350px between sibling nodes
- **Vertical Spacing**: 250px between parent and child levels
- **Subtree Balancing**: Wider subtrees get more space

### ✨ Visual Feedback

- **Loading Animation**: Shows "Arranging Tree Layout" overlay
- **Smooth Transitions**: Nodes animate to new positions
- **Auto Zoom**: Automatically fits entire tree in view
- **Success Toast**: Confirms when layout is complete

## How to Use

### Step 1: Create Your Nodes

1. Drag nodes from the palette
2. Connect them with edges
3. Build your conversation flow

### Step 2: Apply Tree Layout

1. Click **"Tree Layout"** button (top-left)
2. Watch the magic happen!
3. Tree organizes automatically

### Step 3: Enjoy Clean Layout

- Entry node at top
- Children arranged below
- Balanced and centered
- Professional appearance

## Layout Algorithm

### How It Works

```
1. Find Root Node
   └─> Entry node OR node with no parents

2. Build Tree Structure
   └─> Parse edges to create parent-child map

3. Calculate Positions
   ├─> Root at top center
   ├─> For each node level:
   │   ├─> Calculate total width needed
   │   ├─> Center children under parent
   │   └─> Distribute evenly
   └─> Repeat recursively

4. Handle Orphans
   └─> Place disconnected nodes to the right

5. Apply & Animate
   ├─> Update node positions
   ├─> Save to backend
   ├─> Fit viewport
   └─> Show success
```

### Example Structure

**Before:**

```
Random scattered nodes:
  [A]        [C]

     [B]  [D]
```

**After Tree Layout:**

```
Hierarchical structure:
         [Entry]
           |
    ┌──────┼──────┐
    |      |      |
  [A]    [B]    [C]
           |
         [D]
```

## Visual States

### 1. Ready State

```typescript
Button: "🌐 Tree Layout"
Color: White with border
Status: Clickable
```

### 2. Processing State

```typescript
Button: "⏳ Arranging..."
Overlay: "Arranging Tree Layout"
         "Organizing nodes hierarchically..."
Color: Purple gradient overlay
Status: Disabled (in progress)
```

### 3. Complete State

```typescript
Toast: "Nodes arranged in tree layout!"
Viewport: Auto-fitted to show entire tree
Duration: 800ms animation
```

## Configuration

### Spacing Constants

```typescript
HORIZONTAL_SPACING = 350; // Space between siblings
VERTICAL_SPACING = 250; // Space between levels
ROOT_X = 400; // Root node X position
ROOT_Y = 100; // Root node Y position
```

### Animation Settings

```typescript
Duration: 800ms            // Fit view animation
Padding: 0.2               // 20% viewport padding
Toast Duration: 2000ms     // Success message
```

## Use Cases

### 1. Initial Organization

**Scenario**: You've created many nodes randomly
**Solution**: Click "Tree Layout" to organize them instantly

### 2. After Adding Nodes

**Scenario**: Added new nodes that disrupted layout
**Solution**: Re-run tree layout to reorganize

### 3. Presentation Mode

**Scenario**: Showing your flow to others
**Solution**: Tree layout creates professional structure

### 4. Complex Hierarchies

**Scenario**: Deep conversation trees with many branches
**Solution**: Algorithm handles any depth automatically

## Edge Cases Handled

✅ **No Edges**: Arranges nodes in grid pattern  
✅ **Multiple Roots**: Uses entry node or first node  
✅ **Circular References**: Prevents infinite loops  
✅ **Orphan Nodes**: Places separately on right side  
✅ **Empty Canvas**: Button disabled (no nodes)  
✅ **Single Node**: Centers it in viewport

## Keyboard Shortcuts

Currently: Click button only  
Future: Consider adding `Ctrl+L` or `Cmd+L` shortcut

## Tips for Best Results

### 💡 Tip 1: Clear Entry Point

- Always have one entry node
- It becomes the root of your tree
- Gives clear starting point

### 💡 Tip 2: Logical Connections

- Connect parent to child nodes
- Create clear flow direction
- Avoid circular connections

### 💡 Tip 3: Rerun Anytime

- Safe to click multiple times
- Reorganizes based on current edges
- Non-destructive operation

### 💡 Tip 4: Zoom Out First

- See the full structure
- Appreciate the organization
- Easier to navigate

## Technical Details

### API Endpoint

```typescript
PATCH /api/canvases/:canvasId/layout
Body: {
  nodes: [
    { id: "node1", position: { x: 400, y: 100 } },
    { id: "node2", position: { x: 250, y: 350 } },
    ...
  ]
}
```

### State Management

```typescript
// Local state update
setNodes(updatedNodes);

// Backend persistence
fetch('/api/canvases/:id/layout', { ... });

// Local storage sync
storageService.saveCanvas(nextCanvas);
```

### Performance

- **Fast**: O(n) tree traversal
- **Efficient**: Batch position updates
- **Smooth**: CSS transitions for movement
- **Scalable**: Handles 100+ nodes easily

## Troubleshooting

### Button Not Visible?

- Check top-left corner
- It's next to the "Effects" button
- May be hidden if window too small

### Button Disabled?

- **Reason 1**: No nodes on canvas
- **Reason 2**: Currently arranging
- **Solution**: Add nodes first

### Layout Looks Wrong?

- **Issue**: Unexpected structure
- **Cause**: Might have circular edges
- **Fix**: Review and fix connections

### Nodes Overlapping?

- **Rare**: Algorithm prevents this
- **If occurs**: Increase spacing constants
- **Workaround**: Manually adjust after

### Animation Stuttering?

- **Cause**: Many nodes (100+)
- **Fix**: Normal, waits for backend save
- **Note**: One-time occurrence per layout

## Future Enhancements

### Planned Features

- [ ] Multiple layout algorithms (radial, force-directed)
- [ ] Custom spacing controls
- [ ] Horizontal tree option
- [ ] Undo/redo for layouts
- [ ] Save favorite layouts
- [ ] Layout presets by use case
- [ ] Keyboard shortcuts
- [ ] Layout constraints/rules

### Advanced Options (Potential)

- [ ] Compact mode (tighter spacing)
- [ ] Wide mode (more breathing room)
- [ ] Custom root node selection
- [ ] Freeze certain nodes in place
- [ ] Align by node types
- [ ] Group by metadata

## Comparison with Manual Layout

| Aspect           | Manual Layout    | Tree Layout    |
| ---------------- | ---------------- | -------------- |
| **Time**         | 5-10 minutes     | 1 second       |
| **Consistency**  | Varies           | Always perfect |
| **Spacing**      | Approximate      | Exact pixels   |
| **Balance**      | Hard to achieve  | Automatic      |
| **Maintenance**  | Re-do each time  | One click      |
| **Professional** | Depends on skill | Always clean   |

## Examples

### Example 1: Simple Chat Flow

```
Before:
[Entry] → [Bot1] → [User1] → [Bot2]
(all scattered randomly)

After Tree Layout:
       [Entry]
          |
       [Bot1]
          |
       [User1]
          |
       [Bot2]
(perfectly aligned vertically)
```

### Example 2: Branching Conversation

```
Before:
Nodes randomly placed

After Tree Layout:
         [Entry]
            |
    ┌───────┼───────┐
    |       |       |
  [Yes]   [No]   [Maybe]
    |       |
 [Thank] [Retry]
```

### Example 3: Complex Tree

```
         [Entry Point]
              |
      ┌───────┴───────┐
      |               |
  [Branch A]      [Branch B]
      |               |
  ┌───┴───┐       ┌───┴───┐
  |       |       |       |
[A1]    [A2]    [B1]    [B2]
  |                       |
[A1-1]                  [B2-1]
```

## Success Metrics

After clicking Tree Layout, you should see:

✅ **All connected nodes** in hierarchical structure  
✅ **Entry node** at the top  
✅ **Children** centered under parents  
✅ **Even spacing** throughout  
✅ **No overlaps** between nodes  
✅ **Viewport** auto-fitted to show all  
✅ **Toast notification** confirming success  
✅ **Smooth animation** to new positions

## Console Output

When you click the button, you'll see:

```
🌳 Starting tree layout arrangement...
🎯 Root node: node_12345
📍 Positioned node_12345 at (400, 100)
📍 Positioned node_67890 at (250, 350)
...
✅ Tree layout complete!
```

---

**Quick Start**: Just click the "🌐 Tree Layout" button in the top-left corner!

**Version**: 1.0.0  
**Last Updated**: October 17, 2025
