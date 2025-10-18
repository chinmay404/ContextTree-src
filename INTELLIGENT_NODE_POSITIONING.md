# Intelligent Node Positioning System

## Overview

The canvas now features an **Intelligent Node Positioning System** that automatically finds the optimal placement for new nodes, preventing overlaps and maintaining a clean, organized layout.

## Features

### 🎯 Smart Position Detection

- **Overlap Prevention**: Automatically detects when a dropped node would overlap with existing nodes
- **Grid Snapping**: Aligns nodes to a 20px grid for clean, professional layouts
- **Viewport Awareness**: Considers the current viewport position when calculating optimal placement

### 🌀 Spiral Search Algorithm

When the initial drop position has conflicts, the system uses an intelligent spiral search pattern:

1. **Initial Check**: First tries the exact drop position (or viewport center)
2. **Spiral Pattern**: Searches outward in a spiral pattern at increasing radii
3. **Multi-Point Sampling**: Tests multiple positions at each radius for optimal placement
4. **Smart Fallback**: If no ideal position found, intelligently offsets from the center

### 📏 Spacing & Layout

- **Minimum Spacing**: 60px between nodes for visual clarity
- **Node Dimensions**: Considers standard node size (280x200px)
- **Grid Alignment**: 20px grid snap for consistent positioning

## How It Works

### Drop Position Flow

```
User drops node
    ↓
Is drop position clear?
    ├─ Yes → Use drop position (snapped to grid)
    └─ No  → Calculate viewport center
                ↓
            Is viewport center clear?
                ├─ Yes → Use viewport center
                └─ No  → Start spiral search
                            ↓
                        Find nearest clear position
                            ↓
                        Place node + Show indicator
```

### Visual Feedback

When intelligent positioning is triggered, users see:

- ✨ **Smart positioning applied!** notification (2 seconds)
- Smooth animation to the calculated position
- Grid-aligned placement for professional appearance

## Code Architecture

### Key Components

#### `calculateIntelligentPosition()`

```typescript
/**
 * @param dropPosition - User's drop position (null for programmatic)
 * @param existingNodes - Current nodes on canvas
 * @returns Optimal position { x, y }
 */
```

**Algorithm Steps:**

1. Define constants (node size, spacing, grid snap)
2. Create overlap detection helper
3. Check drop position validity
4. Calculate viewport center
5. Execute spiral search if needed
6. Return optimal position

### State Management

- `intelligentPositionUsed`: Boolean flag for UI feedback
- Auto-reset after 2 seconds using setTimeout
- Integrates with existing node creation flow

## Usage Examples

### Scenario 1: Clear Drop Area

```
User drops node → No overlap → Use exact position
Visual: Node appears at drop location
```

### Scenario 2: Overlapping Drop

```
User drops node → Overlap detected → Spiral search activated
Visual: "Smart positioning applied!" + Node placed at nearest clear spot
```

### Scenario 3: Dense Canvas

```
User drops node → Multiple overlaps → Extended spiral search
Visual: Node positioned at optimal distance maintaining spacing
```

## Benefits

### For Users

- 🎨 **Cleaner Layouts**: Automatic organization without manual adjustment
- ⚡ **Faster Workflow**: No need to manually reposition overlapping nodes
- 🎯 **Better UX**: Visual feedback confirms intelligent placement
- 📐 **Professional Results**: Grid-aligned, evenly-spaced nodes

### For Developers

- 🔧 **Maintainable**: Well-documented algorithm with clear logic
- 🧪 **Testable**: Pure function with predictable inputs/outputs
- 🔌 **Extensible**: Easy to adjust spacing, grid size, or search pattern
- 🚀 **Performant**: Efficient spiral search with early termination

## Configuration

### Adjustable Constants

```typescript
const NODE_WIDTH = 280; // Expected node width
const NODE_HEIGHT = 200; // Expected node height
const MIN_SPACING = 60; // Minimum gap between nodes
const GRID_SNAP = 20; // Grid alignment size
```

### Spiral Search Parameters

```typescript
const maxRadius = 1000; // Maximum search distance
const pointsInRing = Math.max(8, Math.floor((2 * Math.PI * radius) / 100));
```

## Future Enhancements

### Potential Improvements

- [ ] Machine learning-based position prediction
- [ ] User preference learning (preferred spacing/alignment)
- [ ] Magnetic snap to nearby nodes
- [ ] Auto-arrangement for selected node groups
- [ ] Different search patterns (grid, radial, organic)
- [ ] Respect canvas boundaries/safe zones
- [ ] Integration with auto-layout algorithms

### Advanced Features

- [ ] Collision prediction during drag
- [ ] Real-time position suggestions (ghost preview)
- [ ] Undo/redo for position changes
- [ ] Batch positioning for multiple nodes
- [ ] Smart edge routing based on node positions

## Technical Notes

### Dependencies

- ReactFlow's `screenToFlowPosition()` for coordinate conversion
- Viewport state for center calculation
- Node state for overlap detection

### Performance

- O(n) overlap detection (n = number of existing nodes)
- Early termination in spiral search
- Debounced state updates for smooth UX

### Browser Compatibility

- Modern browsers (ES6+)
- Uses Math functions (cos, sin, PI)
- CSS Grid support for visual indicators

## Troubleshooting

### Common Issues

**Node still overlaps after placement**

- Check NODE_WIDTH/HEIGHT constants match actual rendered size
- Verify MIN_SPACING is sufficient for your use case

**Positioning seems random**

- Ensure viewport state is correctly tracked
- Check that existingNodes array is current

**Performance issues on large canvases**

- Consider reducing maxRadius
- Optimize overlap detection with spatial indexing

## Credits

Implemented with focus on:

- User experience and visual feedback
- Clean, maintainable code architecture
- Extensibility for future enhancements
- Performance and reliability

---

**Version**: 1.0.0  
**Last Updated**: October 17, 2025  
**Component**: `canvas-area-enhanced.tsx`
