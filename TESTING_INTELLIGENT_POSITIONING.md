# Testing Intelligent Node Positioning

## How to Test

1. **Open your canvas** in the browser
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Drag a node** from the palette and drop it on the canvas

## What to Look For

### Console Output

You should see logs like:

```
🎯 Node drop detected at position: {x: 234, y: 456}
🎯 calculateIntelligentPosition called {dropPosition: {...}, nodeCount: 3}
✓ Intelligent Positioning: Using snapped drop position {original: {...}, snapped: {...}}
✅ Intelligent position calculated: {x: 240, y: 460}
```

### Visual Indicators

1. **Toast Notification** (top-right):

   - "Node positioned intelligently!" message

2. **Smart Positioning Badge** (bottom-left):
   - Purple gradient badge with sparkle icon
   - Text: "Smart Positioning Active! Node placed intelligently"
   - Appears for 2.5 seconds

### Test Scenarios

#### Test 1: Drop on Empty Area

- Drop a node where there are no other nodes
- Should snap to grid (multiples of 20)
- Console: "Using snapped drop position"

#### Test 2: Drop on Existing Node

- Try to drop a node directly on top of another
- Should automatically move to nearby clear space
- Console: "Overlap detected, searching for better position"
- Console: "Found clear position at radius..."

#### Test 3: Drop in Dense Area

- Create several nodes close together
- Try to drop in the middle
- Should use spiral search to find optimal position
- Console: "Starting spiral search from..."

## Troubleshooting

### Not seeing the indicator?

1. Check console for errors
2. Verify you're dragging from the node palette (not moving existing nodes)
3. Refresh the page and try again

### Position seems wrong?

1. Check viewport zoom level
2. Look for overlap detection logs
3. Verify node dimensions match actual size

### Console logs not appearing?

1. Make sure you're in development mode
2. Clear browser cache
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Expected Behavior

✅ Every new node should show the positioning indicator  
✅ Nodes should snap to 20px grid  
✅ Nodes should never overlap  
✅ Toast notification appears  
✅ Visual badge shows for 2.5 seconds  
✅ Console shows positioning details

## Visual Reference

```
Canvas State BEFORE:
┌─────────────────────────────┐
│                             │
│   [Node A]    [Node B]      │
│                             │
│                             │
│         👆 Drop here        │
│      (overlaps Node A!)     │
└─────────────────────────────┘

Canvas State AFTER:
┌─────────────────────────────┐
│                             │
│   [Node A]    [Node B]      │
│                             │
│   [New Node] ✨             │ ← Intelligently positioned!
│                             │
│   └── "Smart Positioning Active!" badge shown
└─────────────────────────────┘
```

## Success Metrics

- ✨ Badge appears: **YES/NO**
- 🎉 Toast shows: **YES/NO**
- 📝 Console logs: **YES/NO**
- 🎯 No overlaps: **YES/NO**
- 📐 Grid aligned: **YES/NO**

If all are YES, the feature is working perfectly! 🎊
