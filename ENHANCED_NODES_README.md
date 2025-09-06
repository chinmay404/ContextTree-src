# Enhanced Node Components for ContextTree

## Overview

This project includes a complete enhanced node system that transforms the basic ReactFlow nodes into beautiful, customizable, and interactive components with smooth animations and modern design principles.

## 🚀 Features

### Enhanced Node Components
- **EntryNodeEnhanced**: Starting points with pulse animations and particle effects
- **ContextNodeEnhanced**: Data sources with flow animations and type indicators
- **BranchNodeEnhanced**: Decision points with dynamic branching visualization

### Customization System
- **Full Color Control**: Background, text, accent colors with preset themes
- **Style Variants**: Minimal, Modern, Glass, and Gradient styles
- **Size Options**: Small, Medium, and Large with auto-sizing
- **Animation Effects**: Hover states, pulse animations, data flow indicators

### UI Enhancements
- **Enhanced Node Palette**: Modern drag-drop interface with categories
- **Customization Panel**: Real-time preview and adjustment controls
- **Color Picker**: 15+ preset themes plus custom color support
- **Integration Guide**: Complete documentation and migration help

## 📦 File Structure

```
components/
├── nodes/
│   ├── entry-node-enhanced.tsx      # Enhanced entry point nodes
│   ├── context-node-enhanced.tsx    # Enhanced data context nodes
│   └── branch-node-enhanced.tsx     # Enhanced decision branch nodes
├── node-customization/
│   ├── node-customization-panel.tsx # Main customization interface
│   └── color-picker.tsx             # Advanced color selection
├── node-palette-enhanced.tsx        # Enhanced drag-drop palette
└── canvas-area-enhanced.tsx         # Integrated canvas system
```

## 🎨 Demo Pages

- `/node-showcase` - Interactive showcase of all enhanced components
- `/integration-guide` - Complete setup and migration documentation

## 🛠️ Quick Start

### 1. Basic Usage

```tsx
import { EntryNodeEnhanced } from "@/components/nodes/entry-node-enhanced";

<EntryNodeEnhanced
  data={{
    label: "Welcome Flow",
    messageCount: 12,
    style: "modern",
    size: "medium",
    color: "#e0f2fe",
    textColor: "#0891b2"
  }}
  id="welcome-node"
/>
```

### 2. Enable Enhanced Mode

In your canvas component, toggle the enhanced mode:

```tsx
const [useEnhancedNodes, setUseEnhancedNodes] = useState(false);

const nodeTypes = useEnhancedNodes ? enhancedNodeTypes : basicNodeTypes;
```

### 3. Add Customization

```tsx
const handleNodeCustomization = (nodeId: string, customization: any) => {
  setNodes(nodes => 
    nodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...customization } }
        : node
    )
  );
};
```

## 🎯 Customization Options

### Colors
- **Background Colors**: Full spectrum with preset themes
- **Text Colors**: Automatic contrast or manual selection
- **Accent Colors**: Dots, borders, and highlights
- **Gradient Themes**: Ocean, Purple, Forest, Sunset, and more

### Styles
- **Minimal**: Clean, simple borders with subtle effects
- **Modern**: Contemporary design with shadow and depth
- **Glass**: Frosted glass effect with backdrop blur
- **Gradient**: Smooth color transitions and dynamic backgrounds

### Sizes
- **Small**: Compact for dense workflows (120px width)
- **Medium**: Default balanced size (160px width)  
- **Large**: Detailed view with extra information (200px width)

### Animations
- **Pulse Effects**: Breathing animations for active states
- **Hover Transitions**: Smooth scale and glow effects
- **Data Flow**: Animated indicators for information movement
- **Particle Effects**: Floating elements for visual interest

## 📋 Migration Guide

### From Basic to Enhanced

1. **Update Imports**:
   ```tsx
   // Before
   import { EntryNode } from "./nodes/entry-node";
   
   // After  
   import { EntryNodeEnhanced } from "./nodes/entry-node-enhanced";
   ```

2. **Update Node Types**:
   ```tsx
   const enhancedNodeTypes = {
     entry: EntryNodeEnhanced,
     context: ContextNodeEnhanced,
     branch: BranchNodeEnhanced,
   };
   ```

3. **Add CSS Animations**:
   Include the enhanced animations in your `globals.css`:
   ```css
   @keyframes nodeGlow {
     0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
     50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
   }
   ```

## 🔧 Backward Compatibility

The enhanced components are fully backward compatible:
- All existing node data properties continue to work
- New customization features are opt-in
- Default values match original styling
- No breaking changes to existing workflows

## 🎨 Theme Presets

### Ocean Breeze
- Entry: Light blue with cyan accents
- Context: Soft cyan with blue highlights  
- Branch: Pale green with emerald touches

### Purple Haze
- Entry: Light purple with violet accents
- Context: Lavender with purple highlights
- Branch: Soft purple with magenta touches

### Forest Green
- Entry: Pale green with emerald accents
- Context: Light green with forest highlights
- Branch: Mint green with nature touches

### Sunset Glow
- Entry: Warm yellow with amber accents
- Context: Soft orange with warm highlights
- Branch: Light coral with sunset touches

## 📱 Responsive Design

All enhanced components are fully responsive:
- Mobile-optimized touch targets
- Adaptive text sizing
- Scalable animations
- Touch-friendly interactions

## ⚡ Performance

- Optimized animations with CSS transforms
- Memoized components to prevent unnecessary re-renders
- Lazy loading of customization panels
- Efficient event handling with debounced updates

## 🔍 Accessibility

- Full keyboard navigation support
- Screen reader compatible ARIA labels
- High contrast mode support
- Focus indicators for all interactive elements

## 🚀 Future Enhancements

- Theme marketplace and sharing
- Custom animation builder
- Advanced data visualization
- Plugin system for extensions
- Auto-layout algorithms
- Collaborative editing features

## 📖 Additional Resources

- **Live Demo**: Visit `/node-showcase` to see all features
- **Setup Guide**: Check `/integration-guide` for detailed instructions
- **API Reference**: TypeScript definitions included in components
- **Examples**: Sample implementations in the showcase page

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new features
3. Include animations and hover states
4. Test on multiple screen sizes
5. Document new customization options

## 📄 License

This enhanced node system is part of the ContextTree project and follows the same licensing terms.
