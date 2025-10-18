# Canvas Layout Guide - Quick Reference

## Current Button Positions ✨

```
┌───────────────────────────────────────────────────────────┐
│                                                            │
│  TOP-LEFT:                              TOP-RIGHT:        │
│  • Tree Layout Button                   • Node Palette    │
│  • Effects Toggle                         (Drag nodes)    │
│                                                            │
│                                                            │
│                    CANVAS AREA                             │
│              (Drop nodes here)                             │
│                                                            │
│                                                            │
│  BOTTOM-LEFT:                        BOTTOM-RIGHT:        │
│  (Reserved)                          • Shift Help         │
│                                      • Smart Position     │
│                                        Badge (when active)│
└───────────────────────────────────────────────────────────┘
```

## Button Details

### 🌐 Tree Layout Button

**Location**: Top-left corner  
**Text**: "Tree Layout" with Network icon  
**States**:

- Normal: White button with border
- Processing: "Arranging..." with spinner
- Disabled: Grayed out (no nodes)

**What it does**: Automatically arranges all nodes in hierarchical tree structure

### ✨ Effects Toggle

**Location**: Top-left, next to Tree Layout  
**Text**: "Enable/Disable Effects"  
**Function**: Toggle background animations and edge animations

### 📦 Node Palette

**Location**: Top-right corner  
**Content**: Draggable node types

- Entry Point
- Branch
- Context

### ⌨️ Shift Tooltip

**Location**: Bottom-right corner  
**Text**: "Shift + Click or Drag to select multiple nodes"  
**Always visible**: Yes

### 🎨 Smart Positioning Badge

**Location**: Bottom-right, above Shift tooltip  
**Visibility**: Only when positioning new nodes  
**Duration**: 2.5 seconds  
**Text**: "Smart Positioning Active! Node placed intelligently"

## No Overlaps! ✅

All UI elements are positioned to avoid conflicts:

- Buttons on LEFT side (top)
- Palette on RIGHT side (top)
- Help text on RIGHT side (bottom)
- Smart badge on RIGHT side (above help)

## Z-Index Layers

```
Layer 50: Smart Positioning Badge, Overlay Animations
Layer 40: Node Palette
Layer 10: Buttons, Help Tooltip
Layer 0:  Canvas, Nodes, Edges
```

## Responsive Behavior

All elements use absolute positioning with:

- Consistent padding (4px = 1rem)
- Backdrop blur effects
- Shadow for depth
- Rounded corners
- Semi-transparent backgrounds

## Color Scheme

### Tree Layout Button

- **Default**: White bg, slate border
- **Hover**: Indigo border highlight
- **Active**: Indigo gradient overlay (full screen)

### Smart Positioning Badge

- **Background**: Blue → Indigo → Purple gradient
- **Text**: White
- **Border**: White 30% opacity

### Shift Help

- **Background**: White 95% opacity
- **Text**: Slate-600
- **Border**: Slate-200 80% opacity

---

**Everything is visible and non-overlapping!** 🎉
