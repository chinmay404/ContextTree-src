"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { FileText } from "lucide-react";

interface ContextNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  parentNodeId?: string;
  forkedFromMessageId?: string;
  highlightTier?: 0 | 1 | 2;
}

export function ContextNode({ data, selected }: NodeProps<ContextNodeData>) {
  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 cursor-pointer hover:shadow-lg transition-shadow ${
        selected || data.isSelected 
          ? 'border-purple-500' 
          : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center">
        <FileText size={16} className="mr-2 text-purple-500" />
        <div>
          <div className="text-sm font-medium">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.model || 'gpt-4'} • Context Node
          </div>
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}
