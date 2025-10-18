# Node Color Customization Guide

## Overview

Node colors are now fully customizable with a minimal and clean UI that matches our aesthetic philosophy. Users can easily personalize their nodes with curated color themes.

## Features

### ✨ Minimal Color Picker

- **13 Curated Color Presets**: Carefully selected colors that match the app's clean design
- **Coordinated Themes**: Each preset includes matching background, text, and accent colors
- **Live Preview**: See changes immediately before applying
- **One-Click Selection**: Simple grid layout for quick theme selection

### 🎨 Color Palette Categories

#### Ultra-Minimal Grays (Default)

- **Pearl** - Soft white with subtle gray tones
- **Silk** - Clean slate background
- **Mist** - Light gray for understated elegance

#### Subtle Blues

- **Ice** - Cool, refreshing light blue
- **Sky** - Serene sky blue tones

#### Soft Purples

- **Lavender** - Gentle purple hues
- **Violet** - Rich yet subtle purple

#### Gentle Greens

- **Mint** - Fresh green tones
- **Sage** - Muted natural green

#### Warm Neutrals

- **Cream** - Warm beige background
- **Sand** - Soft golden tones

#### Soft Rose

- **Blush** - Delicate pink
- **Rose** - Warm rose tones

## How to Use

### Accessing Color Customization

1. **Via Settings Icon**:

   - Hover over any node
   - Click the Settings (⚙️) icon that appears in the top-right corner
   - The customization panel will open

2. **Via Keyboard Shortcut** (if implemented):
   - Select a node
   - Press the customization hotkey

### Customizing Node Colors

1. Open the Node Customization Panel
2. Navigate to the **Appearance** tab
3. Click on any color swatch in the grid
4. The preview updates instantly
5. Click **Save** to apply changes

### Color Properties

Each theme automatically sets three coordinated colors:

- **Background Color**: The main node background
- **Text Color**: Readable text color that contrasts with background
- **Dot/Accent Color**: Used for connection dots and highlights

## Design Philosophy

### Minimal & Clean

- No complex color pickers or RGB sliders
- Just a simple grid of beautiful presets
- Each color is carefully chosen to maintain visual hierarchy

### Aesthetic Consistency

- All colors are professionally curated
- Maintains readability and accessibility
- Subtle tones that don't distract from content

### User-Friendly

- Hover to see color names
- Check mark shows current selection
- Preview shows exactly how the node will look

## Technical Details

### Persistence

- Colors are automatically saved to the database
- Settings persist across sessions
- Synced with your canvas data

### Component Integration

All node types support color customization:

- Entry Nodes
- Branch Nodes
- Context Nodes
- LLM Call Nodes
- User Message Nodes

### Storage Structure

```typescript
interface NodeData {
  color?: string; // Background color (e.g., "#f0f9ff")
  textColor?: string; // Text color (e.g., "#0c4a6e")
  dotColor?: string; // Accent/dot color (e.g., "#0ea5e9")
}
```

## Best Practices

1. **Use Subtle Colors**: Stick with the provided presets for consistency
2. **Consider Readability**: All presets ensure text is readable
3. **Theme Cohesion**: Use similar color families for related nodes
4. **Visual Hierarchy**: Use brighter colors for important nodes

## Future Enhancements

Potential additions based on user feedback:

- Custom color input for advanced users
- Save favorite color combinations
- Apply themes to multiple nodes at once
- Import/export color themes

## Developer Notes

### Color Picker Component

Located at: `components/node-customization/color-picker.tsx`

Key features:

- Ultra-minimal UI
- Grid layout (4 columns)
- Hover effects for discoverability
- Live preview functionality

### Integration Points

- `NodeCustomizationPanel`: Main customization interface
- `canvas-area-enhanced.tsx`: Handles save/update logic
- Node components: Render with custom colors
- `lib/storage.ts`: Persists color data

### Adding New Presets

To add a new color preset, edit `color-picker.tsx`:

```typescript
const COLOR_PRESETS = [
  // Add your preset here
  {
    name: "Your Theme Name",
    color: "#background",
    text: "#textColor",
    dot: "#accentColor",
  },
  // ... existing presets
];
```

## Support

For issues or suggestions related to color customization:

- Check existing node settings
- Ensure colors are saving to database
- Verify node components are receiving color props
