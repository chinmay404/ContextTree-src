"use client";

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  MessageSquare, 
  Settings, 
  Zap, 
  GitBranch, 
  Database,
  Play,
  Pause,
  MoreHorizontal 
} from 'lucide-react';

// Enhanced node data interface
interface EnhancedNodeData {
  label: string;
  messageCount?: number;
  isSelected?: boolean;
  model?: string;
  color?: string;
  textColor?: string;
  dotColor?: string;
  connectionCount?: number;
  onClick?: () => void;
  onSettingsClick?: () => void;
  isRunning?: boolean;
  lastActivity?: string;
}

interface EnhancedNodeProps extends NodeProps {
  data: EnhancedNodeData;
}

// Enhanced Entry Node with flexible connection points
export const EntryNodeEnhanced = memo(({ data, selected }: EnhancedNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(() => {
    data.onClick?.();
  }, [data]);

  const handleSettingsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSettingsClick?.();
  }, [data]);

  return (
    <div 
      className={`
        relative min-w-[200px] rounded-xl border-2 transition-all duration-200 ease-in-out cursor-pointer
        ${selected 
          ? 'border-blue-400 shadow-lg shadow-blue-100' 
          : 'border-slate-200 hover:border-slate-300'
        }
        ${isHovered ? 'transform -translate-y-1 shadow-xl' : 'shadow-md'}
      `}
      style={{ 
        backgroundColor: data.color || '#e0e7ff',
        borderColor: selected ? '#3b82f6' : undefined,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Multiple connection handles for flexibility */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !border-2 !border-white !bg-blue-500 transition-all duration-200"
        style={{ 
          right: -6,
          backgroundColor: data.dotColor || '#3b82f6'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !border-2 !border-white !bg-blue-500 transition-all duration-200"
        style={{ 
          bottom: -6,
          backgroundColor: data.dotColor || '#3b82f6'
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !border-2 !border-white !bg-blue-500 transition-all duration-200"
        style={{ 
          top: -6,
          backgroundColor: data.dotColor || '#3b82f6'
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !border-2 !border-white !bg-blue-500 transition-all duration-200"
        style={{ 
          left: -6,
          backgroundColor: data.dotColor || '#3b82f6'
        }}
      />

      {/* Node content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/50">
              <Play size={16} className="text-blue-600" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: data.textColor || '#1e40af' }}
            >
              Entry Point
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {data.isRunning && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
            <button
              onClick={handleSettingsClick}
              className="p-1 rounded hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Settings size={12} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 
            className="font-medium text-sm leading-tight"
            style={{ color: data.textColor || '#1e40af' }}
          >
            {data.label}
          </h3>
          
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>{data.messageCount || 0} messages</span>
            <span>{data.connectionCount || 0} connections</span>
          </div>
          
          {data.model && (
            <div className="text-xs bg-white/30 rounded px-2 py-1 font-mono">
              {data.model.split('/').pop()}
            </div>
          )}
        </div>
      </div>

      {/* Activity indicator */}
      {data.lastActivity && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>
  );
});

// Enhanced Branch Node
export const BranchNodeEnhanced = memo(({ data, selected }: EnhancedNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(() => {
    data.onClick?.();
  }, [data]);

  return (
    <div 
      className={`
        relative min-w-[180px] rounded-xl border-2 transition-all duration-200 ease-in-out cursor-pointer group
        ${selected 
          ? 'border-emerald-400 shadow-lg shadow-emerald-100' 
          : 'border-slate-200 hover:border-slate-300'
        }
        ${isHovered ? 'transform -translate-y-1 shadow-xl' : 'shadow-md'}
      `}
      style={{ 
        backgroundColor: data.color || '#dcfce7',
        borderColor: selected ? '#10b981' : undefined,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Multiple flexible connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-3 !h-3 !border-2 !border-white !bg-emerald-500 transition-all duration-200"
        style={{ 
          left: -6,
          backgroundColor: data.dotColor || '#10b981'
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-3 !h-3 !border-2 !border-white !bg-emerald-500 transition-all duration-200"
        style={{ 
          top: -6,
          backgroundColor: data.dotColor || '#10b981'
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-3 !h-3 !border-2 !border-white !bg-emerald-500 transition-all duration-200"
        style={{ 
          right: -6,
          backgroundColor: data.dotColor || '#10b981'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-3 !h-3 !border-2 !border-white !bg-emerald-500 transition-all duration-200"
        style={{ 
          bottom: -6,
          backgroundColor: data.dotColor || '#10b981'
        }}
      />

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/50">
              <GitBranch size={16} className="text-emerald-600" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: data.textColor || '#047857' }}
            >
              Branch
            </span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onSettingsClick?.();
            }}
            className="p-1 rounded hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 
            className="font-medium text-sm leading-tight"
            style={{ color: data.textColor || '#047857' }}
          >
            {data.label}
          </h3>
          
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>{data.messageCount || 0} msgs</span>
            <span>{data.connectionCount || 0} paths</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Enhanced Context Node
export const ContextNodeEnhanced = memo(({ data, selected }: EnhancedNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(() => {
    data.onClick?.();
  }, [data]);

  return (
    <div 
      className={`
        relative min-w-[160px] rounded-xl border-2 transition-all duration-200 ease-in-out cursor-pointer group
        ${selected 
          ? 'border-amber-400 shadow-lg shadow-amber-100' 
          : 'border-slate-200 hover:border-slate-300'
        }
        ${isHovered ? 'transform -translate-y-1 shadow-xl' : 'shadow-md'}
      `}
      style={{ 
        backgroundColor: data.color || '#fef3c7',
        borderColor: selected ? '#f59e0b' : undefined,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Flexible connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 transition-all duration-200"
        style={{ 
          left: -6,
          backgroundColor: data.dotColor || '#f59e0b'
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 transition-all duration-200"
        style={{ 
          top: -6,
          backgroundColor: data.dotColor || '#f59e0b'
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 transition-all duration-200"
        style={{ 
          right: -6,
          backgroundColor: data.dotColor || '#f59e0b'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500 transition-all duration-200"
        style={{ 
          bottom: -6,
          backgroundColor: data.dotColor || '#f59e0b'
        }}
      />

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/50">
              <Database size={16} className="text-amber-600" />
            </div>
            <span 
              className="font-semibold text-sm"
              style={{ color: data.textColor || '#92400e' }}
            >
              Context
            </span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onSettingsClick?.();
            }}
            className="p-1 rounded hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Settings size={12} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 
            className="font-medium text-sm leading-tight"
            style={{ color: data.textColor || '#92400e' }}
          >
            {data.label}
          </h3>
          
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>{data.messageCount || 0} items</span>
            <span>{data.connectionCount || 0} links</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Add display names for debugging
EntryNodeEnhanced.displayName = 'EntryNodeEnhanced';
BranchNodeEnhanced.displayName = 'BranchNodeEnhanced';
ContextNodeEnhanced.displayName = 'ContextNodeEnhanced';