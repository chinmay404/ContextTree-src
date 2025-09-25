"use client";

import React, { useState } from "react";
import { ReactFlowProvider } from "reactflow";
import { CanvasAreaSmooth } from "@/components/canvas-area-smooth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  GitBranch,
  Database,
  MousePointer,
  Move,
  Link,
  Trash2,
  Settings,
  Palette,
  Save,
} from "lucide-react";
import "reactflow/dist/style.css";
import "@/styles/canvas-smooth.css";

export default function CanvasDemoPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [demoCanvasId] = useState("demo-smooth-canvas");

  const features = [
    {
      icon: <Move className="w-5 h-5" />,
      title: "Smooth Node Dragging",
      description:
        "Real-time position updates with visual feedback and database persistence",
    },
    {
      icon: <Link className="w-5 h-5" />,
      title: "Flexible Connections",
      description:
        "Connect from any point on nodes - not just predefined handles",
    },
    {
      icon: <MousePointer className="w-5 h-5" />,
      title: "Interactive Edges",
      description:
        "Click edges to select, delete, or edit connection properties",
    },
    {
      icon: <Save className="w-5 h-5" />,
      title: "Real-time Persistence",
      description:
        "All changes automatically saved to database with optimistic updates",
    },
    {
      icon: <Palette className="w-5 h-5" />,
      title: "Enhanced Visuals",
      description:
        "Smooth animations, hover effects, and connection indicators",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: "Customizable",
      description:
        "Flexible connection modes, visual themes, and node customization",
    },
  ];

  const shortcuts = [
    { key: "Delete/Backspace", action: "Delete selected node or edge" },
    { key: "Ctrl/Cmd + C", action: "Toggle connection mode (Loose/Strict)" },
    { key: "Drag from palette", action: "Create new node at cursor position" },
    {
      key: "Drag from node handle",
      action: "Create connection to another node",
    },
    { key: "Click edge", action: "Select edge for editing or deletion" },
    { key: "Hover node", action: "Highlight connected edges" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Enhanced Canvas Demo
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Experience the new smooth, flexible, and intuitive canvas interface
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Zap className="w-3 h-3 mr-1" />
              Real-time Updates
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <GitBranch className="w-3 h-3 mr-1" />
              Flexible Connections
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800"
            >
              <Database className="w-3 h-3 mr-1" />
              Auto-save to DB
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="demo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="shortcuts">Keyboard Shortcuts</TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="w-5 h-5" />
                  Enhanced Canvas
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Drag nodes smoothly, create flexible connections, and
                  experience real-time updates
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] w-full">
                  <ReactFlowProvider>
                    <CanvasAreaSmooth
                      canvasId={demoCanvasId}
                      selectedNode={selectedNode}
                      onNodeSelect={setSelectedNode}
                    />
                  </ReactFlowProvider>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>1. Drag nodes from the palette to create them</p>
                  <p>2. Drag from node handles to create connections</p>
                  <p>3. Click edges to select and delete them</p>
                  <p>4. Use keyboard shortcuts for quick actions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Current Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedNode ? (
                    <div className="space-y-1">
                      <p className="font-medium">Node: {selectedNode}</p>
                      <p className="text-gray-600">
                        Click another node to select it
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No node selected</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Canvas Ready</span>
                  </div>
                  <p className="text-gray-600 mt-1">All changes auto-saved</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="border-0 shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {feature.icon}
                      </div>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shortcuts" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Keyboard Shortcuts & Interactions</CardTitle>
                <CardDescription>
                  Learn the efficient ways to interact with the enhanced canvas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <code className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">
                          {shortcut.key}
                        </code>
                        <span className="text-gray-700">{shortcut.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Visual Feedback</CardTitle>
                <CardDescription>
                  Understanding the visual cues and animations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Node States</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-400 rounded border-2 border-white shadow-sm" />
                        <span>Selected node (blue border)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-300 rounded border border-gray-400" />
                        <span>Normal node</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-400 rounded opacity-80" />
                        <span>Dragging node (translucent)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Edge States</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-0.5 bg-red-400"
                          style={{
                            clipPath:
                              "polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%)",
                          }}
                        />
                        <span>Selected edge (red, dashed)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-gray-400" />
                        <span>Normal edge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-green-400 animate-pulse" />
                        <span>Active/animated edge</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
