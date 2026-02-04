"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";

interface ExternalContextNodeData {
  label: string;
  content?: string;
  fileType?: string;
  size?: number;
  isSelected: boolean;
  onClick?: () => void;
  onRetry?: () => void;
  color?: string;
  textColor?: string;
  loading?: boolean;
  error?: string;
}

export function ExternalContextNode({ data, selected }: NodeProps<ExternalContextNodeData>) {
  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  const hasError = Boolean(data.error);
  const isLoading = Boolean(data.loading) && !hasError;
  const previewText = hasError
    ? data.error || "Processing failed"
    : isLoading
    ? "Processing file..."
    : (data.content || "No content");

  const baseBg = hasError ? "#fff1f2" : "#fff6e8"; // soft red / orange
  const baseBorder = hasError ? "#fecdd3" : "#f4c89c";
  const baseText = hasError ? "#7f1d1d" : "#4b3a2d";
  const accent = hasError ? "#ef4444" : "#f59e0b";

  return (
    <div
      className={`w-[240px] h-[180px] cursor-pointer transition-all duration-200 rounded-2xl shadow-sm border-2 flex flex-col overflow-hidden ${
        selected || data.isSelected ? "shadow-lg scale-[1.01]" : ""
      }`}
      style={{
        backgroundColor: baseBg,
        borderColor: baseBorder,
        color: baseText,
      }}
      onClick={handleClick}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: baseBorder }}>
        <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center border" style={{ borderColor: baseBorder }}>
            {hasError ? (
                <AlertTriangle size={16} style={{ color: accent }} />
            ) : isLoading ? (
                <Loader2 size={16} className="animate-spin" style={{ color: accent }} />
            ) : (
                <FileUp size={16} style={{ color: accent }} />
            )}
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-semibold truncate" title={data.label}>{data.label}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: hasError ? "#b91c1c" : "#a36b2d" }}>
            {data.fileType ? data.fileType.split('/').pop() : 'FILE'} {data.size ? `• ${Math.round(data.size / 1024)}KB` : ''}
          </div>
        </div>
        {hasError && data.onRetry && (
          <button
            className="nodrag ml-auto rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
            style={{ borderColor: baseBorder, color: baseText }}
            onClick={(event) => {
              event.stopPropagation();
              data.onRetry?.();
            }}
          >
            Retry
          </button>
        )}
      </div>

      <div className="flex-1 px-4 py-2 text-xs leading-snug" style={{ color: baseText }}>
        <div className="bg-white/60 rounded-xl h-full p-2 overflow-auto whitespace-pre-wrap" style={{ border: `1px dashed ${baseBorder}` }}>
          <div className="h-full" title={data.content}>{previewText}</div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3.5 h-3.5"
        style={{ backgroundColor: accent }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3.5 h-3.5"
        style={{ backgroundColor: accent }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3.5 h-3.5"
        style={{ backgroundColor: accent }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-3.5 h-3.5"
        style={{ backgroundColor: accent }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-3.5 h-3.5"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}
