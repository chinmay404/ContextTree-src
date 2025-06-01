// lib/canvas-config.ts

// This is a regular TypeScript module, NOT a 'use server' file.
// It can export any type of data or synchronous functions.

export const initialCanvasData = {
  nodes: [{ id: "1", type: "mainNode", data: { label: "Start Here" }, position: { x: 250, y: 5 } }],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

export function getHelperConfig() {
  return {
    featureFlags: {
      newEditor: true,
      collaboration: false,
    },
    apiEndpoints: {
      chat: "/api/chat",
      save: "/api/save_canvas", // Example, adjust as needed
    },
  }
}

// You can add other non-async configurations or helper functions here.
