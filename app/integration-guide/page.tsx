"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code2, 
  Copy, 
  Check, 
  Rocket, 
  Palette,
  Settings,
  FileText,
  Zap,
  Download,
  GitBranch
} from "lucide-react";

const INSTALLATION_STEPS = [
  {
    title: "Import Enhanced Components",
    description: "Replace your existing node imports with the enhanced versions",
    code: `// Replace your existing imports
import { EntryNodeEnhanced } from "@/components/nodes/entry-node-enhanced";
import { ContextNodeEnhanced } from "@/components/nodes/context-node-enhanced";
import { BranchNodeEnhanced } from "@/components/nodes/branch-node-enhanced";
import { NodeCustomizationPanel } from "@/components/node-customization/node-customization-panel";`,
  },
  {
    title: "Update Node Types",
    description: "Configure ReactFlow to use your enhanced node components",
    code: `const nodeTypes = {
  entry: EntryNodeEnhanced,
  context: ContextNodeEnhanced,
  branch: BranchNodeEnhanced,
  // Add other node types as needed
};

// In your ReactFlow component
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  // ... other props
/>`,
  },
  {
    title: "Add Customization Support",
    description: "Integrate the customization panel with your node data",
    code: `const [nodeCustomizations, setNodeCustomizations] = useState({});

const handleNodeCustomization = (nodeId: string, customization: any) => {
  setNodeCustomizations(prev => ({
    ...prev,
    [nodeId]: customization
  }));
  
  // Update node data with customization
  setNodes(nodes => 
    nodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...customization } }
        : node
    )
  );
};`,
  },
  {
    title: "Enable Animations",
    description: "Add the enhanced CSS animations to your globals.css",
    code: `/* Add to your globals.css */
@keyframes nodeGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
}

@keyframes dataFlow {
  0% { opacity: 0.3; transform: translateX(-100%); }
  50% { opacity: 1; }
  100% { opacity: 0.3; transform: translateX(100%); }
}

.node-glow { animation: nodeGlow 2s ease-in-out infinite; }
.data-flow { animation: dataFlow 3s ease-in-out infinite; }`,
  },
];

const CUSTOMIZATION_OPTIONS = [
  {
    category: "Colors",
    options: ["Background colors", "Text colors", "Border colors", "Accent colors", "Gradient themes"],
  },
  {
    category: "Styles",
    options: ["Minimal", "Modern", "Glass effect", "Gradient backgrounds", "Custom borders"],
  },
  {
    category: "Sizes",
    options: ["Small (compact)", "Medium (default)", "Large (detailed)", "Auto-sizing"],
  },
  {
    category: "Animations",
    options: ["Hover effects", "Pulse animations", "Data flow indicators", "Particle effects"],
  },
  {
    category: "Typography",
    options: ["Font weights", "Text sizes", "Label positions", "Meta tag styling"],
  },
];

