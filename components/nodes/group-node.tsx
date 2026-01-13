"use client";

import { memo, useCallback, type CSSProperties } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import { Settings } from "lucide-react";

interface GroupNodeData {
  label?: string;
  color?: string;
  textColor?: string;
  borderColor?: string;
  onResize?: (size: { width: number; height: number }) => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
  onSettingsClick?: () => void;
}

export const GroupNode = memo(({ data, selected }: NodeProps<GroupNodeData>) => {
  const background = data.color || "rgba(148, 163, 184, 0.18)";
  const borderColor = data.borderColor || "rgba(148, 163, 184, 0.55)";
  const textColor = data.textColor || "#334155";

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      data.onResize?.({ width: params.width, height: params.height });
    },
    [data]
  );

  const handleResizeEnd = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      data.onResizeEnd?.({ width: params.width, height: params.height });
    },
    [data]
  );

  const containerStyle: CSSProperties = {
    background,
    borderColor,
    color: textColor,
  };

  return (
    <div
      className="group relative h-full w-full rounded-3xl border-2 border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200"
      style={containerStyle}
    >
      <NodeResizer
        minWidth={240}
        minHeight={180}
        isVisible={selected}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
        lineStyle={{
          borderRadius: 24,
          border: "1px dashed rgba(148,163,184,0.7)",
        }}
        handleStyle={{
          height: 12,
          width: 12,
          borderRadius: 9999,
          background: "rgba(59,130,246,0.9)",
          border: "2px solid white",
          boxShadow: "0 4px 8px rgba(59,130,246,0.35)",
        }}
      />

      {data.onSettingsClick && (
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-500 shadow-sm opacity-0 transition hover:scale-105 hover:bg-white hover:text-slate-700 group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            data.onSettingsClick?.();
          }}
          aria-label="Customize group"
        >
          <Settings size={16} />
        </button>
      )}

      <div
        className="absolute left-6 top-6 max-w-[70%] text-sm font-semibold tracking-tight"
        style={{ color: textColor }}
      >
        {data.label || "Group"}
      </div>

      <div className="absolute inset-0 rounded-[26px] border border-white/60" />

      <div className="absolute bottom-6 left-6 text-xs font-medium text-slate-500/80">
        Drop nodes here to visually group related workstreams
      </div>
    </div>
  );
});

GroupNode.displayName = "GroupNode";
