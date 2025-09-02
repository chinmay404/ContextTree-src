"use client";

import { useEffect, useRef } from "react";
import type { Node, Edge } from "reactflow";
import { mongoService } from "@/lib/mongodb";
import { useSession } from "next-auth/react";

interface UseAutoSaveProps {
  canvasId: string;
  nodes: Node[];
  edges: Edge[];
  enabled?: boolean;
  interval?: number;
}

export function useAutoSave({
  canvasId,
  nodes,
  edges,
  enabled = true,
  interval = 10000,
}: UseAutoSaveProps) {
  const { data: session } = useSession();
  const lastSaveRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !canvasId || !session?.user?.email) return;

    const currentState = JSON.stringify({ nodes, edges });

    // Only save if data has changed
    if (currentState === lastSaveRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        const nodeData = nodes.map((node) => ({
          _id: node.id,
          type: node.type || "default",
          data: node.data,
          position: node.position,
          style: node.style || {},
        }));

        const edgeData = edges.map((edge) => ({
          _id: edge.id,
          from: edge.source,
          to: edge.target,
          type: edge.type || "default",
          data: edge.data || {},
        }));

        await mongoService.updateCanvas(
          canvasId,
          { nodes: nodeData as any, edges: edgeData as any },
          session.user.email as string
        );

        lastSaveRef.current = currentState;
        console.log("[v0] Auto-saved canvas data");
      } catch (error) {
        console.error("[v0] Auto-save failed:", error);
      }
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [canvasId, nodes, edges, enabled, interval, session?.user?.email]);

  // Manual save function
  const saveNow = async () => {
    if (!canvasId || !session?.user?.email) return false;

    try {
      const nodeData = nodes.map((node) => ({
        _id: node.id,
        type: node.type || "default",
        data: node.data,
        position: node.position,
        style: node.style || {},
      }));

      const edgeData = edges.map((edge) => ({
        _id: edge.id,
        from: edge.source,
        to: edge.target,
        type: edge.type || "default",
        data: edge.data || {},
      }));

      await mongoService.updateCanvas(
        canvasId,
        { nodes: nodeData as any, edges: edgeData as any },
        session.user.email as string
      );

      lastSaveRef.current = JSON.stringify({ nodes, edges });
      return true;
    } catch (error) {
      console.error("[v0] Manual save failed:", error);
      return false;
    }
  };

  return { saveNow };
}