export default function IntegrationGuidePage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, identifier: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(identifier);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Integration Guide
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Complete guide to integrating the enhanced node components into your existing 
            ReactFlow application with full customization support.
          </p>
        </div>

        <Tabs defaultValue="installation" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="installation" className="flex items-center gap-2">
              <Rocket size={16} />
              Installation
            </TabsTrigger>
            <TabsTrigger value="customization" className="flex items-center gap-2">
              <Palette size={16} />
              Customization
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <Code2 size={16} />
              Examples
            </TabsTrigger>
            <TabsTrigger value="migration" className="flex items-center gap-2">
              <GitBranch size={16} />
              Migration
            </TabsTrigger>
          </TabsList>

          {/* Installation Tab */}
          <TabsContent value="installation" className="space-y-8">
            <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Rocket className="text-blue-600" size={24} />
                Quick Start Installation
              </h2>
              
              <div className="space-y-8">
                {INSTALLATION_STEPS.map((step, index) => (
                  <div key={index} className="border-l-4 border-blue-400 pl-6 relative">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-400 rounded-full"></div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-slate-600">{step.description}</p>
                    </div>
                    
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{step.code}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-slate-800 border-slate-600 hover:bg-slate-700"
                        onClick={() => copyToClipboard(step.code, `step-${index}`)}
                      >
                        {copiedCode === `step-${index}` ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Tips */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="text-yellow-600" size={20} />
                Pro Tips
              </h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Start with the default themes and gradually customize to match your brand</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Use the node showcase page to test different configurations before implementation</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Enable animations gradually - start with hover effects and add more complex ones</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Save your favorite themes as JSON files for easy reuse across projects</span>
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Customization Tab */}
          <TabsContent value="customization" className="space-y-8">
            <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Palette className="text-purple-600" size={24} />
                Customization Options
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CUSTOMIZATION_OPTIONS.map((category, index) => (
                  <Card key={index} className="p-4 border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                      {category.category}
                    </h3>
                    <ul className="space-y-2">
                      {category.options.map((option, optionIndex) => (
                        <li key={optionIndex} className="text-sm text-slate-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                          {option}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Color Palette Example */}
            <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Custom Color Palettes</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600">Ocean Theme</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600">Purple Haze</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-lg mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600">Forest Green</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600">Sunset Glow</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-8">
            <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Code2 className="text-green-600" size={24} />
                Code Examples
              </h2>
              
              {/* Basic Usage Example */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Basic Node Usage</h3>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`// Basic entry node with custom styling
<EntryNodeEnhanced
  data={{
    label: "Welcome Message",
    messageCount: 12,
    isSelected: false,
    model: "GPT-4",
    metaTags: ["welcome", "onboarding"],
    color: "#e0f2fe",
    textColor: "#0891b2",
    dotColor: "#06b6d4",
    style: "modern",
    size: "medium"
  }}
  selected={false}
  id="welcome-node"
  type="entry"
  position={{ x: 100, y: 100 }}
/>`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-slate-800 border-slate-600 hover:bg-slate-700"
                      onClick={() => copyToClipboard(`// Basic entry node with custom styling
<EntryNodeEnhanced
  data={{
    label: "Welcome Message",
    messageCount: 12,
    isSelected: false,
    model: "GPT-4",
    metaTags: ["welcome", "onboarding"],
    color: "#e0f2fe",
    textColor: "#0891b2",
    dotColor: "#06b6d4",
    style: "modern",
    size: "medium"
  }}
  selected={false}
  id="welcome-node"
  type="entry"
  position={{ x: 100, y: 100 }}
/>`, "basic-usage")}
                    >
                      {copiedCode === "basic-usage" ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Custom Theme Example */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Custom Theme Configuration</h3>
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`// Define your custom theme
const customTheme = {
  entry: {
    color: "#f0f9ff",
    textColor: "#0369a1",
    dotColor: "#0ea5e9",
    style: "glass",
    size: "large"
  },
  context: {
    color: "#fef3c7",
    textColor: "#92400e",
    dotColor: "#f59e0b",
    style: "gradient", 
    size: "medium"
  },
  branch: {
    color: "#f0fdf4",
    textColor: "#14532d",
    dotColor: "#16a34a",
    style: "modern",
    size: "medium"
  }
};

// Apply theme to nodes
const themedNodes = nodes.map(node => ({
  ...node,
  data: {
    ...node.data,
    ...customTheme[node.type]
  }
}));`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-slate-800 border-slate-600 hover:bg-slate-700"
                      onClick={() => copyToClipboard(`// Define your custom theme
const customTheme = {
  entry: {
    color: "#f0f9ff",
    textColor: "#0369a1",
    dotColor: "#0ea5e9",
    style: "glass",
    size: "large"
  },
  context: {
    color: "#fef3c7",
    textColor: "#92400e",
    dotColor: "#f59e0b",
    style: "gradient", 
    size: "medium"
  },
  branch: {
    color: "#f0fdf4",
    textColor: "#14532d",
    dotColor: "#16a34a",
    style: "modern",
    size: "medium"
  }
};

// Apply theme to nodes
const themedNodes = nodes.map(node => ({
  ...node,
  data: {
    ...node.data,
    ...customTheme[node.type]
  }
}));`, "theme-config")}
                    >
                      {copiedCode === "theme-config" ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Migration Tab */}
          <TabsContent value="migration" className="space-y-8">
            <Card className="p-6 bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <GitBranch className="text-indigo-600" size={24} />
                Migration from Basic Nodes
              </h2>
              
              <div className="space-y-8">
                {/* Before/After Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 text-red-600">Before (Basic)</h3>
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{`import { EntryNode } from "@/components/nodes/entry-node";

const nodeTypes = {
  entry: EntryNode
};

// Limited customization
<EntryNode
  data={{
    label: "Entry Point",
    messageCount: 5
  }}
  id="entry-1"
/>`}</code>
                      </pre>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 text-green-600">After (Enhanced)</h3>
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{`import { EntryNodeEnhanced } from "@/components/nodes/entry-node-enhanced";

const nodeTypes = {
  entry: EntryNodeEnhanced
};

// Full customization support
<EntryNodeEnhanced
  data={{
    label: "Entry Point",
    messageCount: 5,
    style: "modern",
    size: "medium",
    color: "#e0f2fe",
    textColor: "#0891b2"
  }}
  id="entry-1"
/>`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Migration Checklist */}
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    Migration Checklist
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Update component imports to use enhanced versions",
                      "Add new customization properties to node data",
                      "Include enhanced CSS animations in globals.css",
                      "Update nodeTypes configuration in ReactFlow",
                      "Test all existing functionality still works",
                      "Gradually add new customization features",
                      "Update any TypeScript types if needed"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-400 rounded"></div>
                        <span className="text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Backward Compatibility Note */}
                <Card className="p-6 bg-yellow-50 border-yellow-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Settings className="text-yellow-600" size={20} />
                    Backward Compatibility
                  </h3>
                  <p className="text-slate-700 mb-3">
                    The enhanced components are designed to be backward compatible with your existing node data. 
                    All original properties will continue to work, and new features are opt-in.
                  </p>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> If a customization property is not provided, the component will use 
                      sensible defaults that match the original styling.
                    </p>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Download Resources */}
        <Card className="mt-12 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Download the complete enhanced node package and start building beautiful, 
              customizable node interfaces for your ReactFlow applications.
            </p>
            <div className="flex justify-center gap-4">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <Download className="mr-2" size={16} />
                Download Package
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                <FileText className="mr-2" size={16} />
                View Documentation
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
