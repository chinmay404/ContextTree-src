# Multi-Node Selection and Drag Guide

## Overview

ContextTree now supports selecting and moving multiple nodes simultaneously, making it easier to reorganize your canvas layouts efficiently.

## Features

### 1. **Multi-Node Selection**

Select multiple nodes at once using keyboard modifiers:

- **Shift + Click**: Add or remove individual nodes from selection (chat panel won't open)
- **Shift + Drag**: Draw a selection box to select multiple nodes at once

### 2. **Multi-Node Dragging**

Once you have multiple nodes selected:

- Click and drag any selected node
- All selected nodes will move together, maintaining their relative positions
- Release to drop all nodes in their new positions

### 3. **Visual Feedback**

- Selected nodes display a blue border/outline
- All selected nodes highlight when hovering over any of them
- Selection box appears when dragging to select
- Chat panel only opens on normal click (without Shift)

## How to Use

### Selecting Multiple Nodes

#### Method 1: Click Selection (Shift + Click)

1. Hold down the **Shift** key
2. Click on the first node you want to select
3. While still holding **Shift**, click on additional nodes
4. Each clicked node will be added to your selection
5. Click a selected node again while holding **Shift** to deselect it

#### Method 2: Box Selection (Shift + Drag)

1. Hold down the **Shift** key
2. Click and drag on an empty area of the canvas
3. A selection box will appear
4. All nodes touched by the box will be selected when you release
5. Release the mouse button to complete the selection

### Moving Multiple Nodes

1. Select multiple nodes using either method above
2. Click and hold on any of the selected nodes
3. Drag to move all selected nodes together
4. Release the mouse button to place the nodes
5. The new positions are automatically saved

### Deselecting Nodes

- **Click empty canvas area**: Deselects all nodes
- **Shift + Click selected node**: Removes that node from selection
- **Click on a single unselected node**: Clears selection and selects only that node

## Keyboard Shortcuts

| Action           | Shortcut                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Add to selection | Shift + Click                                                               |
| Box select       | Shift + Drag                                                                |
| Deselect all     | Click empty area                                                            |
| Pan canvas       | Middle mouse button drag OR Left/Right mouse button drag (when not on node) |

## Tips & Best Practices

1. **Organizing Related Nodes**: Select all nodes in a logical group and move them together to reorganize your flow

2. **Maintaining Layout**: Use multi-select to move entire sections of your canvas while preserving the relative positions of nodes

3. **Quick Reorganization**: Box select a region and move it to make room for new nodes

4. **Precision Placement**:

   - Select nodes individually for precise control
   - Use box select for quick bulk operations

5. **Pan vs Select**:
   - Left-click drag on empty space (without Shift) = Pan canvas
   - Left-click drag with Shift = Box select
   - Middle mouse or right mouse drag = Pan canvas

## Technical Details

### Implementation

- Uses ReactFlow's built-in multi-selection support
- `multiSelectionKeyCode`: "Shift" - enables Shift key for multi-selection
- `selectionKeyCode`: "Shift" - enables box selection with Shift key
- `selectNodesOnDrag`: true - allows box selection by dragging
- `panOnDrag`: [1, 2] - enables panning with middle and right mouse buttons

### Auto-Save

- All position changes are automatically saved when you release the drag
- Works for both single and multi-node movements
- Changes sync to the backend automatically

## Troubleshooting

**Q: The chat panel opens when I Shift+Click on a node**

- This has been fixed! Shift+Click now properly adds nodes to selection without opening the chat panel
- Make sure you're using the latest version of the code

**Q: My nodes aren't selecting with Shift+Click**

- Make sure you're clicking directly on the node
- Ensure you're holding Shift before clicking
- Try refreshing the page if the issue persists

**Q: Box selection isn't working**

- Hold Shift before starting to drag
- Make sure you're dragging on an empty area of the canvas
- The selection box should appear as you drag

**Q: Nodes move individually instead of together**

- Verify that multiple nodes are selected (they should have a blue outline)
- Click on a selected node to drag them all

**Q: Canvas pans when I try to box select**

- Make sure you're holding the Shift key
- Start dragging from an empty area, not from a node

## Future Enhancements

- [ ] Ctrl+A to select all nodes
- [ ] Ability to group nodes permanently
- [ ] Align and distribute tools for selected nodes
- [ ] Copy/paste multiple selected nodes
- [ ] Delete multiple selected nodes at once

---

**Version**: 1.0.0
**Last Updated**: October 17, 2025
