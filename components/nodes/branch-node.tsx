"use client";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch } from "lucide-react";
import { memo } from "react";

interface BranchNodeData {
  label: string;
  messageCount: number;
  isSelected: boolean;
  onClick?: () => void;
  onSettingsClick?: () => void;
  color?: string;
  textColor?: string;
  dotColor?: string;
  parentNodeId?: string;
  forkedFromMessageId?: string;
  model?: string;
  metaTags?: string[];
  lastMessageAt?: string;
  createdAt?: string;
  highlightTier?: 0 | 1 | 2;
}

function BranchNodeComponent({ data, selected }: NodeProps<BranchNodeData>) {
  const handleClick = () => {
    if (data.onClick) {
      data.onClick();
    }
  };

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 cursor-pointer hover:shadow-lg transition-shadow ${
        selected || data.isSelected 
          ? 'border-green-500' 
          : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center">
        <GitBranch size={16} className="mr-2 text-green-500" />
        <div>
          <div className="text-sm font-medium">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.model || 'gpt-4'} • Branch Node
          </div>
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
}

export const BranchNode = memo(BranchNodeComponent);
